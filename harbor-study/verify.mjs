import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createPlan, contains, polygonsOverlap } from './plan.js';
import { createCity } from './city.js';
import { sampleEnvironment } from '../src/environment.js';

const results={planningSeeds:64,renderedSeeds:5,originalStyle:true,failures:[]};
// Native in-city materials create a glow CanvasTexture; no WebGL is needed here.
globalThis.document ??= {createElement:()=>({width:64,height:64,getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
const roadSnapshot=JSON.stringify(createPlan(0).roads);
for(let i=0;i<64;i++) {
  const plan=createPlan(Math.imul(i+1,2654435761)>>>0);
  assert.deepEqual(plan.diagnostics.failures,[],`Invalid plan at seed ${i}`);
  assert.equal(JSON.stringify(plan.roads),roadSnapshot,'Building seed must not move the street network');
}
for(const seed of [0,1,42,0xA1B2C3D4,0xffffffff]) {
  const city=createCity({seed});
  for(const footprint of city.builtFootprints) {
    const block=city.blocks.find(b=>b.id===footprint.blockId),lot=block.lots.find(l=>l.id===footprint.id);
    assert.ok(footprint.polygon.every(p=>contains(block.polygon,p,.28)),`${footprint.id} is out of bounds`);
    assert.ok(footprint.height<=lot.height+1e-6);
  }
  for(let i=0;i<city.builtFootprints.length;i++)for(let j=i+1;j<city.builtFootprints.length;j++)assert.equal(polygonsOverlap(city.builtFootprints[i].polygon,city.builtFootprints[j].polygon),false,'Rendered footprint overlap');
  for(const record of city.buildings)for(const key of ['height','floors','population','jobs','occupancy','year'])assert.ok(Number.isFinite(record[key]),`${record.id}.${key} must support the existing info panel`);
  for(const hour of [0,6.5,12,18,22])city.updateEnvironment(sampleEnvironment(hour));
  const before=city.time;city.update(.1,.1,.1,true);assert.equal(city.time,before);city.update(.1,.1,.2,false);assert.ok(city.time>before);
  for(const mode of ['city','district','network'])city.setView(mode);
  results.defaultStats=seed===0xA1B2C3D4?city.stats:results.defaultStats;
  city.dispose();
}
const originalHtml=await fs.readFile(new URL('../index.html',import.meta.url),'utf8'),html=await fs.readFile(new URL('./index.html',import.meta.url),'utf8');
const originalIds=[...originalHtml.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
for(const id of originalIds)assert.ok(html.includes(`id="${id}"`),`Missing original UI control ${id}`);
assert.ok(html.includes('href="../src/style.css"'),'The proposal must use the original stylesheet');
const originalMain=await fs.readFile(new URL('../src/main.js',import.meta.url),'utf8'),main=await fs.readFile(new URL('./main.js',import.meta.url),'utf8');
assert.ok(main.includes('"pixelbay.proposal.seed"'));assert.ok(!main.includes('"pixelbay.seed"'));
for(const setting of ['THREE.NeutralToneMapping','renderer.toneMappingExposure = 1.28','from "../src/environment.js"'])assert.ok(main.includes(setting));
const hash=text=>createHash('sha256').update(text).digest('hex');
results.originalStyleSha256=hash(await fs.readFile(new URL('../src/style.css',import.meta.url),'utf8'));
results.originalUiIdsPreserved=originalIds.length;
console.log(JSON.stringify(results,null,2));
