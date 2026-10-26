// Headless smoke test for the generated city.
//
// `src/city.js` only touches the DOM inside makeGlowTexture(), so a tiny 2D
// canvas stub is enough to build the entire scene graph in Node. This catches
// the kind of geometry bug a plan rewrite can introduce — non-finite transform
// matrices (e.g. a prop that lost its x/z argument) and empty scenes.
//
// Run: node docs/planning/city-smoke.mjs
// Exit code 1 if any seed produces a broken matrix or an empty city.
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

const { createCity } = await import("../../src/city.js");

const seeds = [0xa9b0df33, 0x00000000, 0x00000001, 0x0000002a, 0x12345678, 0xdeadbeef, 0xffffffff, 0xa1b2c3d4];
let failures = 0;
const rows = [];

for (const seed of seeds) {
  const started = performance.now();
  const city = createCity({ seed });
  const buildMs = Math.round(performance.now() - started);
  city.group.updateMatrixWorld(true);

  let nonFinite = 0;
  let firstBroken = null;
  city.group.traverse((object) => {
    const elements = object.matrixWorld?.elements;
    if (!elements || elements.every(Number.isFinite)) return;
    nonFinite += 1;
    if (!firstBroken) {
      let node = object;
      while (node && !node.userData?.building) node = node.parent;
      firstBroken = node?.userData?.building?.id ?? object.type;
    }
  });

  const record = {
    seed: seed.toString(16).toUpperCase().padStart(8, "0"),
    buildMs,
    blocks: city.blocks.length,
    buildings: city.stats.buildings,
    cars: city.cars.length,
    districts: city.stats.districts,
    nonFinite,
    status: "ok",
  };
  if (nonFinite > 0) {
    record.status = `FAIL non-finite matrices (first: ${firstBroken})`;
  } else if (city.blocks.length < 40 || city.stats.buildings < 80) {
    record.status = "FAIL implausible counts";
  }
  if (record.status !== "ok") failures += 1;
  rows.push(record);
  city.dispose();
}

console.table(rows);
if (failures > 0) {
  console.error(`${failures}/${seeds.length} seeds failed`);
  process.exit(1);
}
console.log(`${seeds.length} seeds OK (no non-finite transforms, city populated)`);
