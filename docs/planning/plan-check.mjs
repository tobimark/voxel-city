// Structural audit + pure-Node top-down preview for the Pixel Bay city plan.
//
// Consumes ONLY the stable public API of src/city-plan.js:
//   static: ISLAND_EXTENT, BAY, LAND_RECTS, EDGE_SEGMENTS, (optional ZONES)
//   dynamic: createCityPlan(rng) -> { island, blocks, streets, arterials, piers,
//            rail, promenades, bayLoop, quayRoads }
// Every check is geometry-driven so it keeps working while the generator is
// rewritten (numbers change, rotated blocks become axis-aligned, ZONES may be
// exported). No app sources are modified; output stays inside docs/planning/.
//
// Usage:
//   node docs/planning/plan-check.mjs
//   node docs/planning/plan-check.mjs --seeds A9B0DF33,0x2A --size 1400
//   node docs/planning/plan-check.mjs --module docs/planning/.tmp-city-plan-before.mjs --tag before
//   node docs/planning/plan-check.mjs --no-png
//
// Outputs (docs/planning/): plan-report.json, plan-<seed>.png,
// plan-<seed>-violations.png; with --tag before also before-plan.png and
// before-plan-violations.png. Exit code stays 0 unless the tool itself throws.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

// ------------------------------------------------------------------ CLI args
const argv = process.argv.slice(2);
function arg(name, fallback = "") {
  const index = argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return argv[index + 1] ?? fallback;
}
const hasFlag = (name) => argv.includes(`--${name}`);

if (hasFlag("help")) {
  console.log(
    "Usage: node docs/planning/plan-check.mjs [--seeds A9B0DF33,0x2A] [--size 1100]\n" +
      "       [--out docs/planning] [--module src/city-plan.js] [--tag before] [--no-png]"
  );
  process.exit(0);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const OUT_DIR = path.resolve(ROOT, arg("out", "docs/planning"));
const MODULE_PATH = path.resolve(ROOT, arg("module", "src/city-plan.js"));
const SIZE = Math.max(400, Math.min(2400, Number(arg("size", 1100)) || 1100));
const TAG = String(arg("tag", "")).trim();
const RENDER = !hasFlag("no-png");
const BASELINE_SEED = 0xa9b0df33;
const DEFAULT_SEEDS =
  "A9B0DF33,0x0,0x1,0x2A,0x7EA,0x12345678,0xDEADBEEF,0xFFFFFFFF,0xA1B2C3D4";

// Roles the plan is expected to hand to the renderer. `greenway-*` is a family.
const EXPECTED_ROLES = [
  "landmark",
  "skyscraper",
  "office",
  "clocktower",
  "market",
  "department",
  "civic",
  "school",
  "campus-green",
  "energy",
  "warehouse",
  "yard",
  "harbor-office",
  "neighbourhood-park",
  "construction",
  "station",
  "promenade-park",
  "amusement",
];

// District colours reused from docs/planning/audit.mjs so images stay comparable.
const DISTRICT_COLORS = {
  downtown: [189, 148, 94],
  oldtown: [185, 126, 105],
  civic: [189, 181, 162],
  commercial: [187, 147, 116],
  residential: [121, 148, 95],
  academic: [110, 159, 163],
  industrial: [137, 145, 140],
  harbor: [115, 152, 174],
  creative: [184, 129, 156],
  green: [149, 185, 107],
  amusement: [212, 171, 103],
};
const FALLBACK_COLORS = [
  [160, 140, 110],
  [130, 150, 140],
  [150, 130, 160],
  [120, 140, 160],
  [170, 150, 130],
  [140, 160, 120],
  [160, 120, 130],
  [110, 130, 120],
];

// ------------------------------------------------------------------ utilities
const finite = (value) => typeof value === "number" && Number.isFinite(value);
function num(value, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function pickFinite(...values) {
  for (const value of values) if (finite(value)) return value;
  return undefined;
}
const round = (value, digits = 3) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const median = (values) => {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const seedHex = (seed) => (seed >>> 0).toString(16).toUpperCase().padStart(8, "0");
function hashString(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function districtColor(name) {
  if (DISTRICT_COLORS[name]) return DISTRICT_COLORS[name];
  return FALLBACK_COLORS[hashString(String(name)) % FALLBACK_COLORS.length];
}
function parseSeedList(text) {
  const seeds = [];
  for (const token of String(text ?? "").split(",").map((value) => value.trim()).filter(Boolean)) {
    let value;
    if (/^0x/i.test(token)) value = Number.parseInt(token.slice(2), 16);
    else if (/^\d+$/.test(token)) value = Number.parseInt(token, 10);
    else value = Number.parseInt(token, 16);
    if (Number.isFinite(value)) seeds.push(value >>> 0);
  }
  if (!seeds.length) seeds.push(BASELINE_SEED);
  return [...new Set(seeds)];
}
function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ geometry
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];

// Local rectangle -> world polygon in (x, z). CCW in the x/z plane, which is
// what the Sutherland-Hodgman clip below expects.
function rectangle(x, z, w, d, angle = 0) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([u, v]) => [x + ((u * w) / 2) * cos + ((v * d) / 2) * sin, z - ((u * w) / 2) * sin + ((v * d) / 2) * cos]);
}
const polygonArea = (points) =>
  Math.abs(points.reduce((sum, point, index) => sum + cross(point, points[(index + 1) % points.length]), 0)) / 2;

// Sutherland-Hodgman against a convex (CCW) clipping polygon.
function clipPolygon(subject, clip) {
  let result = subject;
  for (let i = 0; i < clip.length && result.length; i += 1) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const edge = sub(b, a);
    const inside = (point) => cross(edge, sub(point, a)) >= -1e-9;
    const intersect = (p, q) => {
      const direction = sub(q, p);
      const denominator = cross(edge, direction);
      const t = Math.abs(denominator) < 1e-12 ? 0 : -cross(edge, sub(p, a)) / denominator;
      return [p[0] + direction[0] * t, p[1] + direction[1] * t];
    };
    const input = result;
    result = [];
    for (let j = 0; j < input.length; j += 1) {
      const p = input[j];
      const q = input[(j + 1) % input.length];
      if (inside(p) && inside(q)) result.push(q);
      else if (inside(p)) result.push(intersect(p, q));
      else if (inside(q)) result.push(intersect(p, q), q);
    }
  }
  return result;
}
function intersectionArea(a, b) {
  const clipped = clipPolygon(a, b);
  return clipped.length < 3 ? 0 : polygonArea(clipped);
}
const rectPolygon = ([x0, x1, z0, z1]) => rectangle((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0);
const blockPolygon = (block) => rectangle(block.x, block.z, block.w, block.d, num(block.angle));
function roadPolygon(road) {
  const width = num(road.width, 0.8) || 0.8;
  const length = Math.hypot(road.x1 - road.x0, road.z1 - road.z0);
  const angle = Math.atan2(-(road.z1 - road.z0), road.x1 - road.x0);
  return rectangle((road.x0 + road.x1) / 2, (road.z0 + road.z1) / 2, length, width, angle);
}

// Normalise the module/plan rectangle shapes into { x0, x1, z0, z1 }.
function rectFrom(value) {
  if (!value) return null;
  if (Array.isArray(value) && value.length === 4) {
    let [x0, x1, z0, z1] = value.map((entry) => num(entry, NaN));
    if (![x0, x1, z0, z1].every(Number.isFinite)) return null;
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (z1 < z0) [z0, z1] = [z1, z0];
    return { x0, x1, z0, z1 };
  }
  if (typeof value === "object") {
    const x0 = num(value.x0, NaN);
    const x1 = num(value.x1, NaN);
    const z0 = num(value.z0, NaN);
    const z1 = num(value.z1, NaN);
    if (![x0, x1, z0, z1].every(Number.isFinite)) return null;
    return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) };
  }
  return null;
}
function normalizeRectList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(rectFrom).filter(Boolean);
}

// Optional zone boundaries. The generator only has to export these after the
// rewrite; when absent the zone sub-check is skipped, not failed.
function normalizeZones(mod, plan) {
  const candidates = [mod.ZONES, mod.ZONE_RECTS, mod.ZONE_BOUNDS, plan.zones];
  for (const raw of candidates) {
    if (!raw) continue;
    const zones = [];
    if (Array.isArray(raw)) {
      for (const zone of raw) {
        if (!zone) continue;
        const id = [zone.id, zone.zone, zone.name, zone.key].find(
          (value) => value !== undefined && value !== null
        );
        const rect = rectFrom(zone.rect ?? zone.bounds ?? zone);
        if (id !== undefined && id !== null && rect) zones.push({ id, rect });
      }
    } else if (typeof raw === "object") {
      for (const [id, zone] of Object.entries(raw)) {
        const rect = rectFrom(zone?.rect ?? zone?.bounds ?? zone);
        if (rect) zones.push({ id, rect });
      }
    }
    if (zones.length) return zones;
  }
  return null;
}

function pointSegmentDistance(point, road) {
  const a = [road.x0, road.z0];
  const b = [road.x1, road.z1];
  const v = sub(b, a);
  const w = sub(point, a);
  const lengthSq = v[0] * v[0] + v[1] * v[1];
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, (w[0] * v[0] + w[1] * v[1]) / lengthSq));
  return Math.hypot(point[0] - a[0] - t * v[0], point[1] - a[1] - t * v[1]);
}
// Distance from a point to a road's painted ribbon rectangle (0 when inside).
function pointRibbonDistance(point, road) {
  const half = (num(road.width, 0.8) || 0.8) / 2;
  const dx = road.x1 - road.x0;
  const dz = road.z1 - road.z0;
  const length = Math.hypot(dx, dz);
  if (length < 1e-9) return Math.hypot(point[0] - road.x0, point[1] - road.z0);
  const ux = dx / length;
  const uz = dz / length;
  const px = point[0] - road.x0;
  const pz = point[1] - road.z0;
  const along = px * ux + pz * uz;
  const lateral = Math.abs(pz * ux - px * uz);
  const overshoot = along < 0 ? -along : along > length ? along - length : 0;
  return Math.hypot(overshoot, Math.max(0, lateral - half));
}

function segmentDistance(a, b) {
  const p = [a.x0, a.z0];
  const q = [b.x0, b.z0];
  const u = [a.x1 - a.x0, a.z1 - a.z0];
  const v = [b.x1 - b.x0, b.z1 - b.z0];
  const denominator = cross(u, v);
  if (Math.abs(denominator) > 1e-10) {
    const t = cross(sub(q, p), v) / denominator;
    const s = cross(sub(q, p), u) / denominator;
    if (t >= 0 && t <= 1 && s >= 0 && s <= 1) return 0;
  }
  return Math.min(
    pointSegmentDistance(p, b),
    pointSegmentDistance([a.x1, a.z1], b),
    pointSegmentDistance(q, a),
    pointSegmentDistance([b.x1, b.z1], a)
  );
}
function orientation(p, q, r) {
  const value = cross(sub(q, p), sub(r, p));
  if (Math.abs(value) < 1e-9) return 0;
  return value > 0 ? 1 : -1;
}
function properCross(a, b) {
  const p1 = [a.x0, a.z0];
  const p2 = [a.x1, a.z1];
  const q1 = [b.x0, b.z0];
  const q2 = [b.x1, b.z1];
  const o1 = orientation(p1, p2, q1);
  const o2 = orientation(p1, p2, q2);
  const o3 = orientation(q1, q2, p1);
  const o4 = orientation(q1, q2, p2);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function roadComponents(roads, tolerance, mode) {
  const parent = roads.map((_, index) => index);
  const root = (index) => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  for (let i = 0; i < roads.length; i += 1) {
    for (let j = i + 1; j < roads.length; j += 1) {
      let connected;
      if (mode === "ribbon") connected = intersectionArea(roadPolygon(roads[i]), roadPolygon(roads[j])) > 1e-4;
      else connected = segmentDistance(roads[i], roads[j]) <= tolerance;
      if (connected) parent[root(i)] = root(j);
    }
  }
  const sizes = new Map();
  for (let index = 0; index < roads.length; index += 1) {
    const key = root(index);
    sizes.set(key, (sizes.get(key) ?? 0) + 1);
  }
  const values = [...sizes.values()].sort((a, b) => b - a);
  return { count: values.length, sizes: values, parent };
}

function segmentKey(segment, withWidth) {
  const values = [segment.x0, segment.z0, segment.x1, segment.z1];
  if (withWidth) values.push(num(segment.width));
  return values.map((value) => num(value).toFixed(5)).join("|");
}
function validSegment(segment) {
  if (!segment) return false;
  return (
    finite(segment.x0) &&
    finite(segment.z0) &&
    finite(segment.x1) &&
    finite(segment.z1) &&
    Math.hypot(segment.x1 - segment.x0, segment.z1 - segment.z0) > 1e-6
  );
}
function dedupeSegments(list) {
  const map = new Map();
  for (const segment of list) {
    if (!validSegment(segment)) continue;
    const key = segmentKey(segment, false);
    if (!map.has(key)) map.set(key, segment);
  }
  return [...map.values()];
}

// Piers may be {x,z,dir,length,width} (current) or a road-like ribbon.
function pierPolygon(pier) {
  if (!pier) return null;
  const hasEndpoints = [pier.x0, pier.z0, pier.x1, pier.z1].every(finite);
  if (hasEndpoints) {
    return roadPolygon({ x0: pier.x0, z0: pier.z0, x1: pier.x1, z1: pier.z1, width: num(pier.width, num(pier.w, 1)) });
  }
  const x = pickFinite(pier.x, pier.cx, pier.centerX);
  const z = pickFinite(pier.z, pier.cz, pier.centerZ);
  const length = pickFinite(pier.length, pier.len, pier.depth);
  const width = pickFinite(pier.width, pier.w);
  if (!finite(x) || !finite(z) || !finite(length) || !finite(width) || length <= 0 || width <= 0) return null;
  const direction = String(pier.dir ?? pier.direction ?? pier.axis ?? "south").toLowerCase();
  let dx = 0;
  let dz = 1;
  if (direction.startsWith("n")) dz = -1;
  else if (direction.startsWith("s")) dz = 1;
  else if (direction.startsWith("e")) {
    dx = 1;
    dz = 0;
  } else if (direction.startsWith("w")) {
    dx = -1;
    dz = 0;
  }
  const centerX = x + (dx * length) / 2;
  const centerZ = z + (dz * length) / 2;
  return rectangle(centerX, centerZ, dx !== 0 ? length : width, dx !== 0 ? width : length, 0);
}

// Promenades are either road ribbons (width) or explicit quads (new plan).
function promenadePolygon(segment) {
  if (!segment) return null;
  if (validSegment(segment) && finite(segment.width) && segment.width > 0) return roadPolygon(segment);
  const rect = rectFrom(segment);
  return rect ? rectPolygon([rect.x0, rect.x1, rect.z0, rect.z1]) : null;
}

function railSegments(rail, extent) {
  if (!rail) return [];
  const out = [];
  const push = (x0, z0, x1, z1) => {
    if ([x0, z0, x1, z1].every(finite)) out.push({ x0, z0, x1, z1 });
  };
  const pushEntry = (entry) => {
    if (!entry) return;
    if (Array.isArray(entry) && entry.length === 4) push(...entry);
    else if ([entry.x0, entry.z0, entry.x1, entry.z1].every(finite)) push(entry.x0, entry.z0, entry.x1, entry.z1);
  };
  if (Array.isArray(rail)) {
    rail.forEach(pushEntry);
    return out;
  }
  if (Array.isArray(rail.segments)) rail.segments.forEach(pushEntry);
  if (Array.isArray(rail.tracks)) rail.tracks.forEach(pushEntry);
  if (finite(rail.z) && !out.length) push(rail.x0 ?? -extent, rail.z, rail.x1 ?? extent, rail.z);
  if (finite(rail.x0) && finite(rail.z0)) push(rail.x0, rail.z0, rail.x1, rail.z1);
  return out;
}

// ------------------------------------------------------------------ PNG writer
// Copied from docs/skyscrapers/render.mjs (CRC32 + zlib, no dependencies).
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
function pngChunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}
function writePNG(file, width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 3 + 1)] = 0;
    rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
}

// ------------------------------------------------------------------ raster
class Raster {
  constructor(width, height, background) {
    this.width = width;
    this.height = height;
    this.pixels = Buffer.alloc(width * height * 3);
    this.fillRect(0, 0, width, height, background);
  }
  setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const offset = (y * this.width + x) * 3;
    this.pixels[offset] = color[0];
    this.pixels[offset + 1] = color[1];
    this.pixels[offset + 2] = color[2];
  }
  blendPixel(x, y, color, alpha) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const offset = (y * this.width + x) * 3;
    const a = clamp01(alpha);
    for (let channel = 0; channel < 3; channel += 1) {
      this.pixels[offset + channel] = Math.round(this.pixels[offset + channel] * (1 - a) + color[channel] * a);
    }
  }
  fillRect(x0, y0, x1, y1, color) {
    const ax = Math.max(0, Math.floor(x0));
    const ay = Math.max(0, Math.floor(y0));
    const bx = Math.min(this.width, Math.ceil(x1));
    const by = Math.min(this.height, Math.ceil(y1));
    for (let y = ay; y < by; y += 1) {
      for (let x = ax; x < bx; x += 1) {
        const offset = (y * this.width + x) * 3;
        this.pixels[offset] = color[0];
        this.pixels[offset + 1] = color[1];
        this.pixels[offset + 2] = color[2];
      }
    }
  }
  // Even-odd scanline polygon fill in pixel coordinates.
  fillPolygon(points, color, alpha = 1) {
    if (points.length < 3) return;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const point of points) {
      if (point[1] < minY) minY = point[1];
      if (point[1] > maxY) maxY = point[1];
    }
    const yStart = Math.max(0, Math.floor(minY));
    const yEnd = Math.min(this.height - 1, Math.ceil(maxY));
    const xs = [];
    for (let y = yStart; y <= yEnd; y += 1) {
      const scan = y + 0.5;
      xs.length = 0;
      for (let index = 0; index < points.length; index += 1) {
        const a = points[index];
        const b = points[(index + 1) % points.length];
        if ((a[1] <= scan && b[1] > scan) || (b[1] <= scan && a[1] > scan)) {
          const t = (scan - a[1]) / (b[1] - a[1]);
          xs.push(a[0] + (b[0] - a[0]) * t);
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xFrom = Math.max(0, Math.ceil(xs[k] - 0.5));
        const xTo = Math.min(this.width - 1, Math.ceil(xs[k + 1] - 0.5) - 1);
        for (let x = xFrom; x <= xTo; x += 1) {
          if (alpha >= 1) this.setPixel(x, y, color);
          else this.blendPixel(x, y, color, alpha);
        }
      }
    }
  }
  strokePolygon(points, color, thickness = 1) {
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      this.line(a[0], a[1], b[0], b[1], color, thickness);
    }
  }
  line(x0, y0, x1, y1, color, thickness = 1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lengthSq = dx * dx + dy * dy;
    const radius = Math.max(0.5, thickness / 2);
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - radius - 1));
    const maxX = Math.min(this.width - 1, Math.ceil(Math.max(x0, x1) + radius + 1));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - radius - 1));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(y0, y1) + radius + 1));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const px = x + 0.5;
        const py = y + 0.5;
        let t = lengthSq === 0 ? 0 : ((px - x0) * dx + (py - y0) * dy) / lengthSq;
        t = clamp01(t);
        const nearestX = x0 + dx * t;
        const nearestY = y0 + dy * t;
        if (Math.hypot(px - nearestX, py - nearestY) <= radius) this.setPixel(x, y, color);
      }
    }
  }
  circle(centerX, centerY, radius, color, thickness = 1) {
    const outer = radius + thickness / 2;
    const inner = Math.max(0, radius - thickness / 2);
    const minX = Math.max(0, Math.floor(centerX - outer - 1));
    const maxX = Math.min(this.width - 1, Math.ceil(centerX + outer + 1));
    const minY = Math.max(0, Math.floor(centerY - outer - 1));
    const maxY = Math.min(this.height - 1, Math.ceil(centerY + outer + 1));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const distance = Math.hypot(x + 0.5 - centerX, y + 0.5 - centerY);
        if (distance <= outer && distance >= inner) this.setPixel(x, y, color);
      }
    }
  }
}

// ------------------------------------------------------------------ module load
async function loadPlanModule(file) {
  const source = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const sha256 = createHash("sha256").update(source).digest("hex");
  let loaded = null;
  let lastError = null;
  for (let attempt = 0; attempt < 6 && !loaded; attempt += 1) {
    try {
      loaded = await import(`${pathToFileURL(file).href}?v=${Date.now()}-${attempt}`);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  if (!loaded) throw new Error(`Could not import ${file}: ${lastError?.message ?? lastError}`);
  if (typeof loaded.createCityPlan !== "function") {
    throw new Error(`${file} does not export createCityPlan(rng)`);
  }
  return { mod: loaded, sha256, bytes: Buffer.byteLength(source) };
}

// ------------------------------------------------------------------ audit
function capList(list, limit = 30) {
  return { total: list.length, items: list.slice(0, limit) };
}

function auditPlan(seed, plan, mod) {
  const hex = seedHex(seed);
  const blocks = Array.isArray(plan?.blocks) ? plan.blocks : [];
  const streetsAll = Array.isArray(plan?.streets) ? plan.streets : [];
  const arterials = Array.isArray(plan?.arterials) ? plan.arterials : [];
  const piers = Array.isArray(plan?.piers) ? plan.piers : [];
  const promenades = Array.isArray(plan?.promenades) ? plan.promenades : [];
  const islandExtent = num(plan?.island?.extent, num(mod.ISLAND_EXTENT, 23.2));
  const landRects = normalizeRectList(plan?.island?.land ?? plan?.land ?? mod.LAND_RECTS);
  const bayRect = rectFrom(plan?.island?.bay ?? plan?.bay ?? mod.BAY);
  const zones = normalizeZones(mod, plan);
  const zoneById = zones ? new Map(zones.map((zone) => [String(zone.id), zone])) : null;

  const labels = blocks.map((block, index) => String(block.label ?? `#${index + 1}`));
  const blockPolys = blocks.map(blockPolygon);
  const blockAreas = blocks.map((block) => Math.max(0, num(block.w)) * Math.max(0, num(block.d)));
  const landPolys = landRects.map((rect) => rectPolygon([rect.x0, rect.x1, rect.z0, rect.z1]));
  const bayPoly = bayRect ? rectPolygon([bayRect.x0, bayRect.x1, bayRect.z0, bayRect.z1]) : null;

  // --- counts + rotation ------------------------------------------------
  const districts = [...new Set(blocks.map((block) => block.district).filter(Boolean))].sort();
  const rotatedBlocks = blocks.filter((block) => Math.abs(num(block.angle)) > 1e-6).length;
  const maxAbsAngle = blocks.reduce((max, block) => Math.max(max, Math.abs(num(block.angle))), 0);

  // --- land union -------------------------------------------------------
  let landArea = 0;
  for (const polygon of landPolys) landArea += polygonArea(polygon);
  const landOverlaps = [];
  for (let i = 0; i < landPolys.length; i += 1) {
    for (let j = i + 1; j < landPolys.length; j += 1) {
      const area = intersectionArea(landPolys[i], landPolys[j]);
      if (area > 0.01) {
        landArea -= area;
        landOverlaps.push({ a: i, b: j, area: round(area) });
      }
    }
  }
  const pointInLand = (x, z, pad = 0) =>
    landRects.some((rect) => x >= rect.x0 - pad && x <= rect.x1 + pad && z >= rect.z0 - pad && z <= rect.z1 + pad);
  let bayLandOverlap = 0;
  if (bayPoly) for (const polygon of landPolys) bayLandOverlap += intersectionArea(bayPoly, polygon);

  // --- containment ------------------------------------------------------
  const outsideLand = [];
  const renderOutsideLand = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const area = blockAreas[index];
    if (area <= 1e-9) continue;
    let covered = 0;
    for (const polygon of landPolys) covered += intersectionArea(blockPolys[index], polygon);
    const outside = Math.max(0, area - covered);
    if (outside > 0.01) {
      outsideLand.push({ block: labels[index], zone: blocks[index].zone, area: round(outside) });
      renderOutsideLand.push(index);
    }
  }

  const outsideZone = [];
  const renderOutsideZone = [];
  let unknownZoneBlocks = 0;
  if (zoneById) {
    for (let index = 0; index < blocks.length; index += 1) {
      const zone = zoneById.get(String(blocks[index].zone));
      if (!zone) {
        unknownZoneBlocks += 1;
        continue;
      }
      const area = blockAreas[index];
      if (area <= 1e-9) continue;
      const outside = Math.max(0, area - intersectionArea(blockPolys[index], rectPolygon([zone.rect.x0, zone.rect.x1, zone.rect.z0, zone.rect.z1])));
      if (outside > 0.01) {
        outsideZone.push({ block: labels[index], zone: blocks[index].zone, area: round(outside) });
        renderOutsideZone.push(index);
      }
    }
  }

  // --- block / block overlaps ------------------------------------------
  const blockBlock = [];
  const renderBlockBlock = [];
  for (let i = 0; i < blockPolys.length; i += 1) {
    if (blockAreas[i] <= 1e-9) continue;
    for (let j = i + 1; j < blockPolys.length; j += 1) {
      if (blockAreas[j] <= 1e-9) continue;
      const polygon = clipPolygon(blockPolys[i], blockPolys[j]);
      if (polygon.length < 3) continue;
      const area = polygonArea(polygon);
      if (area <= 0.01) continue;
      blockBlock.push({ a: labels[i], b: labels[j], area: round(area) });
      renderBlockBlock.push({ polygon, area });
    }
  }
  const blockBlockArea = blockBlock.reduce((sum, entry) => sum + entry.area, 0);

  // --- streets vs arterials bookkeeping ---------------------------------
  const streetKeySet = new Set(streetsAll.map((segment) => segmentKey(segment, true)));
  const streetsIncludeArterials = arterials.length > 0 && arterials.every((segment) => streetKeySet.has(segmentKey(segment, true)));
  const arterialKeySet = new Set(arterials.map((segment) => segmentKey(segment, true)));
  const plainStreets = streetsIncludeArterials
    ? streetsAll.filter((segment) => !arterialKeySet.has(segmentKey(segment, true)))
    : streetsAll.slice();

  // --- block vs roads ---------------------------------------------------
  const validArterials = arterials.filter(validSegment);
  const validStreets = plainStreets.filter(validSegment);
  const arterialPolys = validArterials.map(roadPolygon);
  const streetPolys = validStreets.map(roadPolygon);
  const blockArterial = [];
  const blockStreet = [];
  const renderBlockArterial = [];
  const renderBlockStreet = [];
  const arterialBlocks = new Set();
  const streetBlocks = new Set();
  for (let index = 0; index < blocks.length; index += 1) {
    if (blockAreas[index] <= 1e-9) continue;
    for (let j = 0; j < arterialPolys.length; j += 1) {
      const polygon = clipPolygon(blockPolys[index], arterialPolys[j]);
      if (polygon.length < 3) continue;
      const area = polygonArea(polygon);
      if (area <= 0.01) continue;
      blockArterial.push({ block: labels[index], arterial: j, area: round(area) });
      renderBlockArterial.push({ polygon, area });
      arterialBlocks.add(index);
    }
    for (let j = 0; j < streetPolys.length; j += 1) {
      const polygon = clipPolygon(blockPolys[index], streetPolys[j]);
      if (polygon.length < 3) continue;
      const area = polygonArea(polygon);
      if (area <= 0.01) continue;
      blockStreet.push({ block: labels[index], street: j, area: round(area) });
      renderBlockStreet.push({ polygon, area });
      streetBlocks.add(index);
    }
  }
  const blockArterialArea = blockArterial.reduce((sum, entry) => sum + entry.area, 0);
  const blockStreetArea = blockStreet.reduce((sum, entry) => sum + entry.area, 0);

  // --- arterial network -------------------------------------------------
  const arterialNetwork = roadComponents(validArterials, 0.3, "centerline");
  const arterialRibbon = roadComponents(validArterials, 0.3, "ribbon");
  let arterialCrossings = 0;
  let arterialJunctions = 0;
  const crossingPairs = [];
  for (let i = 0; i < validArterials.length; i += 1) {
    for (let j = i + 1; j < validArterials.length; j += 1) {
      if (properCross(validArterials[i], validArterials[j])) {
        arterialCrossings += 1;
        crossingPairs.push([i, j]);
      } else if (segmentDistance(validArterials[i], validArterials[j]) <= 0.3) {
        arterialJunctions += 1;
      }
    }
  }
  const arterialDangles = [];
  for (let i = 0; i < validArterials.length; i += 1) {
    for (const end of [0, 1]) {
      const point = [end === 0 ? validArterials[i].x0 : validArterials[i].x1, end === 0 ? validArterials[i].z0 : validArterials[i].z1];
      let nearest = Infinity;
      for (let j = 0; j < validArterials.length; j += 1) {
        if (i === j) continue;
        nearest = Math.min(nearest, pointSegmentDistance(point, validArterials[j]));
      }
      if (nearest > 0.3) arterialDangles.push({ arterial: i, end, distance: round(nearest) });
    }
  }

  // --- all-road connectivity + dangling endpoints -----------------------
  const allRoads = dedupeSegments([...streetsAll, ...arterials]);
  const connectivity = roadComponents(allRoads, 0.3, "centerline");
  const connectivityRibbon = roadComponents(allRoads, 0.3, "ribbon");
  const duplicateSegments = streetsAll.length + arterials.length - allRoads.length;
  const danglingEndpoints = [];
  for (let i = 0; i < allRoads.length; i += 1) {
    for (const end of [0, 1]) {
      const point = [end === 0 ? allRoads[i].x0 : allRoads[i].x1, end === 0 ? allRoads[i].z0 : allRoads[i].z1];
      let nearest = Infinity;
      let nearestRoad = -1;
      let nearestRibbonGap = Infinity;
      for (let j = 0; j < allRoads.length; j += 1) {
        if (i === j) continue;
        const distance = pointSegmentDistance(point, allRoads[j]);
        if (distance < nearest) {
          nearest = distance;
          nearestRoad = j;
        }
        const ribbonGap = pointRibbonDistance(point, allRoads[j]);
        if (ribbonGap < nearestRibbonGap) nearestRibbonGap = ribbonGap;
      }
      if (nearest > 0.3) {
        danglingEndpoints.push({
          road: i,
          end,
          x: round(point[0], 2),
          z: round(point[1], 2),
          nearestRoad,
          distance: round(nearest),
          ribbonGap: round(nearestRibbonGap),
        });
      }
    }
  }
  const danglingGaps = danglingEndpoints.map((endpoint) => endpoint.ribbonGap);
  const danglingRibbonGap = danglingGaps.length
    ? {
        min: round(Math.min(...danglingGaps), 3),
        median: round(median(danglingGaps), 3),
        max: round(Math.max(...danglingGaps), 3),
        within03: danglingGaps.filter((gap) => gap <= 0.3).length,
      }
    : null;
  // --- piers + rail -----------------------------------------------------
  const pierChecks = [];
  for (let index = 0; index < piers.length; index += 1) {
    const polygon = pierPolygon(piers[index]);
    if (!polygon) {
      pierChecks.push({ pier: index, polygon: null, insideBayFraction: null });
      continue;
    }
    const area = polygonArea(polygon);
    const insideBayFraction = bayPoly && area > 1e-9 ? clamp01(intersectionArea(polygon, bayPoly) / area) : null;
    pierChecks.push({
      pier: index,
      dir: piers[index].dir ?? piers[index].direction ?? null,
      area: round(area),
      insideBayFraction: insideBayFraction === null ? null : round(insideBayFraction, 4),
      ok: insideBayFraction === null ? null : insideBayFraction >= 0.9,
    });
  }
  const pierFractions = pierChecks.filter((check) => check.insideBayFraction !== null).map((check) => check.insideBayFraction);

  const rail = plan?.rail ?? null;
  const railLines = railSegments(rail, islandExtent);
  let railSamplesOutside = 0;
  let railSamples = 0;
  const railOutsidePoints = [];
  for (const line of railLines) {
    const length = Math.hypot(line.x1 - line.x0, line.z1 - line.z0);
    const steps = Math.max(2, Math.ceil(length / 0.5) + 1);
    for (let step = 0; step < steps; step += 1) {
      const t = steps === 1 ? 0 : step / (steps - 1);
      const x = line.x0 + (line.x1 - line.x0) * t;
      const z = line.z0 + (line.z1 - line.z0) * t;
      railSamples += 1;
      if (!pointInLand(x, z)) {
        railSamplesOutside += 1;
        if (railOutsidePoints.length < 10) railOutsidePoints.push({ x: round(x, 2), z: round(z, 2) });
      }
    }
  }
  const station = rail?.station ?? null;
  const stationInsideLand = station && finite(station.x) && finite(station.z) ? pointInLand(station.x, station.z) : null;

  // --- block area stats -------------------------------------------------
  const widths = blocks.map((block) => num(block.w));
  const depths = blocks.map((block) => num(block.d));
  const areas = blockAreas.filter((area) => area > 0);
  const totalBlockArea = blockAreas.reduce((sum, area) => sum + area, 0);
  const blockStats = {
    width: {
      min: round(widths.length ? Math.min(...widths) : 0),
      median: round(median(widths)),
      max: round(widths.length ? Math.max(...widths) : 0),
      mean: round(widths.reduce((sum, value) => sum + value, 0) / Math.max(1, widths.length)),
    },
    depth: {
      min: round(depths.length ? Math.min(...depths) : 0),
      median: round(median(depths)),
      max: round(depths.length ? Math.max(...depths) : 0),
      mean: round(depths.reduce((sum, value) => sum + value, 0) / Math.max(1, depths.length)),
    },
    blockArea: {
      min: round(areas.length ? Math.min(...areas) : 0),
      median: round(median(areas)),
      max: round(areas.length ? Math.max(...areas) : 0),
      total: round(totalBlockArea, 2),
    },
    landArea: round(landArea, 2),
    coveragePct: landArea > 0 ? round((100 * totalBlockArea) / landArea, 1) : null,
  };

  // --- roles ------------------------------------------------------------
  const roleCounts = {};
  let nullRoleBlocks = 0;
  for (const block of blocks) {
    const role = block.role ?? null;
    if (!role) {
      nullRoleBlocks += 1;
      continue;
    }
    roleCounts[role] = (roleCounts[role] ?? 0) + 1;
  }
  const presentRoles = Object.keys(roleCounts).sort();
  const missingRoles = EXPECTED_ROLES.filter((role) => !presentRoles.includes(role));
  const greenwayRoles = presentRoles.filter((role) => role.startsWith("greenway-"));
  if (!greenwayRoles.length) missingRoles.push("greenway-*");

  // --- summary ----------------------------------------------------------
  const summary = {
    seed: hex,
    blocks: blocks.length,
    streets: streetsAll.length,
    streetsUnique: dedupeSegments(streetsAll).length,
    arterials: arterials.length,
    districts: districts.length,
    rotated: rotatedBlocks,
    maxAbsAngle: round(maxAbsAngle, 4),
    blockOverlaps: blockBlock.length,
    blockOverlapArea: round(blockBlockArea, 2),
    arterialBlockOverlaps: blockArterial.length,
    arterialBlockArea: round(blockArterialArea, 2),
    streetBlockOverlaps: blockStreet.length,
    streetBlockArea: round(blockStreetArea, 2),
    outsideLand: outsideLand.length,
    outsideZone: zoneById ? outsideZone.length : null,
    components: connectivity.count,
    componentsRibbon: connectivityRibbon.count,
    largestComponent: connectivity.sizes[0] ?? 0,
    dangles: danglingEndpoints.length,
    arterialComponents: arterialNetwork.count,
    arterialRibbonComponents: arterialRibbon.count,
    arterialCrossings,
    arterialJunctions,
    piers: piers.length,
    piersInBay: pierChecks.filter((check) => check.ok === true).length,
    pierInsideBayMin: pierFractions.length ? round(Math.min(...pierFractions), 4) : null,
    railInsideLand: railLines.length ? railSamplesOutside === 0 : null,
    blockArea: round(totalBlockArea, 2),
    landArea: round(landArea, 2),
    coveragePct: blockStats.coveragePct,
    rolesPresent: presentRoles.length,
    missingRoles: missingRoles.length,
  };

  const details = {
    counts: {
      blocks: blocks.length,
      streets: streetsAll.length,
      plainStreets: validStreets.length,
      streetsUnique: dedupeSegments(streetsAll).length,
      arterials: validArterials.length,
      districts,
      piers: piers.length,
      promenades: promenades.length,
      rotatedBlocks,
      maxAbsAngle: round(maxAbsAngle, 4),
      duplicateSegments,
      streetsIncludeArterials,
    },
    land: {
      rects: landRects.length,
      area: round(landArea, 3),
      overlaps: landOverlaps,
      bayLandOverlapArea: round(bayLandOverlap, 3),
      islandExtent,
    },
    containment: {
      outsideLand: capList(outsideLand),
      outsideZone: zoneById ? capList(outsideZone) : null,
      zonesChecked: Boolean(zoneById),
      zonesSource: zoneById ? (mod.ZONES ? "module.ZONES" : mod.ZONE_RECTS ? "module.ZONE_RECTS" : plan.zones ? "plan.zones" : "other export") : "not exported (skipped)",
      unknownZoneBlocks,
      zones: zones ? zones.map((zone) => ({ id: zone.id, rect: [zone.rect.x0, zone.rect.x1, zone.rect.z0, zone.rect.z1] })) : null,
    },
    overlap: {
      blockBlock: capList(blockBlock),
      blockBlockArea: round(blockBlockArea, 3),
      blockArterial: capList(blockArterial),
      blockArterialArea: round(blockArterialArea, 3),
      blockStreet: capList(blockStreet),
      blockStreetArea: round(blockStreetArea, 3),
    },
    arterialNetwork: {
      components: arterialNetwork.count,
      componentSizes: arterialNetwork.sizes,
      ribbonComponents: arterialRibbon.count,
      ribbonComponentSizes: arterialRibbon.sizes,
      crossings: arterialCrossings,
      crossingPairs: crossingPairs.slice(0, 30),
      junctions: arterialJunctions,
      hangingEndpoints: capList(arterialDangles),
      connected: arterialNetwork.count <= 1,
    },
    connectivity: {
      tolerance: 0.3,
      segments: allRoads.length,
      components: connectivity.count,
      componentSizes: connectivity.sizes,
      ribbonComponents: connectivityRibbon.count,
      ribbonComponentSizes: connectivityRibbon.sizes,
      danglingRibbonGap,
      largestComponentFraction: allRoads.length ? round(connectivity.sizes[0] / allRoads.length, 3) : 0,
      danglingEndpoints: capList(danglingEndpoints, 40),
    },
    piers: {
      checks: pierChecks,
      insideBayQty: pierChecks.filter((check) => check.ok === true).length,
      minInsideBayFraction: pierFractions.length ? round(Math.min(...pierFractions), 4) : null,
    },
    rail: {
      segments: railLines.length,
      samples: railSamples,
      samplesOutsideLand: railSamplesOutside,
      insideLand: railLines.length ? railSamplesOutside === 0 : null,
      outsidePoints: railOutsidePoints,
      stationInsideLand,
    },
    blockStats,
    roles: {
      expected: EXPECTED_ROLES.concat("greenway-*"),
      present: presentRoles,
      counts: roleCounts,
      greenwayRoles,
      nullRoleBlocks,
      missing: missingRoles,
    },
  };

  const renderData = {
    outsideLand: renderOutsideLand,
    outsideZone: renderOutsideZone,
    blockBlock: renderBlockBlock,
    blockArterial: renderBlockArterial,
    blockStreet: renderBlockStreet,
    danglingEndpoints,
    zones,
    bayRect,
    landRects,
    islandExtent,
    plainStreets,
    validArterials,
    piers,
    promenades,
    railLines,
  };

  return { seed, hex, plan, summary, details, renderData };
}

// ------------------------------------------------------------------ render
const WATER = [185, 221, 228];
const LAND = [236, 231, 220];
const PROMENADE = [226, 210, 171];
const STREET = [163, 173, 178];
const ARTERIAL = [100, 115, 124];
const PIER = [179, 154, 116];
const PIER_EDGE = [125, 106, 76];
const RAIL = [63, 74, 79];
const TIE = [110, 104, 92];
const BLOCK_EDGE = [250, 247, 239];
const VIOLATION_RED = [224, 49, 49];
const VIOLATION_DEEP = [198, 40, 40];
const VIOLATION_ORANGE = [245, 159, 0];
const VIOLATION_MAGENTA = [214, 51, 108];
const VIOLATION_BLUE = [28, 126, 214];

function paintBase(raster, plan, audit) {
  const size = raster.width;
  const data = audit.renderData;
  const half = Math.max(24.5, num(data.islandExtent, 23.2) + 1.3);
  const project = (x, z) => [((x + half) / (2 * half)) * size, ((z + half) / (2 * half)) * size];
  const projectPolygon = (polygon) => polygon.map(([x, z]) => project(x, z));

  // Water everywhere, then land on top (L-shaped island).
  for (const rect of data.landRects) {
    raster.fillPolygon(projectPolygon(rectPolygon([rect.x0, rect.x1, rect.z0, rect.z1])), LAND);
  }
  // Zone boundaries, when the generator exports them (faint reference grid).
  if (data.zones) {
    for (const zone of data.zones) {
      raster.strokePolygon(projectPolygon(rectPolygon([zone.rect.x0, zone.rect.x1, zone.rect.z0, zone.rect.z1])), [201, 206, 196], 1);
    }
  }
  // Promenade strips sit under the roads.
  for (const segment of data.promenades) {
    const polygon = promenadePolygon(segment);
    if (polygon) raster.fillPolygon(projectPolygon(polygon), PROMENADE);
  }
  // Streets then arterials, drawn under the blocks as declared road surfaces.
  for (const segment of data.plainStreets) {
    if (validSegment(segment)) raster.fillPolygon(projectPolygon(roadPolygon(segment)), STREET);
  }
  for (const segment of data.validArterials) {
    if (validSegment(segment)) raster.fillPolygon(projectPolygon(roadPolygon(segment)), ARTERIAL);
  }
  // Rail line + ties + station square.
  for (const line of data.railLines) {
    const a = project(line.x0, line.z0);
    const b = project(line.x1, line.z1);
    raster.line(a[0], a[1], b[0], b[1], RAIL, 2);
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      const nx = -dy / length;
      const ny = dx / length;
      for (let t = 6; t < length; t += 9) {
        const x = a[0] + (dx * t) / length;
        const y = a[1] + (dy * t) / length;
        raster.line(x - nx * 2.2, y - ny * 2.2, x + nx * 2.2, y + ny * 2.2, TIE, 1);
      }
    }
  }
  const station = plan?.rail?.station ?? null;
  if (station && finite(station.x) && finite(station.z)) {
    const p = project(station.x, station.z);
    raster.fillRect(p[0] - 3, p[1] - 3, p[0] + 3, p[1] + 3, [198, 120, 90]);
  }
  // Piers, drawn over water at the quay line.
  for (const pier of data.piers) {
    const polygon = pierPolygon(pier);
    if (!polygon) continue;
    raster.fillPolygon(projectPolygon(polygon), PIER);
    raster.strokePolygon(projectPolygon(polygon), PIER_EDGE, 1);
  }
  // Blocks, colour-coded per district (rotated rectangles are real polygons).
  for (const block of plan.blocks ?? []) {
    const polygon = projectPolygon(blockPolygon(block));
    raster.fillPolygon(polygon, districtColor(block.district));
    raster.strokePolygon(polygon, BLOCK_EDGE, 1);
  }
}

function paintViolations(raster, plan, audit) {
  const size = raster.width;
  const data = audit.renderData;
  const half = Math.max(24.5, num(data.islandExtent, 23.2) + 1.3);
  const project = (x, z) => [((x + half) / (2 * half)) * size, ((z + half) / (2 * half)) * size];
  const projectPolygon = (polygon) => polygon.map(([x, z]) => project(x, z));

  // Blocks outside the land union.
  for (const index of data.outsideLand) {
    const polygon = projectPolygon(blockPolygon(plan.blocks[index]));
    raster.fillPolygon(polygon, VIOLATION_RED, 0.16);
    raster.strokePolygon(polygon, VIOLATION_DEEP, 2);
  }
  // Blocks outside their zone (only when zones are available).
  for (const index of data.outsideZone) {
    raster.strokePolygon(projectPolygon(blockPolygon(plan.blocks[index])), VIOLATION_BLUE, 2);
  }
  // Exact intersection areas, from bottom to most important.
  for (const entry of data.blockStreet) raster.fillPolygon(projectPolygon(entry.polygon), VIOLATION_ORANGE, 0.85);
  for (const entry of data.blockArterial) raster.fillPolygon(projectPolygon(entry.polygon), VIOLATION_RED, 0.9);
  for (const entry of data.blockBlock) raster.fillPolygon(projectPolygon(entry.polygon), VIOLATION_MAGENTA, 0.9);
  // Dangling street endpoints.
  for (const endpoint of data.danglingEndpoints) {
    const p = project(endpoint.x, endpoint.z);
    raster.circle(p[0], p[1], 3, VIOLATION_DEEP, 1.4);
  }
}

function renderPlan(audit, plan, options) {
  const { size, tag, hex } = options;
  const raster = new Raster(size, size, WATER);
  paintBase(raster, plan, audit);
  const baseName = `plan-${hex.toLowerCase()}`;
  const cleanFile = path.join(OUT_DIR, `${baseName}.png`);
  writePNG(cleanFile, size, size, raster.pixels);
  let cleanPixels = null;
  if (tag) cleanPixels = Buffer.from(raster.pixels);
  paintViolations(raster, plan, audit);
  const violationFile = path.join(OUT_DIR, `${baseName}-violations.png`);
  writePNG(violationFile, size, size, raster.pixels);
  const files = { plan: cleanFile, violations: violationFile };
  if (tag) {
    const taggedPlan = path.join(OUT_DIR, `${tag}-plan.png`);
    const taggedViolations = path.join(OUT_DIR, `${tag}-plan-violations.png`);
    writePNG(taggedPlan, size, size, cleanPixels);
    writePNG(taggedViolations, size, size, raster.pixels);
    files.tagged = { plan: taggedPlan, violations: taggedViolations };
  }
  return files;
}

// ------------------------------------------------------------------ console
function pad(value, width, align = "left") {
  const text = String(value);
  if (text.length >= width) return text;
  const fill = " ".repeat(width - text.length);
  return align === "right" ? fill + text : text + fill;
}
function printTable(rows) {
  const headers = [
    "seed",
    "blocks",
    "streets",
    "arterial",
    "dist",
    "rot",
    "blk×blk",
    "blk×art",
    "blk×str",
    "offLand",
    "offZone",
    "comps",
    "dangle",
    "missing",
  ];
  const aligns = headers.map((header) => (header === "seed" ? "left" : "right"));
  const keys = [
    "seed",
    "blocks",
    "streets",
    "arterials",
    "districts",
    "rotated",
    "blockOverlaps",
    "arterialBlockOverlaps",
    "streetBlockOverlaps",
    "outsideLand",
    "outsideZone",
    "components",
    "dangles",
    "missingRoles",
  ];
  const values = rows.map((row) =>
    keys.map((key) => {
      const value = row[key];
      if (value === null || value === undefined) return "n/a";
      return String(value);
    })
  );
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...values.map((row) => row[index].length))
  );
  const formatRow = (cells, align) => cells.map((cell, index) => pad(cell, widths[index], align[index])).join("  ");
  console.log(formatRow(headers, aligns));
  console.log(widths.map((width) => "-".repeat(width)).join("  "));
  for (const row of values) console.log(formatRow(row, aligns));
}

function printBaseline(audit, pngFiles, sourceInfo) {
  const { summary, details } = audit;
  console.log(`\nBaseline seed ${summary.seed}`);
  console.log(
    `  counts: ${summary.blocks} blocks · ${summary.streets} streets (${details.counts.plainStreets} non-arterial) · ` +
      `${summary.arterials} arterials · ${summary.districts} districts · ${summary.piers} piers`
  );
  const rotationNote = details.counts.rotatedBlocks
    ? `${details.counts.rotatedBlocks} rotated (max |angle| ${details.counts.maxAbsAngle} rad)`
    : "0 rotated (axis-aligned)";
  console.log(`  rotation: ${rotationNote}`);
  console.log(
    `  containment: outside land ${summary.outsideLand} blocks · outside zone ` +
      `${details.containment.zonesChecked ? `${summary.outsideZone} blocks` : "not checked (ZONES not exported)"}`
  );
  console.log(
    `  block overlaps: ${summary.blockOverlaps} pairs / ${summary.blockOverlapArea} area · ` +
      `block×arterial ${summary.arterialBlockOverlaps} pairs / ${summary.arterialBlockArea} · ` +
      `block×street ${summary.streetBlockOverlaps} pairs / ${summary.streetBlockArea}`
  );
  const net = details.arterialNetwork;
  console.log(
    `  arterial network: ${net.components} centerline component(s) ${JSON.stringify(net.componentSizes)} · ` +
      `${net.crossings} crossings · ${net.junctions} junctions · ` +
      `ribbon components ${net.ribbonComponents} · connected=${net.connected}`
  );
  console.log(
    `  street graph (tol 0.3): ${details.connectivity.components} centerline component(s) ${JSON.stringify(
      details.connectivity.componentSizes
    )} · ribbon components ${details.connectivity.ribbonComponents} · dangling endpoints ${summary.dangles}` +
      (details.connectivity.danglingRibbonGap
        ? ` (road-paint gap min/median/max ${details.connectivity.danglingRibbonGap.min}/${details.connectivity.danglingRibbonGap.median}/${details.connectivity.danglingRibbonGap.max}, ` +
          `${details.connectivity.danglingRibbonGap.within03}/${summary.dangles} within 0.3)`
        : "")
  );
  console.log(
    `  piers: ${summary.piersInBay}/${summary.piers} mostly inside bay` +
      (summary.pierInsideBayMin === null ? "" : ` (min area fraction ${summary.pierInsideBayMin})`) +
      ` · rail inside land: ${summary.railInsideLand === null ? "n/a" : summary.railInsideLand}`
  );
  console.log(
    `  block area: w ${details.blockStats.width.min}/${details.blockStats.width.median}/${details.blockStats.width.max} · ` +
      `d ${details.blockStats.depth.min}/${details.blockStats.depth.median}/${details.blockStats.depth.max} · ` +
      `total ${summary.blockArea} of land ${summary.landArea} (${summary.coveragePct}%)`
  );
  const roles = details.roles;
  console.log(
    `  roles: ${roles.present.length - roles.greenwayRoles.length + 1}/${roles.expected.length} present` +
      `${roles.missing.length ? ` · MISSING ${roles.missing.join(", ")}` : ""}` +
      ` · greenway roles ${roles.greenwayRoles.join(", ") || "none"}`
  );
  if (roles.present.length) console.log(`    counts: ${roles.present.map((role) => `${role}×${roles.counts[role]}`).join("  ")}`);
  if (sourceInfo.module !== sourceInfo.workspace.source) {
    console.log(`  module: ${sourceInfo.module} (workspace src/city-plan.js ${sourceInfo.workspace.sameHash ? "identical" : "DIFFERS — source changed"})`);
  }
  if (pngFiles?.plan) {
    const planFile = path.relative(ROOT, pngFiles.plan).replaceAll("\\", "/");
    const violationFile = path.relative(ROOT, pngFiles.violations).replaceAll("\\", "/");
    console.log(
      `  png: ${planFile} + ${violationFile}${pngFiles.tagged ? ` + ${path.relative(ROOT, pngFiles.tagged.plan).replaceAll("\\", "/")}` : ""}`
    );
  } else {
    console.log("  png: disabled (--no-png)");
  }
}

// ------------------------------------------------------------------ main
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const seeds = parseSeedList(arg("seeds", DEFAULT_SEEDS));
  const loaded = await loadPlanModule(MODULE_PATH);
  const workspaceSource = path.resolve(ROOT, "src/city-plan.js");
  const workspaceHash =
    path.resolve(workspaceSource) === path.resolve(MODULE_PATH)
      ? loaded.sha256
      : createHash("sha256").update(fs.readFileSync(workspaceSource, "utf8").replace(/^\uFEFF/, "")).digest("hex");
  const sourceInfo = {
    module: path.relative(ROOT, MODULE_PATH).replaceAll("\\", "/"),
    sha256: loaded.sha256,
    bytes: loaded.bytes,
    workspace: {
      source: "src/city-plan.js",
      sha256: workspaceHash,
      sameHash: workspaceHash === loaded.sha256,
    },
  };

  console.log(
    `Pixel Bay plan check · module ${sourceInfo.module} · sha256 ${sourceInfo.sha256.slice(0, 12)}… · seeds ${seeds.length}`
  );
  console.log(`  exports: ${Object.keys(loaded.mod).sort().join(", ")}`);

  const results = [];
  const pngFilesBySeed = {};
  let baseline = null;
  let baselinePng = null;
  for (const seed of seeds) {
    let audit = null;
    try {
      const plan = loaded.mod.createCityPlan(mulberry32(seed));
      audit = auditPlan(seed, plan, loaded.mod);
    } catch (error) {
      results.push({ seed: seedHex(seed), error: String(error?.stack ?? error) });
      console.error(`  seed ${seedHex(seed)} failed: ${error?.stack ?? error?.message ?? error}`);
      continue;
    }
    results.push(audit.summary);
    if (RENDER) {
      try {
        pngFilesBySeed[seedHex(seed)] = renderPlan(audit, audit.plan, {
          size: SIZE,
          tag: audit.seed === seeds[0] ? TAG : "",
          hex: audit.hex,
        });
      } catch (error) {
        pngFilesBySeed[seedHex(seed)] = { error: String(error?.stack ?? error) };
      }
    }
    if (baseline === null) baseline = audit;
  }
  if (baseline) baselinePng = pngFilesBySeed[baseline.hex] ?? null;

  console.log("");
  printTable(results);
  if (baseline) printBaseline(baseline, baselinePng ?? { plan: "", violations: "" }, sourceInfo);

  // District colour legend (the PNG itself has no text, so the legend lives here).
  if (baseline) {
    const districts = baseline.details.counts.districts;
    console.log("\nDistrict colour legend (PNG fills):");
    for (const district of districts) {
      const color = districtColor(district);
      console.log(`  ${pad(district, 12)} rgb(${color.join(",")})`);
    }
  }
  console.log(
    "\nOverlay colours (violations PNG): red = block×arterial / outside land · orange = block×street · " +
      "magenta = block×block · blue outline = outside zone · red rings = dangling endpoints"
  );

  const report = {
    generatedAt: new Date().toISOString(),
    script: "docs/planning/plan-check.mjs",
    source: sourceInfo,
    cli: { module: sourceInfo.module, seeds: seeds.map(seedHex), size: RENDER ? SIZE : null, tag: TAG || null },
    method: {
      geometry: "Exact convex polygon intersection (Sutherland-Hodgman) of block rectangles and finite road ribbons; rotated block rectangles supported.",
      overlapTolerance: 0.01,
      connectionTolerance: 0.3,
      landModel: "LAND_RECTS treated as a disjoint union; overlapping land rectangles are reported and subtracted pairwise.",
      roadModel: "Each street/arterial is a rectangle centred on its centreline with the declared width; no rounded caps, no sidewalks added.",
      streetsModel: "plan.streets is checked for containing the arterials; block-vs-street overlap excludes arterials to avoid double counting.",
      piersModel: "Pier area fraction inside the BAY rectangle; >= 0.9 counts as 'roughly in water' (piers touch the quay edge by design).",
      railModel: "Rail centreline sampled every <=0.5 world units against the land union; rail has no declared width.",
      connectivity: "Union-find over centreline segment-to-segment distance <= 0.3 (endpoint snapping or intersection). Ribbon components are reported separately as positive road-paint overlap. Each dangling endpoint also records the gap to the nearest road paint (ribbonGap), so a 0.25 sidewalk seam is distinguishable from a real gap.",
      arterialNetwork: "Centerline components plus ribbon-overlap components; crossings are proper interior segment crossings.",
      blocksAxisAlignedNote: "The rewrite is expected to emit axis-aligned blocks; rotation checks stay active so 'before' images remain faithful.",
    },
    summary: results,
    baseline: baseline
      ? {
          seed: baseline.summary.seed,
          summary: baseline.summary,
          details: baseline.details,
          png: baselinePng,
        }
      : null,
    pngFiles: pngFilesBySeed,
    outputs: ["plan-report.json", ...Object.values(pngFilesBySeed).flatMap((files) => (files?.error ? [] : [files.plan, files.violations, files.tagged?.plan, files.tagged?.violations].filter(Boolean).map((file) => path.relative(OUT_DIR, file).replaceAll("\\", "/"))))],
    limitations: [
      "PNG has no text labels (pure Node); district colour legend is printed to the console.",
      "Land union area assumes LAND_RECTS do not overlap in complex ways; pairwise subtraction is exact for the current 2-rectangle L shape.",
      "Block-vs-road overlap uses declared widths; visually wider painted asphalt or omitted sidewalks are not modelled.",
      "Promenades are drawn but not counted as roads in overlap/connectivity checks.",
      "Piers are only checked against the bay rectangle; pier-to-quay attachment is not graded.",
      "Connectivity ignores terrain, elevation and buildings standing in the right-of-way.",
      "Dangling endpoints are a warning, not automatically an error: quay-side dead ends are a legitimate design.",
    ],
  };
  const reportFile = path.join(OUT_DIR, "plan-report.json");
  fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nWrote ${path.relative(ROOT, reportFile).replaceAll("\\", "/")}`);
  if (RENDER) {
    const count = Object.values(pngFilesBySeed).filter((files) => files && !files.error).length;
    console.log(`Rendered ${count * 2} PNG(s) at ${SIZE}×${SIZE} in ${path.relative(ROOT, OUT_DIR).replaceAll("\\", "/")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
