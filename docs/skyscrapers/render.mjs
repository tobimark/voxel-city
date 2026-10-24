// Offline software renderer for the catalog showcase models.
// Why: the sandbox blocks Chromium's named-pipe IPC, so headless WebGL is not
// available. three.js geometry still builds fine in Node, so this script
// rasterises the same scene graph that the archive thumbnails use.
//
// Usage:
//   node docs/skyscrapers/render.mjs [--group skyscrapers] [--ids s-empire,...]
//        [--out docs/skyscrapers/before] [--w 420] [--h 760] [--scale 2]
//        [--view 3q|front|side|back] [--seed catalog]
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import * as THREE from "three";
import { ShowcaseKit, createShowcaseModel } from "../../src/showcase-models.js";
import { ASSETS, SKYSCRAPERS } from "../../src/object-catalog.js";

const argv = process.argv.slice(2);
function arg(name, fallback) {
  const index = argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return argv[index + 1] ?? fallback;
}
const outDir = path.resolve(arg("out", "docs/skyscrapers/before"));
const width = Number(arg("w", 420));
const height = Number(arg("h", 760));
const scale = Math.max(1, Number(arg("scale", 2)));
const seed = arg("seed", "catalog");
const viewName = arg("view", "3q");
const ascii = argv.includes("--ascii");
const asciiWidth = Number(arg("ascii-w", 64));
const silhouette = argv.includes("--silhouette");
const cropTop = Number(arg("crop-top", 0));
const ids = (arg("ids", "") || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const group = arg("group", "skyscrapers");

const VIEWS = {
  "3q": [0.88, 0.92, 1.24],
  front: [0, 0.82, 1.65],
  side: [1.65, 0.82, 0],
  back: [-0.72, 0.86, -1.32],
  aerial: [0.7, 1.45, 1.0],
};
const VIEW_DIR = new THREE.Vector3(...VIEWS[viewName] ?? VIEWS["3q"]).normalize();
// Keep the established archive key light orientation.
const LIGHT_A = new THREE.Vector3(-3.2, 5.8, 4.2).normalize();
const LIGHT_B = new THREE.Vector3(4.5, 2.4, 2.2).normalize();
const LIGHT_C = new THREE.Vector3(0.5, 3.4, -4.6).normalize();

const pool = group === "all" ? ASSETS : group === "skyscrapers" ? SKYSCRAPERS : ASSETS.filter((a) => a.group === group);
const assets = ids.length ? pool.filter((asset) => ids.includes(asset.id)) : pool;

// ---------------------------------------------------------------- PNG writer
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
    rgb.copy ? rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3)
      : raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
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

// ------------------------------------------------------------- frame helpers
function frame(box, aspect, padding = 1.07) {
  const center = box.getCenter(new THREE.Vector3());
  const right = new THREE.Vector3().crossVectors(VIEW_DIR, new THREE.Vector3(0, 1, 0));
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const up = new THREE.Vector3().crossVectors(right, VIEW_DIR).normalize();
  let halfWidth = 0;
  let halfHeight = 0;
  const corner = new THREE.Vector3();
  const offset = new THREE.Vector3();
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        corner.set(x, y, z);
        offset.subVectors(corner, center);
        halfWidth = Math.max(halfWidth, Math.abs(offset.dot(right)));
        halfHeight = Math.max(halfHeight, Math.abs(offset.dot(up)));
      }
    }
  }
  const extent = Math.max(halfHeight, halfWidth / aspect, 0.24) * padding;
  return { center, right, up, extent };
}

const ground = new THREE.Color("#0d1726");
const sky = new THREE.Color("#23374f");

function shade(mesh, faceNormal, base) {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  if (!material) return new THREE.Color(0.5, 0.5, 0.5);
  let color;
  if (material.isMeshBasicMaterial) {
    color = base.clone();
  } else {
    const hemi = ground.clone().lerp(sky, 0.5 + 0.5 * faceNormal.y).multiplyScalar(0.62);
    const d1 = Math.max(0, faceNormal.dot(LIGHT_A)) * 0.95;
    const d2 = Math.max(0, faceNormal.dot(LIGHT_B)) * 0.42;
    const d3 = Math.max(0, faceNormal.dot(LIGHT_C)) * 0.3;
    const warm = new THREE.Color("#fff0ce");
    const cool = new THREE.Color("#8fd4df");
    const rim = new THREE.Color("#ffce9b");
    color = base.clone().multiply(hemi);
    color.add(base.clone().multiply(warm).multiplyScalar(d1));
    color.add(base.clone().multiply(cool).multiplyScalar(d2));
    color.add(base.clone().multiply(rim).multiplyScalar(d3));
  }
  if (material.emissive && material.emissiveIntensity > 0) {
    color.add(material.emissive.clone().multiplyScalar(Math.min(1, material.emissiveIntensity)));
  }
  return color;
}

function renderAsset(asset) {
  const kit = new ShowcaseKit();
  const model = createShowcaseModel(asset, { kit, seed });
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  if (box.min.y < 0) {
    model.position.y -= box.min.y;
    model.updateMatrixWorld(true);
    box.setFromObject(model);
  }

  const W = width * scale;
  const H = height * scale;
  const aspect = width / height;
  let viewBox = box;
  if (cropTop > 0 && cropTop < 1) {
    const size = box.getSize(new THREE.Vector3());
    viewBox = new THREE.Box3(
      new THREE.Vector3(box.min.x, box.max.y - size.y * cropTop, box.min.z),
      box.max.clone()
    );
  }
  const cam = frame(viewBox, aspect, 1.07);
  const colorBuf = Buffer.alloc(W * H * 3);
  const depthBuf = new Float32Array(W * H).fill(-Infinity);

  // Background: soft vertical gradient.
  for (let y = 0; y < H; y += 1) {
    const t = y / H;
    const c = new THREE.Color("#101b2b").lerp(new THREE.Color("#060b14"), t).convertLinearToSRGB();
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 3;
      colorBuf[i] = Math.round(Math.min(1, c.r) * 255);
      colorBuf[i + 1] = Math.round(Math.min(1, c.g) * 255);
      colorBuf[i + 2] = Math.round(Math.min(1, c.b) * 255);
    }
  }

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const n = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  let triangles = 0;

  model.traverse((object) => {
    if (!object.isMesh || !object.geometry) return;
    const geometry = object.geometry;
    const position = geometry.attributes?.position;
    if (!position) return;
    const index = geometry.index;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    if (!material) return;
    const base = material.color ? material.color.clone() : new THREE.Color(0.8, 0.8, 0.8);
    const matrix = object.matrixWorld;
    const count = index ? index.count : position.count;
    const getVertex = (i, target) => {
      const at = index ? index.getX(i) : i;
      return target.fromBufferAttribute(position, at).applyMatrix4(matrix);
    };

    for (let i = 0; i < count; i += 3) {
      getVertex(i, vA);
      getVertex(i + 1, vB);
      getVertex(i + 2, vC);
      e1.subVectors(vB, vA);
      e2.subVectors(vC, vA);
      n.crossVectors(e1, e2);
      const len = n.length();
      if (len < 1e-9) continue;
      n.multiplyScalar(1 / len);
      const toward = n.dot(VIEW_DIR);
      if (toward < 0) n.multiplyScalar(-1);
      if (Math.abs(toward) < 1e-4) continue;
      const color = silhouette ? new THREE.Color(0.82, 0.84, 0.86) : shade(object, n, base);
      // Work in linear-sRGB (three.js colour management) and encode for
      // display, matching what the WebGL renderer does.
      const display = silhouette ? color : color.clone().multiplyScalar(1.12).convertLinearToSRGB();

      // Project.
      const proj = (v, out) => {
        const off = new THREE.Vector3().subVectors(v, cam.center);
        out.x = ((off.dot(cam.right) / cam.extent / aspect) * 0.5 + 0.5) * W;
        out.y = (0.5 - (off.dot(cam.up) / cam.extent) * 0.5) * H;
        out.z = off.dot(VIEW_DIR);
        return out;
      };
      const pA = proj(vA, { x: 0, y: 0, z: 0 });
      const pB = proj(vB, { x: 0, y: 0, z: 0 });
      const pC = proj(vC, { x: 0, y: 0, z: 0 });
      const minX = Math.max(0, Math.floor(Math.min(pA.x, pB.x, pC.x)));
      const maxX = Math.min(W - 1, Math.ceil(Math.max(pA.x, pB.x, pC.x)));
      const minY = Math.max(0, Math.floor(Math.min(pA.y, pB.y, pC.y)));
      const maxY = Math.min(H - 1, Math.ceil(Math.max(pA.y, pB.y, pC.y)));
      if (maxX < minX || maxY < minY) continue;
      const area = (pB.x - pA.x) * (pC.y - pA.y) - (pC.x - pA.x) * (pB.y - pA.y);
      if (Math.abs(area) < 1e-9) continue;
      const invArea = 1 / area;
      const cr = Math.round(Math.min(1, Math.max(0, display.r)) * 255);
      const cg = Math.round(Math.min(1, Math.max(0, display.g)) * 255);
      const cb = Math.round(Math.min(1, Math.max(0, display.b)) * 255);
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const px = x + 0.5;
          const py = y + 0.5;
          const w0 = ((pB.x - px) * (pC.y - py) - (pC.x - px) * (pB.y - py)) * invArea;
          if (w0 < 0) continue;
          const w1 = ((pC.x - px) * (pA.y - py) - (pA.x - px) * (pC.y - py)) * invArea;
          if (w1 < 0) continue;
          const w2 = 1 - w0 - w1;
          if (w2 < 0) continue;
          const depth = w0 * pA.z + w1 * pB.z + w2 * pC.z;
          const at = y * W + x;
          if (depth <= depthBuf[at]) continue;
          depthBuf[at] = depth;
          const o = at * 3;
          colorBuf[o] = cr;
          colorBuf[o + 1] = cg;
          colorBuf[o + 2] = cb;
        }
      }
      triangles += 1;
    }
  });

  // Box-downsample to the requested resolution.
  const rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const i = ((y * scale + sy) * W + (x * scale + sx)) * 3;
          r += colorBuf[i];
          g += colorBuf[i + 1];
          b += colorBuf[i + 2];
        }
      }
      const o = (y * width + x) * 3;
      const div = scale * scale;
      rgb[o] = Math.round(r / div);
      rgb[o + 1] = Math.round(g / div);
      rgb[o + 2] = Math.round(b / div);
    }
  }

  const file = path.join(outDir, `${asset.id}.png`);
  writePNG(file, width, height, rgb);
  kit.dispose();
  return { file, triangles, rgb };
}

const RAMP = " .:-=+*#%@";
function toAscii(rgb, w, h) {
  const cols = Math.min(asciiWidth, w);
  const rows = Math.max(8, Math.round((h / w) * cols * 0.5));
  const lines = [];
  for (let row = 0; row < rows; row += 1) {
    let line = "";
    for (let col = 0; col < cols; col += 1) {
      // Average a block of pixels for this cell.
      let sum = 0;
      let peak = 0;
      let count = 0;
      const x0 = Math.floor((col / cols) * w);
      const x1 = Math.max(x0 + 1, Math.floor(((col + 1) / cols) * w));
      const y0 = Math.floor((row / rows) * h);
      const y1 = Math.max(y0 + 1, Math.floor(((row + 1) / rows) * h));
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const i = (y * w + x) * 3;
          const luma = (0.2126 * rgb[i] + 0.7152 * rgb[i + 1] + 0.0722 * rgb[i + 2]) / 255;
          sum += luma;
          peak = Math.max(peak, luma);
          count += 1;
        }
      }
      const luma = 0.55 * peak + 0.45 * (sum / Math.max(1, count));
      const level = Math.min(RAMP.length - 1, Math.max(0, Math.round(luma * (RAMP.length - 1) * 1.5 - 0.35)));
      line += RAMP[level];
    }
    lines.push(line.replace(/\s+$/, ""));
  }
  return lines;
}

fs.mkdirSync(outDir, { recursive: true });
const report = [];
for (const asset of assets) {
  const started = Date.now();
  const result = renderAsset(asset);
  report.push({ id: asset.id, name: asset.name, ...result, ms: Date.now() - started });
  if (ascii) {
    console.log(`\n=== ${asset.id} · ${asset.name} · ${asset.model.style} ===`);
    for (const line of toAscii(result.rgb, width, height)) console.log(line);
  }
  if (argv.includes("--stats")) {
    const counts = new Map();
    for (let i = 0; i < result.rgb.length; i += 3) {
      const key = `${(result.rgb[i] >> 4) << 4},${(result.rgb[i + 1] >> 4) << 4},${(result.rgb[i + 2] >> 4) << 4}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const total = result.rgb.length / 3;
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    console.log(`  palette: ${top.map(([key, n]) => `#${key.split(",").map((v) => Number(v).toString(16).padStart(2, "0")).join("")} ${(100 * n / total).toFixed(1)}%`).join("  ")}`);
  }
  console.log(`${asset.id.padEnd(14)} ${String(result.triangles).padStart(7)} tris  ${Date.now() - started}ms  ${path.relative(process.cwd(), result.file)}`);
}
console.log(`\n${report.length} renders → ${path.relative(process.cwd(), outDir)} (${viewName} view, ${width}×${height})`);
