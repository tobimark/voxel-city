// Offline software rasteriser for the whole Pixel Bay city.
//
// Why: the sandbox blocks Chromium's named-pipe IPC, so headless WebGL is not
// available. `src/city.js` only touches the DOM in makeGlowTexture(), so with a
// tiny 2D-canvas stub the entire THREE.Group scene (~6k meshes, 5 InstancedMesh,
// ~105k triangles) builds fine in Node. This script reproduces the app camera,
// lighting + fog + tone mapping closely enough to inspect the layout, and writes
// a PNG with a software z-buffer triangle rasteriser.
//
// Usage (run from the repo root):
//   node docs/planning/render-city.mjs --view hero --out docs/planning/render-hero.png
//   node docs/planning/render-city.mjs --view iso  --out docs/planning/render-iso.png
//   node docs/planning/render-city.mjs --view top  --out docs/planning/render-top.png
//
// Options:
//   --seed A9B0DF33   city seed (hex, default A9B0DF33)
//   --out <path>      PNG output (default docs/planning/render-<view>.png)
//   --w 960 --h 640   output size
//   --scale 1         supersample factor (>=1)
//   --view hero|iso|top
//   --hour 15         time of day fed to src/environment.js (default 15 = afternoon)
//   --crop            tight framing (hero: exact app camera distance; iso/top: no margin)
//   --src <dir>       import city.js from another tree (e.g. .tmp-before/src)
//
// Views:
//   hero : perspective, FOV 30, target (0,1.2,0), direction normalize(36,40.8,36),
//          distance from viewHeight 40 (main.js default). Default zooms out just
//          enough that the island is not clipped at non-16:9 aspect ratios.
//   iso  : orthographic, app default direction (36,42,36), viewHeight fitted to
//          the city bounds (>= 40, so it frames the city at any aspect).
//   top  : orthographic straight down, screen up = world -z, +x right, framed to
//          the island extent.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pathToFileURL } from "node:url";
import * as THREE from "three";

// --------------------------------------------------------------------- CLI
const argv = process.argv.slice(2);
function argValue(name, fallback) {
  const index = argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) return fallback;
  return value;
}
function flag(name) {
  return argv.includes(`--${name}`);
}

const seedHexRaw = String(argValue("seed", "A9B0DF33")).replace(/^0x/i, "").toUpperCase();
if (!/^[0-9A-F]{1,8}$/.test(seedHexRaw)) {
  console.error(`invalid --seed ${seedHexRaw}; expected hex like A9B0DF33`);
  process.exit(1);
}
const seed = Number.parseInt(seedHexRaw, 16) >>> 0;
const seedHex = seedHexRaw.padStart(8, "0");

const viewName = String(argValue("view", "hero")).toLowerCase();
if (!["hero", "iso", "top"].includes(viewName)) {
  console.error(`invalid --view ${viewName}; expected hero|iso|top`);
  process.exit(1);
}

const width = Math.max(16, Math.floor(Number(argValue("w", 960))));
const height = Math.max(16, Math.floor(Number(argValue("h", 640))));
const scale = Math.max(1, Math.floor(Number(argValue("scale", 1))));
const hour = Number(argValue("hour", 15));
const crop = flag("crop");
const outPath = path.resolve(argValue("out", `docs/planning/render-${viewName}.png`));
const srcRoot = path.resolve(argValue("src", "src"));

// ------------------------------------------------------- DOM stub (must be first)
// city.js only needs a canvas for the additive glow texture. Stub it exactly like
// docs/review/metrics.mjs so the module can be imported in Node.
const ctx2d = {
  fillStyle: null,
  createRadialGradient() {
    return { addColorStop() {} };
  },
  fillRect() {},
};
const canvasStub = {
  width: 64,
  height: 64,
  style: {},
  getContext() {
    return ctx2d;
  },
};
globalThis.document = {
  createElement(tag) {
    if (tag === "canvas") return canvasStub;
    throw new Error(`unexpected document.createElement(${tag})`);
  },
};

const { createCity } = await import(pathToFileURL(path.join(srcRoot, "city.js")).href);
const { sampleEnvironment } = await import(
  pathToFileURL(path.join(srcRoot, "environment.js")).href
);

// ------------------------------------------------------------------ PNG writer
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}
function writePNG(file, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 3 + 1)] = 0;
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
}

// ------------------------------------------------------- colour / tone mapping
// three.js stores material colors in linear-sRGB (ColorManagement is on), the
// WebGL renderer applies NeutralToneMapping with exposure 1.28, then encodes sRGB.
const EXPOSURE = 1.28;
const SRGB_LUT = new Uint8Array(4097);
for (let i = 0; i <= 4096; i += 1) {
  const c = i / 4096;
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  SRGB_LUT[i] = Math.round(Math.min(1, Math.max(0, s)) * 255);
}
function encode8(c) {
  if (!(c > 0)) return 0;
  if (c >= 1) return 255;
  return SRGB_LUT[Math.round(c * 4096)];
}
// Khronos PBR Neutral tone mapping (three.js NeutralToneMapping).
function neutralToneMap(r, g, b, out) {
  r *= EXPOSURE;
  g *= EXPOSURE;
  b *= EXPOSURE;
  const x = Math.min(r, Math.min(g, b));
  const offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  r -= offset;
  g -= offset;
  b -= offset;
  const peak = Math.max(r, Math.max(g, b));
  if (peak >= 0.76) {
    const d = 0.24;
    const newPeak = 1 - (d * d) / (peak + d - 0.76);
    const s = newPeak / peak;
    r *= s;
    g *= s;
    b *= s;
    const desat = 1 - 1 / (0.15 * (peak - newPeak) + 1);
    r += (newPeak - r) * desat;
    g += (newPeak - g) * desat;
    b += (newPeak - b) * desat;
  }
  out[0] = r;
  out[1] = g;
  out[2] = b;
  return out;
}
const DISPLAY_TMP = [0, 0, 0];
function toDisplay(r, g, b, toneMapped) {
  if (toneMapped) {
    neutralToneMap(r, g, b, DISPLAY_TMP);
    return [encode8(DISPLAY_TMP[0]), encode8(DISPLAY_TMP[1]), encode8(DISPLAY_TMP[2])];
  }
  return [encode8(r), encode8(g), encode8(b)];
}
function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
function colorLinear(color) {
  return [color.r, color.g, color.b];
}
function mixLinear(a, b, t, out) {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}

// ------------------------------------------------------------------- scene
const env = sampleEnvironment(hour);
const buildStart = performance.now();
const city = createCity({ seed });
city.group.updateMatrixWorld(true);
city.updateEnvironment(env);
const buildMs = performance.now() - buildStart;

// Lighting mirrors main.js applyEnvironment() (without the point light glow).
const nightLift = env.night;
const hemiIntensity = env.hemiIntensity * (1.32 + nightLift * 0.6);
const ambientIntensity = env.ambientIntensity * (1.5 + nightLift * 1.3);
const sunIntensity = env.sunIntensity * (1.08 + nightLift * 0.75);
const fillIntensity = 0.18 + env.daylight * 0.52 + nightLift * 0.3;
const sunDir = new THREE.Vector3(env.sunX, env.sunY, env.sunZ).normalize();
const fillDir = new THREE.Vector3(-26, 22, -18).normalize();
const hemiSky = colorLinear(env.hemiSky);
const hemiGround = colorLinear(env.hemiGround);
const ambientColor = colorLinear(env.ambient);
const sunColor = colorLinear(env.sun);
const fillColor = colorLinear(env.hemiSky).map((v, i) => v + (colorLinear(env.sun)[i] - v) * 0.22);
const fogColorLinear = colorLinear(env.fog);
const skyZenith = colorLinear(env.sky);
const skyHorizon = colorLinear(env.fog);
const INV_PI = 1 / Math.PI;

// ------------------------------------------------------------------ material styles
// Cache one style object per material: skip / unlit / water / lit, base color,
// emissive, fog, toneMapped.
const styleCache = new Map();
function styleFor(material) {
  if (!material) return null;
  const cached = styleCache.get(material.uuid);
  if (cached !== undefined) return cached;
  let style;
  if (
    material.visible === false ||
    (material.transparent && material.opacity <= 0.05) ||
    (material.transparent && material.blending === THREE.AdditiveBlending)
  ) {
    style = { skip: true, reason: "invisible" };
  } else if (material.isShaderMaterial && material.uniforms && material.uniforms.uDeep) {
    // Water: custom shader, flat mix(uDeep, uShallow, 0.17) quantised to 1/32.
    const deep = material.uniforms.uDeep.value;
    const shallow = material.uniforms.uShallow.value;
    const mix = [
      deep.r + (shallow.r - deep.r) * 0.17,
      deep.g + (shallow.g - deep.g) * 0.17,
      deep.b + (shallow.b - deep.b) * 0.17,
    ].map((v) => Math.floor(v * 32 + 0.5) / 32);
    style = { water: true, unlit: true, toneMapped: true, fog: false, base: mix };
  } else if (material.transparent && material.opacity < 0.5) {
    // Additive glow sprites and faint wake decals are skipped; at these
    // resolutions they are sub-pixel and would only wash the image out.
    style = { skip: true, reason: "faint-transparent" };
  } else {
    const base = material.color ? colorLinear(material.color) : [0.8, 0.8, 0.8];
    const emissive =
      material.emissive && material.emissiveIntensity
        ? colorLinear(material.emissive).map((v) => v * material.emissiveIntensity)
        : [0, 0, 0];
    style = {
      unlit: !!material.isMeshBasicMaterial,
      toneMapped: material.toneMapped !== false,
      fog: material.fog !== false,
      base,
      emissive,
    };
  }
  styleCache.set(material.uuid, style);
  return style;
}
function materialOf(object) {
  return Array.isArray(object.material) ? object.material[0] : object.material;
}

// --------------------------------------------------- scene bounds (for framing)
const WATER_LIKE = (object) => {
  const material = materialOf(object);
  return material && material.isShaderMaterial && material.uniforms && material.uniforms.uDeep;
};
// Framing uses the 8 corners of every drawable's local bounding box (instances
// included), clamped to the island area so the handful of far-out boats do not
// zoom the camera out. A single union AABB is far too conservative for a 3/4
// view because it combines the tallest tower with the farthest corner.
const FRAME_LIMIT = 25.5;
const framingPoints = [];
function collectFramingPoints() {
  const instMatrix = new THREE.Matrix4();
  const combined = new THREE.Matrix4();
  const corner = new THREE.Vector3();
  city.group.traverse((object) => {
    if (!object.isMesh || !object.geometry || WATER_LIKE(object)) return;
    // src/ is edited concurrently by other teammates; ignore objects whose
    // transforms are not finite instead of poisoning the whole framing.
    if (!object.matrixWorld.elements.every(Number.isFinite)) return;
    const style = styleFor(materialOf(object));
    if (!style || style.skip) return;
    const geometry = object.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox) return;
    const b = geometry.boundingBox;
    if (![b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite)) return;
    const addBox = (matrix) => {
      if (!matrix.elements.every(Number.isFinite)) return;
      for (let i = 0; i < 8; i += 1) {
        corner.set(
          i & 1 ? b.max.x : b.min.x,
          i & 2 ? b.max.y : b.min.y,
          i & 4 ? b.max.z : b.min.z
        );
        corner.applyMatrix4(matrix);
        if (!Number.isFinite(corner.x) || !Number.isFinite(corner.y) || !Number.isFinite(corner.z)) continue;
        if (Math.abs(corner.x) > FRAME_LIMIT || Math.abs(corner.z) > FRAME_LIMIT) continue;
        framingPoints.push(corner.x, corner.y, corner.z);
      }
    };
    if (object.isInstancedMesh) {
      const array = object.instanceMatrix.array;
      for (let i = 0; i < object.count; i += 1) {
        instMatrix.fromArray(array, i * 16);
        combined.multiplyMatrices(object.matrixWorld, instMatrix);
        addBox(combined);
      }
    } else {
      addBox(object.matrixWorld);
    }
  });
  // Always include the island corners so the sea edge is framed even on seeds
  // whose outermost blocks are sparse.
  for (const x of [-23.2, 23.2]) {
    for (const y of [-1.12, 0]) {
      for (const z of [-23.2, 23.2]) framingPoints.push(x, y, z);
    }
  }
}
collectFramingPoints();
const frameMin = { x: Infinity, y: Infinity, z: Infinity };
const frameMax = { x: -Infinity, y: -Infinity, z: -Infinity };
for (let i = 0; i < framingPoints.length; i += 3) {
  frameMin.x = Math.min(frameMin.x, framingPoints[i]);
  frameMin.y = Math.min(frameMin.y, framingPoints[i + 1]);
  frameMin.z = Math.min(frameMin.z, framingPoints[i + 2]);
  frameMax.x = Math.max(frameMax.x, framingPoints[i]);
  frameMax.y = Math.max(frameMax.y, framingPoints[i + 1]);
  frameMax.z = Math.max(frameMax.z, framingPoints[i + 2]);
}

// ----------------------------------------------------------------------- camera
// Returns a general camera: position/target/up, forward/right/up basis and a
// perspective or orthographic projection.
function makeCamera({ position, target, up, kind, fovDeg, aspectOut, viewHeight, near, far }) {
  const forward = new THREE.Vector3().subVectors(target, position).normalize();
  const zaxis = forward.clone().negate();
  const right = new THREE.Vector3().crossVectors(up, zaxis).normalize();
  const upScreen = new THREE.Vector3().crossVectors(zaxis, right);
  const tanHalf = kind === "persp" ? Math.tan((fovDeg * Math.PI) / 360) : 0;
  const halfH = kind === "ortho" ? viewHeight / 2 : 0;
  const halfW = kind === "ortho" ? (viewHeight * aspectOut) / 2 : 0;
  return {
    kind,
    pos: position,
    fwd: { x: forward.x, y: forward.y, z: forward.z },
    right: { x: right.x, y: right.y, z: right.z },
    up: { x: upScreen.x, y: upScreen.y, z: upScreen.z },
    tanHalf,
    halfW,
    halfH,
    aspectOut,
    near,
    far,
  };
}
function fitOrthoViewHeight(target, right, upScreen, aspectOut, padding) {
  let halfW = 0;
  let halfH = 0;
  for (let i = 0; i < framingPoints.length; i += 3) {
    const dx = framingPoints[i] - target.x;
    const dy = framingPoints[i + 1] - target.y;
    const dz = framingPoints[i + 2] - target.z;
    halfW = Math.max(halfW, Math.abs(dx * right.x + dy * right.y + dz * right.z));
    halfH = Math.max(halfH, Math.abs(dx * upScreen.x + dy * upScreen.y + dz * upScreen.z));
  }
  return 2 * Math.max(halfH, halfW / aspectOut) * padding;
}
// Horizontal-only fit for the hero view: the app deliberately runs the near
// waterfront (bottom foreground) out of frame, and fitting it vertically would
// zoom the whole island out to a thumbnail. Keep the full city width instead.
function fitPerspectiveWidth(target, forward, right, aspectOut, fovDeg, margin) {
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const dir = forward.clone().negate(); // target -> camera
  let distance = 0;
  for (let i = 0; i < framingPoints.length; i += 3) {
    const dx = framingPoints[i] - target.x;
    const dy = framingPoints[i + 1] - target.y;
    const dz = framingPoints[i + 2] - target.z;
    const along = dx * dir.x + dy * dir.y + dz * dir.z;
    const lateralX = Math.abs(dx * right.x + dy * right.y + dz * right.z) * margin;
    distance = Math.max(distance, along + lateralX / (tanHalf * aspectOut));
  }
  return distance;
}

const aspectOut = width / height;
const FOV = 30;
const appViewHeight = 40;
const target = new THREE.Vector3(0, 1.2, 0);
let camera;
let cameraDescription;
if (viewName === "hero") {
  const direction = new THREE.Vector3(36, 40.8, 36).normalize();
  const appDistance = appViewHeight / (2 * Math.tan((FOV * Math.PI) / 360));
  // Default framing extends the app distance only if the island would otherwise
  // be clipped by a non-16:9 aspect; --crop keeps the exact app framing.
  const basis = makeCamera({
    position: target.clone().addScaledVector(direction, appDistance),
    target,
    up: new THREE.Vector3(0, 1, 0),
    kind: "persp",
    fovDeg: FOV,
    aspectOut,
    near: 0.5,
    far: 1200,
  });
  const fitDistance = fitPerspectiveWidth(
    target,
    new THREE.Vector3(basis.fwd.x, basis.fwd.y, basis.fwd.z),
    new THREE.Vector3(basis.right.x, basis.right.y, basis.right.z),
    aspectOut,
    FOV,
    1.02
  );
  const distance = crop ? appDistance : Math.max(appDistance, Number.isFinite(fitDistance) ? fitDistance : appDistance);
  camera = makeCamera({
    position: target.clone().addScaledVector(direction, distance),
    target,
    up: new THREE.Vector3(0, 1, 0),
    kind: "persp",
    fovDeg: FOV,
    aspectOut,
    near: 0.5,
    far: 1200,
  });
  const viewHeightAtTarget = 2 * Math.tan((FOV * Math.PI) / 360) * distance;
  cameraDescription =
    `persp fov ${FOV}° dir (36,40.8,36) distance ${distance.toFixed(2)} ` +
    `(app ${appDistance.toFixed(2)}, viewHeight ${viewHeightAtTarget.toFixed(1)})`;
} else if (viewName === "iso") {
  const position = new THREE.Vector3(36, 42, 36);
  const basis = makeCamera({
    position,
    target,
    up: new THREE.Vector3(0, 1, 0),
    kind: "ortho",
    aspectOut,
    viewHeight: appViewHeight,
    near: 0.1,
    far: 1200,
  });
  const padding = crop ? 1 : 1.07;
  const fitHeight = fitOrthoViewHeight(
    target,
    new THREE.Vector3(basis.right.x, basis.right.y, basis.right.z),
    new THREE.Vector3(basis.up.x, basis.up.y, basis.up.z),
    aspectOut,
    padding
  );
  const viewHeight = crop
    ? Number.isFinite(fitHeight) ? fitHeight : appViewHeight
    : Math.max(appViewHeight, Number.isFinite(fitHeight) ? fitHeight : appViewHeight);
  camera = makeCamera({
    position,
    target,
    up: new THREE.Vector3(0, 1, 0),
    kind: "ortho",
    aspectOut,
    viewHeight,
    near: 0.1,
    far: 1200,
  });
  cameraDescription = `ortho dir (36,42,36) viewHeight ${viewHeight.toFixed(2)}`;
} else {
  const centerX = (frameMin.x + frameMax.x) / 2;
  const centerZ = (frameMin.z + frameMax.z) / 2;
  const topTarget = new THREE.Vector3(centerX, 0, centerZ);
  const padding = crop ? 1 : 1.06;
  const topSpanZ = Number.isFinite(frameMax.z) ? frameMax.z - frameMin.z : 46.4;
  const topSpanX = Number.isFinite(frameMax.x) ? frameMax.x - frameMin.x : 46.4;
  const viewHeight = 2 * Math.max(topSpanZ / 2, topSpanX / 2 / aspectOut) * padding;
  camera = makeCamera({
    position: new THREE.Vector3(centerX, 200, centerZ),
    target: topTarget,
    up: new THREE.Vector3(0, 0, -1),
    kind: "ortho",
    aspectOut,
    viewHeight,
    near: 0.1,
    far: 400,
  });
  cameraDescription = `ortho top-down viewHeight ${viewHeight.toFixed(2)} center (${centerX.toFixed(2)}, ${centerZ.toFixed(2)})`;
}

// Fog: main.js applyEnvironment() scales the sampled fog band by focus distance.
// iso keeps the app ortho value (66); the top-down view sits further away, so
// scale by its actual distance or everything would be fully fogged out.
const focusDistance =
  viewName === "iso" ? 66 : camera.pos.distanceTo(target);
const fogScale = Math.min(8, Math.max(1, focusDistance / 66));
const fogNear = env.fogNear * fogScale;
const fogFar = env.fogFar * fogScale;
const fogSrgb = toDisplay(fogColorLinear[0], fogColorLinear[1], fogColorLinear[2], true);

// -------------------------------------------------------------------- rendering
const W = width * scale;
const H = height * scale;
const colorBuf = new Uint8Array(W * H * 3);
const depthBuf = new Float32Array(W * H).fill(-Infinity);

// Background: app sky is a gradient from horizon (fog) to zenith (sky).
{
  const horizon = skyHorizon;
  const zenith = skyZenith;
  const tmp = [0, 0, 0];
  if (camera.kind === "ortho") {
    // Parallel rays: the sky direction is constant across the frame.
    const t = smoothstep(-0.04, 0.62, camera.fwd.y);
    mixLinear(horizon, zenith, t, tmp);
    const r = encode8(tmp[0]);
    const g = encode8(tmp[1]);
    const b = encode8(tmp[2]);
    for (let i = 0; i < W * H; i += 1) {
      colorBuf[i * 3] = r;
      colorBuf[i * 3 + 1] = g;
      colorBuf[i * 3 + 2] = b;
    }
  } else {
    const tanHalf = camera.tanHalf;
    for (let y = 0; y < H; y += 1) {
      const ndcY = 1 - (2 * (y + 0.5)) / H;
      const by = ndcY * tanHalf;
      const rowBase = y * W * 3;
      for (let x = 0; x < W; x += 1) {
        const ndcX = (2 * (x + 0.5)) / W - 1;
        const bx = ndcX * tanHalf * aspectOut;
        const dx = camera.fwd.x + camera.right.x * bx + camera.up.x * by;
        const dy = camera.fwd.y + camera.right.y * bx + camera.up.y * by;
        const dz = camera.fwd.z + camera.right.z * bx + camera.up.z * by;
        const invLen = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);
        const t = smoothstep(-0.04, 0.62, dy * invLen);
        mixLinear(horizon, zenith, t, tmp);
        const o = rowBase + x * 3;
        colorBuf[o] = encode8(tmp[0]);
        colorBuf[o + 1] = encode8(tmp[1]);
        colorBuf[o + 2] = encode8(tmp[2]);
      }
    }
  }
}

const stats = {
  meshes: 0,
  instancedMeshes: 0,
  instances: 0,
  trianglesTotal: 0,
  trianglesDrawn: 0,
  skippedLines: 0,
  skippedTransparent: 0,
  skippedNoGeometry: 0,
  skippedInvalid: 0,
};

// Camera-space scratch polygon (cx, cy, dv) with near/far clipping.
const CLIP_MAX = 64;
const clipAX = new Float64Array(CLIP_MAX);
const clipAY = new Float64Array(CLIP_MAX);
const clipAD = new Float64Array(CLIP_MAX);
const clipBX = new Float64Array(CLIP_MAX);
const clipBY = new Float64Array(CLIP_MAX);
const clipBD = new Float64Array(CLIP_MAX);
const screenX = new Float64Array(CLIP_MAX);
const screenY = new Float64Array(CLIP_MAX);
const screenZ = new Float64Array(CLIP_MAX);

function clipPlane(srcX, srcY, srcD, count, limit, keepGreater, dstX, dstY, dstD) {
  let out = 0;
  for (let i = 0; i < count; i += 1) {
    const j = i + 1 === count ? 0 : i + 1;
    const xi = srcX[i];
    const yi = srcY[i];
    const di = srcD[i];
    const xj = srcX[j];
    const yj = srcY[j];
    const dj = srcD[j];
    const insideI = keepGreater ? di >= limit : di <= limit;
    const insideJ = keepGreater ? dj >= limit : dj <= limit;
    if (insideI) {
      if (out >= CLIP_MAX) break;
      dstX[out] = xi;
      dstY[out] = yi;
      dstD[out] = di;
      out += 1;
    }
    if (insideI !== insideJ) {
      if (out >= CLIP_MAX) break;
      const t = (limit - di) / (dj - di);
      dstX[out] = xi + (xj - xi) * t;
      dstY[out] = yi + (yj - yi) * t;
      dstD[out] = limit;
      out += 1;
    }
  }
  return out;
}

function rasterTriangle(
  x0, y0, z0,
  x1, y1, z1,
  x2, y2, z2,
  cr, cg, cb,
  fogEnabled
) {
  // Ensure a positive signed area so barycentric weights are all >= 0 inside.
  let ax = x0, ay = y0, az = z0;
  let bx = x1, by = y1, bz = z1;
  let cx = x2, cy = y2, cz = z2;
  let area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
  if (!(Math.abs(area) > 1e-9)) return;
  if (area < 0) {
    const tx = bx, ty = by, tz = bz;
    bx = cx; by = cy; bz = cz;
    cx = tx; cy = ty; cz = tz;
    area = -area;
  }
  const invArea = 1 / area;
  let minX = Math.floor(Math.min(ax, bx, cx));
  let maxX = Math.ceil(Math.max(ax, bx, cx));
  let minY = Math.floor(Math.min(ay, by, cy));
  let maxY = Math.ceil(Math.max(ay, by, cy));
  if (minX < 0) minX = 0;
  if (minY < 0) minY = 0;
  if (maxX > W - 1) maxX = W - 1;
  if (maxY > H - 1) maxY = H - 1;
  if (maxX < minX || maxY < minY) return;

  const a0 = by - cy;
  const b0 = cx - bx;
  const c0 = bx * cy - cx * by;
  const a1 = cy - ay;
  const b1 = ax - cx;
  const c1 = cx * ay - ax * cy;

  const persp = camera.kind === "persp";
  const fogRange = fogFar - fogNear;
  const fR = fogSrgb[0];
  const fG = fogSrgb[1];
  const fB = fogSrgb[2];

  for (let y = minY; y <= maxY; y += 1) {
    const py = y + 0.5;
    const rowOffset = y * W;
    for (let x = minX; x <= maxX; x += 1) {
      const px = x + 0.5;
      const w0 = (a0 * px + b0 * py + c0) * invArea;
      if (w0 < 0) continue;
      const w1 = (a1 * px + b1 * py + c1) * invArea;
      if (w1 < 0) continue;
      const w2 = 1 - w0 - w1;
      if (w2 < 0) continue;
      const z = w0 * az + w1 * bz + w2 * cz;
      const at = rowOffset + x;
      if (z <= depthBuf[at]) continue;
      depthBuf[at] = z;
      let r = cr;
      let g = cg;
      let b = cb;
      if (fogEnabled && fogRange > 0) {
        const viewDist = persp ? 1 / z : -z;
        let f = (viewDist - fogNear) / fogRange;
        if (f > 0) {
          if (f > 1) f = 1;
          r += (fR - r) * f;
          g += (fG - g) * f;
          b += (fB - b) * f;
        }
      }
      const o = at * 3;
      colorBuf[o] = r;
      colorBuf[o + 1] = g;
      colorBuf[o + 2] = b;
    }
  }
}

// Shade one face normal using the app's hemisphere + sun + fill + ambient rig.
function shadeFace(style, nx, ny, nz, out) {
  if (style.unlit) {
    out[0] = style.base[0];
    out[1] = style.base[1];
    out[2] = style.base[2];
    return;
  }
  const hemiT = 0.5 + 0.5 * ny;
  const wr = hemiGround[0] + (hemiSky[0] - hemiGround[0]) * hemiT;
  const wg = hemiGround[1] + (hemiSky[1] - hemiGround[1]) * hemiT;
  const wb = hemiGround[2] + (hemiSky[2] - hemiGround[2]) * hemiT;
  const ndotlSun = Math.max(0, nx * sunDir.x + ny * sunDir.y + nz * sunDir.z);
  const ndotlFill = Math.max(0, nx * fillDir.x + ny * fillDir.y + nz * fillDir.z);
  const baseR = style.base[0];
  const baseG = style.base[1];
  const baseB = style.base[2];
  const irrR =
    wr * hemiIntensity +
    ambientColor[0] * ambientIntensity +
    sunColor[0] * sunIntensity * ndotlSun +
    fillColor[0] * fillIntensity * ndotlFill;
  const irrG =
    wg * hemiIntensity +
    ambientColor[1] * ambientIntensity +
    sunColor[1] * sunIntensity * ndotlSun +
    fillColor[1] * fillIntensity * ndotlFill;
  const irrB =
    wb * hemiIntensity +
    ambientColor[2] * ambientIntensity +
    sunColor[2] * sunIntensity * ndotlSun +
    fillColor[2] * fillIntensity * ndotlFill;
  out[0] = baseR * irrR * INV_PI + style.emissive[0];
  out[1] = baseG * irrG * INV_PI + style.emissive[1];
  out[2] = baseB * irrB * INV_PI + style.emissive[2];
}

const SHADE_TMP = [0, 0, 0];

// Fast path that keeps per-triangle work allocation-free.
function drawTriangleWorld(
  style,
  ax, ay, az,
  bx, by, bz,
  cx, cy, cz,
  mwx, mwy, mwz
) {
  // Face normal from world-space vertices.
  const e1x = bx - ax;
  const e1y = by - ay;
  const e1z = bz - az;
  const e2x = cx - ax;
  const e2y = cy - ay;
  const e2z = cz - az;
  let nx = e1y * e2z - e1z * e2y;
  let ny = e1z * e2x - e1x * e2z;
  let nz = e1x * e2y - e1y * e2x;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (!(len > 1e-12)) return;
  const invLen = 1 / len;
  nx *= invLen;
  ny *= invLen;
  nz *= invLen;
  if (nx * camera.fwd.x + ny * camera.fwd.y + nz * camera.fwd.z > 0) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }
  shadeFace(style, nx, ny, nz, SHADE_TMP);
  const display = toDisplay(SHADE_TMP[0], SHADE_TMP[1], SHADE_TMP[2], style.toneMapped);

  // Camera space for the three vertices.
  const rx = camera.right.x, ry = camera.right.y, rz = camera.right.z;
  const ux = camera.up.x, uy = camera.up.y, uz = camera.up.z;
  const fx = camera.fwd.x, fy = camera.fwd.y, fz = camera.fwd.z;
  const px = camera.pos.x, py = camera.pos.y, pz = camera.pos.z;

  const gax = ax - px, gay = ay - py, gaz = az - pz;
  const gbx = bx - px, gby = by - py, gbz = bz - pz;
  const gcx = cx - px, gcy = cy - py, gcz = cz - pz;

  clipAX[0] = gax * rx + gay * ry + gaz * rz;
  clipAY[0] = gax * ux + gay * uy + gaz * uz;
  clipAD[0] = gax * fx + gay * fy + gaz * fz;
  clipAX[1] = gbx * rx + gby * ry + gbz * rz;
  clipAY[1] = gbx * ux + gby * uy + gbz * uz;
  clipAD[1] = gbx * fx + gby * fy + gbz * fz;
  clipAX[2] = gcx * rx + gcy * ry + gcz * rz;
  clipAY[2] = gcx * ux + gcy * uy + gcz * uz;
  clipAD[2] = gcx * fx + gcy * fy + gcz * fz;

  // Near/far clipping in camera space (linear in the projected parameter).
  let count = 3;
  count = clipPlane(clipAX, clipAY, clipAD, count, camera.near, true, clipBX, clipBY, clipBD);
  if (count < 3) return;
  count = clipPlane(clipBX, clipBY, clipBD, count, camera.far, false, clipAX, clipAY, clipAD);
  if (count < 3) return;

  stats.trianglesDrawn += 1;

  // Project and fan-triangulate the clipped polygon.
  const persp = camera.kind === "persp";
  const tanAspect = camera.tanHalf * aspectOut;
  for (let i = 0; i < count; i += 1) {
    const dv = clipAD[i];
    if (persp) {
      const invDv = 1 / dv;
      screenX[i] = ((clipAX[i] * invDv) / tanAspect * 0.5 + 0.5) * W;
      screenY[i] = (0.5 - (clipAY[i] * invDv) / camera.tanHalf * 0.5) * H;
      screenZ[i] = invDv;
    } else {
      screenX[i] = ((clipAX[i] / camera.halfW) * 0.5 + 0.5) * W;
      screenY[i] = (0.5 - (clipAY[i] / camera.halfH) * 0.5) * H;
      screenZ[i] = -dv;
    }
  }
  const fogEnabled = style.fog;
  for (let i = 1; i + 1 < count; i += 1) {
    rasterTriangle(
      screenX[0], screenY[0], screenZ[0],
      screenX[i], screenY[i], screenZ[i],
      screenX[i + 1], screenY[i + 1], screenZ[i + 1],
      display[0], display[1], display[2],
      fogEnabled
    );
  }
}

const matrixScratch = new Float64Array(16);
function multiplyMatrixInstance(target, world, instances, offset) {
  // target = world * instance (both column-major 4x4)
  for (let col = 0; col < 4; col += 1) {
    const i0 = instances[offset + col * 4];
    const i1 = instances[offset + col * 4 + 1];
    const i2 = instances[offset + col * 4 + 2];
    const i3 = instances[offset + col * 4 + 3];
    target[col * 4] = world[0] * i0 + world[4] * i1 + world[8] * i2 + world[12] * i3;
    target[col * 4 + 1] = world[1] * i0 + world[5] * i1 + world[9] * i2 + world[13] * i3;
    target[col * 4 + 2] = world[2] * i0 + world[6] * i1 + world[10] * i2 + world[14] * i3;
    target[col * 4 + 3] = world[3] * i0 + world[7] * i1 + world[11] * i2 + world[15] * i3;
  }
}

function renderMesh(object, style) {
  const geometry = object.geometry;
  const position = geometry.attributes.position;
  if (!position) {
    stats.skippedNoGeometry += 1;
    return;
  }
  const index = geometry.index;
  const triangleCount = Math.floor((index ? index.count : position.count) / 3);
  if (triangleCount <= 0) return;
  const array = position.array;
  const stride = position.itemSize;
  const indexArray = index ? index.array : null;
  const world = object.matrixWorld.elements;
  if (!world.every(Number.isFinite)) {
    stats.skippedInvalid += 1;
    return;
  }
  const isInstanced = !!object.isInstancedMesh;
  const instanceArray = isInstanced ? object.instanceMatrix.array : null;
  const instanceCount = isInstanced ? object.count : 1;
  stats.trianglesTotal += triangleCount * instanceCount;
  if (isInstanced) {
    stats.instancedMeshes += 1;
    stats.instances += instanceCount;
  } else {
    stats.meshes += 1;
  }
  const matrix = matrixScratch;
  for (let inst = 0; inst < instanceCount; inst += 1) {
    if (isInstanced) multiplyMatrixInstance(matrix, world, instanceArray, inst * 16);
    else matrix.set(world);
    if (!matrix.every(Number.isFinite)) {
      stats.skippedInvalid += 1;
      continue;
    }
    const m0 = matrix[0], m1 = matrix[1], m2 = matrix[2];
    const m4 = matrix[4], m5 = matrix[5], m6 = matrix[6];
    const m8 = matrix[8], m9 = matrix[9], m10 = matrix[10];
    const m12 = matrix[12], m13 = matrix[13], m14 = matrix[14];
    for (let t = 0; t < triangleCount; t += 1) {
      const i0 = indexArray ? indexArray[t * 3] : t * 3;
      const i1 = indexArray ? indexArray[t * 3 + 1] : t * 3 + 1;
      const i2 = indexArray ? indexArray[t * 3 + 2] : t * 3 + 2;
      const p0 = i0 * stride;
      const p1 = i1 * stride;
      const p2 = i2 * stride;
      const x0 = array[p0], y0 = array[p0 + 1], z0 = array[p0 + 2];
      const x1 = array[p1], y1 = array[p1 + 1], z1 = array[p1 + 2];
      const x2 = array[p2], y2 = array[p2 + 1], z2 = array[p2 + 2];
      drawTriangleWorld(
        style,
        m0 * x0 + m4 * y0 + m8 * z0 + m12,
        m1 * x0 + m5 * y0 + m9 * z0 + m13,
        m2 * x0 + m6 * y0 + m10 * z0 + m14,
        m0 * x1 + m4 * y1 + m8 * z1 + m12,
        m1 * x1 + m5 * y1 + m9 * z1 + m13,
        m2 * x1 + m6 * y1 + m10 * z1 + m14,
        m0 * x2 + m4 * y2 + m8 * z2 + m12,
        m1 * x2 + m5 * y2 + m9 * z2 + m13,
        m2 * x2 + m6 * y2 + m10 * z2 + m14
      );
    }
  }
}

const rasterStart = performance.now();
city.group.traverse((object) => {
  if (object.isLineSegments || object.isLine || object.isPoints) {
    stats.skippedLines += 1;
    return;
  }
  if (!object.isMesh) return;
  if (object.visible === false) return;
  const style = styleFor(materialOf(object));
  if (!style) return;
  if (style.skip) {
    stats.skippedTransparent += 1;
    return;
  }
  renderMesh(object, style);
});
const rasterMs = performance.now() - rasterStart;

// ------------------------------------------------------- downsample + write PNG
const outRgb = Buffer.alloc(width * height * 3);
if (scale === 1) {
  outRgb.set(colorBuf);
} else {
  const div = scale * scale;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < scale; sy += 1) {
        let row = ((y * scale + sy) * W + x * scale) * 3;
        for (let sx = 0; sx < scale; sx += 1) {
          r += colorBuf[row];
          g += colorBuf[row + 1];
          b += colorBuf[row + 2];
          row += 3;
        }
      }
      const o = (y * width + x) * 3;
      outRgb[o] = Math.round(r / div);
      outRgb[o + 1] = Math.round(g / div);
      outRgb[o + 2] = Math.round(b / div);
    }
  }
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
writePNG(outPath, width, height, outRgb);
const totalMs = performance.now() - buildStart;

const report = [
  `Pixel Bay software render`,
  `  seed ${seedHex} · view ${viewName} · hour ${hour.toFixed(1)} · ${width}×${height} (scale ${scale})`,
  `  camera ${cameraDescription}`,
  `  bounds x[${frameMin.x.toFixed(2)}, ${frameMax.x.toFixed(2)}] y[${frameMin.y.toFixed(2)}, ${frameMax.y.toFixed(2)}] z[${frameMin.z.toFixed(2)}, ${frameMax.z.toFixed(2)}]`,
  `  buildings ${city.stats.buildings ?? "?"} · districts ${city.stats.districts ?? "?"}`,
  `  drew ${stats.meshes} Mesh + ${stats.instancedMeshes} InstancedMesh (${stats.instances} instances) · ${stats.trianglesDrawn} / ${stats.trianglesTotal} triangles`,
  `  skipped ${stats.skippedLines} Line/Points objects, ${stats.skippedTransparent} transparent objects` +
    (stats.skippedInvalid > 0 ? `, ${stats.skippedInvalid} objects with non-finite transforms (src mid-edit?)` : ""),
  `  build ${buildMs.toFixed(0)} ms · raster ${rasterMs.toFixed(0)} ms · total ${totalMs.toFixed(0)} ms`,
  `  wrote ${path.relative(process.cwd(), outPath)}`,
];
console.log(report.join("\n"));
