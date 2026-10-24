// Read-only audit of the existing generator. Run: node docs/planning/audit.mjs
// Outputs are written only inside docs/planning; no application sources change.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const output = new URL('./', import.meta.url);
const source = await fs.readFile(new URL('../../src/city-plan.js', import.meta.url), 'utf8');
const { createCityPlan, ZONES } = await import(
  `data:text/javascript;base64,${Buffer.from(`${source}\nexport { ZONES };`).toString('base64')}`
);
const citySource = await fs.readFile(new URL('../../src/city.js', import.meta.url), 'utf8');
const lotSource = citySource.slice(citySource.indexOf('  function planBlockLots('), citySource.indexOf('  function fillPlanBlock('));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand = (rng, lo, hi) => lo + (hi - lo) * rng();
function rngFor(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const area = (p) => Math.abs(p.reduce((s, a, i) => s + cross(a, p[(i + 1) % p.length]), 0)) / 2;
function rectangle(x, z, w, d, angle = 0) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v]) => [x + u*w/2*c + v*d/2*s, z - u*w/2*s + v*d/2*c]);
}
function intersection(subject, clip) {
  let result = subject;
  for (let i = 0; i < clip.length && result.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length], edge = sub(b, a);
    const inside = (p) => cross(edge, sub(p, a)) >= -1e-9;
    const intersect = (p, q) => {
      const direction = sub(q, p);
      const denominator = cross(edge, direction);
      const t = Math.abs(denominator) < 1e-12 ? 0 : -cross(edge, sub(p, a)) / denominator;
      return [p[0] + direction[0] * t, p[1] + direction[1] * t];
    };
    const input = result;
    result = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j], q = input[(j + 1) % input.length];
      if (inside(p) && inside(q)) result.push(q);
      else if (inside(p)) result.push(intersect(p,q));
      else if (inside(q)) result.push(intersect(p,q), q);
    }
  }
  return result;
}
const overlap = (a,b) => area(intersection(a,b));
const blockPolygon = (b) => rectangle(b.x,b.z,b.w,b.d,b.angle);
const roadPolygon = (r) => rectangle((r.x0+r.x1)/2,(r.z0+r.z1)/2,Math.hypot(r.x1-r.x0,r.z1-r.z0),r.width,Math.atan2(-(r.z1-r.z0),r.x1-r.x0));
const rectPolygon = ([x0,x1,z0,z1]) => rectangle((x0+x1)/2,(z0+z1)/2,x1-x0,z1-z0);
function pointSegment(p,r) {
  const a=[r.x0,r.z0], b=[r.x1,r.z1], v=sub(b,a), w=sub(p,a);
  const t=clamp((w[0]*v[0]+w[1]*v[1])/(v[0]*v[0]+v[1]*v[1]),0,1);
  return Math.hypot(p[0]-a[0]-t*v[0],p[1]-a[1]-t*v[1]);
}
function segmentDistance(a,b) {
  const p=[a.x0,a.z0], q=[b.x0,b.z0], u=[a.x1-a.x0,a.z1-a.z0], v=[b.x1-b.x0,b.z1-b.z0];
  const den=cross(u,v);
  if (Math.abs(den)>1e-10) {
    const t=cross(sub(q,p),v)/den, s=cross(sub(q,p),u)/den;
    if(t>=0 && t<=1 && s>=0 && s<=1) return 0;
  }
  return Math.min(pointSegment(p,b),pointSegment([a.x1,a.z1],b),pointSegment(q,a),pointSegment([b.x1,b.z1],a));
}
function components(roads,tolerance,buffered=false) {
  const parent=roads.map((_,i)=>i);
  const root=(i)=>parent[i]===i?i:(parent[i]=root(parent[i]));
  for(let i=0;i<roads.length;i++) for(let j=i+1;j<roads.length;j++) {
    const connected=buffered ? overlap(roadPolygon(roads[i]),roadPolygon(roads[j]))>1e-6 : segmentDistance(roads[i],roads[j])<=tolerance;
    if(connected) parent[root(i)]=root(j);
  }
  const sizes=new Map();
  for(let i=0;i<roads.length;i++) sizes.set(root(i),(sizes.get(root(i))??0)+1);
  return [...sizes.values()].sort((a,b)=>b-a);
}
function audit(seed,details=false) {
  const rng=rngFor(seed), plan=createCityPlan(rng);
  const polygons=plan.blocks.map(blockPolygon);
  const land=plan.island.land.map(r=>rectPolygon([r.x0,r.x1,r.z0,r.z1]));
  const outsideZone=[],outsideLand=[],blockOverlaps=[],arterialOverlaps=[],lotOverlaps=[],lotsOutsideBlock=[];
  const lotPlanner=new Function('rng','clamp','rand',`${lotSource}\nreturn planBlockLots;`)(rng,clamp,rand);
  for(let i=0;i<plan.blocks.length;i++) {
    const b=plan.blocks[i], p=polygons[i], zone=ZONES.find(z=>z.id===b.zone);
    const zoneLoss=b.w*b.d-overlap(p,rectPolygon(zone.rect));
    const landLoss=b.w*b.d-land.reduce((s,l)=>s+overlap(p,l),0);
    if(zoneLoss>0.01) outsideZone.push({block:b.label,zone:b.zone,area:zoneLoss});
    if(landLoss>0.01) outsideLand.push({block:b.label,zone:b.zone,area:landLoss});
    for(let j=i+1;j<polygons.length;j++) {
      const a=overlap(p,polygons[j]);
      if(a>0.01) blockOverlaps.push({a:b.label,b:plan.blocks[j].label,area:a});
    }
    for(let j=0;j<plan.arterials.length;j++) {
      const a=overlap(p,roadPolygon(plan.arterials[j]));
      if(a>0.01) arterialOverlaps.push({block:b.label,zone:b.zone,road:j,area:a});
    }
    // These are proposed lot reservations, not measured final mesh overlaps.
    // The isolated lot planner doesn't consume the renderer's intervening RNG calls.
    if(['green','amusement','construction','civic','station'].includes(b.morph)) continue;
    const lots=lotPlanner(b), lp=lots.map(l=>rectangle(l.x,l.z,l.w,l.d,l.rotation));
    const bp=rectangle(0,0,b.w,b.d);
    for(let j=0;j<lp.length;j++) {
      if(lots[j].w*lots[j].d-overlap(lp[j],bp)>0.01) lotsOutsideBlock.push({block:b.label,lot:j});
      for(let k=j+1;k<lp.length;k++) {
        const a=overlap(lp[j],lp[k]);
        if(a>0.01) lotOverlaps.push({block:b.label,morph:b.morph,a:j,b:k,area:a});
      }
    }
  }
  const dangles=[];
  for(let i=0;i<plan.streets.length;i++) for(const end of [0,1]) {
    const r=plan.streets[i], p=[r[`x${end}`],r[`z${end}`]];
    const distance=Math.min(...plan.streets.filter((_,j)=>i!==j).map(other=>pointSegment(p,other)));
    if(distance>0.25) dangles.push({road:i,end,distance});
  }
  const summary={seed:seed.toString(16).toUpperCase().padStart(8,'0'),blocks:plan.blocks.length,streets:plan.streets.length,arterials:plan.arterials.length,rotatedBlocks:plan.blocks.filter(b=>Math.abs(b.angle)>1e-6).length,outsideZone:outsideZone.length,outsideLand:outsideLand.length,blockOverlapPairs:blockOverlaps.length,arterialBlockPairs:arterialOverlaps.length,blocksTouchedByArterials:new Set(arterialOverlaps.map(x=>x.block)).size,centerlineComponents025:components(plan.streets,0.25),roadSurfaceComponents:components(plan.streets,0,true),unattachedEndpoints025:dangles.length,proposedLotOverlapPairs:lotOverlaps.length,lotsOutsideBlock:lotsOutsideBlock.length,blockArea:plan.blocks.reduce((s,b)=>s+b.w*b.d,0),landArea:land.reduce((s,p)=>s+area(p),0)};
  return {summary,...(details?{outsideZone,outsideLand,blockOverlaps,arterialOverlaps,lotOverlaps,lotsOutsideBlock,dangles,plan}:{})};
}

const baseline=audit(0xA1B2C3D4,true);
const seeds=[0,1,2,42,2026,0x12345678,0xDEADBEEF,0xFFFFFFFF];
for(let i=0;i<56;i++) seeds.push(Math.imul(i+1,2654435761)>>>0);
const samples=seeds.map(seed=>audit(seed).summary);
const range=(key)=>({min:Math.min(...samples.map(s=>s[key])),max:Math.max(...samples.map(s=>s[key])),affectedSeeds:samples.filter(s=>s[key]>0).length});
const ranges=Object.fromEntries(['blocks','outsideZone','outsideLand','blockOverlapPairs','arterialBlockPairs','blocksTouchedByArterials','proposedLotOverlapPairs','lotsOutsideBlock'].map(k=>[k,range(k)]));
const results={snapshot:{generatedAt:new Date().toISOString(),sha256:{'src/city-plan.js':createHash('sha256').update(source).digest('hex'),'src/city.js':createHash('sha256').update(citySource).digest('hex')}},method:{baseline:'A1B2C3D4',additionalSeedCount:samples.length,areaThreshold:0.01,connectionTolerance:0.25,notes:['Convex polygon intersection of rotated block rectangles and finite road rectangles; no rounded road caps.','Centerline graph allows intersections and endpoint proximity <= 0.25; it ignores block obstruction.','Road surface components use positive overlap between finite road rectangles; they ignore the all-island asphalt underlay.','Lot reservations are computed from the original planBlockLots source, with isolated RNG; they do not reproduce final renderer random state or mesh decoration.']},baseline,ranges,samples};
await fs.writeFile(new URL('audit-results.json',output),JSON.stringify(results,null,2)+'\n');

const colors={downtown:'#bd945e',oldtown:'#b97e69',civic:'#bdb5a2',commercial:'#bb9374',residential:'#79945f',academic:'#6e9fa3',industrial:'#89918c',harbor:'#7398ae',creative:'#b8819c',green:'#95b96b',amusement:'#d4ab67'};
const esc=(s)=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const points=(p)=>p.map(([x,z])=>`${(x+24)*16+55},${(z+24)*16+100}`).join(' ');
const px=(x)=>(x+24)*16+55, py=(z)=>(z+24)*16+100;
const plan=baseline.plan;
let shapes='';
for(const l of plan.island.land) shapes+=`<polygon points="${points(rectPolygon([l.x0,l.x1,l.z0,l.z1]))}" fill="#ece7dc"/>`;
for(const z of ZONES) shapes+=`<polygon points="${points(rectPolygon(z.rect))}" fill="none" stroke="#8f9b9b" stroke-dasharray="4 4" stroke-width="1"/>`;
for(const r of plan.streets) shapes+=`<polygon points="${points(roadPolygon(r))}" fill="#526575" opacity=".85"/>`;
for(const b of plan.blocks) {
  shapes+=`<polygon points="${points(blockPolygon(b))}" fill="${colors[b.district]}" stroke="#faf7ef" stroke-width="1.1"/><text x="${px(b.x)}" y="${py(b.z)}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#182a32">${esc(b.label)}</text>`;
}
for(const r of baseline.arterialOverlaps) {
  const b=plan.blocks.find(b=>b.label===r.block);
  shapes+=`<polygon points="${points(intersection(blockPolygon(b),roadPolygon(plan.arterials[r.road])))}" fill="#ed4d49" opacity=".95"/>`;
}
for(const b of baseline.outsideZone) {
  const block=plan.blocks.find(x=>x.label===b.block);
  shapes+=`<polygon points="${points(blockPolygon(block))}" fill="none" stroke="#b229a6" stroke-width="2.8"/>`;
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="920" viewBox="0 0 1180 920"><rect width="1180" height="920" fill="#f7f4ed"/><style>text{font-family:'Microsoft YaHei',sans-serif}</style><text x="55" y="38" font-size="25" font-weight="700" fill="#19303a">现有城市规划：道路与街区冲突</text><text x="55" y="65" font-size="14" fill="#526575">SEED A1B2C3D4 · 当前源码的二维几何投影 · +Z 朝下，非指南针方位</text><rect x="55" y="100" width="768" height="768" fill="#d8edf0"/>${shapes}<g transform="translate(855,135)" fill="#19303a"><text font-size="19" font-weight="700">图例</text><rect y="25" width="19" height="13" fill="#526575"/><text x="29" y="37" font-size="14">道路的声明宽度</text><rect y="57" width="19" height="13" fill="#ed4d49"/><text x="29" y="69" font-size="14">主干道侵入街区</text><rect y="89" width="19" height="13" fill="none" stroke="#b229a6" stroke-width="3"/><text x="29" y="101" font-size="14">越出所属片区</text><path d="M0 130 H20" stroke="#8f9b9b" stroke-dasharray="4 4"/><text x="29" y="135" font-size="14">原始片区边界</text><text y="195" font-size="16" font-weight="700">${baseline.summary.blocks} 个街区 / ${baseline.summary.streets} 条路段</text><text y="224" font-size="14">${baseline.summary.outsideZone} 个街区越出所属片区</text><text y="251" font-size="14">${baseline.summary.blocksTouchedByArterials} 个街区与主干道重叠</text><text y="278" font-size="14">${baseline.summary.arterialBlockPairs} 处道路—街区重叠</text><text y="331" font-size="13">红色为精确矩形交集。</text><text y="355" font-size="13">不包含建筑挑檐、广场等外扩。</text><text y="395" font-size="13">路面显示在街区下方，</text><text y="419" font-size="13">因此部分冲突在 3D 中被遮住。</text><text y="459" font-size="13">浅色陆地在实际场景中</text><text y="483" font-size="13">几乎全部覆盖沥青。</text></g><text x="55" y="901" font-size="13" fill="#526575">只用于调研；没有修改城市生成算法。复现：node docs/planning/audit.mjs</text></svg>`;
await fs.writeFile(new URL('current-layout-audit.svg',output),svg);
console.log(JSON.stringify({baseline:baseline.summary,ranges,outputs:['audit-results.json','current-layout-audit.svg'].map(p=>fileURLToPath(new URL(p,output)))},null,2));
