import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createPlan, MAP, pointInPolygon, polygonFits, polygonsOverlap } from './plan.js';
import { createCity } from './city.js';
import { sampleEnvironment } from '../src/environment.js';

const results = { map: 'ring-waterways', planningSeeds: 64, renderedSeeds: 5, failures: [] };
// Native in-city materials create a glow CanvasTexture; no WebGL is needed here.
globalThis.document ??= {
  createElement: () => ({
    width: 64,
    height: 64,
    getContext: () => ({ createRadialGradient: () => ({ addColorStop() {} }), fillRect() {} }),
  }),
};

const roadSnapshot = JSON.stringify(createPlan('RING-01').roads);
for (let i = 0; i < 64; i += 1) {
  const plan = createPlan(`seed-${i}`);
  assert.deepEqual(plan.diagnostics.failures, [], `Invalid plan at seed ${i}`);
  assert.equal(JSON.stringify(plan.roads), roadSnapshot, 'Building seed must not move the street network');
  assert.ok(plan.diagnostics.blocks >= 40, 'The ring map should keep its full block count');
  assert.ok(plan.diagnostics.buildings >= 70, 'The ring map should keep its house count');
}

for (const seed of [0, 1, 42, 0xA1B2C3D4, 0xffffffff]) {
  const city = createCity({ seed });
  for (const footprint of city.builtFootprints) {
    const block = city.blocks.find((b) => b.id === footprint.blockId);
    const lot = block.lots.find((l) => l.id === footprint.id);
    assert.ok(polygonFits(block.polygon, footprint.polygon), `${footprint.id} is out of bounds`);
    assert.ok(footprint.height <= lot.height + 1e-6, `${footprint.id} exceeds its lot height`);
  }
  for (let i = 0; i < city.builtFootprints.length; i += 1) {
    for (let j = i + 1; j < city.builtFootprints.length; j += 1) {
      assert.equal(
        polygonsOverlap(city.builtFootprints[i].polygon, city.builtFootprints[j].polygon),
        false,
        'Rendered footprint overlap'
      );
    }
  }
  for (const record of city.buildings) {
    for (const key of ['height', 'floors', 'population', 'jobs', 'occupancy', 'year']) {
      assert.ok(Number.isFinite(record[key]), `${record.id}.${key} must support the existing info panel`);
    }
  }
  for (const hour of [0, 6.5, 12, 18, 22]) city.updateEnvironment(sampleEnvironment(hour));
  const before = city.time;
  city.update(0.1, 0.1, 0.1, true);
  assert.equal(city.time, before);
  city.update(0.1, 0.1, 0.2, false);
  assert.ok(city.time > before);
  for (const mode of ['city', 'district', 'network']) city.setView(mode);
  results.defaultStats = seed === 0xA1B2C3D4 ? city.stats : results.defaultStats;
  city.dispose();
}

// The ring island must stay a ring: the garden is land, the canals are water.
const plan = createPlan('RING-01');
assert.ok(pointInPolygon(plan.land[0], [0, 0]), 'The garden centre must be land');
assert.equal(pointInPolygon(plan.land[0], [0, MAP.tip + 3]), false, 'The outer basin must be water');
const canalAngle = Math.PI / MAP.fingers;
const canalPoint = [Math.cos(canalAngle) * (MAP.tip + 2), Math.sin(canalAngle) * (MAP.tip + 2)];
assert.equal(pointInPolygon(plan.land[0], canalPoint), false, 'The canal between fingers must be water');
assert.ok(pointInPolygon(plan.land[1], [0, MAP.causewayZ + 1]), 'The mainland bridgehead must be land');

const originalHtml = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
const html = await fs.readFile(new URL('./index.html', import.meta.url), 'utf8');
const main = await fs.readFile(new URL('./main.js', import.meta.url), 'utf8');
// The original page keeps evolving (it gained a camera-effect toggle while this
// map was built), so the contract is: every control this page's own script uses
// must exist, and the original control set must still be mirrored almost 1:1.
const originalIds = [...originalHtml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const ringIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const usedIds = new Set([...main.matchAll(/querySelector\("#([^"]+)"\)/g)].map((m) => m[1]));
for (const id of usedIds) assert.ok(ringIds.has(id), `Missing UI control ${id} used by main.js`);
for (const id of ['scene', 'statusText', 'infoPanel', 'seedPanel', 'seedInput', 'pauseBtn', 'rebuildBtn', 'seedBtn', 'projectionBtn', 'resetViewBtn', 'toast', 'boot']) {
  assert.ok(ringIds.has(id), `Missing core control ${id}`);
}
const mirrored = originalIds.filter((id) => ringIds.has(id)).length;
assert.ok(mirrored >= originalIds.length - 3, `Only ${mirrored}/${originalIds.length} original controls mirrored`);
assert.ok(ringIds.size >= 45, 'The ring page lost too many controls');
assert.ok(html.includes('href="../src/style.css"'), 'The ring map must use the original stylesheet');
assert.ok(main.includes('"pixelbay.ringseed"'));
assert.ok(!main.includes('"pixelbay.seed"'));
for (const setting of ['THREE.NeutralToneMapping', 'renderer.toneMappingExposure = 1.28', 'from "../src/environment.js"']) {
  assert.ok(main.includes(setting), `Missing ${setting}`);
}
const hash = (text) => createHash('sha256').update(text).digest('hex');
results.originalStyleSha256 = hash(await fs.readFile(new URL('../src/style.css', import.meta.url), 'utf8'));
results.originalUiIds = originalIds.length;
results.mirroredUiIds = mirrored;
console.log(JSON.stringify(results, null, 2));
