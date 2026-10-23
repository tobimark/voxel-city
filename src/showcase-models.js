import * as THREE from "three";
import { ASSET_BY_ID, BUILDINGS_BY_ID, PARKS_BY_ID } from "./object-catalog.js";

const TAU = Math.PI * 2;
const FLOOR = 0.24;

function hashSeed(value) {
  const text = String(value ?? "pixel-bay");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, list) => list[Math.floor(rng() * list.length) % list.length];
const rand = (rng, min, max) => min + rng() * (max - min);
const randInt = (rng, min, max) => Math.floor(min + rng() * (max - min + 1));

function makeGableGeometry() {
  const positions = [];
  const triangle = (a, b, c) => positions.push(...a, ...b, ...c);
  const quad = (a, b, c, d) => {
    triangle(a, b, c);
    triangle(a, c, d);
  };

  const backLeft = [-0.5, -0.5, -0.5];
  const backRight = [0.5, -0.5, -0.5];
  const frontRight = [0.5, -0.5, 0.5];
  const frontLeft = [-0.5, -0.5, 0.5];
  const ridgeBack = [0, 0.5, -0.5];
  const ridgeFront = [0, 0.5, 0.5];

  quad(backLeft, frontLeft, ridgeFront, ridgeBack);
  quad(frontRight, backRight, ridgeBack, ridgeFront);
  triangle(frontLeft, frontRight, ridgeFront);
  triangle(backRight, backLeft, ridgeBack);
  quad(backLeft, backRight, frontRight, frontLeft);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function makeSailGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0.16, 1, 0], 3)
  );
  geometry.computeVertexNormals();
  return geometry;
}

export class ShowcaseKit {
  constructor() {
    this.disposables = new Set();
    this.materials = new Map();
    this.geometries = new Map();
    this.edgeGeometries = new Map();

    this.boxGeometry = this.track(new THREE.BoxGeometry(1, 1, 1));
    this.cylinderGeometry = this.track(new THREE.CylinderGeometry(0.5, 0.5, 1, 8));
    this.cylinderSmoothGeometry = this.track(new THREE.CylinderGeometry(0.5, 0.5, 1, 16));
    this.coneGeometry = this.track(new THREE.ConeGeometry(0.5, 1, 8));
    this.sphereGeometry = this.track(new THREE.SphereGeometry(0.5, 10, 7));
    this.domeGeometry = this.track(
      new THREE.SphereGeometry(0.5, 12, 6, 0, TAU, 0, Math.PI / 2)
    );
    this.icoGeometry = this.track(new THREE.IcosahedronGeometry(0.5, 0));
    this.gableGeometry = this.track(makeGableGeometry());
    this.pyramidGeometry = this.track(
      new THREE.ConeGeometry(Math.SQRT1_2, 1, 4)
    );
    this.pyramidGeometry.rotateY(Math.PI / 4);
    this.torusGeometry = this.track(new THREE.TorusGeometry(0.5, 0.07, 4, 12));
    this.halfTorusGeometry = this.track(
      new THREE.TorusGeometry(0.5, 0.065, 4, 10, Math.PI)
    );
    this.sailGeometry = this.track(makeSailGeometry());

    this.lineMaterial = this.track(
      new THREE.LineBasicMaterial({
        color: "#172130",
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        toneMapped: false,
      })
    );

    this.darkWindow = this.material("#304956", {
      roughness: 0.38,
      metalness: 0.16,
      emissive: "#0c1a24",
      emissiveIntensity: 0.32,
    });
    this.litWindow = this.material("#ffd79a", {
      roughness: 0.52,
      emissive: "#ffb354",
      emissiveIntensity: 0.62,
    });
    this.door = this.material("#4a4036", { roughness: 0.85 });
    this.trim = this.material("#b8ad96", { roughness: 0.9 });
    this.darkMetal = this.material("#39434c", { roughness: 0.65, metalness: 0.25 });
    this.steel = this.material("#a9b5b4", { roughness: 0.45, metalness: 0.32 });
    this.wood = this.material("#8a6a4d", { roughness: 0.9 });
    this.soil = this.material("#55483b", { roughness: 1 });
    this.stone = this.material("#c7bda6", { roughness: 0.95 });
    this.water = this.material("#74c1c1", {
      roughness: 0.25,
      metalness: 0.12,
      emissive: "#2f7c86",
      emissiveIntensity: 0.12,
    });
    this.grass = this.material("#7c9d59", { roughness: 1 });
    this.path = this.material("#b8a17a", { roughness: 1 });
    this.asphalt = this.material("#3b424e", { roughness: 1 });
  }

  track(resource) {
    this.disposables.add(resource);
    return resource;
  }

  material(color, options = {}) {
    const key = `${color}|${JSON.stringify(options)}`;
    if (!this.materials.has(key)) {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.84,
        metalness: 0,
        flatShading: true,
        ...options,
      });
      this.track(material);
      this.materials.set(key, material);
    }
    return this.materials.get(key);
  }

  basic(color, options = {}) {
    const key = `basic|${color}|${JSON.stringify(options)}`;
    if (!this.materials.has(key)) {
      const material = new THREE.MeshBasicMaterial({
        color,
        toneMapped: false,
        ...options,
      });
      this.track(material);
      this.materials.set(key, material);
    }
    return this.materials.get(key);
  }

  glow(color) {
    return this.basic(color);
  }

  glass(color = "#78aab8", opacity = 0.72) {
    return this.material(color, {
      roughness: 0.25,
      metalness: 0.22,
      transparent: opacity < 1,
      opacity,
      emissive: color,
      emissiveIntensity: 0.06,
    });
  }

  sail(color) {
    return this.material(color, {
      roughness: 0.95,
      side: THREE.DoubleSide,
    });
  }

  resolve(material) {
    return typeof material === "string" ? this.material(material) : material;
  }

  outline(mesh) {
    let edges = this.edgeGeometries.get(mesh.geometry);
    if (!edges) {
      edges = new THREE.EdgesGeometry(mesh.geometry);
      this.track(edges);
      this.edgeGeometries.set(mesh.geometry, edges);
    }
    const lines = new THREE.LineSegments(edges, this.lineMaterial);
    lines.raycast = () => {};
    mesh.add(lines);
    return mesh;
  }

  place(mesh, options = {}) {
    mesh.rotation.set(options.rx ?? 0, options.ry ?? 0, options.rz ?? 0);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    if (options.outline) this.outline(mesh);
    return mesh;
  }

  add(parent, geometry, material, x, y, z, sx, sy, sz, options = {}) {
    const mesh = new THREE.Mesh(geometry, this.resolve(material));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    this.place(mesh, options);
    parent.add(mesh);
    return mesh;
  }

  box(parent, width, height, depth, material, x, y, z, options = {}) {
    return this.add(parent, this.boxGeometry, material, x, y, z, width, height, depth, options);
  }

  mass(parent, options) {
    const {
      width,
      height,
      depth,
      material,
      x = 0,
      y = 0,
      z = 0,
      outline = false,
      ry = 0,
    } = options;
    return this.box(
      parent,
      width,
      height,
      depth,
      material,
      x,
      y + height / 2,
      z,
      { outline, ry }
    );
  }

  cyl(parent, radius, height, material, x, y, z, options = {}) {
    const geometry = options.segments === 16 ? this.cylinderSmoothGeometry : this.cylinderGeometry;
    return this.add(
      parent,
      geometry,
      material,
      x,
      y,
      z,
      radius * 2,
      height,
      radius * 2,
      options
    );
  }

  taper(parent, topRadius, bottomRadius, height, material, x, y, z, options = {}) {
    const key = `${topRadius}|${bottomRadius}|${options.segments ?? 8}`;
    let geometry = this.geometries.get(key);
    if (!geometry) {
      geometry = this.track(
        new THREE.CylinderGeometry(topRadius, bottomRadius, 1, options.segments ?? 8)
      );
      this.geometries.set(key, geometry);
    }
    return this.add(parent, geometry, material, x, y, z, 1, height, 1, options);
  }

  dispose() {
    for (const resource of this.disposables) {
      if (resource && typeof resource.dispose === "function") resource.dispose();
    }
    this.disposables.clear();
    this.materials.clear();
    this.geometries.clear();
    this.edgeGeometries.clear();
  }

  cone(parent, radius, height, material, x, yBase, z, options = {}) {
    return this.add(
      parent,
      this.coneGeometry,
      material,
      x,
      yBase + height / 2,
      z,
      radius * 2,
      height,
      radius * 2,
      options
    );
  }

  pyramid(parent, width, height, depth, material, x, yBase, z, options = {}) {
    return this.add(
      parent,
      this.pyramidGeometry,
      material,
      x,
      yBase + height / 2,
      z,
      width,
      height,
      depth,
      options
    );
  }

  gable(parent, width, height, depth, material, x, yBase, z, options = {}) {
    return this.add(
      parent,
      this.gableGeometry,
      material,
      x,
      yBase + height / 2,
      z,
      width,
      height,
      depth,
      options
    );
  }

  sphere(parent, radius, material, x, y, z, options = {}) {
    const squash = options.squash ?? 1;
    return this.add(
      parent,
      this.sphereGeometry,
      material,
      x,
      y,
      z,
      radius * 2,
      radius * 2 * squash,
      radius * 2,
      options
    );
  }

  ico(parent, radius, material, x, y, z, options = {}) {
    const squash = options.squash ?? 1;
    return this.add(
      parent,
      this.icoGeometry,
      material,
      x,
      y,
      z,
      radius * 2,
      radius * 2 * squash,
      radius * 2,
      options
    );
  }

  dome(parent, radius, material, x, yBase, z, options = {}) {
    return this.add(
      parent,
      this.domeGeometry,
      material,
      x,
      yBase,
      z,
      radius * 2,
      radius * 2,
      radius * 2,
      options
    );
  }

  torus(parent, radius, material, x, y, z, options = {}) {
    return this.add(
      parent,
      this.torusGeometry,
      material,
      x,
      y,
      z,
      radius * 2,
      radius * 2,
      radius * 2,
      options
    );
  }

  rack(parent, radius, material, x, y, z, options = {}) {
    return this.add(
      parent,
      this.halfTorusGeometry,
      material,
      x,
      y,
      z,
      radius * 2,
      radius * 2,
      radius * 2,
      options
    );
  }

  sailMesh(parent, width, height, material, x, yBase, z, ry = 0) {
    return this.add(
      parent,
      this.sailGeometry,
      material,
      x,
      yBase,
      z,
      width,
      height,
      1,
      { ry }
    );
  }
}

function addWindowGrid(kit, group, options) {
  const {
    width,
    depth,
    floors,
    baseY,
    floorH = FLOOR,
    rng,
    litChance = 0.2,
    startFloor = 1,
    sides = ["front", "right"],
    mini = false,
    litMaterial = kit.litWindow,
  } = options;

  const maxFront = mini ? 3 : 6;
  const colsFront = Math.max(2, Math.min(maxFront, Math.round(width / 0.22)));
  const winW = Math.min(0.095, (width / colsFront) * 0.48);
  const winH = Math.min(0.108, floorH * 0.44);
  const depthCols = Math.max(2, Math.min(maxFront, Math.round(depth / 0.22)));

  const floorStep = floors > 44 ? 3 : floors > 24 ? 2 : 1;
  for (let floor = startFloor; floor < floors; floor += floorStep) {
    const y = baseY + floor * floorH + floorH * 0.56;
    if (sides.includes("front")) {
      for (let col = 0; col < colsFront; col += 1) {
        const x = -width / 2 + ((col + 0.5) / colsFront) * width;
        const lit = rng() < litChance;
        kit.box(
          group,
          winW,
          winH,
          0.022,
          lit ? litMaterial : kit.darkWindow,
          x,
          y,
          depth / 2 + 0.012
        );
      }
    }
    if (sides.includes("right")) {
      for (let col = 0; col < depthCols; col += 1) {
        const z = -depth / 2 + ((col + 0.5) / depthCols) * depth;
        const lit = rng() < litChance;
        kit.box(
          group,
          0.022,
          winH,
          winW,
          lit ? litMaterial : kit.darkWindow,
          width / 2 + 0.012,
          y,
          z
        );
      }
    }
  }
}

function addStorefront(kit, group, options) {
  const {
    width,
    depth,
    baseY,
    floorH = FLOOR,
    accent = "#ffd166",
    awning = true,
    awningColor,
    split = 3,
    door = true,
  } = options;
  const glassW = width * 0.62;
  kit.box(
    group,
    glassW,
    floorH * 0.66,
    0.03,
    kit.darkWindow,
    0,
    baseY + floorH * 0.38,
    depth / 2 + 0.018,
    { outline: true }
  );
  kit.box(
    group,
    0.03,
    floorH * 0.66,
    0.03,
    kit.trim,
    -glassW / 2,
    baseY + floorH * 0.38,
    depth / 2 + 0.032
  );
  kit.box(
    group,
    0.03,
    floorH * 0.66,
    0.03,
    kit.trim,
    glassW / 2,
    baseY + floorH * 0.38,
    depth / 2 + 0.032
  );
  if (door) {
    kit.box(
      group,
      Math.min(0.17, width * 0.16),
      floorH * 0.6,
      0.035,
      kit.door,
      glassW / 2 + Math.min(0.12, width * 0.1),
      baseY + floorH * 0.32,
      depth / 2 + 0.025
    );
  }
  if (awning) {
    addAwning(kit, group, {
      width: width * 0.78,
      y: baseY + floorH * 0.8,
      z: depth / 2 + 0.1,
      colorA: awningColor ?? accent,
      stripes: Math.max(3, split),
    });
  }
}

function addAwning(kit, group, options) {
  const {
    width,
    y,
    z,
    colorA,
    colorB = "#f2e7d1",
    stripes = 5,
    depth = 0.2,
    x = 0,
    ry = 0,
  } = options;
  const stripe = width / stripes;
  for (let index = 0; index < stripes; index += 1) {
    kit.box(
      group,
      stripe,
      0.024,
      depth,
      kit.material(index % 2 === 0 ? colorA : colorB, {
        emissive: index % 2 === 0 ? colorA : "#000000",
        emissiveIntensity: index % 2 === 0 ? 0.08 : 0,
        roughness: 0.9,
      }),
      x - width / 2 + stripe * (index + 0.5),
      y,
      z,
      { rx: -0.24, ry }
    );
  }
}

function addSign(kit, group, options) {
  const {
    width,
    height,
    x,
    y,
    z,
    color,
    frame = "#313a44",
    face = "#f8ecd4",
    ry = 0,
    bars = 2,
  } = options;
  const panel = kit.material(color, {
    emissive: color,
    emissiveIntensity: 0.26,
    roughness: 0.55,
  });
  kit.box(group, width + 0.035, height + 0.035, 0.026, kit.material(frame), x, y, z, { ry });
  kit.box(group, width, height, 0.036, panel, x, y, z + 0.008, { ry });
  for (let bar = 0; bar < bars; bar += 1) {
    kit.box(
      group,
      width * (0.42 + bar * 0.16),
      0.015,
      0.042,
      kit.glow(face),
      x,
      y + (bars - 1) * 0.026 - bar * 0.052,
      z + 0.014,
      { ry }
    );
  }
}

function addClockFace(kit, group, options) {
  const { x, y, z, radius = 0.11, face = "front", accent = "#f7ecd2" } = options;
  const rim = kit.material("#3d4148", { roughness: 0.7 });
  const faceMat = kit.material(accent, {
    emissive: "#ffe2a1",
    emissiveIntensity: 0.26,
    roughness: 0.6,
  });
  if (face === "right") {
    kit.cyl(group, radius, 0.03, rim, x, y, z, { rz: Math.PI / 2 });
    kit.cyl(group, radius * 0.82, 0.034, faceMat, x + 0.008, y, z, { rz: Math.PI / 2 });
    kit.box(group, 0.018, radius * 0.5, 0.014, kit.darkMetal, x + 0.028, y + radius * 0.1, z);
    kit.box(group, 0.018, 0.014, radius * 0.42, kit.darkMetal, x + 0.028, y, z + radius * 0.08);
  } else {
    kit.cyl(group, radius, 0.03, rim, x, y, z, { rx: Math.PI / 2 });
    kit.cyl(group, radius * 0.82, 0.034, faceMat, x, y, z + 0.008, { rx: Math.PI / 2 });
    kit.box(group, 0.016, radius * 0.5, 0.014, kit.darkMetal, x, y + radius * 0.1, z + 0.028);
    kit.box(group, radius * 0.42, 0.014, 0.014, kit.darkMetal, x + radius * 0.08, y, z + 0.028);
  }
}

function addTree(kit, parent, options = {}) {
  const {
    x = 0,
    z = 0,
    scale = 1,
    kind = "broadleaf",
    leaf = "#6b9b53",
    leaf2 = "#7eab5c",
    trunk = "#6f4e37",
  } = options;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  parent.add(group);

  const trunkMat = kit.material(trunk, { roughness: 1 });
  const leafMat = kit.material(leaf, { roughness: 0.98 });
  const leafLightMat = kit.material(leaf2, { roughness: 0.98 });

  if (kind === "conifer") {
    kit.cyl(group, 0.045, 0.28, trunkMat, 0, 0.14, 0);
    kit.cone(group, 0.34, 0.5, leafMat, 0, 0.16, 0, { outline: false });
    kit.cone(group, 0.27, 0.44, leafLightMat, 0, 0.4, 0);
    kit.cone(group, 0.18, 0.36, leafMat, 0, 0.62, 0);
    return group;
  }

  if (kind === "palm") {
    kit.cyl(group, 0.05, 0.55, trunkMat, 0, 0.28, 0, { rz: 0.04 });
    for (let frond = 0; frond < 6; frond += 1) {
      const angle = (frond / 6) * TAU;
      const frondGroup = new THREE.Group();
      frondGroup.rotation.y = angle;
      frondGroup.position.y = 0.56;
      group.add(frondGroup);
      kit.box(
        frondGroup,
        0.42,
        0.022,
        0.1,
        frond % 2 === 0 ? leafMat : leafLightMat,
        0.2,
        0.01,
        0,
        { rz: -0.28 }
      );
    }
    return group;
  }

  if (kind === "shrub") {
    kit.ico(group, 0.24, leafMat, -0.1, 0.16, 0, { squash: 0.8 });
    kit.ico(group, 0.2, leafLightMat, 0.12, 0.14, 0.05, { squash: 0.8 });
    kit.ico(group, 0.18, leafMat, 0.02, 0.18, -0.12, { squash: 0.8 });
    return group;
  }

  kit.cyl(group, 0.055, 0.44, trunkMat, 0, 0.22, 0);
  kit.box(group, 0.02, 0.22, 0.02, trunkMat, 0.08, 0.38, 0.01, { rz: -0.5 });
  kit.ico(group, 0.32, leafMat, -0.12, 0.56, 0.02);
  kit.ico(group, 0.28, leafLightMat, 0.15, 0.53, -0.04);
  kit.ico(group, 0.24, leafMat, 0.02, 0.68, 0.1);
  kit.ico(group, 0.2, leafMat, -0.04, 0.46, -0.16);

  if (kind === "cherry") {
    kit.ico(group, 0.28, leafLightMat, -0.16, 0.46, 0.1);
    kit.ico(group, 0.22, leafMat, 0.16, 0.44, 0.12);
  }
  return group;
}

function addBush(kit, parent, x, z, scale = 1, color = "#6e9452") {
  const material = kit.material(color, { roughness: 1 });
  kit.ico(parent, 0.2 * scale, material, x, 0.14 * scale, z, { squash: 0.78 });
  kit.ico(parent, 0.16 * scale, material, x + 0.17 * scale, 0.11 * scale, z + 0.03 * scale, {
    squash: 0.78,
  });
}

function addFlowers(kit, parent, x, z, radius = 0.25, colors = ["#ffd166", "#ef816c", "#f4e4c1"]) {
  const count = 7;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * TAU + index * 0.7;
    const distance = radius * (0.3 + (index % 3) * 0.28);
    const px = x + Math.cos(angle) * distance;
    const pz = z + Math.sin(angle) * distance;
    kit.cyl(parent, 0.012, 0.06, kit.material("#5d7f45"), px, 0.03, pz);
    kit.ico(parent, 0.034, kit.material(colors[index % colors.length]), px, 0.075, pz, {
      squash: 0.8,
    });
  }
}

function addBench(kit, parent, options = {}) {
  const { x = 0, z = 0, ry = 0, y = 0, color = "#6f5541" } = options;
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);
  const woodMat = kit.material(color, { roughness: 0.92 });
  const metalMat = kit.material("#3e3b35", { roughness: 0.7 });
  for (let slat = 0; slat < 3; slat += 1) {
    kit.box(group, 0.74, 0.032, 0.09, woodMat, 0, 0.18, -0.11 + slat * 0.1);
  }
  for (let slat = 0; slat < 2; slat += 1) {
    kit.box(group, 0.74, 0.075, 0.028, woodMat, 0, 0.29 + slat * 0.085, 0.16, {
      rx: -0.16,
    });
  }
  kit.box(group, 0.045, 0.18, 0.32, metalMat, -0.3, 0.09, 0.02);
  kit.box(group, 0.045, 0.18, 0.32, metalMat, 0.3, 0.09, 0.02);
  kit.box(group, 0.045, 0.24, 0.04, metalMat, -0.3, 0.25, 0.16);
  kit.box(group, 0.045, 0.24, 0.04, metalMat, 0.3, 0.25, 0.16);
  return group;
}

function addLamp(kit, parent, options = {}) {
  const {
    x = 0,
    z = 0,
    ry = 0,
    y = 0,
    color = "#3f444a",
    light = "#ffd18a",
    height = 1,
  } = options;
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);
  const poleMat = kit.material(color, { roughness: 0.65, metalness: 0.2 });
  kit.cyl(group, 0.1, 0.04, kit.darkMetal, 0, 0.02, 0);
  kit.cyl(group, 0.028, height * 0.9, poleMat, 0, height * 0.47, 0);
  kit.box(group, 0.2, 0.032, 0.032, poleMat, 0.08, height * 0.92, 0);
  kit.box(group, 0.14, 0.07, 0.12, kit.material(color, { roughness: 0.5 }), 0.18, height * 0.88, 0);
  kit.box(group, 0.11, 0.028, 0.09, kit.glow(light), 0.18, height * 0.845, 0);
  return group;
}

function addPlanter(kit, parent, options = {}) {
  const { x = 0, z = 0, y = 0, width = 0.5, depth = 0.26, color = "#b8ad98" } = options;
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  kit.box(group, width, 0.16, depth, kit.material(color, { roughness: 0.96 }), 0, 0.08, 0, {
    outline: true,
  });
  kit.box(group, width * 0.9, 0.02, depth * 0.82, kit.soil, 0, 0.165, 0);
  addBush(kit, group, -width * 0.2, 0, 0.7, "#6e9452");
  addFlowers(kit, group, width * 0.18, 0, 0.16, ["#e8a0b4", "#ffd166", "#f4e4c1"]);
  return group;
}

function addFountain(kit, parent, options = {}) {
  const { x = 0, z = 0, y = 0, scale = 1, accent = "#72cec0" } = options;
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  parent.add(group);
  kit.cyl(group, 0.46, 0.14, kit.stone, 0, 0.07, 0, { segments: 16 });
  kit.cyl(group, 0.4, 0.15, kit.material("#8b877a", { roughness: 0.9 }), 0, 0.075, 0, {
    segments: 16,
  });
  kit.cyl(group, 0.37, 0.025, kit.water, 0, 0.15, 0, { segments: 16 });
  kit.cyl(group, 0.07, 0.3, kit.stone, 0, 0.3, 0, { segments: 8 });
  kit.cyl(group, 0.18, 0.05, kit.stone, 0, 0.45, 0, { segments: 16 });
  kit.cyl(group, 0.04, 0.16, kit.water, 0, 0.53, 0, { segments: 8 });
  kit.ico(group, 0.04, kit.glow(accent), 0, 0.62, 0, { squash: 1.4 });
  return group;
}

function addCrate(kit, parent, x, y, z, scale = 1, color = "#9a7a55") {
  kit.box(parent, 0.16 * scale, 0.14 * scale, 0.16 * scale, kit.material(color), x, y + 0.07 * scale, z, {
    outline: true,
  });
  kit.box(parent, 0.17 * scale, 0.018 * scale, 0.03 * scale, kit.material("#c9b081"), x, y + 0.07 * scale, z);
}

function addParasol(kit, parent, x, z, color = "#f2e7d1") {
  kit.cyl(parent, 0.012, 0.36, kit.steel, x, 0.18, z);
  kit.cone(parent, 0.18, 0.1, kit.material(color, { roughness: 0.9 }), x, 0.34, z);
}

function addRailing(kit, parent, options) {
  const { width, x = 0, y, z, color = "#aeb7af", depth = 0.02, posts = 3 } = options;
  const material = kit.material(color, { roughness: 0.55, metalness: 0.25 });
  kit.box(parent, width, 0.02, depth, material, x, y + 0.09, z);
  for (let post = 0; post < posts; post += 1) {
    const px = x - width / 2 + (post / (posts - 1)) * width;
    kit.box(parent, 0.018, 0.18, depth, material, px, y + 0.045, z);
  }
}

function addCrossSign(kit, group, x, y, z, color = "#ef6a5b", size = 0.18) {
  const material = kit.material(color, { emissive: color, emissiveIntensity: 0.28, roughness: 0.55 });
  kit.box(group, size, size * 0.32, 0.035, material, x, y, z);
  kit.box(group, size * 0.32, size, 0.035, material, x, y, z);
}

function addPeakedRoof(kit, group, options) {
  const {
    width,
    depth,
    y,
    height = 0.3,
    color,
    ry = 0,
    overhang = 0.12,
    outline = true,
  } = options;
  return kit.gable(
    group,
    width + overhang,
    height,
    depth + overhang,
    kit.material(color),
    0,
    y,
    0,
    { ry, outline }
  );
}

function addTank(kit, group, x, y, z, scale = 1) {
  const tankMat = kit.material("#8c8b80", { roughness: 0.8 });
  kit.cyl(group, 0.12 * scale, 0.26 * scale, tankMat, x, y + 0.13 * scale, z);
  kit.cyl(group, 0.12 * scale, 0.02, kit.darkMetal, x, y + 0.27 * scale, z);
  for (const leg of [-1, 1]) {
    kit.box(group, 0.02, 0.16 * scale, 0.02, kit.darkMetal, x + leg * 0.07 * scale, y + 0.05, z);
    kit.box(group, 0.02, 0.16 * scale, 0.02, kit.darkMetal, x, y + 0.05, z + leg * 0.07 * scale);
  }
}

function buildBuilding(asset, kit, rng, options = {}) {
  const model = asset.model;
  const mini = options.mini === true;
  const width = rand(rng, model.width[0], model.width[1]);
  const depth = rand(rng, model.depth[0], model.depth[1]);
  const floors = Math.max(1, Math.round(rand(rng, model.floors[0], model.floors[1])));
  const style = model.style;
  const wall = pick(rng, model.walls);
  const wallAlt = model.walls[(model.walls.indexOf(wall) + 1) % model.walls.length];
  const roof = model.roof;
  const accent = model.accent;
  const wallMat = kit.material(wall);
  const wallAltMat = kit.material(wallAlt);
  const roofMat = kit.material(roof);
  const accentMat = kit.material(accent, {
    roughness: 0.65,
    emissive: accent,
    emissiveIntensity: 0.12,
  });
  const baseH = 0.06;
  const baseY = baseH;
  const height = floors * FLOOR;
  const top = baseY + height;
  const group = new THREE.Group();

  const plinth = (w = width, d = depth, color = "#928b7b") =>
    kit.box(group, w + 0.14, baseH, d + 0.14, kit.material(color), 0, baseH / 2, 0, {
      outline: true,
    });

  const windows = (extra = {}) =>
    addWindowGrid(kit, group, {
      width,
      depth,
      floors,
      baseY,
      floorH: FLOOR,
      rng,
      mini,
      ...extra,
    });

  const windowsFor = (w, d, count, y, extra = {}) =>
    addWindowGrid(kit, group, {
      width: w,
      depth: d,
      floors: Math.max(1, Math.round(count)),
      baseY: y,
      floorH: FLOOR,
      rng,
      mini,
      ...extra,
    });

  const addChimney = (x, y, z, scale = 1) => {
    kit.box(group, 0.11 * scale, 0.32 * scale, 0.11 * scale, kit.material("#8a5b4a"), x, y + 0.16 * scale, z, {
      outline: true,
    });
    kit.box(group, 0.14 * scale, 0.035 * scale, 0.14 * scale, kit.trim, x, y + 0.335 * scale, z);
  };

  switch (style) {
    case "gable": {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.18 });
      kit.box(group, 0.16, 0.28, 0.03, kit.door, 0, baseY + 0.14, depth / 2 + 0.02);
      kit.box(group, width * 0.42, 0.03, 0.24, kit.trim, 0, baseY + 0.32, depth / 2 + 0.12);
      kit.box(group, 0.025, 0.34, 0.025, kit.trim, -width * 0.17, baseY + 0.17, depth / 2 + 0.23);
      kit.box(group, 0.025, 0.34, 0.025, kit.trim, width * 0.17, baseY + 0.17, depth / 2 + 0.23);
      const roofHeight = 0.26 + depth * 0.14;
      addPeakedRoof(kit, group, {
        width,
        depth,
        y: top,
        height: roofHeight,
        color: roof,
      });
      addChimney(width * 0.29, top + roofHeight * 0.56, -depth * 0.16);
      if (!mini) {
        kit.box(group, width * 0.17, 0.16, 0.16, wallAltMat, -width * 0.2, top + roofHeight * 0.45, depth * 0.24);
        kit.pyramid(group, width * 0.19, 0.09, 0.18, roofMat, -width * 0.2, top + roofHeight * 0.55, depth * 0.24);
        addBush(kit, group, width * 0.34, depth * 0.63, 0.8, "#6e9452");
        addBush(kit, group, -width * 0.4, depth * 0.6, 0.65, "#82a45d");
        addFlowers(kit, group, width * 0.28, depth * 0.64, 0.16);
      }
      break;
    }

    case "townhouse": {
      plinth(width + 0.04, depth + 0.04);
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.25, startFloor: 1 });
      kit.box(group, width + 0.15, 0.06, depth + 0.15, roofMat, 0, top + 0.03, 0, { outline: true });
      kit.pyramid(group, width * 0.94, 0.16, depth * 0.94, roofMat, 0, top + 0.06, 0);
      addChimney(-width * 0.3, top + 0.16, -depth * 0.2, 0.9);
      addChimney(width * 0.32, top + 0.16, -depth * 0.18, 0.8);
      const bayY = baseY + FLOOR * 0.95;
      kit.box(group, width * 0.48, FLOOR * 0.72, 0.09, wallAltMat, 0, bayY + FLOOR * 0.3, depth / 2 + 0.1, {
        outline: true,
      });
      kit.box(group, width * 0.38, FLOOR * 0.5, 0.02, kit.darkWindow, 0, bayY + FLOOR * 0.32, depth / 2 + 0.152);
      kit.box(group, width * 0.55, 0.04, 0.16, kit.trim, 0, bayY + FLOOR * 0.1, depth / 2 + 0.12);
      kit.box(group, 0.16, 0.3, 0.03, kit.door, 0, baseY + 0.15, depth / 2 + 0.02);
      for (let step = 0; step < 3; step += 1) {
        kit.box(group, 0.24 + step * 0.035, 0.026, 0.08, kit.trim, 0, baseY - 0.012 + step * 0.024, depth / 2 + 0.12 + step * 0.05, {
          outline: false,
        });
      }
      for (let floor = 1; floor < floors; floor += 1) {
        kit.box(
          group,
          width * 0.34,
          0.035,
          0.08,
          accentMat,
          -width * 0.26,
          baseY + floor * FLOOR + 0.11,
          depth / 2 + 0.04
        );
      }
      break;
    }

    case "courtyard": {
      plinth(width + 0.04, depth + 0.04);
      const wingWidth = width * 0.27;
      const wingDepth = depth * 0.7;
      const wingHeight = Math.max(0.28, height * 0.72);
      const wingZ = -depth * 0.08;
      for (const side of [-1, 1]) {
        const wing = new THREE.Group();
        wing.position.set(side * (width / 2 - wingWidth / 2), 0, wingZ);
        group.add(wing);
        kit.box(wing, wingWidth, wingHeight, wingDepth, wallAltMat, 0, baseY + wingHeight / 2, 0, {
          outline: true,
        });
        addWindowGrid(kit, wing, {
          width: wingWidth,
          depth: wingDepth,
          floors: Math.max(1, Math.round(wingHeight / FLOOR)),
          baseY,
          rng,
          mini,
          litChance: 0.2,
          sides: ["front", "right"],
        });
        addPeakedRoof(kit, wing, {
          width: wingWidth,
          depth: wingDepth,
          y: baseY + wingHeight,
          height: 0.2,
          color: roof,
        });
      }
      const backHeight = wingHeight * 0.86;
      const back = new THREE.Group();
      back.position.set(0, 0, -depth / 2 + depth * 0.13);
      group.add(back);
      kit.box(back, width, backHeight, depth * 0.26, wallMat, 0, baseY + backHeight / 2, 0, {
        outline: true,
      });
      addWindowGrid(kit, back, {
        width,
        depth: depth * 0.26,
        floors: Math.max(1, Math.round(backHeight / FLOOR)),
        baseY,
        rng,
        mini,
        litChance: 0.18,
        sides: ["front"],
      });
      kit.gable(back, depth * 0.32, 0.2, width + 0.12, roofMat, 0, baseY + backHeight, 0, {
        ry: Math.PI / 2,
        outline: true,
      });
      kit.box(group, width * 0.58, 0.018, depth * 0.44, kit.path, 0, baseY + 0.01, depth * 0.07);
      kit.box(group, width * 0.34, 0.27, 0.07, wallAltMat, 0, baseY + 0.135, depth / 2 - 0.02);
      kit.box(group, 0.16, 0.3, 0.03, kit.door, 0, baseY + 0.15, depth / 2 + 0.02);
      kit.box(group, 0.2, 0.06, 0.16, roofMat, 0, baseY + 0.3, depth / 2 + 0.02);
      kit.box(group, 0.06, 0.36, 0.06, roofMat, -width * 0.12, baseY + 0.2, depth / 2 - 0.01);
      kit.box(group, 0.06, 0.36, 0.06, roofMat, width * 0.12, baseY + 0.2, depth / 2 - 0.01);
      addTree(kit, group, { x: 0, z: 0.02, scale: 0.48, kind: "broadleaf", leaf: "#6b9b53" });
      if (!mini) {
        kit.cyl(group, 0.08, 0.16, kit.stone, -width * 0.17, baseY + 0.08, -depth * 0.02);
        kit.cyl(group, 0.06, 0.02, kit.water, -width * 0.17, baseY + 0.17, -depth * 0.02);
      }
      break;
    }

    case "apartment": {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.26 });
      for (let floor = 1; floor < floors; floor += 2) {
        const y = baseY + floor * FLOOR;
        kit.box(group, width * 0.72, 0.035, 0.16, kit.trim, 0, y + 0.1, depth / 2 + 0.09);
        addRailing(kit, group, {
          width: width * 0.72,
          y: y + 0.09,
          z: depth / 2 + 0.16,
          posts: 4,
          color: "#c9c2ad",
        });
        kit.box(group, 0.14, 0.15, 0.018, kit.door, -width * 0.2, y + 0.17, depth / 2 + 0.012);
        kit.box(group, 0.14, 0.15, 0.018, kit.door, width * 0.2, y + 0.17, depth / 2 + 0.012);
      }
      kit.box(group, width + 0.08, 0.04, depth + 0.08, roofMat, 0, top + 0.02, 0);
      addTank(kit, group, -width * 0.24, top + 0.03, -depth * 0.2, 0.85);
      kit.box(group, width * 0.34, 0.08, depth * 0.2, kit.soil, width * 0.18, top + 0.06, depth * 0.16);
      addBush(kit, group, width * 0.14, depth * 0.17, 0.8, "#6e9452");
      addFlowers(kit, group, width * 0.22, depth * 0.17, 0.12);
      if (floors > 3) {
        kit.box(group, 0.018, 0.5, 0.018, kit.darkMetal, width * 0.24, top + 0.28, -depth * 0.12);
      }
      addStorefront(kit, group, { width, depth, baseY, accent, awning: false });
      break;
    }

    case "apartmentTall": {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.22 });
      for (let floor = 1; floor < floors; floor += 1) {
        for (const side of [-1, 1]) {
          const x = side * width * 0.26;
          const y = baseY + floor * FLOOR;
          kit.box(group, width * 0.3, 0.026, 0.13, kit.trim, x, y + 0.07, depth / 2 + 0.075);
          addRailing(kit, group, {
            width: width * 0.3,
            x,
            y: y + 0.06,
            z: depth / 2 + 0.13,
            posts: 2,
            color: "#c4c9c0",
          });
        }
      }
      kit.box(group, width + 0.08, 0.05, depth + 0.08, roofMat, 0, top + 0.025, 0, { outline: true });
      addTree(kit, group, { x: -width * 0.24, z: 0.08, scale: 0.42, kind: "broadleaf", leaf: "#6e9452" });
      addTree(kit, group, { x: width * 0.2, z: 0.12, scale: 0.34, kind: "shrub", leaf: "#82a45d" });
      kit.box(group, 0.02, 0.62, 0.02, kit.darkMetal, 0, top + 0.36, 0);
      kit.box(group, 0.05, 0.05, 0.05, kit.glow("#ff8178"), 0, top + 0.68, 0);
      addStorefront(kit, group, { width, depth, baseY, accent, awning: false, door: true });
      break;
    }

    case "cafe": {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.3, startFloor: 1 });
      addStorefront(kit, group, {
        width,
        depth,
        baseY,
        accent,
        awning: true,
        awningColor: accent,
        split: 5,
      });
      addSign(kit, group, {
        width: width * 0.3,
        height: 0.15,
        x: width * 0.3,
        y: baseY + FLOOR * 1.42,
        z: depth / 2 + 0.05,
        color: accent,
      });
      kit.box(group, 0.04, 0.28, 0.04, kit.darkMetal, width * 0.34, baseY + FLOOR * 1.2, depth / 2 + 0.12);
      addSign(kit, group, {
        width: 0.16,
        height: 0.12,
        x: width * 0.34,
        y: baseY + FLOOR * 1.12,
        z: depth / 2 + 0.16,
        color: "#f4e4c1",
        frame: accent,
        bars: 1,
      });
      if (!mini) {
        kit.cyl(group, 0.045, 0.05, kit.trim, -width * 0.25, 0.42, depth / 2 + 0.3);
        kit.cyl(group, 0.022, 0.28, kit.darkMetal, -width * 0.25, 0.2, depth / 2 + 0.3);
        kit.cyl(group, 0.04, 0.03, kit.trim, width * 0.16, 0.36, depth / 2 + 0.3);
        kit.cyl(group, 0.018, 0.25, kit.darkMetal, width * 0.16, 0.18, depth / 2 + 0.3);
        addPlanter(kit, group, { x: -width * 0.38, z: depth / 2 + 0.06, width: 0.32, depth: 0.14 });
      }
      break;
    }

    case "bookshop": {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.24, startFloor: 2 });
      kit.box(group, width * 0.56, FLOOR * 0.74, 0.09, wallAltMat, 0, baseY + FLOOR * 1.38, depth / 2 + 0.06, {
        outline: true,
      });
      kit.box(group, width * 0.44, FLOOR * 0.46, 0.022, kit.darkWindow, 0, baseY + FLOOR * 1.4, depth / 2 + 0.112);
      addAwning(kit, group, {
        width: width * 0.72,
        y: baseY + FLOOR * 0.86,
        z: depth / 2 + 0.1,
        colorA: accent,
        colorB: "#e6d9bd",
        stripes: 4,
      });
      addSign(kit, group, {
        width: width * 0.5,
        height: 0.13,
        x: 0,
        y: baseY + FLOOR * 1.02,
        z: depth / 2 + 0.02,
        color: accent,
        frame: "#4b4237",
      });
      kit.box(group, 0.17, 0.28, 0.03, kit.door, width * 0.18, baseY + 0.14, depth / 2 + 0.02);
      if (!mini) {
        addCrate(kit, group, -width * 0.42, 0.05, depth / 2 + 0.22, 1.05, "#86684a");
        for (let book = 0; book < 4; book += 1) {
          kit.box(
            group,
            0.045,
            0.06,
            0.1,
            kit.material(["#d86b5a", "#6e9e8e", "#e4c377", "#7c88a8"][book]),
            -width * 0.42 - 0.05 + book * 0.045,
            0.21,
            depth / 2 + 0.22
          );
        }
      }
      break;
    }

    case "market": {
      plinth(width + 0.06, depth + 0.06);
      const hallHeight = Math.max(0.32, height * 0.66);
      kit.box(group, width * 0.92, hallHeight, depth * 0.78, wallMat, 0, baseY + hallHeight / 2, 0, {
        outline: true,
      });
      kit.box(group, width * 0.92, 0.04, depth * 0.8, kit.trim, 0, baseY + hallHeight + 0.02, 0);
      const glassRoof = kit.glass("#8fc8b0", 0.62);
      kit.gable(group, width * 0.92, 0.28, depth * 0.84, glassRoof, 0, baseY + hallHeight + 0.04, 0, {
        outline: true,
      });
      for (let truss = -2; truss <= 2; truss += 1) {
        const x = (truss / 5) * width * 0.86;
        kit.box(group, 0.022, 0.28, 0.035, accentMat, x, baseY + hallHeight + 0.18, -depth * 0.06, {
          rz: truss % 2 === 0 ? 0.62 : 0.62,
        });
      }
      addClockFace(kit, group, {
        x: 0,
        y: baseY + hallHeight + 0.14,
        z: depth * 0.42 + 0.02,
        radius: 0.09,
      });
      for (let stall = 0; stall < 3; stall += 1) {
        const x = (stall - 1) * width * 0.26;
        kit.box(group, width * 0.19, 0.12, 0.16, kit.wood, x, baseY + 0.06, depth * 0.36);
        addAwning(kit, group, {
          width: width * 0.2,
          y: baseY + 0.26,
          z: depth * 0.36,
          colorA: stall === 1 ? "#e36f5f" : accent,
          colorB: "#f3e6cc",
          stripes: 3,
          depth: 0.15,
        });
        kit.box(group, 0.018, 0.2, 0.018, kit.darkMetal, x - width * 0.08, baseY + 0.13, depth * 0.36 + 0.06);
        kit.box(group, 0.018, 0.2, 0.018, kit.darkMetal, x + width * 0.08, baseY + 0.13, depth * 0.36 + 0.06);
      }
      kit.box(group, width * 0.98, 0.02, 0.34, kit.trim, 0, baseY + 0.01, depth * 0.4);
      break;
    }

    case "department": {
      plinth();
      const lowerHeight = Math.max(0.5, height * 0.7);
      kit.box(group, width, lowerHeight, depth, wallMat, 0, baseY + lowerHeight / 2, 0, { outline: true });
      windowsFor(width, depth, Math.round(lowerHeight / FLOOR), baseY, { litChance: 0.3, startFloor: 1 });
      if (floors >= 4) {
        const upperHeight = height - lowerHeight;
        kit.box(group, width * 0.82, upperHeight, depth * 0.82, wallAltMat, 0, baseY + lowerHeight + upperHeight / 2, 0, {
          outline: true,
        });
        windowsFor(width * 0.82, depth * 0.82, Math.max(1, Math.round(upperHeight / FLOOR)), baseY + lowerHeight, {
          litChance: 0.26,
          startFloor: 0,
        });
        kit.box(group, width * 0.88, 0.05, depth * 0.88, roofMat, 0, baseY + height + 0.025, 0);
      } else {
        kit.box(group, width + 0.1, 0.06, depth + 0.1, roofMat, 0, top + 0.03, 0, { outline: true });
      }
      kit.box(group, width + 0.08, 0.04, depth + 0.08, kit.trim, 0, baseY + lowerHeight - 0.02, 0);
      addStorefront(kit, group, {
        width,
        depth,
        baseY,
        accent,
        awning: false,
        split: 4,
      });
      for (let fin = -2; fin <= 2; fin += 1) {
        kit.box(group, 0.035, lowerHeight * 0.78, 0.03, accentMat, (fin / 2.4) * width * 0.42, baseY + lowerHeight * 0.46, depth / 2 + 0.03);
      }
      kit.box(group, 0.026, 0.42, 0.026, kit.darkMetal, -width * 0.26, top + 0.24, -depth * 0.1);
      kit.box(group, 0.026, 0.42, 0.026, kit.darkMetal, width * 0.26, top + 0.24, -depth * 0.1);
      addSign(kit, group, {
        width: width * 0.5,
        height: 0.2,
        x: 0,
        y: top + 0.2,
        z: depth * 0.34,
        color: accent,
        bars: 2,
      });
      break;
    }

    case "office": {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.3 });
      for (let floor = 2; floor < floors; floor += 2) {
        kit.box(group, width + 0.03, 0.025, depth + 0.03, kit.trim, 0, baseY + floor * FLOOR, 0);
      }
      kit.box(group, width * 0.52, FLOOR * 0.78, 0.03, kit.darkWindow, 0, baseY + FLOOR * 0.4, depth / 2 + 0.02);
      kit.box(group, width * 0.58, 0.04, 0.22, accentMat, 0, baseY + FLOOR * 0.84, depth / 2 + 0.12);
      kit.box(group, width + 0.06, 0.04, depth + 0.06, roofMat, 0, top + 0.02, 0);
      addTank(kit, group, -width * 0.22, top + 0.04, -depth * 0.2, 0.9);
      addTree(kit, group, { x: width * 0.2, z: depth * 0.14, scale: 0.35, kind: "shrub", leaf: "#6e9452" });
      if (!mini) {
        addParasol(kit, group, width * 0.32, depth / 2 + 0.32, "#efe2c9");
        addParasol(kit, group, width * 0.16, depth / 2 + 0.38, "#e8a0b4");
        addBench(kit, group, { x: -width * 0.26, z: depth / 2 + 0.28 });
      }
      break;
    }

    case "glass": {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      const facadeGlass = kit.glass("#8fbcc6", 0.84);
      kit.box(group, width * 0.97, height * 0.88, 0.028, facadeGlass, 0, baseY + height * 0.46, depth / 2 + 0.015);
      kit.box(group, 0.028, height * 0.88, depth * 0.97, facadeGlass, width / 2 + 0.015, baseY + height * 0.46, 0);
      const mullionMat = kit.material(accent, { metalness: 0.2, roughness: 0.5 });
      for (let col = 0; col <= 4; col += 1) {
        const x = -width * 0.47 + (col / 4) * width * 0.94;
        kit.box(group, 0.022, height * 0.88, 0.04, mullionMat, x, baseY + height * 0.46, depth / 2 + 0.04);
      }
      for (let row = 1; row < 6; row += 1) {
        kit.box(group, width * 0.97, 0.016, 0.04, kit.trim, 0, baseY + (row / 6) * height * 0.88, depth / 2 + 0.04);
      }
      kit.box(group, width * 0.82, 0.16, depth * 0.82, wallAltMat, 0, top + 0.08, 0, { outline: true });
      kit.box(group, width * 0.86, 0.035, depth * 0.86, kit.glow(accent), 0, top + 0.17, 0);
      kit.box(group, 0.022, 0.55, 0.022, kit.darkMetal, 0, top + 0.44, 0);
      kit.box(group, width * 0.5, FLOOR * 0.8, 0.025, kit.darkWindow, 0, baseY + FLOOR * 0.4, depth / 2 + 0.03);
      break;
    }

    case "stepped": {
      plinth();
      const tiers = [
        { w: width, d: depth, h: height * 0.48, y: baseY, color: wallMat },
        { w: width * 0.8, d: depth * 0.8, h: height * 0.32, y: baseY + height * 0.48, color: wallAltMat },
        { w: width * 0.6, d: depth * 0.6, h: height * 0.2, y: baseY + height * 0.8, color: wallMat },
      ];
      tiers.forEach((tier, index) => {
        kit.box(group, tier.w, tier.h, tier.d, tier.color, 0, tier.y + tier.h / 2, 0, { outline: true });
        addWindowGrid(kit, group, {
          width: tier.w,
          depth: tier.d,
          floors: Math.max(1, Math.round(tier.h / FLOOR)),
          baseY: tier.y,
          rng,
          mini,
          litChance: 0.24,
          startFloor: 0,
        });
        kit.box(group, tier.w + 0.08, 0.035, tier.d + 0.08, kit.trim, 0, tier.y + tier.h + 0.018, 0);
        if (index < 2) {
          for (const side of [-1, 1]) {
            addBush(
              kit,
              group,
              side * tier.w * 0.3,
              tier.d * 0.36,
              0.9,
              index === 0 ? "#6e9452" : "#82a45d"
            );
          }
          addPlanter(kit, group, {
            x: -tier.w * 0.3,
            z: tier.d * 0.3,
            y: tier.y + tier.h + 0.04,
            width: tier.w * 0.22,
            depth: 0.16,
          });
        }
      });
      const crownY = baseY + height;
      kit.box(group, width * 0.45, 0.06, depth * 0.45, kit.glow(accent), 0, crownY + 0.03, 0);
      kit.box(group, 0.02, 0.38, 0.02, kit.darkMetal, 0, crownY + 0.24, 0);
      break;
    }

    case "twin": {
      plinth(width + 0.08, depth + 0.08);
      const towerWidth = width * 0.34;
      const towerDepth = depth * 0.82;
      const towerOffset = width * 0.26;
      for (const side of [-1, 1]) {
        const tower = new THREE.Group();
        tower.position.set(side * towerOffset, 0, 0);
        group.add(tower);
        kit.box(tower, towerWidth, height, towerDepth, side < 0 ? wallMat : wallAltMat, 0, baseY + height / 2, 0, {
          outline: true,
        });
        addWindowGrid(kit, tower, {
          width: towerWidth,
          depth: towerDepth,
          floors,
          baseY,
          rng,
          mini,
          litChance: 0.28,
          startFloor: 1,
        });
        kit.box(tower, towerWidth + 0.05, 0.04, towerDepth + 0.05, roofMat, 0, top + 0.02, 0);
        kit.box(tower, 0.018, 0.5, 0.018, kit.darkMetal, 0, top + 0.27, 0);
        kit.box(tower, 0.05, 0.05, 0.05, kit.glow("#ff8178"), 0, top + 0.55, 0);
      }
      const bridgeY = baseY + height * 0.64;
      kit.box(group, towerOffset * 2 - towerWidth + 0.05, 0.14, towerDepth * 0.5, kit.trim, 0, bridgeY, 0, {
        outline: true,
      });
      for (let pane = -2; pane <= 2; pane += 1) {
        kit.box(
          group,
          (towerOffset * 2 - towerWidth) * 0.17,
          0.08,
          0.02,
          kit.litWindow,
          pane * (towerOffset * 2 - towerWidth) * 0.16,
          bridgeY,
          towerDepth * 0.251
        );
      }
      kit.box(group, towerOffset * 2, 0.28, depth * 0.7, wallMat, 0, baseY + 0.14, 0, { outline: true });
      kit.box(group, towerOffset * 2 * 0.72, FLOOR * 0.62, 0.03, kit.darkWindow, 0, baseY + 0.12, depth * 0.35 + 0.02);
      break;
    }

    case "media": {
      plinth();
      const baseHeight = Math.min(height * 0.36, FLOOR * 2.4);
      kit.box(group, width, baseHeight, depth, wallMat, 0, baseY + baseHeight / 2, 0, { outline: true });
      addWindowGrid(kit, group, {
        width,
        depth,
        floors: Math.max(1, Math.round(baseHeight / FLOOR)),
        baseY,
        rng,
        mini,
        litChance: 0.36,
        startFloor: 0,
      });
      const towerWidth = width * 0.74;
      const towerDepth = depth * 0.78;
      const towerHeight = height - baseHeight;
      kit.box(group, towerWidth, towerHeight, towerDepth, wallAltMat, 0, baseY + baseHeight + towerHeight / 2, 0, {
        outline: true,
      });
      addWindowGrid(kit, group, {
        width: towerWidth,
        depth: towerDepth,
        floors: Math.max(1, Math.round(towerHeight / FLOOR)),
        baseY: baseY + baseHeight,
        rng,
        mini,
        litChance: 0.3,
        startFloor: 0,
      });
      kit.box(group, towerWidth + 0.06, 0.04, towerDepth + 0.06, roofMat, 0, top + 0.02, 0);
      addSign(kit, group, {
        width: width * 0.52,
        height: 0.22,
        x: 0,
        y: baseY + baseHeight + 0.18,
        z: depth / 2 + 0.02,
        color: accent,
        bars: 2,
      });
      kit.box(group, 0.022, 0.62, 0.022, kit.darkMetal, 0, top + 0.34, 0);
      kit.box(group, 0.05, 0.05, 0.05, kit.glow("#ff8178"), 0, top + 0.68, 0);
      break;
    }

    case "library": {
      plinth(width + 0.06, depth + 0.06);
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.2, startFloor: 0 });
      const columnHeight = Math.min(height * 0.72, FLOOR * (floors - 0.2));
      for (let column = 0; column < 4; column += 1) {
        const x = -width * 0.33 + (column / 3) * width * 0.66;
        kit.cyl(group, 0.042, columnHeight, kit.trim, x, baseY + columnHeight / 2, depth / 2 + 0.16, {
          segments: 8,
        });
        kit.box(group, 0.12, 0.035, 0.12, kit.trim, x, baseY + columnHeight + 0.02, depth / 2 + 0.16);
        kit.box(group, 0.1, 0.03, 0.1, kit.trim, x, baseY + 0.015, depth / 2 + 0.16);
      }
      kit.box(group, width * 0.76, 0.07, 0.26, kit.trim, 0, baseY + columnHeight + 0.06, depth / 2 + 0.16, {
        outline: true,
      });
      kit.gable(group, width * 0.76, 0.17, 0.26, roofMat, 0, baseY + columnHeight + 0.1, depth / 2 + 0.16, {
        outline: true,
      });
      for (let step = 0; step < 3; step += 1) {
        kit.box(group, width * 0.6 + step * 0.08, 0.03, 0.1, kit.trim, 0, baseY - 0.015 + step * 0.024, depth / 2 + 0.28 + step * 0.07);
      }
      kit.box(group, width + 0.08, 0.06, depth + 0.08, roofMat, 0, top + 0.03, 0, { outline: true });
      kit.cyl(group, 0.12, 0.12, kit.trim, 0, top + 0.12, 0, { segments: 8 });
      kit.dome(group, 0.12, kit.material("#a9bdbb", { roughness: 0.5 }), 0, top + 0.18, 0);
      kit.box(group, 0.018, 0.16, 0.018, kit.darkMetal, 0, top + 0.31, 0);
      addSign(kit, group, {
        width: width * 0.26,
        height: 0.1,
        x: 0,
        y: baseY + columnHeight + 0.12,
        z: depth / 2 + 0.3,
        color: accent,
        bars: 1,
      });
      break;
    }

    case "school": {
      plinth(width + 0.04);
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.26 });
      const towerX = -width * 0.34;
      const towerHeight = height + 0.52;
      kit.box(group, 0.24, towerHeight, 0.24, wallAltMat, towerX, baseY + towerHeight / 2, depth * 0.12, {
        outline: true,
      });
      addClockFace(kit, group, {
        x: towerX,
        y: baseY + towerHeight - 0.17,
        z: depth * 0.12 + 0.13,
        radius: 0.085,
      });
      kit.pyramid(group, 0.3, 0.2, 0.3, roofMat, towerX, baseY + towerHeight, depth * 0.12);
      kit.box(group, width * 0.5, 0.04, 0.2, accentMat, 0, baseY + FLOOR * 0.86, depth / 2 + 0.11);
      kit.box(group, width * 0.34, FLOOR * 0.62, 0.028, kit.darkWindow, 0, baseY + FLOOR * 0.4, depth / 2 + 0.03);
      addSign(kit, group, {
        width: width * 0.18,
        height: 0.1,
        x: width * 0.14,
        y: baseY + FLOOR * 1.02,
        z: depth / 2 + 0.03,
        color: accent,
        bars: 1,
      });
      kit.box(group, 0.014, 0.58, 0.014, kit.steel, width * 0.34, top + 0.29, depth * 0.12);
      kit.box(group, 0.18, 0.1, 0.012, accentMat, width * 0.34 + 0.09, top + 0.52, depth * 0.12);
      kit.box(group, width + 0.06, 0.04, depth + 0.06, roofMat, 0, top + 0.02, 0);
      addBush(kit, group, width * 0.28, depth / 2 + 0.2, 0.85, "#6e9452");
      break;
    }

    case "museum": {
      plinth(width + 0.08, depth + 0.08);
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.18, startFloor: 0 });
      const columnHeight = Math.min(height * 0.68, FLOOR * 2.2);
      for (let column = 0; column < 5; column += 1) {
        const x = -width * 0.34 + (column / 4) * width * 0.68;
        kit.cyl(group, 0.04, columnHeight, kit.trim, x, baseY + columnHeight / 2, depth / 2 + 0.18);
        kit.box(group, 0.11, 0.03, 0.11, kit.trim, x, baseY + columnHeight + 0.015, depth / 2 + 0.18);
      }
      kit.box(group, width * 0.8, 0.08, 0.26, kit.trim, 0, baseY + columnHeight + 0.08, depth / 2 + 0.18, {
        outline: true,
      });
      for (let step = 0; step < 3; step += 1) {
        kit.box(group, width * 0.68 + step * 0.09, 0.03, 0.11, kit.trim, 0, baseY - 0.015 + step * 0.024, depth / 2 + 0.32 + step * 0.06);
      }
      const drumY = top + 0.02;
      kit.cyl(group, width * 0.23, 0.14, wallAltMat, 0, drumY + 0.07, 0, { segments: 16 });
      kit.dome(group, width * 0.25, kit.material("#a9bdbb", { roughness: 0.45 }), 0, drumY + 0.14, 0);
      kit.cyl(group, 0.03, 0.15, kit.darkMetal, 0, drumY + width * 0.25 + 0.1, 0);
      kit.box(group, 0.05, 0.05, 0.05, kit.glow(accent), 0, drumY + width * 0.25 + 0.19, 0);
      kit.box(group, width + 0.06, 0.05, depth + 0.06, roofMat, 0, top + 0.025, 0, { outline: true });
      kit.box(group, 0.16, 0.42, 0.16, kit.stone, width * 0.38, 0.21, depth / 2 + 0.36, { outline: true });
      kit.cyl(group, 0.045, 0.2, kit.material("#6d8178"), width * 0.38, 0.53, depth / 2 + 0.36);
      kit.sphere(group, 0.055, kit.material("#6d8178"), width * 0.38, 0.67, depth / 2 + 0.36);
      break;
    }

    case "clinic": {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.34 });
      addCrossSign(kit, group, 0, baseY + height * 0.7, depth / 2 + 0.02, "#ef6a5b", 0.19);
      kit.box(group, width + 0.06, 0.05, depth + 0.06, roofMat, 0, top + 0.025, 0);
      kit.cyl(group, width * 0.3, 0.025, kit.material("#414b52"), 0, top + 0.06, 0, { segments: 16 });
      kit.torus(group, width * 0.3, kit.material("#e8e2d2"), 0, top + 0.075, 0, {
        rx: Math.PI / 2,
      });
      kit.box(group, 0.14, 0.012, 0.03, kit.glow("#e8e2d2"), -width * 0.05, top + 0.078, 0);
      kit.box(group, 0.14, 0.012, 0.03, kit.glow("#e8e2d2"), width * 0.05, top + 0.078, 0);
      kit.box(group, 0.03, 0.012, 0.14, kit.glow("#e8e2d2"), 0, top + 0.078, 0);
      kit.box(group, width * 0.4, FLOOR * 0.72, 0.05, kit.darkWindow, 0, baseY + FLOOR * 0.4, depth / 2 + 0.02);
      kit.box(group, width * 0.48, 0.04, 0.22, accentMat, 0, baseY + FLOOR * 0.84, depth / 2 + 0.12);
      kit.box(group, 0.18, 0.2, 0.16, kit.material("#d8d4bd"), -width * 0.32, 0.1, depth / 2 + 0.24);
      break;
    }

    case "fire": {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.24, startFloor: 1 });
      const doorWidth = width * 0.34;
      for (const side of [-1, 1]) {
        const x = side * width * 0.22;
        kit.box(group, doorWidth, FLOOR * 0.95, 0.035, kit.material("#8c3f38"), x, baseY + FLOOR * 0.48, depth / 2 + 0.025);
        for (let slat = 0; slat < 4; slat += 1) {
          kit.box(
            group,
            doorWidth * 0.82,
            0.018,
            0.02,
            kit.material("#b9584c"),
            x,
            baseY + 0.08 + slat * 0.05,
            depth / 2 + 0.045
          );
        }
      }
      kit.box(group, doorWidth * 2.35, 0.05, 0.1, accentMat, 0, baseY + FLOOR * 0.99, depth / 2 + 0.04);
      const towerX = width * 0.37;
      const towerHeight = height + 0.42;
      kit.box(group, 0.22, towerHeight, 0.22, wallAltMat, towerX, baseY + towerHeight / 2, -depth * 0.06, {
        outline: true,
      });
      kit.pyramid(group, 0.28, 0.18, 0.28, roofMat, towerX, baseY + towerHeight, -depth * 0.06);
      kit.box(group, 0.05, 0.05, 0.05, kit.glow("#ff8178"), towerX, baseY + towerHeight + 0.2, -depth * 0.06);
      addSign(kit, group, {
        width: width * 0.24,
        height: 0.1,
        x: 0,
        y: baseY + FLOOR * 1.18,
        z: depth / 2 + 0.03,
        color: accent,
        bars: 1,
      });
      kit.cyl(group, 0.03, 0.5, kit.darkMetal, -width * 0.36, 0.25, depth / 2 + 0.2);
      break;
    }

    case "cityhall": {
      plinth(width + 0.08, depth + 0.08);
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.22, startFloor: 0 });
      const columnHeight = Math.min(height * 0.58, FLOOR * 2.4);
      for (let column = 0; column < 6; column += 1) {
        const x = -width * 0.38 + (column / 5) * width * 0.76;
        kit.cyl(group, 0.038, columnHeight, kit.trim, x, baseY + columnHeight / 2, depth / 2 + 0.16);
      }
      kit.box(group, width * 0.76, 0.07, 0.24, kit.trim, 0, baseY + columnHeight + 0.07, depth / 2 + 0.16);
      for (let step = 0; step < 4; step += 1) {
        kit.box(group, width * 0.66 + step * 0.08, 0.028, 0.1, kit.trim, 0, baseY - 0.014 + step * 0.024, depth / 2 + 0.28 + step * 0.06);
      }
      kit.box(group, width + 0.08, 0.05, depth + 0.08, roofMat, 0, top + 0.025, 0, { outline: true });
      const towerWidth = width * 0.3;
      const towerDepth = depth * 0.3;
      const towerHeight = 0.78;
      kit.box(group, towerWidth, towerHeight, towerDepth, wallAltMat, 0, top + towerHeight / 2, 0, { outline: true });
      addClockFace(kit, group, {
        x: 0,
        y: top + towerHeight - 0.19,
        z: towerDepth / 2 + 0.02,
        radius: 0.1,
      });
      addClockFace(kit, group, {
        x: towerWidth / 2 + 0.02,
        y: top + towerHeight - 0.19,
        z: 0,
        radius: 0.1,
        face: "right",
      });
      kit.pyramid(group, towerWidth + 0.08, 0.24, towerDepth + 0.08, roofMat, 0, top + towerHeight, 0);
      kit.box(group, 0.016, 0.4, 0.016, kit.steel, 0, top + towerHeight + 0.34, 0);
      kit.box(group, 0.16, 0.09, 0.012, accentMat, 0.08, top + towerHeight + 0.4, 0);
      kit.box(group, width * 1.15, 0.02, 0.5, kit.material("#c6bca6"), 0, 0.01, depth / 2 + 0.48);
      addFountain(kit, group, { x: 0, z: depth / 2 + 0.5, y: 0.02, scale: 0.32 });
      break;
    }

    case "warehouse": {
      plinth(width + 0.04, depth + 0.04);
      const bodyHeight = Math.max(0.4, height);
      kit.box(group, width, bodyHeight, depth, wallMat, 0, baseY + bodyHeight / 2, 0, { outline: true });
      const teeth = mini ? 3 : 4;
      const toothWidth = width / teeth;
      for (let tooth = 0; tooth < teeth; tooth += 1) {
        const x = -width / 2 + toothWidth * (tooth + 0.5);
        kit.box(group, toothWidth * 0.94, 0.035, depth + 0.1, roofMat, x, baseY + bodyHeight + 0.12, 0, {
          rz: -0.34,
        });
        kit.box(group, 0.02, 0.22, depth + 0.06, kit.darkWindow, x - toothWidth * 0.45, baseY + bodyHeight + 0.11, 0);
      }
      kit.box(group, width, 0.06, depth, wallAltMat, 0, baseY + bodyHeight - 0.02, 0);
      const dock = new THREE.Group();
      dock.position.set(0, 0, depth / 2 + 0.13);
      group.add(dock);
      kit.box(dock, width * 0.82, 0.14, 0.28, kit.trim, 0, 0.07, 0, { outline: true });
      kit.box(dock, width * 0.82, 0.06, 0.16, kit.material("#8a8172"), 0, 0.17, 0.1);
      for (const side of [-1, 1]) {
        kit.box(dock, width * 0.22, FLOOR * 0.7, 0.03, kit.material("#5a6460"), side * width * 0.2, baseY + FLOOR * 0.35, -0.12);
        for (let slat = 0; slat < 3; slat += 1) {
          kit.box(dock, width * 0.18, 0.012, 0.015, kit.material("#79827c"), side * width * 0.2, 0.18 + slat * 0.035, -0.102);
        }
      }
      addSign(kit, group, {
        width: width * 0.2,
        height: 0.11,
        x: width * 0.3,
        y: baseY + bodyHeight - 0.06,
        z: depth / 2 + 0.02,
        color: accent,
        bars: 1,
      });
      if (!mini) {
        addCrate(kit, group, -width * 0.35, 0.02, depth / 2 + 0.38, 1.2);
        addCrate(kit, group, -width * 0.2, 0.02, depth / 2 + 0.38, 0.9, "#86684a");
        addCrate(kit, group, width * 0.36, 0.02, depth / 2 + 0.38, 1);
      }
      break;
    }

    case "workshop": {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.28, startFloor: 1 });
      addPeakedRoof(kit, group, { width, depth, y: top, height: 0.24, color: roof });
      const stackX = width * 0.36;
      const stackBase = top + 0.08;
      kit.taper(group, 0.07, 0.11, 0.6, kit.material("#8e8578"), stackX, stackBase + 0.3, -depth * 0.16);
      kit.cyl(group, 0.075, 0.03, kit.darkMetal, stackX, stackBase + 0.6, -depth * 0.16);
      for (let band = 0; band < 2; band += 1) {
        kit.cyl(group, 0.09 - band * 0.01, 0.02, accentMat, stackX, stackBase + 0.2 + band * 0.2, -depth * 0.16);
      }
      kit.cyl(group, 0.028, 0.45, kit.darkMetal, -width * 0.42, baseY + 0.28, depth * 0.3, { rz: Math.PI / 2 });
      kit.cyl(group, 0.026, 0.42, kit.darkMetal, -width * 0.42, baseY + 0.36, depth * 0.3, { rz: Math.PI / 2 });
      kit.box(group, width * 0.5, FLOOR * 0.55, 0.03, kit.darkWindow, 0, baseY + FLOOR * 0.36, depth / 2 + 0.02);
      addSign(kit, group, {
        width: width * 0.22,
        height: 0.1,
        x: 0,
        y: baseY + FLOOR * 0.98,
        z: depth / 2 + 0.03,
        color: accent,
        bars: 1,
      });
      if (!mini) {
        kit.box(group, 0.7, 0.09, 0.22, kit.material("#b77b52"), width * 0.52, 0.28, depth * 0.35, { rz: 0.2 });
        kit.box(group, 0.5, 0.05, 0.18, kit.material("#e2c58d"), width * 0.52, 0.24, depth * 0.35, { rz: 0.2 });
        addCrate(kit, group, -width * 0.4, 0.02, depth / 2 + 0.18, 1);
      }
      break;
    }

    case "energy": {
      plinth(width + 0.12, depth + 0.12, "#9e9d92");
      const controlHeight = Math.min(0.46, height * 0.8);
      const control = new THREE.Group();
      control.position.set(-width * 0.22, 0, depth * 0.22);
      group.add(control);
      kit.box(control, width * 0.56, controlHeight, depth * 0.4, wallMat, 0, baseY + controlHeight / 2, 0, {
        outline: true,
      });
      addWindowGrid(kit, control, {
        width: width * 0.56,
        depth: depth * 0.4,
        floors: Math.max(1, Math.round(controlHeight / FLOOR)),
        baseY,
        rng,
        mini,
        litChance: 0.4,
        startFloor: 0,
      });
      kit.box(control, width * 0.56 + 0.06, 0.04, depth * 0.4 + 0.06, roofMat, 0, baseY + controlHeight + 0.02, 0);
      const towerValues = [
        { x: -width * 0.2, z: -depth * 0.22, scale: 1 },
        { x: width * 0.26, z: -depth * 0.24, scale: 0.84 },
      ];
      for (const tower of towerValues) {
        const scale = tower.scale;
        const baseRadius = 0.3 * scale;
        const towerHeight = 0.78 * scale;
        const base = baseY;
        kit.taper(group, baseRadius * 0.72, baseRadius, towerHeight * 0.44, kit.material("#b7b2a4"), tower.x, base + towerHeight * 0.22, tower.z, { segments: 12 });
        kit.taper(group, baseRadius * 0.88, baseRadius * 0.72, towerHeight * 0.16, kit.material("#aca79a"), tower.x, base + towerHeight * 0.5, tower.z, { segments: 12 });
        kit.taper(group, baseRadius * 0.78, baseRadius * 0.88, towerHeight * 0.4, kit.material("#b7b2a4"), tower.x, base + towerHeight * 0.78, tower.z, { segments: 12 });
        kit.cyl(group, baseRadius * 0.78, 0.02, kit.trim, tower.x, base + towerHeight + 0.01, tower.z, { segments: 12 });
        kit.box(group, 0.045, 0.045, 0.045, kit.glow("#ff8178"), tower.x, base + towerHeight + 0.08, tower.z);
      }
      for (const side of [-1, 1]) {
        const bx = side * width * 0.32;
        kit.box(group, 0.16, 0.2, 0.18, kit.material("#7e8a86"), bx, 0.18, depth * 0.42, { outline: true });
        for (let fin = 0; fin < 3; fin += 1) {
          kit.box(group, 0.012, 0.14, 0.2, kit.darkMetal, bx - 0.06 + fin * 0.06, 0.18, depth * 0.42);
        }
      }
      kit.cyl(group, 0.025, width * 0.55, kit.darkMetal, 0, 0.32, depth * 0.36, { rz: Math.PI / 2 });
      kit.box(group, width * 0.7, 0.02, 0.02, kit.trim, 0, 0.03, depth * 0.5);
      break;
    }

    case "hotel": {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.34 });
      for (let floor = 1; floor < floors; floor += 1) {
        for (const side of [-1, 1]) {
          const x = side * width * 0.24;
          const y = baseY + floor * FLOOR;
          kit.box(group, width * 0.28, 0.025, 0.14, kit.trim, x, y + 0.09, depth / 2 + 0.08);
          addRailing(kit, group, {
            width: width * 0.28,
            x,
            y: y + 0.09,
            z: depth / 2 + 0.14,
            posts: 2,
            color: "#d0c5ae",
          });
        }
      }
      kit.box(group, width + 0.06, 0.05, depth + 0.06, roofMat, 0, top + 0.025, 0);
      addSign(kit, group, {
        width: width * 0.56,
        height: 0.18,
        x: 0,
        y: top + 0.26,
        z: depth * 0.28,
        color: accent,
        bars: 2,
      });
      kit.box(group, 0.02, 0.28, 0.02, kit.darkMetal, -width * 0.22, top + 0.14, depth * 0.28);
      kit.box(group, 0.02, 0.28, 0.02, kit.darkMetal, width * 0.22, top + 0.14, depth * 0.28);
      if (!mini) {
        kit.box(group, width * 0.4, 0.09, depth * 0.26, kit.material("#cfe4e0"), width * 0.24, top + 0.1, -depth * 0.28);
        kit.box(group, width * 0.32, 0.02, depth * 0.18, kit.water, width * 0.24, top + 0.15, -depth * 0.28);
        addRailing(kit, group, {
          width: width * 0.4,
          x: width * 0.24,
          y: top + 0.12,
          z: -depth * 0.15,
          posts: 3,
          color: "#d8d1bb",
        });
      }
      addStorefront(kit, group, { width, depth, baseY, accent, awning: true, split: 4 });
      break;
    }

    case "cinema": {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.36, startFloor: 2 });
      kit.box(group, width * 0.82, 0.06, 0.34, accentMat, 0, baseY + FLOOR * 0.92, depth / 2 + 0.15, {
        outline: true,
      });
      for (let bulb = 0; bulb < 8; bulb += 1) {
        const x = -width * 0.36 + (bulb / 7) * width * 0.72;
        kit.box(group, 0.035, 0.035, 0.035, kit.glow("#ffe2a1"), x, baseY + FLOOR * 0.86, depth / 2 + 0.31);
      }
      kit.box(group, width * 0.44, FLOOR * 0.7, 0.035, kit.darkWindow, 0, baseY + FLOOR * 0.42, depth / 2 + 0.02);
      kit.box(group, 0.02, FLOOR * 0.66, 0.04, kit.trim, 0, baseY + FLOOR * 0.42, depth / 2 + 0.04);
      kit.box(group, 0.08, 0.5, 0.08, kit.material(accent, { emissive: accent, emissiveIntensity: 0.32 }), width * 0.46, baseY + FLOOR * 1.3, depth / 2 + 0.02);
      kit.box(group, 0.05, 0.42, 0.1, kit.glow(accent), width * 0.46, baseY + FLOOR * 1.3, depth / 2 + 0.08);
      for (const side of [-1, 1]) {
        kit.box(group, 0.24, FLOOR * 0.42, 0.03, kit.darkWindow, side * width * 0.3, baseY + FLOOR * 0.4, depth / 2 + 0.025);
        kit.box(group, 0.26, 0.03, 0.035, accentMat, side * width * 0.3, baseY + FLOOR * 0.62, depth / 2 + 0.03);
      }
      kit.box(group, width * 0.16, 0.22, 0.14, kit.material("#8c5b53"), width * 0.3, 0.11, depth / 2 + 0.26, {
        outline: true,
      });
      kit.box(group, width * 0.14, 0.08, 0.02, kit.glow("#ffdc95"), width * 0.3, 0.17, depth / 2 + 0.332);
      break;
    }

    case "diner": {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.38 });
      kit.box(group, width * 0.7, FLOOR * 0.68, 0.03, kit.darkWindow, 0, baseY + FLOOR * 0.4, depth / 2 + 0.02);
      addAwning(kit, group, {
        width: width * 0.9,
        y: baseY + FLOOR * 0.88,
        z: depth / 2 + 0.11,
        colorA: "#e9f0ed",
        colorB: "#5b8f9a",
        stripes: 6,
      });
      addSign(kit, group, {
        width: width * 0.52,
        height: 0.2,
        x: 0,
        y: top + 0.22,
        z: depth * 0.3,
        color: accent,
        bars: 2,
      });
      kit.box(group, 0.02, 0.22, 0.02, kit.darkMetal, -width * 0.2, top + 0.11, depth * 0.3);
      kit.box(group, 0.02, 0.22, 0.02, kit.darkMetal, width * 0.2, top + 0.11, depth * 0.3);
      kit.box(group, width + 0.06, 0.04, depth + 0.06, roofMat, 0, top + 0.02, 0);
      if (!mini) {
        kit.cyl(group, 0.05, 0.04, kit.trim, -width * 0.24, 0.42, depth / 2 + 0.28);
        kit.cyl(group, 0.02, 0.28, kit.darkMetal, -width * 0.24, 0.21, depth / 2 + 0.28);
        kit.cyl(group, 0.05, 0.04, kit.trim, width * 0.1, 0.38, depth / 2 + 0.33);
        kit.cyl(group, 0.02, 0.25, kit.darkMetal, width * 0.1, 0.19, depth / 2 + 0.33);
        kit.box(group, 0.16, 0.1, 0.02, kit.material("#ef816c", { emissive: "#ef816c", emissiveIntensity: 0.28 }), width * 0.34, baseY + FLOOR * 1.1, depth / 2 + 0.04);
      }
      break;
    }

    case "arcade": {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.24, startFloor: 2 });
      for (const side of [-1, 1]) {
        kit.box(group, 0.035, height * 0.45, 0.04, kit.glow(accent), side * width * 0.34, baseY + height * 0.5, depth / 2 + 0.03);
      }
      kit.box(group, width * 0.52, 0.18, 0.03, kit.material(accent, { emissive: accent, emissiveIntensity: 0.42 }), 0, baseY + FLOOR * 1.62, depth / 2 + 0.03);
      kit.box(group, width * 0.44, 0.02, 0.05, kit.glow("#ffe2a1"), 0, baseY + FLOOR * 1.62, depth / 2 + 0.06);
      kit.box(group, width * 0.74, 0.05, 0.28, accentMat, 0, baseY + FLOOR * 0.88, depth / 2 + 0.14);
      kit.box(group, width * 0.52, FLOOR * 0.66, 0.035, kit.darkWindow, 0, baseY + FLOOR * 0.4, depth / 2 + 0.02);
      for (let cabinet = 0; cabinet < 3; cabinet += 1) {
        const x = (cabinet - 1) * width * 0.22;
        kit.box(group, 0.14, 0.26, 0.12, kit.material("#3b4050"), x, 0.16, depth / 2 + 0.3, { outline: true });
        kit.box(group, 0.09, 0.08, 0.015, kit.glow(cabinet === 1 ? "#ffd166" : "#72cec0"), x, 0.21, depth / 2 + 0.365);
      }
      addSign(kit, group, {
        width: width * 0.3,
        height: 0.14,
        x: -width * 0.3,
        y: top + 0.2,
        z: depth * 0.24,
        color: accent,
        bars: 1,
      });
      break;
    }

    case "clocktower": {
      plinth(width * 0.75, depth * 0.75);
      for (let step = 0; step < 3; step += 1) {
        kit.box(group, width * (0.78 + step * 0.14), 0.025, depth * (0.78 + step * 0.14), kit.trim, 0, 0.012 + step * 0.022, 0);
      }
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      for (let strip = 0; strip < 3; strip += 1) {
        const x = (strip - 1) * width * 0.3;
        kit.box(group, 0.045, height * 0.82, 0.03, accentMat, x, baseY + height * 0.46, depth / 2 + 0.02);
      }
      kit.box(group, 0.16, 0.3, 0.03, kit.door, 0, baseY + 0.15, depth / 2 + 0.02);
      for (let floor = 2; floor < Math.max(3, floors - 2); floor += 2) {
        kit.box(group, 0.07, 0.1, 0.02, kit.darkWindow, -width * 0.18, baseY + floor * FLOOR + 0.1, depth / 2 + 0.02);
        kit.box(group, 0.07, 0.1, 0.02, kit.darkWindow, width * 0.18, baseY + floor * FLOOR + 0.1, depth / 2 + 0.02);
      }
      const clockY = top - 0.34;
      addClockFace(kit, group, { x: 0, y: clockY, z: depth / 2 + 0.025, radius: 0.12 });
      addClockFace(kit, group, {
        x: width / 2 + 0.025,
        y: clockY,
        z: 0,
        radius: 0.12,
        face: "right",
      });
      kit.box(group, width + 0.14, 0.06, depth + 0.14, roofMat, 0, top + 0.03, 0, { outline: true });
      for (const side of [-1, 1]) {
        kit.box(group, 0.035, 0.3, 0.035, kit.trim, side * width * 0.32, top + 0.19, depth * 0.32);
      }
      kit.box(group, width * 0.5, 0.05, depth * 0.5, kit.trim, 0, top + 0.35, 0);
      kit.pyramid(group, width * 0.9, 0.45, depth * 0.9, roofMat, 0, top + 0.36, 0);
      kit.box(group, 0.018, 0.2, 0.018, kit.darkMetal, 0, top + 0.85, 0);
      break;
    }

    case "observation": {
      plinth(width * 0.9, depth * 0.9);
      kit.box(group, width, height * 0.16, depth, wallMat, 0, baseY + height * 0.08, 0, { outline: true });
      const shaftWidth = width * 0.42;
      const shaftDepth = depth * 0.42;
      const shaftHeight = height * 0.74;
      kit.box(group, shaftWidth, shaftHeight, shaftDepth, wallAltMat, 0, baseY + height * 0.16 + shaftHeight / 2, 0, {
        outline: true,
      });
      addWindowGrid(kit, group, {
        width: shaftWidth,
        depth: shaftDepth,
        floors: Math.max(2, Math.round(shaftHeight / FLOOR)),
        baseY: baseY + height * 0.16,
        rng,
        mini,
        litChance: 0.24,
        startFloor: 1,
      });
      kit.box(group, 0.04, shaftHeight * 0.72, 0.04, kit.glow(accent), shaftWidth / 2 + 0.01, baseY + height * 0.16 + shaftHeight * 0.4, depth / 2 * 0.42);
      const saucerY = baseY + height * 0.9;
      kit.cyl(group, width * 0.72, 0.09, kit.material("#59666d"), 0, saucerY, 0, { segments: 16 });
      kit.cyl(group, width * 0.62, 0.13, kit.glass("#8fbcc6", 0.7), 0, saucerY + 0.12, 0, { segments: 16 });
      kit.cyl(group, width * 0.7, 0.04, kit.material("#7d9098"), 0, saucerY + 0.21, 0, { segments: 16 });
      kit.cyl(group, width * 0.56, 0.03, kit.glow(accent), 0, saucerY + 0.24, 0, { segments: 16 });
      kit.box(group, 0.02, 0.42, 0.02, kit.darkMetal, 0, saucerY + 0.42, 0);
      kit.box(group, 0.05, 0.05, 0.05, kit.glow("#ff8178"), 0, saucerY + 0.65, 0);
      kit.cyl(group, width * 0.32, 0.04, accentMat, 0, saucerY - 0.06, 0, { segments: 16 });
      break;
    }

    case "lighthouse": {
      kit.box(group, width * 1.35, 0.06, depth * 1.35, kit.material("#7d837c"), 0, 0.03, 0, { outline: true });
      for (let rock = 0; rock < 5; rock += 1) {
        const angle = (rock / 5) * TAU;
        kit.ico(group, 0.12 + (rock % 2) * 0.04, kit.material("#565b58"), Math.cos(angle) * width * 0.55, 0.07, Math.sin(angle) * depth * 0.55, { squash: 0.6 });
      }
      const towerHeight = Math.max(0.9, height);
      const baseRadius = width * 0.34;
      kit.taper(group, baseRadius * 0.64, baseRadius, towerHeight * 0.2, kit.material("#d76a5a"), 0, 0.06 + towerHeight * 0.1, 0);
      kit.taper(group, baseRadius * 0.6, baseRadius * 0.64, towerHeight * 0.2, kit.material("#ece4d2"), 0, 0.06 + towerHeight * 0.3, 0);
      kit.taper(group, baseRadius * 0.54, baseRadius * 0.6, towerHeight * 0.2, kit.material("#d76a5a"), 0, 0.06 + towerHeight * 0.5, 0);
      kit.taper(group, baseRadius * 0.46, baseRadius * 0.54, towerHeight * 0.2, kit.material("#ece4d2"), 0, 0.06 + towerHeight * 0.7, 0);
      kit.taper(group, baseRadius * 0.44, baseRadius * 0.46, towerHeight * 0.2, kit.material("#d76a5a"), 0, 0.06 + towerHeight * 0.9, 0);
      const galleryY = 0.06 + towerHeight;
      kit.cyl(group, baseRadius * 0.66, 0.05, kit.darkMetal, 0, galleryY + 0.02, 0, { segments: 12 });
      addRailing(kit, group, {
        width: baseRadius * 1.18,
        y: galleryY + 0.04,
        z: 0,
        posts: 4,
        color: "#3d4449",
      });
      kit.cyl(group, baseRadius * 0.42, 0.18, kit.glass("#d9ecd9", 0.8), 0, galleryY + 0.14, 0, { segments: 12 });
      kit.cyl(group, baseRadius * 0.45, 0.02, kit.trim, 0, galleryY + 0.24, 0, { segments: 12 });
      kit.cone(group, baseRadius * 0.55, 0.16, kit.material("#4f5b62"), 0, galleryY + 0.25, 0);
      kit.ico(group, 0.05, kit.glow(accent), 0, galleryY + 0.16, 0);
      kit.box(group, 0.14, 0.26, 0.03, kit.door, 0, 0.06 + 0.13, baseRadius * 0.96);
      break;
    }

    case "skygarden": {
      plinth();
      const coreWidth = width * 0.56;
      const coreDepth = depth * 0.56;
      kit.box(group, coreWidth, height, coreDepth, kit.glass("#8fbcc6", 0.85), 0, baseY + height / 2, 0, {
        outline: true,
      });
      for (let floor = 1; floor < floors; floor += 2) {
        const terraceY = baseY + floor * FLOOR;
        const spread = width * (0.55 + Math.min(0.35, floor / floors * 0.4));
        kit.box(group, spread, 0.03, depth * 0.55, kit.trim, 0, terraceY, 0);
        kit.box(group, spread * 0.9, 0.05, depth * 0.42, kit.material("#6d8f5c"), 0, terraceY + 0.035, depth * 0.06);
        kit.box(group, spread * 0.94, 0.06, 0.04, kit.glass("#a9cbb0", 0.68), 0, terraceY + 0.08, depth * 0.27);
        addTree(kit, group, {
          x: spread * 0.34,
          z: depth * 0.06,
          scale: 0.28,
          kind: "shrub",
          leaf: "#7db265",
        });
        addBush(kit, group, -spread * 0.3, depth * 0.06, 0.65, "#6e9452");
      }
      for (const side of [-1, 1]) {
        kit.box(group, 0.035, height * 0.7, 0.035, kit.material("#78b969", { roughness: 0.9 }), side * coreWidth * 0.48, baseY + height * 0.45, coreDepth * 0.5 + 0.02);
      }
      kit.box(group, width * 0.72, 0.05, depth * 0.72, kit.material("#6d8f5c"), 0, top + 0.025, 0);
      addTree(kit, group, { x: width * 0.2, z: 0, scale: 0.4, kind: "broadleaf", leaf: "#7db265" });
      addTree(kit, group, { x: -width * 0.18, z: -depth * 0.12, scale: 0.3, kind: "shrub", leaf: "#8bc56b" });
      kit.box(group, 0.02, 0.35, 0.02, kit.darkMetal, 0, top + 0.18, 0);
      break;
    }

    default: {
      plinth();
      kit.box(group, width, height, depth, wallMat, 0, baseY + height / 2, 0, { outline: true });
      windows({ litChance: 0.25 });
      kit.box(group, width + 0.08, 0.05, depth + 0.08, roofMat, 0, top + 0.025, 0, { outline: true });
      break;
    }
  }

  if (asset.model.features?.includes("roofGarden") && style !== "skygarden") {
    addBush(kit, group, width * 0.24, -depth * 0.18, 0.9, "#6e9452");
  }
  if (mini) group.scale.setScalar(0.96);

  return group;
}

const DISTRICT_SLOTS = {
  downtown: [
    [-0.88, -0.72, 0.18],
    [0.76, -0.84, -0.16],
    [-0.88, 0.56, 0.42],
    [0.78, 0.5, -0.36],
  ],
  oldtown: [
    [-0.94, -0.55, 0.1],
    [-0.05, -0.68, 0.04],
    [0.88, -0.42, -0.2],
    [-0.62, 0.52, 0.46],
  ],
  harbor: [
    [-0.94, -0.66, 0.02],
    [-0.02, -0.86, 0.18],
    [0.62, -0.58, -0.28],
    [-0.58, 0.42, 0.38],
  ],
  creative: [
    [-0.84, -0.66, 0.2],
    [0.8, -0.7, -0.2],
    [-0.82, 0.5, 0.34],
    [0.82, 0.54, -0.32],
  ],
  residential: [
    [-0.86, -0.55, 0.08],
    [0.8, -0.62, -0.18],
    [-0.82, 0.58, 0.3],
    [0.84, 0.54, -0.4],
  ],
  civic: [
    [-0.94, -0.68, 0.04],
    [0.92, -0.62, -0.08],
    [-0.94, 0.42, 0.4],
    [0.92, 0.42, -0.4],
  ],
  academic: [
    [-0.9, -0.7, 0.08],
    [0.12, -0.84, 0.04],
    [0.94, -0.52, -0.22],
    [-0.62, 0.5, 0.5],
  ],
  industrial: [
    [-0.95, -0.62, 0.04],
    [0.1, -0.82, 0.14],
    [0.94, -0.5, -0.2],
    [-0.55, 0.42, 0.42],
  ],
  green: [
    [-0.94, -0.56, 0.08],
    [0.94, -0.48, -0.2],
  ],
  commercial: [
    [-0.96, -0.56, 0.08],
    [-0.08, -0.7, 0.02],
    [0.78, -0.46, -0.22],
    [0.94, 0.46, -0.4],
  ],
};

const DISTRICT_PARKS = {
  downtown: [0.02, 0.1, 0.28],
  oldtown: [0.34, 0.58, 0.26],
  harbor: [-0.36, 0.6, 0.25],
  creative: [0.04, 0.08, 0.24],
  residential: [0.0, 0.1, 0.3],
  civic: [0.0, 0.06, 0.38],
  academic: [0.16, 0.16, 0.34],
  industrial: [0.18, 0.66, 0.23],
  green: [0.0, 0.0, 0.52],
  commercial: [0.02, 0.58, 0.24],
};

const DISTRICT_ROAD = new Set([
  "downtown",
  "oldtown",
  "harbor",
  "creative",
  "civic",
  "industrial",
  "commercial",
]);

function buildDistrict(asset, kit, rng, seed) {
  const model = asset.model;
  const district = model.district;
  const accent = model.accent;
  const group = new THREE.Group();
  const tile = 3.3;

  kit.box(group, tile, 0.12, tile, kit.material(model.ground, { roughness: 1 }), 0, 0.06, 0, {
    outline: true,
  });
  kit.box(group, tile, 0.018, tile, kit.material(model.ground, { roughness: 1 }), 0, 0.129, 0);

  const edgeMat = kit.material("#b7ae99", { roughness: 0.95 });
  for (const side of [-1, 1]) {
    kit.box(group, tile, 0.025, 0.16, edgeMat, 0, 0.14, side * (tile / 2 - 0.08));
    kit.box(group, 0.16, 0.025, tile, edgeMat, side * (tile / 2 - 0.08), 0.14, 0);
  }

  if (DISTRICT_ROAD.has(district)) {
    kit.box(group, tile, 0.02, 0.52, kit.asphalt, 0, 0.14, tile / 2 - 0.38);
    kit.box(group, tile, 0.012, 0.06, kit.material("#c9bda2"), 0, 0.152, tile / 2 - 0.38);
    for (let dash = -2; dash <= 2; dash += 1) {
      kit.box(group, 0.22, 0.012, 0.03, kit.basic("#d8c9a4"), dash * 0.62, 0.153, tile / 2 - 0.38);
    }
    kit.box(group, tile, 0.018, 0.2, kit.material("#c7bca4"), 0, 0.145, tile / 2 - 0.75);
  } else {
    kit.box(group, tile, 0.018, 0.26, kit.path, 0, 0.145, tile / 2 - 0.5);
  }

  if (district === "harbor") {
    kit.box(group, 0.56, 0.03, tile, kit.water, tile / 2 - 0.31, 0.145, 0);
    for (let wave = -2; wave <= 2; wave += 1) {
      kit.box(group, 0.2, 0.008, 0.02, kit.basic("#cfeae1"), tile / 2 - 0.31, 0.165, wave * 0.6);
    }
    for (let plank = -3; plank <= 3; plank += 1) {
      kit.box(group, 0.52, 0.025, 0.1, kit.wood, tile / 2 - 0.46, 0.19, plank * 0.2);
    }
    for (let post = -3; post <= 3; post += 2) {
      kit.cyl(group, 0.022, 0.2, kit.darkMetal, tile / 2 - 0.7, 0.11, post * 0.2);
    }
  }

  if (district === "industrial") {
    for (let pipe = 0; pipe < 3; pipe += 1) {
      kit.cyl(group, 0.024, 0.7, kit.material("#7b817c"), -1.2 + pipe * 0.18, 0.19, -1.2, {
        rz: Math.PI / 2,
      });
    }
  }

  if (district === "construction") {
    const placements = [
      ["c-skeleton", -0.58, -0.1, 0.33, 0.18],
      ["c-crane", 0.62, -0.72, 0.34, -0.22],
      ["c-excavator", 0.6, 0.72, 0.28, -0.45],
      ["c-fence", 0.0, 1.28, 0.3, 0],
    ];
    placements.forEach(([id, x, z, scale, rotation]) => {
      const constructionAsset = ASSET_BY_ID.get(id);
      if (!constructionAsset) return;
      const modelGroup = createShowcaseModel(constructionAsset, {
        kit,
        seed: `${seed ?? ""}:${asset.id}:${id}`,
      });
      modelGroup.scale.setScalar(scale);
      modelGroup.position.set(x, 0.14, z);
      modelGroup.rotation.y = rotation;
      group.add(modelGroup);
    });
    kit.box(group, 1.6, 0.03, 0.26, kit.material("#7f6c54"), 0, 0.145, 0.44);
    return group;
  }

  const samples = (model.samples ?? [])
    .map((id) => ASSET_BY_ID.get(id) ?? BUILDINGS_BY_ID.get(id))
    .filter(Boolean)
    .slice(0, 4);
  const slots = DISTRICT_SLOTS[district] ?? DISTRICT_SLOTS.commercial;

  samples.forEach((buildingAsset, index) => {
    const slot = slots[index % slots.length];
    const buildingSeed = hashSeed(`${seed ?? ""}:${asset.id}:${buildingAsset.id}:${index}`);
    const buildingRng = mulberry32(buildingSeed);
    const mini = buildBuilding(buildingAsset, kit, buildingRng, { mini: true });
    const scale = rand(buildingRng, 0.27, 0.33) * (district === "green" ? 0.9 : 1);
    mini.scale.setScalar(scale);
    mini.position.set(slot[0], 0.14, slot[1]);
    mini.rotation.y = slot[2];
    group.add(mini);
  });

  if (model.parkType) {
    const parkAsset = PARKS_BY_ID.get(model.parkType);
    if (parkAsset) {
      const park = createShowcaseModel(parkAsset, {
        kit,
        seed: `${seed ?? ""}:${asset.id}:park`,
      });
      const placement = DISTRICT_PARKS[district] ?? [0, 0, 0.25];
      park.scale.setScalar(placement[2]);
      park.position.set(placement[0], 0.14, placement[1]);
      group.add(park);
    }
  }

  (model.props ?? []).slice(0, 4).forEach((propId, index) => {
    const propAsset = ASSET_BY_ID.get(propId);
    if (!propAsset) return;
    const prop = createShowcaseModel(propAsset, {
      kit,
      seed: `${seed ?? ""}:${asset.id}:${propId}:${index}`,
    });
    const positions = [
      [-1.22, 1.12],
      [1.14, 1.06],
      [-1.26, -1.15],
      [1.2, -1.15],
    ];
    const position = positions[index % positions.length];
    prop.scale.setScalar(0.3);
    prop.position.set(position[0], 0.14, position[1]);
    prop.rotation.y = (index % 2 === 0 ? 1 : -1) * Math.PI * 0.2;
    group.add(prop);
  });

  const treeKind =
    district === "residential" || district === "green" || district === "academic"
      ? "broadleaf"
      : district === "harbor"
        ? "palm"
        : "broadleaf";
  const treeSpots =
    district === "green"
      ? [
          [-1.1, -0.9],
          [1.05, -0.8],
          [-0.8, 1.0],
          [0.9, 1.06],
          [1.25, 0.1],
        ]
      : [
          [-1.18, 0.3],
          [1.15, -0.25],
        ];
  treeSpots.forEach(([x, z], index) => {
    addTree(kit, group, {
      x,
      z,
      scale: 0.42 + (index % 2) * 0.08,
      kind: treeKind,
      leaf: district === "civic" ? "#7fa866" : "#6b9b53",
      leaf2: district === "civic" ? "#93b76f" : "#7eab5c",
      trunk: "#6f4e37",
    });
  });

  if (district === "downtown") {
    kit.box(group, 0.9, 0.018, 0.9, kit.material("#d9cfb8"), 0, 0.145, 0.1);
    kit.box(group, 0.65, 0.018, 0.65, kit.material("#c9bda4"), 0, 0.15, 0.1);
  }
  if (district === "oldtown") {
    for (let stone = 0; stone < 5; stone += 1) {
      kit.box(group, 0.12, 0.01, 0.18, kit.material("#c9b28d"), -1.0 + stone * 0.5, 0.143, 0.92);
    }
  }
  if (district === "creative") {
    kit.box(group, 0.28, 0.16, 0.04, kit.glow(accent), -0.18, 0.52, 0.8);
    kit.box(group, 0.28, 0.16, 0.04, kit.glow("#72cec0"), 0.18, 0.52, 0.8);
  }
  if (district === "industrial") {
    kit.box(group, 0.16, 0.3, 0.16, kit.material("#7f847d"), 1.24, 0.29, -1.2);
    kit.box(group, 0.1, 0.2, 0.1, kit.material("#6e746f"), 1.24, 0.54, -1.2);
  }
  if (district === "harbor") {
    kit.cyl(group, 0.025, 0.48, kit.darkMetal, 1.3, 0.44, 1.2);
    kit.box(group, 0.12, 0.04, 0.12, kit.glow("#ffd18a"), 1.3, 0.7, 1.2);
  }

  return group;
}

function buildPark(asset, kit, rng) {
  const model = asset.model;
  const accent = model.accent;
  const kind = model.park;
  const size = kind === "pocket" ? 2.0 : 2.6;
  const group = new THREE.Group();

  kit.box(group, size, 0.1, size, kit.material(model.ground, { roughness: 1 }), 0, 0.05, 0, {
    outline: true,
  });
  kit.box(group, size, 0.016, size, kit.material(model.ground, { roughness: 1 }), 0, 0.108, 0);
  const edgeMat = kit.material("#a79e87", { roughness: 0.95 });
  for (const side of [-1, 1]) {
    kit.box(group, size, 0.02, 0.055, edgeMat, 0, 0.118, side * (size / 2 - 0.03));
    kit.box(group, 0.055, 0.02, size, edgeMat, side * (size / 2 - 0.03), 0.118, 0);
  }

  const features = new THREE.Group();
  features.position.y = 0.112;
  group.add(features);

  const addPath = (width, depth, x = 0, z = 0, ry = 0) => {
    kit.box(features, width, 0.012, depth, kit.path, x, 0.006, z, { ry });
  };

  if (kind === "pocket") {
    addPath(0.8, 0.14, 0, 0.3);
    addPath(0.14, 0.42, 0.18, 0.06);
    kit.box(features, 0.32, 0.03, 0.42, kit.material("#6f8f50"), -0.62, 0.02, -0.58);
    addTree(kit, features, { x: -0.5, z: -0.36, scale: 0.62, kind: "broadleaf" });
    addBench(kit, features, { x: 0.34, z: 0.22, ry: 0.25 });
    addBush(kit, features, -0.18, 0.7, 0.75, "#6e9452");
    addBush(kit, features, -0.5, 0.66, 0.68, "#82a45d");
    addFlowers(kit, features, 0.62, -0.35, 0.24);
    addFlowers(kit, features, 0.52, 0.55, 0.18);
    addLamp(kit, features, { x: 0.72, z: -0.68, height: 0.68 });
  } else if (kind === "fountain") {
    addPath(0.34, 2.2);
    addPath(2.2, 0.34);
    addFountain(kit, features, { scale: 0.62, accent, y: 0.008 });
    for (const side of [-1, 1]) {
      addBench(kit, features, { x: side * 0.78, z: 0.1, ry: side < 0 ? Math.PI / 2 : -Math.PI / 2 });
    }
    const treeSpots = [
      [-1.0, -1.0],
      [1.0, -1.0],
      [-1.0, 1.0],
      [1.0, 1.0],
    ];
    treeSpots.forEach(([x, z], index) => {
      addTree(kit, features, { x, z, scale: 0.4 + (index % 2) * 0.06, kind: "broadleaf" });
    });
    addFlowers(kit, features, 0.65, 0.72, 0.22);
    addFlowers(kit, features, -0.62, 0.72, 0.22);
  } else if (kind === "pond") {
    const rim = kit.cyl(features, 0.78, 0.035, kit.material("#9b927d"), 0.1, 0.02, 0.14, {
      segments: 16,
    });
    rim.scale.z *= 0.72;
    const pond = kit.cyl(features, 0.7, 0.03, kit.water, 0.1, 0.04, 0.14, { segments: 16 });
    pond.scale.z *= 0.72;
    kit.box(features, 1.25, 0.035, 0.26, kit.wood, 0.1, 0.12, 0.14);
    for (const side of [-1, 1]) {
      kit.box(features, 1.25, 0.025, 0.02, kit.material("#c9b583"), 0.1, 0.22, 0.14 + side * 0.13);
      for (let post = -2; post <= 2; post += 1) {
        kit.box(features, 0.018, 0.1, 0.018, kit.darkMetal, 0.1 + post * 0.26, 0.17, 0.14 + side * 0.13);
      }
    }
    for (let reed = 0; reed < 8; reed += 1) {
      const angle = (reed / 8) * TAU;
      kit.cyl(
        features,
        0.008,
        0.16 + (reed % 3) * 0.04,
        kit.material("#6f8f50"),
        0.1 + Math.cos(angle) * 0.64,
        0.1,
        0.14 + Math.sin(angle) * 0.46
      );
    }
    addTree(kit, features, { x: -0.95, z: -0.72, scale: 0.55, kind: "broadleaf" });
    addTree(kit, features, { x: 0.98, z: -0.62, scale: 0.46, kind: "broadleaf" });
    addBench(kit, features, { x: -0.8, z: 0.7, ry: 0.4 });
    addFlowers(kit, features, 0.72, 0.8, 0.2);
  } else if (kind === "playground") {
    kit.box(features, 1.0, 0.06, 0.76, kit.material("#d9bf8e"), -0.4, 0.03, 0.28);
    kit.box(features, 1.06, 0.025, 0.06, kit.trim, -0.4, 0.07, 0.63);
    kit.box(features, 1.06, 0.025, 0.06, kit.trim, -0.4, 0.07, -0.07);
    kit.box(features, 0.06, 0.025, 0.7, kit.trim, -0.89, 0.07, 0.28);
    kit.box(features, 0.06, 0.025, 0.7, kit.trim, 0.09, 0.07, 0.28);
    kit.box(features, 0.06, 0.5, 0.06, kit.steel, 0.58, 0.25, 0.52);
    kit.box(features, 0.06, 0.5, 0.06, kit.steel, 0.58, 0.25, 0.08);
    kit.box(features, 0.18, 0.04, 0.5, kit.steel, 0.58, 0.52, 0.3);
    kit.box(features, 0.5, 0.035, 0.2, kit.material(accent), 0.3, 0.3, 0.3, { rz: 0.5 });
    kit.box(features, 0.12, 0.02, 0.18, kit.material("#e8d8b0"), 0.08, 0.12, 0.3);
    for (const side of [-1, 1]) {
      kit.box(features, 0.04, 0.56, 0.04, kit.steel, -0.72 + side * 0.35, 0.28, -0.48);
      kit.box(features, 0.04, 0.02, 0.3, kit.steel, -0.72 + side * 0.35, 0.56, -0.36);
    }
    kit.box(features, 1.0, 0.035, 0.035, kit.steel, -0.72, 0.56, -0.48);
    for (const side of [-1, 1]) {
      kit.box(features, 0.02, 0.22, 0.02, kit.darkMetal, -0.9 + side * 0.06, 0.45, -0.48);
      kit.box(features, 0.13, 0.035, 0.16, kit.material(side < 0 ? "#ef816c" : "#ffd166"), -0.9 + side * 0.06, 0.34, -0.48);
    }
    addBench(kit, features, { x: 0.82, z: 0.62, ry: -0.3 });
    addTree(kit, features, { x: 0.85, z: -0.72, scale: 0.45, kind: "broadleaf" });
    for (let flag = 0; flag < 5; flag += 1) {
      const x = -0.85 + flag * 0.42;
      kit.box(features, 0.014, 0.18, 0.014, kit.steel, x, 0.13, 0.78);
      kit.box(features, 0.09, 0.06, 0.012, kit.material(["#ef816c", "#ffd166", "#72cec0"][flag % 3]), x + 0.05, 0.19, 0.78);
    }
  } else if (kind === "sports") {
    kit.box(features, 1.9, 0.03, 1.3, kit.material("#527f8f"), 0, 0.02, 0.12, { outline: true });
    kit.box(features, 1.66, 0.012, 1.06, kit.material("#5e8d9c"), 0, 0.04, 0.12);
    kit.box(features, 0.025, 0.012, 1.06, kit.basic("#e9e2cf"), 0, 0.05, 0.12);
    kit.torus(features, 0.16, kit.material("#e9e2cf"), 0, 0.05, 0.12, { rx: Math.PI / 2 });
    for (const side of [-1, 1]) {
      const x = side * 1.04;
      kit.cyl(features, 0.025, 0.55, kit.darkMetal, x, 0.28, 0.12);
      kit.box(features, 0.05, 0.24, 0.32, kit.material("#e9e2cf"), x - side * 0.04, 0.5, 0.12);
      kit.torus(features, 0.1, kit.material("#ef7d5f"), x - side * 0.12, 0.43, 0.12, {
        rx: Math.PI / 2,
      });
    }
    for (let step = 0; step < 3; step += 1) {
      kit.box(features, 1.1, 0.09, 0.1, kit.material("#b7ae98"), 0, 0.05 + step * 0.1, -0.62 - step * 0.09);
    }
    for (const side of [-1, 1]) {
      kit.cyl(features, 0.025, 0.9, kit.darkMetal, side * 1.1, 0.45, 0.72);
      kit.box(features, 0.12, 0.05, 0.12, kit.glow("#ffe2a1"), side * 1.1, 0.93, 0.72);
    }
    addBench(kit, features, { x: 0.85, z: 0.72, ry: -0.2 });
    addTree(kit, features, { x: -1.02, z: -0.82, scale: 0.4, kind: "broadleaf" });
  } else if (kind === "botanical") {
    addPath(0.3, 2.2, -0.72, 0);
    addPath(1.5, 0.24, 0.25, 0.82);
    const greenhouse = new THREE.Group();
    greenhouse.position.set(0.25, 0.02, -0.25);
    features.add(greenhouse);
    kit.box(greenhouse, 1.15, 0.32, 0.7, kit.glass("#9fcbb6", 0.55), 0, 0.16, 0, { outline: true });
    kit.gable(greenhouse, 1.15, 0.26, 0.7, kit.glass("#9fcbb6", 0.5), 0, 0.32, 0, { outline: true });
    for (const side of [-1, 1]) {
      kit.box(greenhouse, 0.025, 0.32, 0.72, kit.trim, side * 0.56, 0.16, 0);
      kit.box(greenhouse, 0.03, 0.26, 0.7, kit.trim, side * 0.15, 0.45, 0, { rz: side * 0.5 });
    }
    kit.box(greenhouse, 0.16, 0.24, 0.02, kit.darkWindow, 0, 0.12, 0.35);
    kit.box(features, 0.42, 0.18, 0.24, kit.material("#b0a58f"), -1.02, 0.09, -0.58);
    kit.box(features, 0.44, 0.02, 0.26, kit.soil, -1.02, 0.19, -0.58);
    addFlowers(kit, features, -1.02, -0.58, 0.2, ["#ef816c", "#ffd166", "#e8a0b4"]);
    kit.box(features, 0.48, 0.18, 0.24, kit.material("#b0a58f"), 0.96, 0.09, 0.46);
    kit.box(features, 0.5, 0.02, 0.26, kit.soil, 0.96, 0.19, 0.46);
    addFlowers(kit, features, 0.96, 0.46, 0.22, ["#ffd166", "#f4e4c1", "#ef816c"]);
    addTree(kit, features, { x: -0.92, z: 0.82, scale: 0.6, kind: "palm" });
    addTree(kit, features, { x: 1.0, z: -0.86, scale: 0.5, kind: "palm" });
    addBench(kit, features, { x: 0.96, z: 0.92, ry: -0.3 });
  } else if (kind === "cherry") {
    for (let stone = 0; stone < 5; stone += 1) {
      kit.box(features, 0.3, 0.014, 0.3, kit.material("#c3b69b"), -0.72 + stone * 0.36, 0.008, -0.66 + stone * 0.32);
    }
    const spots = [
      [-0.78, -0.6],
      [0.78, -0.58],
      [-0.8, 0.62],
      [0.8, 0.62],
    ];
    spots.forEach(([x, z], index) => {
      addTree(kit, features, {
        x,
        z,
        scale: 0.55 + (index % 2) * 0.06,
        kind: "cherry",
        leaf: "#e7a3b6",
        leaf2: "#f0bccb",
        trunk: "#6b5144",
      });
      for (let petal = 0; petal < 4; petal += 1) {
        kit.box(
          features,
          0.035,
          0.006,
          0.035,
          kit.material("#f0bccb"),
          x + Math.cos(petal * 2.1 + index) * 0.28,
          0.012,
          z + Math.sin(petal * 2.1 + index) * 0.24
        );
      }
    });
    kit.box(features, 0.18, 0.32, 0.18, kit.stone, -0.05, 0.16, 0.05);
    kit.box(features, 0.24, 0.05, 0.24, kit.stone, -0.05, 0.32, 0.05);
    kit.box(features, 0.16, 0.05, 0.16, kit.glow("#ffcf86"), -0.05, 0.37, 0.05);
    addBench(kit, features, { x: 0.5, z: -0.1, ry: -1.1 });
  } else {
    addTree(kit, features, { x: -0.5, z: -0.4, scale: 0.6 });
    addBench(kit, features, { x: 0.4, z: 0.35, ry: 0.3 });
    addFlowers(kit, features, 0.5, -0.5, 0.24);
  }

  const sign = kit.material(accent, { emissive: accent, emissiveIntensity: 0.2 });
  kit.box(group, 0.32, 0.06, 0.06, sign, 0, 0.07, size / 2 - 0.03);
  return group;
}

function buildVehicle(asset, kit, rng) {
  const model = asset.model;
  const kind = model.vehicle;
  const length = model.length;
  const width = model.width;
  const color = model.color;
  const accent = model.accent;
  const group = new THREE.Group();
  const bodyMat = kit.material(color, { roughness: 0.58, metalness: 0.08 });
  const accentMat = kit.material(accent, { roughness: 0.62 });
  const tireMat = kit.material("#23292d", { roughness: 0.92 });
  const chrome = kit.material("#aab3b2", { roughness: 0.35, metalness: 0.4 });
  const wheelRadius = 0.056;

  kit.box(group, length + 0.24, 0.03, width + 0.2, kit.asphalt, 0, -0.015, 0);
  for (let dash = -1; dash <= 1; dash += 1) {
    kit.box(group, 0.12, 0.006, 0.018, kit.basic("#c8bda2"), dash * 0.32, 0.002, width / 2 + 0.035);
  }

  const wheel = (x, z, radius = wheelRadius) => {
    kit.cyl(group, radius, 0.036, tireMat, x, radius, z, { rx: Math.PI / 2 });
    kit.cyl(group, radius * 0.42, 0.039, chrome, x, radius, z, { rx: Math.PI / 2 });
  };

  const lights = (frontX, size = 0.05) => {
    for (const side of [-1, 1]) {
      kit.box(group, 0.012, 0.04, size, kit.glow("#fff2c0"), frontX, 0.115, side * width * 0.34);
      kit.box(group, 0.012, 0.035, size, kit.glow("#ff8b74"), -frontX, 0.115, side * width * 0.34);
    }
  };

  if (kind === "sedan" || kind === "taxi" || kind === "police") {
    const chassisY = wheelRadius + 0.045;
    kit.box(group, length * 0.9, 0.085, width, bodyMat, 0, chassisY, 0, { outline: true });
    kit.box(group, length * 0.46, 0.09, width * 0.86, bodyMat, -length * 0.02, chassisY + 0.085, 0, {
      outline: true,
    });
    kit.box(group, length * 0.36, 0.055, width * 0.88, kit.darkWindow, -length * 0.02, chassisY + 0.095, 0);
    kit.box(group, length * 0.14, 0.018, width * 0.9, kit.material(color), -length * 0.02, chassisY + 0.13, 0);
    kit.box(group, length * 0.16, 0.06, width * 0.76, kit.darkWindow, length * 0.2, chassisY + 0.07, 0, {
      rz: -0.3,
    });
    kit.box(group, length * 0.06, 0.02, width * 0.94, accentMat, length * 0.34, chassisY + 0.03, 0);
    for (const side of [-1, 1]) {
      wheel(length * 0.3, side * width * 0.42);
      wheel(-length * 0.3, side * width * 0.42);
      kit.box(group, 0.035, 0.026, 0.07, accentMat, length * 0.05, chassisY + 0.145, side * width * 0.44);
    }
    lights(length * 0.455);
    kit.box(group, length * 0.1, 0.016, width * 0.98, chrome, -length * 0.42, chassisY + 0.015, 0);

    if (kind === "taxi") {
      kit.box(group, 0.14, 0.07, width * 0.42, kit.glow("#ffe0a1"), -length * 0.02, chassisY + 0.19, 0);
      kit.box(group, 0.1, 0.02, width * 0.3, kit.material("#3d454c"), -length * 0.02, chassisY + 0.196, 0);
      for (let check = 0; check < 4; check += 1) {
        kit.box(group, 0.03, 0.035, 0.012, kit.basic(check % 2 === 0 ? "#2f3439" : "#f0e6d1"), -length * 0.18 + check * 0.045, chassisY, width / 2 + 0.006);
      }
    }

    if (kind === "police") {
      kit.box(group, length * 0.2, 0.008, width * 0.86, kit.material("#4d6170"), 0, chassisY + 0.02, 0);
      const barY = chassisY + 0.155;
      kit.box(group, 0.09, 0.03, width * 0.5, kit.glow("#ff5f5f"), -length * 0.02, barY, 0);
      kit.box(group, 0.09, 0.03, width * 0.5, kit.glow("#6cc8ff"), length * 0.055, barY, 0);
      kit.box(group, 0.02, 0.06, width * 0.6, kit.darkMetal, length * 0.48, 0.1, 0);
      kit.box(group, 0.018, 0.08, width * 0.7, kit.darkMetal, length * 0.5, 0.14, 0);
    }
  } else if (kind === "compact") {
    const chassisY = wheelRadius + 0.05;
    kit.box(group, length * 0.88, 0.11, width, bodyMat, 0, chassisY + 0.02, 0, { outline: true });
    kit.box(group, length * 0.56, 0.12, width * 0.9, kit.material(accent, { roughness: 0.5 }), -length * 0.06, chassisY + 0.12, 0, {
      outline: true,
    });
    kit.box(group, length * 0.42, 0.075, width * 0.82, kit.darkWindow, -length * 0.06, chassisY + 0.13, 0);
    kit.box(group, length * 0.3, 0.025, width * 0.8, kit.material(color), -length * 0.06, chassisY + 0.19, 0);
    for (const side of [-1, 1]) {
      wheel(length * 0.29, side * width * 0.42);
      wheel(-length * 0.29, side * width * 0.42);
      kit.box(group, 0.03, 0.03, 0.03, kit.glow(accent), -length * 0.41, chassisY + 0.06, side * width * 0.45);
    }
    lights(length * 0.44);
    kit.box(group, 0.1, 0.03, width * 0.9, kit.material("#f0e0bd"), length * 0.35, chassisY + 0.04, 0);
  } else if (kind === "van") {
    const chassisY = wheelRadius + 0.05;
    kit.box(group, length * 0.9, 0.12, width, bodyMat, 0, chassisY, 0, { outline: true });
    kit.box(group, length * 0.64, 0.22, width * 0.94, bodyMat, -length * 0.12, chassisY + 0.17, 0, {
      outline: true,
    });
    kit.box(group, length * 0.18, 0.15, width * 0.92, bodyMat, length * 0.33, chassisY + 0.13, 0, {
      outline: true,
    });
    kit.box(group, length * 0.13, 0.1, width * 0.72, kit.darkWindow, length * 0.37, chassisY + 0.16, 0, {
      rz: -0.28,
    });
    kit.box(group, length * 0.03, 0.1, width * 0.6, kit.darkWindow, -length * 0.05, chassisY + 0.19, -width / 2 - 0.002);
    kit.box(group, length * 0.08, 0.08, width * 0.03, kit.material("#3d444a"), -length * 0.26, chassisY + 0.16, width / 2 + 0.006);
    kit.box(group, length * 0.4, 0.02, width * 0.7, accentMat, -length * 0.12, chassisY + 0.29, 0);
    for (const side of [-1, 1]) {
      wheel(length * 0.32, side * width * 0.42);
      wheel(-length * 0.34, side * width * 0.42);
    }
    lights(length * 0.44);
    kit.box(group, 0.08, 0.035, width * 0.6, kit.material("#5b6468"), -length * 0.3, chassisY + 0.3, 0);
  } else if (kind === "bus") {
    const chassisY = wheelRadius + 0.035;
    kit.box(group, length * 0.94, 0.03, width, kit.material("#2b3035"), 0, chassisY, 0);
    kit.box(group, length * 0.96, 0.2, width * 0.92, bodyMat, 0, chassisY + 0.13, 0, { outline: true });
    kit.box(group, length * 0.96, 0.055, width * 0.94, kit.material(accent), 0, chassisY + 0.24, 0);
    kit.box(group, length * 0.96, 0.03, width * 0.94, kit.material("#e9dfc5"), 0, chassisY + 0.07, 0);
    for (const side of [-1, 1]) {
      for (let pane = 0; pane < 6; pane += 1) {
        kit.box(group, length * 0.115, 0.1, 0.02, kit.darkWindow, -length * 0.36 + pane * length * 0.14, chassisY + 0.16, side * width * 0.47);
      }
      kit.box(group, length * 0.09, 0.13, 0.025, kit.litWindow, length * 0.27, chassisY + 0.16, side * width * 0.47);
    }
    kit.box(group, length * 0.8, 0.012, width * 0.92, kit.material("#d66f5f"), 0, chassisY + 0.255, 0);
    for (const side of [-1, 1]) {
      wheel(length * 0.34, side * width * 0.4, 0.062);
      wheel(0, side * width * 0.4, 0.062);
      wheel(-length * 0.34, side * width * 0.4, 0.062);
    }
    lights(length * 0.48, 0.07);
    kit.box(group, length * 0.22, 0.025, width * 0.46, kit.glow("#ffe2a1"), length * 0.36, chassisY + 0.235, 0);
    kit.box(group, length * 0.38, 0.04, width * 0.66, kit.material("#5b6468"), -length * 0.05, chassisY + 0.31, 0);
    kit.box(group, 0.02, 0.3, 0.02, kit.darkMetal, length * 0.46, chassisY + 0.16, -width * 0.34);
  } else if (kind === "truck") {
    const chassisY = wheelRadius + 0.04;
    kit.box(group, length * 0.96, 0.07, width * 0.9, kit.material("#39444a"), 0, chassisY, 0, { outline: true });
    kit.box(group, length * 0.26, 0.17, width, bodyMat, length * 0.34, chassisY + 0.12, 0, { outline: true });
    kit.box(group, length * 0.18, 0.1, width * 0.86, kit.darkWindow, length * 0.38, chassisY + 0.17, 0, {
      rz: -0.24,
    });
    kit.box(group, length * 0.52, 0.09, width * 0.94, kit.material(accent), -length * 0.19, chassisY + 0.08, 0, {
      outline: true,
    });
    for (let crate = 0; crate < 3; crate += 1) {
      addCrate(
        kit,
        group,
        -length * 0.34 + crate * length * 0.17,
        chassisY + 0.12,
        (crate % 2 === 0 ? 1 : -1) * width * 0.17,
        0.75,
        crate === 1 ? "#86684a" : "#9a7a55"
      );
    }
    kit.box(group, length * 0.04, 0.04, width * 0.98, kit.material("#c9bda2"), -length * 0.02, chassisY + 0.03, 0);
    for (const side of [-1, 1]) {
      wheel(length * 0.36, side * width * 0.43, 0.062);
      wheel(-length * 0.32, side * width * 0.43, 0.062);
      wheel(-length * 0.08, side * width * 0.43, 0.062);
    }
    lights(length * 0.48, 0.06);
  } else if (kind === "foodtruck") {
    const chassisY = wheelRadius + 0.045;
    kit.box(group, length * 0.9, 0.12, width, bodyMat, 0, chassisY, 0, { outline: true });
    kit.box(group, length * 0.78, 0.22, width * 0.92, kit.material(color, { roughness: 0.55 }), -length * 0.02, chassisY + 0.17, 0, {
      outline: true,
    });
    kit.box(group, length * 0.2, 0.14, width * 0.86, bodyMat, length * 0.37, chassisY + 0.14, 0, {
      outline: true,
    });
    kit.box(group, length * 0.15, 0.09, width * 0.7, kit.darkWindow, length * 0.4, chassisY + 0.16, 0, {
      rz: -0.24,
    });
    kit.box(group, length * 0.3, 0.11, 0.025, kit.darkWindow, -length * 0.02, chassisY + 0.2, width * 0.462);
    kit.box(group, length * 0.36, 0.02, 0.16, kit.glow("#ffe2a1"), -length * 0.02, chassisY + 0.28, width * 0.53);
    addAwning(kit, group, {
      width: length * 0.36,
      y: chassisY + 0.3,
      z: width * 0.55,
      colorA: accent,
      colorB: "#f4e4c1",
      stripes: 4,
      depth: 0.18,
    });
    kit.box(group, length * 0.82, 0.018, 0.025, accentMat, -length * 0.02, chassisY + 0.11, width * 0.47);
    kit.box(group, length * 0.8, 0.018, 0.025, accentMat, -length * 0.02, chassisY + 0.27, width * 0.47);
    kit.box(group, length * 0.12, 0.14, 0.02, kit.material("#3d444a"), -length * 0.42, chassisY + 0.15, width * 0.5);
    for (const side of [-1, 1]) {
      wheel(length * 0.3, side * width * 0.43);
      wheel(-length * 0.3, side * width * 0.43);
    }
    lights(length * 0.46);
    kit.box(group, length * 0.24, 0.035, width * 0.5, kit.material("#5b6468"), -length * 0.12, chassisY + 0.3, 0);
  }

  return group;
}

function buildStreetProp(asset, kit, rng) {
  const model = asset.model;
  const prop = model.prop;
  const color = model.color;
  const accent = model.accent;
  const group = new THREE.Group();
  const colorMat = kit.material(color, { roughness: 0.78, metalness: 0.08 });
  const accentMat = kit.material(accent, { roughness: 0.7 });

  const pad = (size = 1.0, material = "#7f857a") => {
    kit.box(group, size, 0.028, size, kit.material(material, { roughness: 1 }), 0, 0.014, 0, {
      outline: true,
    });
    kit.box(group, size * 0.88, 0.012, size * 0.88, kit.material("#9a9d8f"), 0, 0.033, 0);
  };

  if (prop === "lamp") {
    pad(0.8);
    addLamp(kit, group, { y: 0.035, height: 0.9, color, light: accent });
  } else if (prop === "bench") {
    pad(1.0, "#82877b");
    addBench(kit, group, { y: 0.035, color, ry: 0.15 });
  } else if (prop === "busstop") {
    pad(1.2, "#7d8378");
    const shelter = new THREE.Group();
    shelter.position.set(-0.16, 0.035, 0);
    group.add(shelter);
    kit.box(shelter, 0.76, 0.035, 0.34, kit.material("#5a6668"), 0, 0.42, -0.06, { outline: true });
    for (const x of [-0.35, 0.35]) {
      kit.box(shelter, 0.03, 0.42, 0.03, kit.darkMetal, x, 0.21, 0.1);
      kit.box(shelter, 0.03, 0.42, 0.03, kit.darkMetal, x, 0.21, -0.2);
    }
    kit.box(shelter, 0.7, 0.3, 0.015, kit.glass("#b9d2d0", 0.35), 0, 0.24, -0.22);
    kit.box(shelter, 0.015, 0.3, 0.28, kit.glass("#b9d2d0", 0.35), 0.36, 0.24, -0.06);
    addBench(kit, shelter, { x: 0, z: -0.02, y: 0.03, ry: 0 });
    kit.box(shelter, 0.12, 0.22, 0.02, kit.glow(accent), -0.28, 0.26, 0.16);
    kit.box(shelter, 0.03, 0.22, 0.03, kit.darkMetal, 0.38, 0.11, 0.16);
    kit.box(shelter, 0.14, 0.04, 0.04, kit.glow(accent), 0.38, 0.38, 0.16);
  } else if (prop === "kiosk") {
    pad(1.0, "#7f8478");
    kit.box(group, 0.5, 0.44, 0.38, colorMat, 0, 0.055 + 0.22, 0, { outline: true });
    kit.box(group, 0.38, 0.17, 0.025, kit.darkWindow, 0, 0.31, 0.2);
    kit.box(group, 0.42, 0.03, 0.16, kit.material(accent), 0, 0.43, 0.26);
    kit.box(group, 0.62, 0.035, 0.5, kit.material("#5e5a4f"), 0, 0.53, 0, { outline: true });
    kit.box(group, 0.44, 0.05, 0.32, kit.wood, 0, 0.27, 0.24);
    for (let paper = 0; paper < 3; paper += 1) {
      kit.box(group, 0.09, 0.015, 0.12, kit.material("#efe6d1"), -0.14 + paper * 0.14, 0.3, 0.25);
    }
    kit.box(group, 0.1, 0.26, 0.02, kit.glow(accent), 0.14, 0.33, 0.2);
  } else if (prop === "postbox") {
    pad(0.8, "#808579");
    kit.box(group, 0.12, 0.08, 0.12, kit.darkMetal, 0, 0.075, 0);
    kit.cyl(group, 0.14, 0.38, colorMat, 0, 0.3, 0, { segments: 16 });
    kit.dome(group, 0.14, colorMat, 0, 0.49, 0, { segments: 16 });
    kit.cyl(group, 0.145, 0.035, kit.material("#efe3c8"), 0, 0.22, 0, { segments: 16 });
    kit.box(group, 0.1, 0.025, 0.02, kit.material("#2f3438"), 0, 0.36, 0.132);
    kit.box(group, 0.12, 0.015, 0.02, accentMat, 0, 0.3, 0.134);
  } else if (prop === "bin") {
    pad(0.8, "#808579");
    kit.cyl(group, 0.16, 0.34, colorMat, 0, 0.21, 0, { segments: 12 });
    kit.cyl(group, 0.17, 0.035, kit.material("#3d4a42"), 0, 0.4, 0, { segments: 12 });
    kit.cyl(group, 0.05, 0.03, kit.material(accent), 0, 0.43, 0, { segments: 12 });
    kit.box(group, 0.16, 0.025, 0.02, kit.material("#1f2b24"), 0, 0.32, 0.155);
    kit.cyl(group, 0.165, 0.035, kit.material(accent, { roughness: 0.8 }), 0, 0.09, 0, { segments: 12 });
  } else if (prop === "planter") {
    pad(0.9, "#858a7e");
    addPlanter(kit, group, { y: 0.035, width: 0.66, depth: 0.32, color });
  } else if (prop === "statue") {
    pad(1.0, "#898e81");
    kit.box(group, 0.42, 0.08, 0.42, kit.stone, 0, 0.07, 0, { outline: true });
    kit.box(group, 0.32, 0.12, 0.32, kit.material("#b7ac95"), 0, 0.17, 0, { outline: true });
    kit.box(group, 0.24, 0.5, 0.24, kit.material("#b7ac95"), 0, 0.48, 0, { outline: true });
    const bronze = kit.material("#6d8178", { roughness: 0.62, metalness: 0.22 });
    kit.box(group, 0.22, 0.3, 0.16, bronze, 0, 0.82, 0);
    kit.sphere(group, 0.075, bronze, 0, 1.01, 0);
    kit.box(group, 0.06, 0.22, 0.08, bronze, 0.14, 0.84, 0.01, { rz: -0.5 });
    kit.box(group, 0.06, 0.2, 0.08, bronze, -0.14, 0.84, 0.01, { rz: 0.4 });
    kit.box(group, 0.05, 0.24, 0.07, bronze, -0.06, 0.64, 0.03);
    kit.box(group, 0.05, 0.24, 0.07, bronze, 0.06, 0.64, 0.03);
    kit.box(group, 0.24, 0.05, 0.2, bronze, 0, 0.95, 0);
    kit.box(group, 0.03, 0.03, 0.03, kit.glow("#f4e4c1"), -0.3, 0.16, 0.32);
    kit.sphere(group, 0.04, kit.material("#f4ead9"), -0.3, 0.2, 0.32);
  } else if (prop === "billboard") {
    pad(1.3, "#757b70");
    for (const x of [-0.42, 0.42]) {
      kit.box(group, 0.055, 0.9, 0.055, kit.darkMetal, x, 0.47, -0.02, { outline: true });
      kit.box(group, 0.08, 0.03, 0.14, kit.darkMetal, x, 0.04, -0.02);
    }
    kit.box(group, 1.02, 0.62, 0.06, kit.material("#313941"), 0, 0.72, -0.02, { outline: true });
    for (let panel = 0; panel < 3; panel += 1) {
      const colors = ["#ef816c", "#ffd166", "#72cec0"];
      kit.box(group, 0.28, 0.5, 0.025, kit.basic(colors[panel]), -0.32 + panel * 0.32, 0.72, 0.02);
      kit.box(group, 0.2, 0.02, 0.03, kit.basic("#f4e4c1"), -0.32 + panel * 0.32, 0.62, 0.04);
    }
    for (const side of [-1, 1]) {
      kit.box(group, 0.06, 0.045, 0.05, kit.glow("#ffe2a1"), side * 0.55, 1.03, -0.02);
    }
    for (let rung = 0; rung < 4; rung += 1) {
      kit.box(group, 0.26, 0.02, 0.02, kit.steel, 0, 0.18 + rung * 0.16, -0.12);
    }
  } else if (prop === "bikerack") {
    pad(1.2, "#7f8478");
    for (let rack = 0; rack < 3; rack += 1) {
      kit.rack(group, 0.22, kit.material(accent, { metalness: 0.35, roughness: 0.4 }), -0.32 + rack * 0.32, 0.04, 0);
    }
    for (const wheel of [-0.4, -0.16]) {
      kit.torus(group, 0.09, kit.material("#2f3539"), wheel, 0.13, 0.2);
    }
    kit.box(group, 0.24, 0.012, 0.012, accentMat, -0.28, 0.16, 0.2, { rz: 0.35 });
    kit.box(group, 0.12, 0.012, 0.012, accentMat, -0.34, 0.18, 0.2, { rz: -0.6 });
  } else {
    pad(0.9);
    kit.box(group, 0.4, 0.3, 0.4, colorMat, 0, 0.18, 0, { outline: true });
    kit.box(group, 0.46, 0.04, 0.46, accentMat, 0, 0.34, 0);
  }

  return group;
}

function buildNature(asset, kit, rng) {
  const model = asset.model;
  const species = model.species;
  const group = new THREE.Group();

  const patch = (color = "#6f8f50", size = 1.0) => {
    kit.box(group, size, 0.035, size, kit.material(color, { roughness: 1 }), 0, 0.0175, 0, {
      outline: true,
    });
    kit.box(group, size * 0.84, 0.015, size * 0.84, kit.material(color, { roughness: 1 }), 0, 0.042, 0);
  };

  if (species === "broadleaf") {
    patch("#6f8f50", 1.0);
    addTree(kit, group, {
      x: 0,
      z: 0,
      scale: 1.1,
      kind: "broadleaf",
      leaf: model.leaf,
      leaf2: model.leaf2,
      trunk: model.trunk,
    });
    addFlowers(kit, group, 0.3, 0.3, 0.18);
    addBush(kit, group, -0.32, 0.28, 0.7, model.leaf2);
  } else if (species === "conifer") {
    patch("#69884e", 1.0);
    addTree(kit, group, {
      x: 0,
      z: 0,
      scale: 1.2,
      kind: "conifer",
      leaf: model.leaf,
      leaf2: model.leaf2,
      trunk: model.trunk,
    });
    addBush(kit, group, 0.3, 0.32, 0.6, model.leaf2);
  } else if (species === "palm") {
    patch("#cbb98f", 1.1);
    addTree(kit, group, {
      x: 0,
      z: 0,
      scale: 1.15,
      kind: "palm",
      leaf: model.leaf,
      leaf2: model.leaf2,
      trunk: model.trunk,
    });
    kit.box(group, 0.34, 0.02, 0.18, kit.basic("#74c1c1"), -0.22, 0.05, 0.3);
  } else if (species === "cherry") {
    patch("#829c61", 1.0);
    addTree(kit, group, {
      x: 0,
      z: 0,
      scale: 1.0,
      kind: "cherry",
      leaf: model.leaf,
      leaf2: model.leaf2,
      trunk: model.trunk,
    });
    for (let petal = 0; petal < 7; petal += 1) {
      kit.box(
        group,
        0.035,
        0.008,
        0.035,
        kit.material(leafPetal(petal, model)),
        -0.35 + (petal % 4) * 0.2,
        0.05,
        0.3 - (petal % 3) * 0.16
      );
    }
  } else if (species === "shrub") {
    patch("#6f8f50", 1.1);
    addBush(kit, group, -0.16, 0.02, 1.25, model.leaf);
    addBush(kit, group, 0.18, 0.14, 1.0, model.leaf2);
    addBush(kit, group, 0.05, -0.22, 0.85, model.leaf);
    addFlowers(kit, group, 0.18, -0.3, 0.15, ["#ffd166", "#f4e4c1"]);
  } else if (species === "flowerbed") {
    kit.box(group, 1.0, 0.08, 1.0, kit.material("#8b816c"), 0, 0.04, 0, { outline: true });
    kit.box(group, 0.9, 0.03, 0.9, kit.soil, 0, 0.1, 0);
    const colors = model.flowers;
    for (let flower = 0; flower < 18; flower += 1) {
      const angle = flower * 2.39;
      const radius = 0.08 + (flower % 4) * 0.1;
      const x = Math.cos(angle) * radius * 1.6;
      const z = Math.sin(angle) * radius * 1.35;
      kit.cyl(group, 0.01, 0.09, kit.material("#5d7f45"), x, 0.165, z);
      kit.ico(group, 0.035, kit.material(colors[flower % colors.length]), x, 0.22, z);
    }
    kit.box(group, 0.06, 0.12, 0.5, kit.material("#8a6a4d"), -0.51, 0.06, 0);
    kit.box(group, 0.06, 0.12, 0.5, kit.material("#8a6a4d"), 0.51, 0.06, 0);
  } else if (species === "gull") {
    kit.box(group, 0.62, 0.05, 0.62, kit.material("#7f8578"), 0, 0.025, 0, { outline: true });
    const gull = new THREE.Group();
    gull.position.y = 0.06;
    group.add(gull);
    kit.cyl(gull, 0.035, 0.16, kit.material("#c9a25d"), 0, 0.08, 0);
    kit.sphere(gull, 0.14, kit.material(model.color, { roughness: 0.85 }), 0, 0.27, 0, {
      squash: 0.8,
    });
    kit.sphere(gull, 0.08, kit.material(model.color, { roughness: 0.85 }), 0.1, 0.4, 0);
    kit.box(gull, 0.09, 0.028, 0.035, kit.material(model.accent), 0.16, 0.4, 0);
    kit.box(gull, 0.2, 0.035, 0.26, kit.material("#d8d2c3"), -0.02, 0.29, 0.12, { rz: -0.2 });
    kit.box(gull, 0.14, 0.02, 0.2, kit.material("#e8e1d1"), -0.12, 0.28, -0.12, { rz: 0.2 });
    for (const side of [-1, 1]) {
      kit.box(gull, 0.012, 0.1, 0.012, kit.material(model.accent), 0.03, 0.06, side * 0.04);
    }
    const gull2 = gull.clone();
    gull2.position.set(-0.26, 0.1, 0.2);
    gull2.scale.setScalar(0.65);
    gull2.rotation.y = 1.2;
    group.add(gull2);
  }

  return group;
}

function leafPetal(index, model) {
  return index % 2 === 0 ? model.leaf2 : "#f4d3dc";
}

function buildMaritime(asset, kit, rng) {
  const model = asset.model;
  const vessel = model.vessel;
  const group = new THREE.Group();
  const water = kit.water;
  const hullMat = kit.material(model.color, { roughness: 0.6 });
  const accentMat = kit.material(model.accent, { roughness: 0.65 });
  const deckMat = kit.material("#b8a482", { roughness: 0.92 });
  const white = kit.material("#e4ddcb", { roughness: 0.85 });
  const length = model.length ?? 1;
  const width = model.width ?? 0.45;

  const waterBase = (w, d, x = 0, z = 0) => {
    kit.box(group, w, 0.04, d, water, x, -0.02, z);
    for (let wave = -2; wave <= 2; wave += 1) {
      kit.box(group, w * 0.9, 0.012, 0.025, kit.basic("#d8efe8"), x, 0.005, z + wave * (d / 6));
    }
  };

  if (vessel === "sailboat") {
    waterBase(length + 0.35, width + 0.35);
    kit.box(group, length * 0.82, 0.09, width, hullMat, 0, 0.075, 0, { outline: true });
    kit.box(group, length * 0.82, 0.025, width * 1.04, accentMat, 0, 0.12, 0);
    kit.box(group, length * 0.55, 0.02, width * 0.8, deckMat, 0.08, 0.135, 0);
    kit.box(group, length * 0.22, 0.09, width * 0.62, white, -length * 0.16, 0.19, 0, { outline: true });
    kit.box(group, 0.025, 0.72, 0.025, kit.darkMetal, 0.02, 0.5, 0);
    kit.box(group, 0.18, 0.025, 0.025, kit.darkMetal, 0.1, 0.62, 0);
    kit.sailMesh(group, 0.38, 0.58, kit.sail("#f1e8d4"), 0.21, 0.36, 0.012);
    kit.sailMesh(group, 0.22, 0.46, kit.sail("#e7dcc4"), 0.17, 0.34, 0.014, Math.PI);
    kit.sailMesh(group, 0.16, 0.32, kit.sail(accentMatColor(model)), 0.2, 0.35, -0.014);
    kit.box(group, length * 0.16, 0.025, width * 0.3, accentMat, -length * 0.3, 0.15, 0);
  } else if (vessel === "fishing") {
    waterBase(length + 0.35, width + 0.4);
    kit.box(group, length * 0.86, 0.11, width, hullMat, 0, 0.08, 0, { outline: true });
    kit.box(group, length * 0.86, 0.026, width * 1.04, accentMat, 0, 0.135, 0);
    kit.box(group, length * 0.5, 0.02, width * 0.82, deckMat, 0.05, 0.15, 0);
    kit.box(group, length * 0.2, 0.14, width * 0.62, white, -length * 0.16, 0.22, 0, { outline: true });
    kit.box(group, length * 0.1, 0.07, width * 0.5, kit.darkWindow, -length * 0.16, 0.26, width * 0.2);
    kit.box(group, 0.02, 0.55, 0.02, kit.darkMetal, 0.08, 0.44, 0);
    kit.box(group, 0.24, 0.018, 0.018, kit.darkMetal, 0.2, 0.58, 0);
    kit.box(group, 0.08, 0.3, 0.02, kit.sail(accentMatColor(model)), 0.32, 0.42, 0);
    kit.cyl(group, 0.11, 0.06, kit.material("#6f8f50"), -0.24, 0.18, 0.1, { segments: 8 });
    for (let net = 0; net < 3; net += 1) {
      kit.box(group, 0.16, 0.05, 0.12, kit.material("#c5b58d"), -0.34 + net * 0.18, 0.19, -0.18);
    }
    kit.ico(group, 0.04, kit.glow("#ef816c"), 0.34, 0.2, width * 0.2);
  } else if (vessel === "ferry") {
    waterBase(length + 0.4, width + 0.5);
    kit.box(group, length * 0.92, 0.14, width, hullMat, 0, 0.08, 0, { outline: true });
    kit.box(group, length * 0.92, 0.03, width * 1.02, accentMat, 0, 0.16, 0);
    kit.box(group, length * 0.78, 0.14, width * 0.82, white, 0, 0.26, 0, { outline: true });
    kit.box(group, length * 0.6, 0.14, width * 0.7, white, -length * 0.04, 0.4, 0, { outline: true });
    for (const side of [-1, 1]) {
      for (let pane = 0; pane < 5; pane += 1) {
        kit.box(group, length * 0.12, 0.06, 0.02, kit.darkWindow, -length * 0.28 + pane * length * 0.14, 0.28, side * width * 0.42);
        kit.box(group, length * 0.09, 0.055, 0.02, kit.darkWindow, -length * 0.25 + pane * length * 0.12, 0.42, side * width * 0.36);
      }
    }
    kit.box(group, length * 0.16, 0.13, width * 0.5, white, length * 0.34, 0.4, 0, { outline: true });
    kit.box(group, length * 0.13, 0.07, width * 0.4, kit.darkWindow, length * 0.34, 0.42, width * 0.2);
    kit.cyl(group, 0.075, 0.16, kit.material("#8b5a50"), -length * 0.2, 0.54, 0);
    kit.cyl(group, 0.08, 0.025, kit.material("#393d3f"), -length * 0.2, 0.63, 0);
    for (const side of [-1, 1]) {
      kit.torus(group, 0.07, kit.material("#ef816c"), -length * 0.02, 0.28, side * width * 0.44, {
        rx: Math.PI / 2,
      });
    }
    for (let rail = 0; rail < 5; rail += 1) {
      kit.box(group, 0.018, 0.08, 0.018, kit.steel, -length * 0.32 + rail * (length * 0.16), 0.5, -width * 0.33);
    }
    kit.box(group, length * 0.68, 0.016, 0.016, kit.steel, -length * 0.05, 0.54, -width * 0.33);
  } else if (vessel === "dinghy") {
    waterBase(length + 0.35, width + 0.35);
    kit.box(group, length * 0.8, 0.08, width, hullMat, 0, 0.06, 0, { outline: true });
    kit.box(group, length * 0.7, 0.03, width * 0.78, accentMat, 0, 0.11, 0);
    kit.box(group, length * 0.56, 0.02, width * 0.68, deckMat, 0, 0.13, 0);
    kit.box(group, length * 0.1, 0.025, width * 0.8, kit.material("#d9c896"), 0.08, 0.15, 0);
    kit.box(group, length * 0.1, 0.025, width * 0.8, kit.material("#d9c896"), -0.16, 0.15, 0);
    for (const z of [-0.08, 0.08]) {
      kit.box(group, length * 0.8, 0.018, 0.018, kit.wood, 0.02, 0.24, z, { rz: 0.75, ry: z > 0 ? 0.3 : -0.3 });
    }
    kit.torus(group, 0.08, kit.material("#d9c896"), -0.32, 0.08, 0.14, {
      rx: Math.PI / 2,
    });
  } else if (vessel === "buoy") {
    waterBase(0.9, 0.9);
    kit.cyl(group, 0.16, 0.3, kit.material(model.color, { roughness: 0.65 }), 0, 0.16, 0, {
      segments: 12,
    });
    kit.cyl(group, 0.17, 0.05, kit.material(model.accent), 0, 0.33, 0, { segments: 12 });
    kit.cone(group, 0.18, 0.22, kit.material(model.color), 0, 0.36, 0);
    kit.cyl(group, 0.05, 0.12, kit.darkMetal, 0, 0.62, 0);
    kit.ico(group, 0.075, kit.glow(model.accent), 0, 0.7, 0);
    for (let ring = 0; ring < 3; ring += 1) {
      kit.torus(group, 0.17, kit.material("#3d4449"), 0, 0.08 + ring * 0.07, 0, {
        rx: Math.PI / 2,
      });
    }
    kit.cyl(group, 0.02, 0.3, kit.darkMetal, 0, 0.5, 0);
  } else if (vessel === "pier") {
    waterBase(0.9, length + 0.4);
    for (let plank = 0; plank < 9; plank += 1) {
      kit.box(group, width, 0.028, 0.16, kit.wood, 0, 0.1, -length / 2 + 0.1 + plank * (length / 9));
    }
    for (let post = 0; post < 4; post += 1) {
      kit.cyl(group, 0.025, 0.28, kit.darkMetal, -width * 0.38, 0.12, -length / 2 + 0.15 + post * (length / 4));
      kit.cyl(group, 0.025, 0.28, kit.darkMetal, width * 0.38, 0.12, -length / 2 + 0.15 + post * (length / 4));
    }
    kit.box(group, width * 0.78, 0.03, 0.14, kit.trim, 0, 0.25, length / 2 - 0.1);
    addLamp(kit, group, { x: width * 0.35, z: length / 2 - 0.15, y: 0.11, height: 0.7, color: "#4b4f4c", light: "#ffd18a" });
    kit.cyl(group, 0.035, 0.16, kit.material("#c9b583"), -width * 0.3, 0.16, length / 2 - 0.25);
  }

  return group;
}

function accentMatColor(model) {
  return model.accent;
}

function buildSkyscraper(asset, kit, rng) {
  const model = asset.model;
  const group = new THREE.Group();
  const outer = new THREE.Group();
  group.add(outer);

  const span = Math.max(model.width[1], model.depth[1]);
  const base = span * (model.plinthScale ?? 1.32) + 0.2;
  kit.mass(group, {
    width: base,
    height: 0.08,
    depth: base,
    material: kit.stone,
    y: 0,
    outline: true,
  });
  kit.box(group, base * 0.82, 0.05, base * 0.82, kit.trim, 0, 0.105, 0);
  kit.box(group, base * 0.36, 0.034, 0.2, kit.trim, 0, 0.14, base * 0.43);
  kit.box(group, base * 0.28, 0.034, 0.16, kit.trim, 0, 0.175, base * 0.48);

  const treePositions = [
    [-base * 0.38, -base * 0.36],
    [base * 0.38, -base * 0.36],
    [-base * 0.38, base * 0.36],
    [base * 0.38, base * 0.34],
  ];
  treePositions.forEach(([x, z], index) => {
    if (index === 3) {
      kit.box(group, 0.36, 0.14, 0.22, kit.material("#8e846d"), x, 0.12, z, { outline: true });
      addBush(kit, group, x, z, 0.55, "#6e9452");
    } else {
      addTree(kit, group, {
        x,
        z,
        scale: 0.45,
        kind: index === 1 ? "palm" : "broadleaf",
        leaf: index === 1 ? "#7ca653" : "#6b9b53",
      });
    }
  });
  for (let light = 0; light < 8; light += 1) {
    const angle = (light / 8) * TAU;
    kit.ico(
      group,
      0.02,
      kit.glow("#ffd28a"),
      Math.cos(angle) * base * 0.46,
      0.13,
      Math.sin(angle) * base * 0.46
    );
  }

  const building = buildBuilding(asset, kit, rng);
  building.position.y = 0.12;
  outer.add(building);

  kit.box(group, 0.16, 0.5, 0.04, kit.material("#28333b"), 0, 0.26, base * 0.45);
  kit.box(group, 0.13, 0.2, 0.02, kit.glow("#ffd166"), 0, 0.29, base * 0.47);
  return group;
}

function buildConstruction(asset, kit, rng) {
  const model = asset.model;
  const type = model.construction;
  const group = new THREE.Group();
  const orange = kit.material(model.accent ?? "#d98f57", { roughness: 0.8 });
  const yellow = kit.material(model.steel ?? "#d7a93f", { roughness: 0.65, metalness: 0.08 });
  const concrete = kit.material(model.wall ?? "#aaa69a", { roughness: 0.98 });
  const dark = kit.material(model.dark ?? "#464b47", { roughness: 0.8 });
  const net = kit.material(model.net ?? "#617e67", { roughness: 0.92 });
  const white = kit.material(model.trim ?? "#e6d8bb", { roughness: 0.9 });
  const warn = kit.glow("#ff6b58");

  const concretePile = (x, z, radius = 0.22, height = 0.12) => {
    kit.cone(group, radius, height, kit.material(model.sand ?? "#c9b083"), x, 0.035, z);
    kit.box(group, radius * 1.8, 0.02, radius * 1.3, kit.material("#7d6d58"), x, 0.018, z);
  };

  if (type === "crane") {
    const mastHeight = 3.8;
    kit.box(group, 0.9, 0.06, 0.9, kit.material("#89857a"), 0, 0.03, 0, { outline: true });
    kit.box(group, 0.1, mastHeight, 0.1, yellow, 0, 0.06 + mastHeight / 2, 0, { outline: true });
    for (let brace = 0; brace < 8; brace += 1) {
      kit.box(group, 0.3, 0.025, 0.025, yellow, 0, 0.35 + brace * 0.42, 0, {
        rz: brace % 2 === 0 ? 0.65 : -0.65,
      });
    }
    kit.box(group, 2.8, 0.07, 0.07, yellow, 1.08, mastHeight + 0.08, 0, { outline: true });
    kit.box(group, 0.85, 0.07, 0.09, yellow, -0.55, mastHeight + 0.08, 0);
    kit.box(group, 0.32, 0.34, 0.32, dark, -0.87, mastHeight - 0.08, 0, { outline: true });
    kit.box(group, 0.05, 0.54, 0.05, yellow, 0, mastHeight + 0.35, 0);
    kit.box(group, 0.8, 0.035, 0.035, yellow, 0.28, mastHeight + 0.35, 0);
    kit.box(group, 0.5, 0.035, 0.035, yellow, -0.26, mastHeight + 0.35, 0);
    kit.box(group, 0.012, 1.25, 0.012, dark, 2.05, mastHeight - 0.5, 0);
    kit.box(group, 0.12, 0.12, 0.12, dark, 2.05, mastHeight - 1.12, 0, { outline: true });
    kit.box(group, 0.035, 0.035, 0.035, warn, 0, mastHeight + 0.65, 0);
    kit.box(group, 1.1, 0.05, 0.7, kit.material("#8b765b"), -0.4, 0.05, 0.9, { outline: true });
    kit.box(group, 0.34, 0.24, 0.3, kit.material("#947452"), 0.2, 0.17, 0.9, { outline: true });
    concretePile(-0.8, 0.85, 0.25, 0.18);
  } else if (type === "skeleton") {
    const floors = Math.max(5, model.floors ?? 8);
    const width = model.width ?? 1.5;
    const depth = model.depth ?? 1.3;
    kit.box(group, width + 0.6, 0.05, depth + 0.6, kit.material("#8d7c64"), 0, 0.025, 0, {
      outline: true,
    });
    for (let floor = 0; floor < floors; floor += 1) {
      const y = 0.08 + floor * 0.34;
      kit.box(group, width, 0.07, depth, concrete, 0, y, 0, { outline: true });
      for (const dx of [-1, 1]) {
        for (const dz of [-1, 1]) {
          kit.box(
            group,
            0.065,
            0.34,
            0.065,
            floor === floors - 1 ? kit.material("#8e8a7d") : concrete,
            dx * (width / 2 - 0.06),
            0.075 + floor * 0.34 + 0.17,
            dz * (depth / 2 - 0.06)
          );
        }
      }
    }
    for (const dz of [-1, 1]) {
      kit.box(group, width * 0.75, 0.2, 0.02, dark, 0, 0.27, dz * (depth / 2 + 0.05));
    }
    for (const dx of [-0.45, -0.15, 0.15, 0.45]) {
      kit.box(group, 0.018, 0.24, 0.018, kit.material("#5e5446"), dx, floors * 0.34 + 0.08, 0);
    }
    kit.box(group, width * 0.5, 0.75, 0.02, net, -width * 0.7, 0.48, 0.62, { ry: Math.PI / 2 });
    concretePile(0.9, 0.8, 0.28, 0.18);
    kit.box(group, 0.7, 0.04, 0.35, kit.wood, 0.8, 0.08, -0.75);
  } else if (type === "excavator") {
    kit.box(group, 1.15, 0.06, 0.67, kit.material("#806b52"), 0, 0.03, 0, { outline: true });
    kit.box(group, 0.63, 0.18, 0.42, dark, 0, 0.12, 0);
    kit.box(group, 0.36, 0.23, 0.32, yellow, 0.1, 0.26, 0, { outline: true });
    kit.box(group, 0.2, 0.2, 0.2, kit.darkWindow, 0.16, 0.32, 0.18, { outline: true });
    kit.box(group, 0.72, 0.085, 0.085, yellow, 0.42, 0.32, 0.17, { rz: 0.55, outline: true });
    kit.box(group, 0.48, 0.075, 0.075, yellow, 0.72, 0.12, 0.17, { rz: -0.8, outline: true });
    kit.box(group, 0.2, 0.17, 0.2, dark, 0.9, 0.04, 0.17, { outline: true });
    kit.box(group, 0.06, 0.16, 0.42, dark, -0.34, 0.13, 0);
    kit.box(group, 0.06, 0.16, 0.42, dark, 0.3, 0.13, 0);
    for (let track = 0; track < 4; track += 1) {
      kit.box(group, 0.08, 0.02, 0.62, kit.material("#353a38"), -0.3 + track * 0.18, 0.05, 0);
    }
    concretePile(-0.7, 0.55, 0.24, 0.17);
    kit.ico(group, 0.03, warn, 0.1, 0.44, 0);
  } else if (type === "scaffold") {
    const width = 1.0;
    const depth = 0.6;
    const levels = 6;
    kit.box(group, 1.5, 0.05, 1.0, kit.material("#9c8463"), 0, 0.025, 0, { outline: true });
    kit.box(group, width, 1.65, depth, concrete, 0, 0.86, 0, { outline: true });
    for (let side = -1; side <= 1; side += 2) {
      for (let level = 0; level <= levels; level += 1) {
        kit.box(group, 0.035, 0.035, 0.035, kit.steel, side * (width / 2 + 0.16), 0.13 + level * 0.31, depth / 2 + 0.18);
        kit.box(group, 0.035, 0.035, 0.035, kit.steel, side * (width / 2 + 0.16), 0.13 + level * 0.31, -depth / 2 - 0.18);
        kit.box(group, 0.035, 0.035, 0.5, kit.steel, side * (width / 2 + 0.16), 0.13 + level * 0.31, 0);
      }
    }
    for (let level = 0; level < levels; level += 2) {
      kit.box(group, width + 0.4, 0.02, depth + 0.4, kit.steel, 0, 0.13 + level * 0.31, 0);
      kit.box(group, width + 0.24, 0.18, 0.02, net, 0, 0.55 + level * 0.3, depth / 2 + 0.2);
    }
    kit.box(group, 0.05, 0.4, 0.05, kit.darkMetal, -width / 2 - 0.18, 0.25, depth / 2 + 0.2, { rz: 0.8 });
    concretePile(0.9, 0.42, 0.25, 0.16);
  } else if (type === "fence") {
    kit.box(group, 2.6, 0.035, 0.6, kit.material("#9c8463"), 0, 0.018, 0, { outline: true });
    for (let panel = 0; panel < 6; panel += 1) {
      const x = -1.25 + panel * 0.5;
      kit.box(group, 0.48, 0.48, 0.04, orange, x, 0.3, 0.02, { outline: true });
      kit.box(group, 0.48, 0.08, 0.045, white, x, 0.5, 0.03);
      kit.box(group, 0.035, 0.62, 0.035, kit.steel, x - 0.26, 0.33, 0.02);
    }
    kit.box(group, 0.78, 0.3, 0.035, kit.material("#d9c5a3"), 0.2, 0.34, 0.055);
    kit.box(group, 0.38, 0.1, 0.015, kit.material("#895b44"), 0.2, 0.36, 0.08);
    kit.box(group, 0.4, 0.3, 0.3, kit.material("#9b7e59"), -0.78, 0.2, -0.25, { outline: true });
    kit.box(group, 0.16, 0.18, 0.16, kit.material("#897358"), -0.42, 0.14, -0.2);
    kit.box(group, 0.06, 0.22, 0.06, kit.glow("#ff6b58"), 1.4, 0.32, 0);
  } else if (type === "materials") {
    kit.box(group, 1.9, 0.035, 1.5, kit.material("#9c8463"), 0, 0.018, 0, { outline: true });
    concretePile(-0.52, -0.35, 0.4, 0.3);
    concretePile(0.35, -0.2, 0.28, 0.22);
    for (let pipe = 0; pipe < 3; pipe += 1) {
      kit.cyl(group, 0.075, 1.25, kit.steel, 0.2, 0.08 + pipe * 0.13, 0.45, {
        rz: Math.PI / 2,
      });
    }
    for (let pallet = 0; pallet < 3; pallet += 1) {
      kit.box(group, 0.3, 0.04, 0.28, kit.wood, -0.7 + pallet * 0.31, 0.04, 0.5);
      kit.box(group, 0.24, 0.16, 0.22, kit.material("#b89f7a"), -0.7 + pallet * 0.31, 0.14, 0.5);
    }
    for (let bag = 0; bag < 3; bag += 1) {
      kit.box(group, 0.2, 0.16, 0.13, kit.material("#d4c39e"), 0.6, 0.08 + bag * 0.1, -0.55, { ry: 0.2 });
    }
    kit.box(group, 0.42, 0.28, 0.32, kit.material("#5f7e73"), -0.55, 0.16, 0.15);
  } else if (type === "office") {
    kit.box(group, 1.7, 0.05, 1.0, kit.material("#9c8463"), 0, 0.025, 0, { outline: true });
    kit.box(group, 1.15, 0.44, 0.57, kit.material(model.wall ?? "#7fa69c"), 0, 0.26, 0, {
      outline: true,
    });
    kit.box(group, 1.17, 0.06, 0.59, white, 0, 0.51, 0);
    kit.box(group, 0.22, 0.16, 0.02, kit.darkWindow, -0.3, 0.33, 0.3);
    kit.box(group, 0.22, 0.16, 0.02, kit.darkWindow, 0.12, 0.33, 0.3);
    kit.box(group, 0.18, 0.28, 0.03, kit.door, 0.42, 0.21, 0.3);
    kit.box(group, 0.2, 0.15, 0.2, kit.steel, 0.3, 0.61, 0);
    for (let step = 0; step < 3; step += 1) {
      kit.box(group, 0.34 + step * 0.08, 0.03, 0.08, kit.trim, 0.45, 0.06 + step * 0.03, 0.48 + step * 0.09);
    }
    kit.box(group, 0.4, 0.2, 0.06, kit.material("#dfd3b7"), -0.52, 0.38, 0.31);
    kit.box(group, 0.3, 0.04, 0.02, kit.material("#7b5e45"), -0.52, 0.44, 0.35);
  }

  return group;
}

function buildAttraction(asset, kit, rng) {
  const model = asset.model;
  const attraction = model.attraction;
  const group = new THREE.Group();
  const accent = kit.material(model.accent ?? "#e8735f", { roughness: 0.7 });
  const cream = kit.material("#f0e3c8", { roughness: 0.9 });
  const bulb = kit.glow(model.light ?? "#ffd166");
  const palette = (model.colors ?? ["#e8735f", "#f2b65c", "#6fc3b2"]).map((color) =>
    kit.material(color, { roughness: 0.7 })
  );

  if (attraction === "ferris") {
    const radius = model.radius ?? 2.1;
    const hubY = radius * 0.95 + 0.45;
    const scale = radius / 2.1;
    kit.cyl(group, 1.0 * scale, 0.12, kit.stone, 0, 0.06, 0, { segments: 12 });
    kit.cyl(group, 1.12 * scale, 0.035, kit.trim, 0, 0.135, 0, { segments: 12 });
    for (const side of [-1, 1]) {
      kit.box(group, 0.08, hubY - 0.2, 0.08, kit.darkMetal, -0.83 * scale, (hubY + 0.2) / 2, side * 0.33, {
        rz: 0.06,
        outline: true,
      });
      kit.box(group, 0.08, hubY - 0.2, 0.08, kit.darkMetal, 0.83 * scale, (hubY + 0.2) / 2, side * 0.33, {
        rz: -0.06,
        outline: true,
      });
      kit.box(group, 0.1, 0.08, 0.62, kit.darkMetal, 0, hubY, side * 0.33);
    }
    kit.box(group, 1.85 * scale, 0.07, 0.07, kit.darkMetal, 0, hubY + 0.35 * scale, 0);
    kit.box(group, 0.9 * scale, 0.08, 0.7, kit.material("#b9a27e"), 0, 0.15, 0.52, { outline: true });
    kit.cyl(group, 0.16 * scale, 0.16, kit.steel, 0, hubY, 0, { rx: Math.PI / 2, segments: 12 });
    kit.torus(group, radius * 0.63, kit.steel, 0, hubY, 0, { outline: true });
    kit.torus(group, radius * 0.48, palette[2], 0, hubY, 0, { outline: false });
    for (let spoke = 0; spoke < 10; spoke += 1) {
      const angle = (spoke / 10) * TAU;
      kit.box(
        group,
        radius * 0.62,
        0.016,
        0.016,
        kit.steel,
        Math.cos(angle) * radius * 0.31,
        hubY + Math.sin(angle) * radius * 0.31,
        0,
        { rz: angle }
      );
    }
    for (let cabin = 0; cabin < 10; cabin += 1) {
      const angle = (cabin / 10) * TAU + Math.PI / 2;
      const x = Math.cos(angle) * radius * 0.68;
      const y = hubY + Math.sin(angle) * radius * 0.68;
      kit.box(group, 0.13, 0.07, 0.16, palette[cabin % palette.length], x, y - 0.06, 0, {
        outline: true,
      });
      kit.box(group, 0.1, 0.06, 0.12, cream, x, y + 0.01, 0);
      kit.box(group, 0.018, 0.07, 0.018, kit.darkMetal, x, y + 0.08, 0);
    }
    for (let light = 0; light < 8; light += 1) {
      const angle = (light / 8) * TAU;
      kit.ico(
        group,
        0.022,
        light % 2 === 0 ? bulb : palette[light % palette.length],
        Math.cos(angle) * radius * 0.72,
        hubY + Math.sin(angle) * radius * 0.72,
        0
      );
    }
    kit.ico(group, 0.035, bulb, 0, hubY + radius * 0.74, 0);
  } else if (attraction === "carousel") {
    const radius = model.radius ?? 0.95;
    kit.cyl(group, radius * 1.28, 0.1, kit.stone, 0, 0.05, 0, { segments: 16 });
    kit.cyl(group, radius * 1.04, 0.09, cream, 0, 0.14, 0, { segments: 16 });
    kit.cyl(group, radius * 0.92, 0.035, palette[1], 0, 0.2, 0, { segments: 16 });
    kit.cyl(group, 0.07, 0.74, kit.darkMetal, 0, 0.57, 0, { segments: 8 });
    kit.cyl(group, radius * 0.84, 0.1, palette[0], 0, 1.0, 0, { segments: 16 });
    kit.cone(group, radius * 1.0, 0.44, palette[2], 0, 1.1, 0, { segments: 10 });
    kit.cone(group, radius * 0.92, 0.05, cream, 0, 1.16, 0, { segments: 10 });
    kit.cyl(group, 0.03, 0.24, kit.steel, 0, 1.5, 0);
    kit.ico(group, 0.045, bulb, 0, 1.62, 0);
    for (let panel = 0; panel < 8; panel += 1) {
      const angle = (panel / 8) * TAU;
      kit.box(
        group,
        radius * 0.8,
        0.06,
        0.08,
        palette[panel % palette.length],
        Math.cos(angle) * radius * 0.62,
        1.04,
        Math.sin(angle) * radius * 0.62,
        { ry: -angle }
      );
    }
    for (let horse = 0; horse < 6; horse += 1) {
      const angle = (horse / 6) * TAU + 0.2;
      const x = Math.cos(angle) * radius * 0.63;
      const z = Math.sin(angle) * radius * 0.63;
      kit.cyl(group, 0.014, 0.6, kit.steel, x, 0.52, z);
      kit.box(group, 0.16, 0.1, 0.06, palette[horse % palette.length], x, 0.45, z, {
        outline: true,
        ry: -angle,
      });
      kit.box(group, 0.04, 0.08, 0.04, cream, x + Math.cos(angle) * 0.04, 0.51, z + Math.sin(angle) * 0.04, {
        ry: -angle,
      });
    }
    for (let light = 0; light < 8; light += 1) {
      const angle = (light / 8) * TAU;
      kit.ico(
        group,
        0.02,
        light % 2 === 0 ? bulb : cream,
        Math.cos(angle) * radius * 0.86,
        1.11,
        Math.sin(angle) * radius * 0.86
      );
    }
  } else if (attraction === "tent") {
    const radius = model.radius ?? 0.7;
    kit.cyl(group, radius * 1.3, 0.06, kit.path, 0, 0.03, 0, { segments: 10 });
    kit.cyl(group, radius, 0.5, cream, 0, 0.3, 0, { segments: 8 });
    for (let stripe = 0; stripe < 8; stripe += 2) {
      const angle = (stripe / 8) * TAU;
      kit.box(
        group,
        radius * 1.02,
        0.52,
        0.03,
        accent,
        Math.cos(angle) * radius * 0.5,
        0.3,
        Math.sin(angle) * radius * 0.5,
        { ry: -angle }
      );
    }
    kit.cone(group, radius * 1.13, 0.52, accent, 0, 0.55, 0, { segments: 8, outline: true });
    for (let stripe = 0; stripe < 8; stripe += 2) {
      const angle = (stripe / 8) * TAU;
      kit.box(
        group,
        radius * 1.1,
        0.5,
        0.035,
        cream,
        Math.cos(angle) * radius * 0.55,
        0.8,
        Math.sin(angle) * radius * 0.55,
        { ry: -angle, rz: 0.5 }
      );
    }
    kit.box(group, 0.25, 0.32, 0.03, kit.door, 0, 0.21, radius + 0.02);
    kit.box(group, 0.18, 0.16, 0.02, kit.darkWindow, 0, 0.31, radius + 0.04);
    kit.cyl(group, 0.015, 0.4, kit.darkMetal, 0, 1.15, 0);
    kit.box(group, 0.18, 0.1, 0.02, palette[1], 0.11, 1.27, 0);
  } else if (attraction === "gate") {
    for (const side of [-1, 1]) {
      kit.box(group, 0.16, 1.15, 0.16, cream, side * 0.85, 0.58, 0, { outline: true });
      kit.box(group, 0.24, 0.07, 0.24, accent, side * 0.85, 1.18, 0);
      for (let light = 0; light < 3; light += 1) {
        kit.ico(group, 0.024, bulb, side * 0.85, 0.3 + light * 0.3, 0.1);
      }
    }
    kit.box(group, 1.95, 0.15, 0.22, accent, 0, 1.3, 0, { outline: true });
    kit.box(group, 1.3, 0.38, 0.05, kit.material("#2d3b42"), 0, 1.3, 0.13);
    kit.box(group, 1.15, 0.26, 0.02, cream, 0, 1.3, 0.16);
    for (let light = 0; light < 9; light += 1) {
      kit.ico(group, 0.018, light % 2 === 0 ? bulb : palette[0], -0.76 + light * 0.19, 1.4, 0.15);
    }
    kit.box(group, 2.2, 0.035, 0.64, kit.path, 0, 0.018, 0);
    kit.cyl(group, 0.18, 0.06, accent, 0.6, 0.05, 0.65, { segments: 10 });
    kit.cyl(group, 0.1, 0.5, kit.material("#e8735f"), 0.6, 0.24, 0.65);
    kit.cone(group, 0.26, 0.18, cream, 0.6, 0.49, 0.65);
  } else if (attraction === "gazebo") {
    kit.cyl(group, 0.9, 0.08, kit.wood, 0, 0.04, 0, { segments: 8 });
    kit.cyl(group, 0.8, 0.035, kit.path, 0, 0.1, 0, { segments: 8 });
    for (let post = 0; post < 6; post += 1) {
      const angle = (post / 6) * TAU;
      const x = Math.cos(angle) * 0.62;
      const z = Math.sin(angle) * 0.62;
      kit.cyl(group, 0.045, 0.72, cream, x, 0.46, z);
      kit.box(group, 0.46, 0.04, 0.04, kit.wood, x * 0.75, 0.2, z * 0.75, { ry: -angle });
    }
    kit.cyl(group, 0.77, 0.1, accent, 0, 0.84, 0, { segments: 6 });
    kit.cone(group, 0.98, 0.46, kit.material(model.accent), 0, 0.89, 0, { segments: 6, outline: true });
    kit.cyl(group, 0.03, 0.2, kit.darkMetal, 0, 1.4, 0);
    kit.ico(group, 0.055, bulb, 0, 1.52, 0);
    kit.box(group, 0.46, 0.035, 0.18, kit.wood, 0.5, 0.22, 0, { outline: true });
    kit.cyl(group, 0.12, 0.24, kit.material("#5e7860"), -0.37, 0.18, 0.4, { segments: 8 });
  }

  return group;
}

export function createShowcaseModel(asset, options = {}) {
  const kit = options.kit ?? new ShowcaseKit();
  const seed = options.seed ?? "pixel-bay";
  if (!asset || !asset.model) {
    throw new Error("createShowcaseModel requires a catalog asset with a model");
  }
  const rng = mulberry32(hashSeed(`${asset.id}:${seed}`));
  const kind = asset.model.kind;
  let group;

  switch (kind) {
    case "building":
      group = buildBuilding(asset, kit, rng, { mini: false });
      break;
    case "skyscraper":
      group = buildSkyscraper(asset, kit, rng);
      break;
    case "construction":
      group = buildConstruction(asset, kit, rng);
      break;
    case "district":
      group = buildDistrict(asset, kit, rng, `${seed}`);
      break;
    case "park":
      group = buildPark(asset, kit, rng);
      break;
    case "attraction":
      group = buildAttraction(asset, kit, rng);
      break;
    case "vehicle":
      group = buildVehicle(asset, kit, rng);
      break;
    case "street":
      group = buildStreetProp(asset, kit, rng);
      break;
    case "nature":
      group = buildNature(asset, kit, rng);
      break;
    case "maritime":
      group = buildMaritime(asset, kit, rng);
      break;
    default: {
      group = new THREE.Group();
      kit.box(group, 0.8, 0.5, 0.8, kit.material("#8a8f86"), 0, 0.25, 0, { outline: true });
      break;
    }
  }

  group.name = asset.id;
  group.userData.assetId = asset.id;
  group.userData.kind = kind;
  return group;
}

export function disposeShowcaseModel(model) {
  if (!model) return;
  model.traverse((object) => {
    if (object.isInstancedMesh && typeof object.dispose === "function") object.dispose();
  });
  model.removeFromParent();
  model.clear();
}
