// The new proposal is intentionally independent of src/city-plan.js.
// Roads, blocks, parcels, animation routes and diagnostics share this geometry.
export const DISTRICTS = {
  residential: { name:'花园住区', en:'GARDEN QUARTER', color:'#a7b58a', description:'长短不一的街区围着安静的庭院。沿街有小店，转过街角就是树荫和邻里的生活。', center:[-10,-15] },
  oldtown: { name:'海风老城', en:'THE OLD TOWN', color:'#c28e72', description:'一条斜向老街穿过细密的巷子。坡屋顶、街角咖啡和小小的广场，保留了最初的港湾记忆。', center:[-12,12] },
  downtown: { name:'湾畔中心', en:'BAY CENTRE', color:'#8caaac', description:'一座主塔、几组中层街坊。高楼退到海岸之后，给滨水大道留下完整的天空。', center:[5,-6] },
  civic: { name:'中央花园', en:'CIVIC GARDEN', color:'#b9bf8b', description:'市政厅面向喷泉和开阔的草坪。它既是城市的公共客厅，也是通往各片街区的中间站。', center:[-8,-7] },
  commercial: { name:'市集街坊', en:'MARKET STREETS', color:'#c5ac83', description:'书店、咖啡和街角商铺沿着道路生长。中等尺度的街坊，把安静住区与热闹中心自然连起来。', center:[-7,0] },
  academic: { name:'林荫学园', en:'THE CAMPUS', color:'#8fada0', description:'图书馆、教学楼和运动场藏在树间。校园沿用城市的道路方向，在内部留出更大的绿色庭院。', center:[14,-15] },
  harbor: { name:'东岸港口', en:'EAST DOCKS', color:'#b9a48a', description:'仓库与旧港市场顺着岸线展开。装卸的院子、渔船和木栈桥，让海湾依然是一座港口。', center:[17,0] },
  industrial: { name:'北岸工坊', en:'NORTH WORKS', color:'#a7aaa1', description:'铁路边的小型工坊与仓储院落，保持朴素而清楚的秩序。货运通道接入城市的外围道路。', center:[-17,-15] },
  promenade: { name:'滨海花园', en:'WATERFRONT', color:'#9ebd87', description:'连续的步道从灯塔延伸到港口。草坡与树荫接住街区的边界，最好的海景留给每个人。', center:[2,15] },
};

export const LAND = [[-24,-22],[24,-22],[24,6.2],[8,6.2],[8,23],[-24,23]];
export const WATER_Y = -1.12;
export const BLOCK_Y = 0.39;
export const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
export const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
export const area=(p)=>Math.abs(p.reduce((s,a,i)=>s+cross(a,p[(i+1)%p.length]),0))/2;
export const rect=(x0,x1,z0,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
export function rngFor(value) {
  let v=2166136261;
  for(const ch of String(value)) v=Math.imul(v^ch.charCodeAt(0),16777619);
  return ()=>{v=(v+0x6d2b79f5)>>>0;let t=v;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function centroid(p) {
  let a=0,x=0,z=0;
  p.forEach((u,i)=>{const v=p[(i+1)%p.length],c=cross(u,v);a+=c;x+=(u[0]+v[0])*c;z+=(u[1]+v[1])*c;});
  return [x/(3*a),z/(3*a)];
}
export function contains(polygon,p,padding=0) {
  return polygon.every((a,i)=>{const b=polygon[(i+1)%polygon.length],e=sub(b,a);return cross(e,sub(p,a))>=padding*Math.hypot(...e)-1e-7;});
}
export function clip(polygon,normal,offset) {
  const out=[];
  for(let i=0;i<polygon.length;i++) {
    const a=polygon[i],b=polygon[(i+1)%polygon.length];
    const da=a[0]*normal[0]+a[1]*normal[1]-offset,db=b[0]*normal[0]+b[1]*normal[1]-offset;
    if(da>=-1e-8) out.push(a);
    if((da>1e-8&&db<-1e-8)||(da<-1e-8&&db>1e-8)) {const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
  }
  return out;
}
function cutRoad(polygon,road) {
  const dx=road.b[0]-road.a[0],dz=road.b[1]-road.a[1],len=Math.hypot(dx,dz),n=[-dz/len,dx/len],o=n[0]*road.a[0]+n[1]*road.a[1];
  return [clip(polygon,n,o+road.width/2),clip(polygon,[-n[0],-n[1]],-o+road.width/2)].filter(p=>p.length>=3&&area(p)>1);
}
export function lotPolygon(lot,extra=0) {
  const c=Math.cos(lot.angle),s=Math.sin(lot.angle),w=lot.w+extra*2,d=lot.d+extra*2;
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>[lot.x+x*w/2*c+z*d/2*s,lot.z-x*w/2*s+z*d/2*c]);
}
export function polygonsOverlap(a,b) {
  for(const p of [a,b]) for(let i=0;i<p.length;i++) {
    const edge=sub(p[(i+1)%p.length],p[i]),axis=[-edge[1],edge[0]];
    const aa=a.map(v=>v[0]*axis[0]+v[1]*axis[1]),bb=b.map(v=>v[0]*axis[0]+v[1]*axis[1]);
    if(Math.max(...aa)<=Math.min(...bb)+1e-7||Math.max(...bb)<=Math.min(...aa)+1e-7)return false;
  }
  return true;
}
export function roadPolygon(r) {
  const dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],length=Math.hypot(dx,dz);
  return lotPolygon({x:(r.a[0]+r.b[0])/2,z:(r.a[1]+r.b[1])/2,w:length,d:r.width,angle:-Math.atan2(dz,dx)});
}
function makeNetwork(roads) {
  const cuts=roads.map(()=>[0,1]),nodes=[],edges=[],byKey=new Map();
  for(let i=0;i<roads.length;i++)for(let j=i+1;j<roads.length;j++) {
    const a=roads[i],b=roads[j],u=sub(a.b,a.a),v=sub(b.b,b.a),den=cross(u,v);
    if(Math.abs(den)<1e-8)continue;
    const t=cross(sub(b.a,a.a),v)/den,s=cross(sub(b.a,a.a),u)/den;
    if(t>=-1e-7&&t<=1+1e-7&&s>=-1e-7&&s<=1+1e-7){cuts[i].push(Math.max(0,Math.min(1,t)));cuts[j].push(Math.max(0,Math.min(1,s)));}
  }
  function node(p) {const key=p.map(n=>n.toFixed(5)).join(',');if(!byKey.has(key)){byKey.set(key,nodes.length);nodes.push({id:nodes.length,p,edges:[]});}return byKey.get(key);}
  roads.forEach((road,i)=>{
    const ts=[...new Set(cuts[i].map(v=>v.toFixed(7)))].map(Number).sort((a,b)=>a-b),d=sub(road.b,road.a);
    for(let j=1;j<ts.length;j++) {
      const p=ts.slice(j-1,j+1).map(t=>[road.a[0]+d[0]*t,road.a[1]+d[1]*t]);
      if(Math.hypot(...sub(p[1],p[0]))<1e-4)continue;
      const a=node(p[0]),b=node(p[1]),id=edges.length;
      edges.push({id,a,b,road:i,length:Math.hypot(...sub(p[1],p[0]))});nodes[a].edges.push(id);nodes[b].edges.push(id);
    }
  });
  return {nodes,edges};
}

function parcels(block,seed) {
  const lots=[],rng=rngFor(`${seed}:${block.id}:parcels`),center=block.center;
  function add(x,z,w,d,angle,asset,height) {
    const lot={id:`${block.id}-${lots.length}`,x,z,w,d,angle,asset,height};
    const p=lotPolygon(lot);
    if(!p.every(v=>contains(block.polygon,v,.3))||lots.some(l=>polygonsOverlap(lotPolygon(l,.12),p)))return false;
    lots.push(lot);return true;
  }
  const [cx,cz]=center;
  if(block.kind==='park') {
    return lots;
  }
  if(block.kind==='amusement') return lots;
  if(block.kind==='civic') {
    add(cx,cz-1.6,3.4,2.8,0,'b-cityhall',6);
    add(cx-2.0,cz+1.3,2.5,2.6,0,'b-museum',5);
    add(cx+2.0,cz+1.3,2.4,2.6,0,'b-library',5);
    return lots;
  }
  if(block.kind==='landmark') {
    add(cx,cz,5.4,5.3,0,block.id==='N12'?'s-trade':'s-apex',25);
    return lots;
  }
  if(block.kind==='offices') {
    add(cx,cz,5.4,5.4,0,'s-cloudspire',25);
    return lots;
  }
  if(block.kind==='campus') {
    add(cx-1.5,cz-1.1,2.75,2.3,0,'b-school',2.6);
    add(cx+1.7,cz+.7,2.1,2.25,Math.PI,'b-library',2.0);
    return lots;
  }
  const family=block.district;
  const old=family==='oldtown',industrial=family==='industrial'||family==='harbor';
  const assets=old?['b-townhouse','b-townhouse','b-cafe','b-bookshop','b-diner','b-cottage']:
    family==='commercial'?['b-market','b-cafe','b-bookshop','b-department','b-courtyard']:
    industrial?['b-warehouse','b-workshop']:family==='downtown'?['b-office','b-glass','b-stepped']:['b-lowrise','b-lowrise','b-townhouse','b-highrise','b-courtyard'];
  const depth=industrial?2.7:old?2.0:2.25,target=industrial?3.1:old?1.45:1.9;
  for(let i=0;i<block.polygon.length;i++) {
    const a=block.polygon[i],b=block.polygon[(i+1)%block.polygon.length],v=sub(b,a),length=Math.hypot(...v),u=v.map(x=>x/length),n=[-u[1],u[0]],angle=-Math.atan2(u[1],u[0]);
    const count=Math.floor((length-1.2)/(target+.2));
    if(count<1)continue;
    const available=length-1.15,step=available/count;
    for(let k=0;k<count;k++) {
      const along=.575+step*(k+.5),w=Math.min(step-.12,target*(.95+rng()*.08)),d=depth*(.97+rng()*.05),inset=.32+d/2;
      const asset=assets[Math.floor(rng()*assets.length)];
      const height=industrial?4:old?8:family==='downtown'?9:family==='commercial'?6:7;
      add(a[0]+u[0]*along+n[0]*inset,a[1]+u[1]*along+n[1]*inset,w,d,angle,asset,height);
    }
  }
  if(block.area>48&&family==='residential')add(cx,cz,2.1,2.0,0,'b-lowrise',7);
  return lots;
}

export function createPlan(seed='TIDELINE-01') {
  const roads=[];
  const road=(id,a,b,width,kind='street')=>roads.push({id,a,b,width,kind});
  road('west-coast',[-22.4,-20.4],[-22.4,21.4],1.4,'avenue');
  road('north-coast',[-22.4,-20.4],[22.4,-20.4],1.4,'avenue');
  road('east-coast',[22.4,-20.4],[22.4,4.4],1.4,'avenue');
  road('bay-boulevard',[-22.4,4.4],[22.4,4.4],1.8,'boulevard');
  road('quay-axis',[6.4,-20.4],[6.4,21.4],1.5,'avenue');
  road('south-coast',[-22.4,21.4],[6.4,21.4],1.4,'avenue');
  road('garden-axis',[-12.5,-20.4],[-12.5,21.4],1.2);
  road('civic-axis',[-3.2,-20.4],[-3.2,21.4],1.3);
  road('east-lane',[14.4,-20.4],[14.4,4.4],.85,'lane');
  road('north-cross',[-22.4,-11.5],[22.4,-11.5],1.25);
  road('central-cross',[-22.4,-3.2],[22.4,-3.2],1.25);
  road('oldtown-cross',[-22.4,12.8],[6.4,12.8],1.0,'lane');
  road('garden-lane',[-22.4,-7.35],[-12.5,-7.35],.75,'lane');
  road('oldtown-diagonal',[-22.4,6.8],[-3.2,19.4],.85,'lane');
  const blocks=[];
  function block(id,polygon,district,kind='perimeter',name='') {
    if(area(polygon)<1)return;
    const actual=area(polygon)<14?'park':kind;
    blocks.push({id,polygon,district,kind:actual,center:centroid(polygon),name:name||`${DISTRICTS[district].name} · ${String(blocks.length+1).padStart(2,'0')}`,area:area(polygon)});
  }
  const xs=[[-21.7,-13.1],[-11.9,-3.85],[-2.55,5.65],[7.15,13.975],[14.825,21.7]],zs=[[-19.7,-12.125],[-10.875,-3.825],[-2.575,3.5]];
  const districts=[['industrial','residential','residential','academic','academic'],['residential','civic','downtown','downtown','commercial'],['residential','commercial','downtown','harbor','harbor']];
  for(let row=0;row<3;row++)for(let col=0;col<5;col++) {
    const p=rect(...xs[col],...zs[row]),id=`N${row}${col}`,district=districts[row][col];
    const kind=row===0&&col===3?'campus':row===0&&col===4?'park':row===1&&col===1?'civic':(row===1||row===2)&&col===2?'landmark':row===1&&col===3?'offices':'perimeter';
    if(row===1&&col===0)cutRoad(p,roads.find(r=>r.id==='garden-lane')).forEach((p,i)=>block(`${id}-${i}`,p,district));
    else block(id,p,district,kind,kind==='landmark'?'海湾之塔':kind==='civic'?'市民广场':kind==='park'?'学园运动公园':kind==='campus'?'林荫校园':'');
  }
  const bx=xs.slice(0,3),bz=[[5.3,12.3],[13.3,20.7]];
  for(let row=0;row<2;row++)for(let col=0;col<3;col++) {
    const p=rect(...bx[col],...bz[row]),id=`S${row}${col}`;
    if(col<2)cutRoad(p,roads.find(r=>r.id==='oldtown-diagonal')).forEach((p,i)=>block(`${id}-${i}`,p,'oldtown'));
    else block(id,p,'promenade',row===0?'park':'amusement',row===0?'海湾花园':'海湾游乐园');
  }
  for(const b of blocks)b.lots=parcels(b,seed);
  const oldLots=blocks.filter(b=>b.district==='oldtown').flatMap(b=>b.lots);
  oldLots.sort((a,b)=>Math.hypot(a.x+12,a.z-12)-Math.hypot(b.x+12,b.z-12));
  if(oldLots[0])oldLots[0].asset='b-clocktower';
  const network=makeNetwork(roads);
  const plan={seed,land:LAND,roads,blocks,network};
  plan.diagnostics=validatePlan(plan);
  return plan;
}

export function validatePlan(plan) {
  const failures=[];
  // LAND is concave; its valid region is the union of these two rectangles.
  const onLand=([x,z])=>x>=-24-1e-6&&x<=24+1e-6&&z>=-22-1e-6&&z<=23+1e-6&&(x<=8+1e-6||z<=6.2+1e-6);
  for(let i=0;i<plan.blocks.length;i++) {
    const b=plan.blocks[i];
    if(!b.polygon.every(onLand))failures.push(`land:${b.id}`);
    for(let j=i+1;j<plan.blocks.length;j++)if(polygonsOverlap(b.polygon,plan.blocks[j].polygon))failures.push(`block-overlap:${b.id}:${plan.blocks[j].id}`);
    for(const r of plan.roads)if(polygonsOverlap(b.polygon,roadPolygon(r)))failures.push(`road-overlap:${b.id}:${r.id}`);
    b.lots.forEach((lot,j)=>{
      const p=lotPolygon(lot);
      if(!p.every(v=>contains(b.polygon,v,.29)))failures.push(`lot-boundary:${lot.id}`);
      for(let k=j+1;k<b.lots.length;k++)if(polygonsOverlap(p,lotPolygon(b.lots[k])))failures.push(`lot-overlap:${lot.id}:${b.lots[k].id}`);
    });
  }
  let components=0;const visited=new Set();
  for(const node of plan.network.nodes)if(!visited.has(node.id)) {
    components++;const stack=[node.id];
    while(stack.length){const id=stack.pop();if(visited.has(id))continue;visited.add(id);for(const edge of plan.network.nodes[id].edges){const e=plan.network.edges[edge];stack.push(e.a===id?e.b:e.a);}}
  }
  if(components!==1)failures.push(`network-components:${components}`);
  if(plan.network.nodes.some(n=>n.edges.length<2))failures.push('unplanned-dead-end');
  return {failures,components,blocks:plan.blocks.length,buildings:plan.blocks.reduce((s,b)=>s+b.lots.length,0),openSpaces:plan.blocks.filter(b=>b.kind==='park'||b.kind==='civic').length};
}
