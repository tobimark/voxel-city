// Dump the plan as JSON so the Python previewer can draw a 2D map.
//   node ring-study/preview.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createPlan, DISTRICTS, MAP } from './plan.js';

const plan = createPlan('RING-01');
const payload = {
  map: MAP,
  districts: DISTRICTS,
  land: plan.land,
  roads: plan.roads.map((road) => ({ id: road.id, a: road.a, b: road.b, width: road.width, kind: road.kind })),
  blocks: plan.blocks.map((block) => ({
    id: block.id,
    polygon: block.polygon,
    district: block.district,
    kind: block.kind,
    name: block.name,
    center: block.center,
    lots: block.lots.map((lot) => ({ x: lot.x, z: lot.z, w: lot.w, d: lot.d, angle: lot.angle, asset: lot.asset, height: lot.height })),
  })),
  piers: plan.piers,
  boats: plan.boats,
  diagnostics: plan.diagnostics,
};
const out = fileURLToPath(new URL('./preview-plan.json', import.meta.url));
fs.writeFileSync(out, JSON.stringify(payload));
console.log(`wrote ${out}`);
console.log(JSON.stringify(plan.diagnostics));
