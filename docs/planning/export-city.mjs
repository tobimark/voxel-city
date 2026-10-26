// Export a deterministic JSON snapshot of a generated city.
//
// Why: the city is a pure function of its seed, but the scene graph itself is a
// Three.js object graph — not something another process, tool or agent can read
// directly. This script turns one seed into a stable, serialisable world
// snapshot (districts, blocks, buildings, vehicles, catalogue summary) so
// external programs can inspect / diff / validate the same city without a
// browser.
//
// Usage (from the repo root):
//   node docs/planning/export-city.mjs --seed 7ECF35DF
//   node docs/planning/export-city.mjs --seed 7ECF35DF --out city.json --compact
//
// Options:
//   --seed <hex>     city seed (default 7ECF35DF)
//   --out <path>     output path (default docs/planning/city-<SEED>.json)
//   --compact        write single-line JSON (default pretty, 2 spaces)
//
// The snapshot contains no timestamps and no Three.js objects, so two runs with
// the same seed produce byte-identical JSON — safe to diff between agents.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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
const flag = (name) => argv.includes(`--${name}`);

const seedHexRaw = String(argValue("seed", "7ECF35DF")).replace(/^0x/i, "").toUpperCase();
if (!/^[0-9A-F]{1,8}$/.test(seedHexRaw)) {
  console.error(`invalid --seed ${seedHexRaw}; expected hex like 7ECF35DF`);
  process.exit(1);
}
const seedHex = seedHexRaw.padStart(8, "0");
const seed = Number.parseInt(seedHex, 16) >>> 0;
const outPath = path.resolve(argValue("out", `docs/planning/city-${seedHex}.json`));
const compact = flag("compact");

// ------------------------------------------------------- DOM stub (must be first)
// city.js only touches the DOM inside makeGlowTexture(); a 2D canvas stub is
// enough to build the whole scene graph in Node.
const ctx2d = {
  fillStyle: null,
  createRadialGradient() {
    return { addColorStop() {} };
  },
  fillRect() {},
};
const canvasStub = { width: 64, height: 64, style: {}, getContext: () => ctx2d };
globalThis.document = {
  createElement(tag) {
    if (tag === "canvas") return canvasStub;
    throw new Error(`unexpected document.createElement(${tag})`);
  },
};

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, "../../src");
const { createCity } = await import(pathToFileURL(path.join(srcRoot, "city.js")).href);
const { ASSETS, BUILDINGS, GROUPS, SKYSCRAPERS, VEHICLES } = await import(
  pathToFileURL(path.join(srcRoot, "object-catalog.js")).href
);

// ------------------------------------------------------------------- export
const city = createCity({ seed });
city.group.updateMatrixWorld(true);
// Place the vehicles on their curves once (dt = 0 keeps the state deterministic).
city.update(0, 0, 0, true);

const round = (value, digits = 4) => {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
const vec = (vector) => [round(vector.x), round(vector.y), round(vector.z)];
// Building bounds are stored as Vector3s (their toJSON() is an array, but keep
// both shapes working in case the record changes).
const vecArray = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value.map((item) => round(item));
  if (typeof value.x === "number") return [round(value.x), round(value.y), round(value.z)];
  return null;
};

const districtMap = new Map();
for (const record of city.buildings) {
  if (!record.districtId || districtMap.has(record.districtId)) continue;
  districtMap.set(record.districtId, {
    id: record.districtId,
    name: record.districtName ?? record.districtId,
    accent: record.districtAccent ?? null,
  });
}

const blocks = city.blocks.map((block) => ({
  label: block.label,
  i: block.i,
  j: block.j,
  position: [round(block.blockX), round(block.blockZ)],
  width: round(block.width),
  depth: round(block.depth),
  type: block.type,
  district: {
    id: block.district?.id ?? null,
    name: block.district?.name ?? block.districtName ?? null,
    en: block.district?.en ?? null,
  },
}));

const buildings = city.buildings.map((record) => {
  const worldPosition = record.root.getWorldPosition(new THREE.Vector3());
  return {
    id: record.id,
    name: record.name,
    kind: record.kind,
    family: record.family ?? null,
    style: record.style ?? null,
    typeId: record.typeId ?? null,
    typeLabel: record.typeLabel ?? null,
    label: record.label,
    districtId: record.districtId ?? null,
    districtName: record.districtName ?? null,
    floors: record.floors ?? null,
    height: round(record.height),
    population: record.population ?? null,
    jobs: record.jobs ?? null,
    occupancy: record.occupancy ?? null,
    year: record.year ?? null,
    color: record.color ?? null,
    address: record.address ?? null,
    note: record.note ?? null,
    position: vec(worldPosition),
    footprint: record.footprint
      ? { width: round(record.footprint.width), depth: round(record.footprint.depth) }
      : null,
    topY: round(record.topY),
    bodyTop: round(record.bodyTop),
    bounds: record.bounds
      ? { min: vecArray(record.bounds.min), max: vecArray(record.bounds.max) }
      : null,
  };
});

const vehicles = {
  cars: city.cars.map((car) => ({
    typeId: car.typeId ?? null,
    lane: car.lane ?? null,
    t: round(car.t, 6),
    position: vec(car.group.position),
    rotationY: round(car.group.rotation.y, 6),
  })),
  boats: city.boats.map((boat) => ({
    typeId: boat.typeId ?? null,
    t: round(boat.t, 6),
    position: vec(boat.group.position),
    rotationY: round(boat.group.rotation.y, 6),
  })),
};

const groupCounts = {};
for (const asset of ASSETS) groupCounts[asset.group] = (groupCounts[asset.group] ?? 0) + 1;

const snapshot = {
  schema: 1,
  generator: "docs/planning/export-city.mjs",
  seed: seedHex,
  seedValue: seed,
  stats: {
    population: city.stats.population,
    jobs: city.stats.jobs,
    buildings: city.stats.buildings,
    cars: city.stats.cars,
    boats: city.stats.boats,
    districts: city.stats.districts,
    parks: city.stats.parks,
  },
  districts: [...districtMap.values()].sort((a, b) => a.id.localeCompare(b.id)),
  blocks,
  buildings,
  vehicles,
  catalog: {
    groups: GROUPS.map((group) => group.id),
    assets: ASSETS.length,
    baseAssets: {
      buildings: BUILDINGS.length,
      skyscrapers: SKYSCRAPERS.length,
      vehicles: VEHICLES.length,
    },
    perGroup: groupCounts,
  },
};

// -------------------------------------------------------------------- write
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, compact ? JSON.stringify(snapshot) : `${JSON.stringify(snapshot, null, 2)}\n`);
city.dispose();

const sizeKb = Math.round(fs.statSync(outPath).size / 1024);
console.log(
  `seed ${seedHex} · ${snapshot.stats.buildings} buildings · ${snapshot.stats.cars} cars · ` +
    `${snapshot.districts.length} districts · ${sizeKb} KB\nwrote ${path.relative(process.cwd(), outPath)}`
);
