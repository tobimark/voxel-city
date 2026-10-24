import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ShowcaseKit, createShowcaseModel } from '../src/showcase-models.js';
import { ASSET_BY_ID } from '../src/object-catalog.js';
import { BLOCK_Y, WATER_Y, DISTRICTS, MAP, contains, insideWithMargin, pointInPolygon, lotPolygon, rngFor, sub, polygonsOverlap } from './plan.js';
import { createPlan } from './plan.js';
import { makeWaterMaterial } from './water.js';
import { createNativeBuildings } from './native-buildings.js';

export function polygonGeometry(polygon,depth=0) {
  const shape=new THREE.Shape();
  polygon.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const geometry=depth?new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}):new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI/2);return geometry;
}

export function createProposalCity(plan) {
  const root=new THREE.Group(),kit=new ShowcaseKit(),geometries=new Set(),materials=new Set(),builtFootprints=[],buildings=[],selectables=[];
  const base=new THREE.Group(),roads=new THREE.Group(),ground=new THREE.Group(),architecture=new THREE.Group(),gardens=new THREE.Group(),districts=new THREE.Group(),network=new THREE.Group(),traffic=new THREE.Group();
  root.add(base,roads,ground,architecture,gardens,districts,network,traffic);
  const cars=[],boats=[],selection=new THREE.Group(),placements=[],features=[];let native=null;root.add(selection);
  const mat=(color,options={})=>kit.material(color,{roughness:.86,...options});
  const box=(parent,w,h,d,color,x,y,z,rotation=0)=>kit.box(parent,w,h,d,typeof color==='string'?mat(color):color,x,y,z,{ry:rotation});
  function polygon(parent,p,color,top,height=0,options={}) {
    const geometry=polygonGeometry(p,height);geometries.add(geometry);
    const mesh=new THREE.Mesh(geometry,typeof color==='string'?mat(color,options):color);mesh.position.y=top-height;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function tree(parent,x,z,height=.95,type='broadleaf',baseY=BLOCK_Y) {
    const rng=rngFor(`${plan.seed}:tree:${x.toFixed(2)}:${z.toFixed(2)}`);
    kit.cyl(parent,.055*height,height*.62,mat('#897a5e'),x,baseY+height*.31,z);
    const colors=type==='cherry'?['#db9eae','#e9b5bf','#c9869b']:type==='pine'?['#456c4d','#537e55']:['#5f8c4b','#719d56','#4f7f4a','#84a95c'];
    const color=mat(colors[Math.floor(rng()*colors.length)]);
    if(type==='pine') {
      kit.cone(parent,height*.34,height*.8,color,x,baseY+height*.9,z,{segments:6});
      kit.cone(parent,height*.26,height*.65,color,x,baseY+height*1.2,z,{segments:6});
    } else {
      kit.ico(parent,height*.38,color,x,baseY+height*.89,z,{squash:1.16});
      kit.ico(parent,height*.25,color,x+height*.22,baseY+height*.79,z-height*.12);
    }
  }
  function bench(parent,x,z,angle=0) {
    box(parent,.64,.05,.22,'#9e7954',x,BLOCK_Y+.23,z,angle);
    box(parent,.64,.25,.045,'#ab855e',x-Math.sin(angle)*.1,BLOCK_Y+.36,z-Math.cos(angle)*.1,angle);
    for(const side of [-1,1])box(parent,.04,.2,.17,'#5c6e63',x+Math.cos(angle)*side*.23,BLOCK_Y+.1,z-Math.sin(angle)*side*.23,angle);
  }
  function lamp(x,z) {
    kit.cyl(gardens,.023,.76,mat('#61786f'),x,.38+.1,z);
    kit.cyl(gardens,.10,.07,mat('#e9dbb6',{emissive:'#ffce81',emissiveIntensity:.25}),x,.91,z,{segments:6});
    kit.cone(gardens,.13,.075,mat('#566c63'),x,.98,z,{segments:6});
  }
  function fountain(x,z) {
    kit.cyl(gardens,1.0,.08,mat('#c5c6ad'),x,BLOCK_Y+.04,z,{segments:20});
    kit.cyl(gardens,.84,.1,mat('#77b5ad',{roughness:.3}),x,BLOCK_Y+.09,z,{segments:20});
    kit.cyl(gardens,.24,.26,mat('#d5d1b7'),x,BLOCK_Y+.23,z,{segments:10});
    kit.cyl(gardens,.48,.075,mat('#e7dfc5'),x,BLOCK_Y+.4,z,{segments:16});
    kit.cyl(gardens,.36,.018,mat('#8bc5b8'),x,BLOCK_Y+.45,z,{segments:16});
    kit.cyl(gardens,.045,.46,mat('#bde4d4',{transparent:true,opacity:.7}),x,BLOCK_Y+.66,z);
  }

  // Sandstone and exposed earth are the island, rather than an asphalt underlay.
  // The island outline is a gear and the mainland is a second polygon, so both
  // are extruded and dressed separately.
  for(const landPolygon of plan.land) {
    polygon(base,landPolygon,'#373633',-1.0,1.3);
    polygon(base,landPolygon,'#55483b',-.38,.75);
    polygon(base,landPolygon,'#8c8878',.025,.4);
    for(let i=0;i<landPolygon.length;i++) {
      const a=landPolygon[i],b=landPolygon[(i+1)%landPolygon.length],d=sub(b,a),l=Math.hypot(...d),angle=-Math.atan2(d[1],d[0]);
      box(base,l,.13,.16,'#938b77',(a[0]+b[0])/2,.03,(a[1]+b[1])/2,angle);
      for(let j=1;j<l;j+=1.1)box(base,.025,.11,.18,'#959d89',a[0]+d[0]*j/l,-.02,a[1]+d[1]*j/l,angle);
      // Shore foam sits just outside the quay wall (CCW polygons: outward is
      // the right-hand side of each edge).
      const nx=d[1]/l,nz=-d[0]/l;
      box(base,l*.98,.012,.1,'#cfe6dd',(a[0]+b[0])/2+nx*.5,WATER_Y+.035,(a[1]+b[1])/2+nz*.5,angle);
    }
  }
  // The only asphalt comes from the declared road corridors.
  for(const road of plan.roads) {
    const d=sub(road.b,road.a),length=Math.hypot(...d),angle=-Math.atan2(d[1],d[0]);
    box(roads,length,.07,road.width,'#474e59',(road.a[0]+road.b[0])/2,.065,(road.a[1]+road.b[1])/2,angle);
  }
  for(const edge of plan.network.edges) {
    const road=plan.roads[edge.road],a=plan.network.nodes[edge.a].p,b=plan.network.nodes[edge.b].p,v=sub(b,a),len=Math.hypot(...v),u=v.map(x=>x/len),angle=-Math.atan2(u[1],u[0]);
    if(road.width>=1.2)for(let d=1.0;d<len-.9;d+=.9)box(roads,.31,.009,.035,'#b9aa82',a[0]+u[0]*d,.107,a[1]+u[1]*d,angle);
    if(road.kind==='boulevard'&&len>2.6) {
      box(roads,len-1.6,.045,.16,'#7c9d59',(a[0]+b[0])/2,.107,(a[1]+b[1])/2,angle);
      for(let d=1.7;d<len-1.2;d+=2.9)tree(gardens,a[0]+u[0]*d,a[1]+u[1]*d,.55,'broadleaf',.13);
    }
    for(const endpoint of [0,1]) {
      const node=plan.network.nodes[endpoint?edge.b:edge.a];
      if(node.edges.length<3||len<2.5||road.width<1.1)continue;
      for(let stripe=0;stripe<3;stripe++) {
        const along=.85+stripe*.16,x=endpoint?b[0]-u[0]*along:a[0]+u[0]*along,z=endpoint?b[1]-u[1]*along:a[1]+u[1]*along;
        box(roads,.065,.012,road.width*.72,'#e8dfc3',x,.111,z,angle);
      }
    }
  }
  const greenMat=mat('#7c9d59');
  const blockFill=b=>{
    if(b.kind==='plaza')return '#cfc6ad';
    if(b.kind==='park'||b.district==='garden')return greenMat;
    if(b.kind==='civic')return '#d2c7b2';
    if(b.district==='marina')return '#8d8577';
    if(b.district==='gateway')return '#9a968c';
    if(b.district==='midtown')return '#c2b295';
    return '#c0b8a4';
  };
  for(const b of plan.blocks) {
    const p=b.polygon;
    const mesh=polygon(ground,p,'#c5bb9f',BLOCK_Y,.3);mesh.userData.blockId=b.id;
    const inner=p.map(v=>[b.center[0]+(v[0]-b.center[0])*.94,b.center[1]+(v[1]-b.center[1])*.94]);
    polygon(ground,inner,blockFill(b),BLOCK_Y+.004);
    const districtMaterial=new THREE.MeshBasicMaterial({color:DISTRICTS[b.district].color,fog:false});materials.add(districtMaterial);
    polygon(districts,p,districtMaterial,BLOCK_Y+.022);
    if(b.kind==='landmark'||b.kind==='offices') {
      const pxs=p.map(v=>v[0]),pzs=p.map(v=>v[1]);
      const deck=Math.min(4.9,Math.min(Math.max(...pxs)-Math.min(...pxs),Math.max(...pzs)-Math.min(...pzs))*.66);
      box(ground,deck,.016,deck,'#e1dcc9',b.center[0],BLOCK_Y+.014,b.center[1]);
      for(const s of [-1,1])bench(gardens,b.center[0]+s*deck*.58,b.center[1]+deck*.3,s*Math.PI/2);
    }
    for(const lot of b.lots) placements.push({...lot,blockId:b.id,district:b.district,districtName:DISTRICTS[b.district].name});
    const special=b.kind==='park'||b.kind==='civic'||b.kind==='amusement';
    const pavement=b.kind==='plaza';
    if(pavement){
      // The roundabout annulus is paving with a seating ring, not a lawn.
      const count=Math.max(3,Math.round(b.area/2.4));
      const prng=rngFor(`${plan.seed}:${b.id}:plaza`);
      for(let i=0;i<count;i++){
        const r=b.meta.r0+(b.meta.r1-b.meta.r0)*prng();
        const a=b.meta.a0+(b.meta.a1-b.meta.a0)*prng();
        bench(gardens,Math.cos(a)*r,Math.sin(a)*r,-a);
      }
      continue;
    }
    if(special){
      const xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);
      features.push({id:b.id,x:b.center[0],z:b.center[1],w:Math.max(...xs)-Math.min(...xs),d:Math.max(...zs)-Math.min(...zs),
        district:b.district,districtName:DISTRICTS[b.district].name,
        kind:b.kind==='civic'?'civicGarden':'park',
        parkKind:b.name.includes('游艇')||b.name.includes('步道')?'waterfront':b.meta&&b.meta.kind==='circle'?'pond':'pond'});
      continue;
    }
    const rng=rngFor(`${plan.seed}:${b.id}:garden`);
    const target=b.kind==='landmark'?9:b.district==='marina'?8:7;
    const xs=p.map(v=>v[0]),zs=p.map(v=>v[1]),minX=Math.min(...xs),minZ=Math.min(...zs),w=Math.max(...xs)-minX,d=Math.max(...zs)-minZ;
    let planted=0;
    for(let attempt=0;attempt<130&&planted<target;attempt++) {
      const x=minX+rng()*w,z=minZ+rng()*d;
      if(!insideWithMargin(p,[x,z],.55)||b.lots.some(l=>insideWithMargin(lotPolygon(l,.35),[x,z],.1)))continue;
      tree(gardens,x,z,.58+rng()*.4,b.district==='waterside'&&rng()<.25?'cherry':b.district==='marina'?'pine':'broadleaf');planted++;
    }
  }
  native=createNativeBuildings({seed: typeof plan.seed==='number'?plan.seed:parseInt(String(plan.seed).replace(/[^0-9a-f]/gi,''),16)||1,placements,features});
  architecture.add(native.group);buildings.push(...native.buildings);selectables.push(...native.selectables);
  for(const record of native.buildings)if(record.planningLot){
    const p=record.planningLot,f=record.planningFootprint;builtFootprints.push({id:p.id,blockId:p.blockId,polygon:lotPolygon(f),height:f.height});
  }
  // Waterfront promenade: a tree and a lamp at every fingertip, benches around
  // the garden circle, and railings along the causeway bridge.
  for(let k=0;k<MAP.fingers;k+=1){
    if(k===3)continue;
    const centre=(k/MAP.fingers)*Math.PI*2, r=MAP.tip-0.5;
    const x=Math.cos(centre)*r, z=Math.sin(centre)*r;
    tree(gardens,x,z,.6,'broadleaf',.02); lamp(x*.97,z*.97);
  }
  for(let i=0;i<12;i+=1){
    const a=(i/12)*Math.PI*2+Math.PI/12, r=MAP.parkRadius+0.5;
    bench(gardens,Math.cos(a)*r,Math.sin(a)*r,-a);
  }
  const bridgeFrom=MAP.tip+.15, bridgeTo=MAP.causewayZ;
  for(const side of [-1,1]){
    box(base,.06,.1,bridgeTo-bridgeFrom,'#8d8579',side*.92,WATER_Y+.5,(bridgeFrom+bridgeTo)/2);
    for(let z=bridgeFrom;z<bridgeTo;z+=1.1)box(base,.07,.45,.07,'#7d7960',side*.92,WATER_Y+.22,z);
  }
  // Timber slips, quays and private docks come straight from the plan.
  for(const pier of plan.piers){
    const rotation=-pier.angle, deck=pier.kind==='slip'?'#c9b48c':'#b69b70';
    box(base,pier.length,.13,pier.width,deck,pier.x,-.05,pier.z,rotation);
    for(let t=-pier.length/2+.18;t<pier.length/2;t+=.24)
      box(base,.026,.02,pier.width*1.04,'#927f5e',pier.x+Math.cos(pier.angle)*t,.025,pier.z+Math.sin(pier.angle)*t,rotation);
    if(pier.kind!=='slip')for(const s of [-1,1])for(const t of [-pier.length/2+.45,pier.length/2-.45])
      box(base,.09,1.0,.09,'#7d7960',pier.x+Math.cos(pier.angle)*t+Math.sin(pier.angle)*s*.26,-.39,pier.z+Math.sin(pier.angle)*t-Math.cos(pier.angle)*s*.26);
  }
  // Every vehicle path follows the shared road graph, including junctions.
  const carRng=rngFor(`${plan.seed}:traffic`);
  for(let i=0;i<22;i++) {
    const asset=ASSET_BY_ID.get(i===0?'v-bus':i%5===0?'v-taxi':i%7===0?'v-van':'v-sedan');
    const car=createShowcaseModel(asset,{kit,seed:`car-${i}`});batch(car);car.scale.setScalar(.65);traffic.add(car);
    const edge=plan.network.edges[Math.floor(carRng()*plan.network.edges.length)],forward=carRng()>.5;
    cars.push({mesh:car,edge:edge.id,forward,distance:carRng()*edge.length,speed:.5+carRng()*.33,rng:rngFor(`car:${i}`)});
  }
  // Boats ride exactly where the plan puts them: slips in the marina, private
  // docks on the fingers, and a handful drifting in the outer basin.
  plan.boats.forEach((spot,index)=>{
    const asset=ASSET_BY_ID.get(spot.kind);
    if(!asset)return;
    const boat=createShowcaseModel(asset,{kit,seed:`boat-${index}`});batch(boat);boat.scale.setScalar(.72);
    boat.position.set(spot.x,WATER_Y+.04,spot.z);boat.rotation.y=-spot.angle+Math.PI/2;traffic.add(boat);
    boats.push({mesh:boat,x:spot.x,z:spot.z,phase:index*1.7});
  });
  const netRoad=new THREE.MeshBasicMaterial({color:'#72cec0',fog:false}),netBlock=new THREE.MeshBasicMaterial({color:'#263946',fog:false}),netNode=new THREE.MeshBasicMaterial({color:'#ffd166',fog:false});
  materials.add(netRoad);materials.add(netBlock);materials.add(netNode);
  for(const b of plan.blocks)polygon(network,b.polygon,netBlock,BLOCK_Y+.024);
  for(const r of plan.roads){const d=sub(r.b,r.a);box(network,Math.hypot(...d),.025,r.width*.82,netRoad,(r.a[0]+r.b[0])/2,BLOCK_Y+.035,(r.a[1]+r.b[1])/2,-Math.atan2(d[1],d[0]));}
  for(const n of plan.network.nodes)kit.cyl(network,.12,.035,netNode,n.p[0],BLOCK_Y+.065,n.p[1],{segments:12});

  // Merge static geometry by material to keep the detailed shared assets cheap.
  function batch(group) {
    group.updateMatrixWorld(true);const bins=new Map(),instances=[];
    group.traverse(o=>{
      if(o.isInstancedMesh){instances.push(o);return;}
      if((!o.isMesh&&!o.isLineSegments)||Array.isArray(o.material))return;
      const key=`${o.isLineSegments?'l':'m'}:${o.material.uuid}`;
      let g=o.geometry.clone();if(g.index){const next=g.toNonIndexed();g.dispose();g=next;}
      for(const a of Object.keys(g.attributes))if(a!=='position'&&!(a==='normal'&&o.isMesh))g.deleteAttribute(a);
      g.clearGroups();g.applyMatrix4(o.matrixWorld);
      if(!bins.has(key))bins.set(key,{material:o.material,lines:o.isLineSegments,geometries:[]});
      bins.get(key).geometries.push(g);
    });
    group.clear();for(const instance of instances)group.add(instance);
    for(const bin of bins.values()) {
      const merged=mergeGeometries(bin.geometries,false);bin.geometries.forEach(g=>g.dispose());
      if(!merged)throw new Error('Could not batch city geometry');
      geometries.add(merged);const mesh=bin.lines?new THREE.LineSegments(merged,bin.material):new THREE.Mesh(merged,bin.material);
      mesh.castShadow=!bin.lines;mesh.receiveShadow=!bin.lines;group.add(mesh);
    }
  }
  [base,roads,architecture,gardens,network].forEach(batch);
  network.visible=false;districts.visible=false;

  const waterMaterial=makeWaterMaterial();materials.add(waterMaterial);
  const waterGeo=new THREE.PlaneGeometry(2000,2000);waterGeo.rotateX(-Math.PI/2);geometries.add(waterGeo);
  const water=new THREE.Mesh(waterGeo,waterMaterial);water.position.y=WATER_Y;root.add(water);
  for(const [a,b] of [[[-24.5,-22.6],[24.5,-22.6]],[[24.6,-22.6],[24.6,5.4]],[[-24.6,-22.6],[-24.6,23.5]],[[-24.6,23.5],[7.7,23.5]]]) {
    const d=sub(b,a),len=Math.hypot(...d),angle=-Math.atan2(d[1],d[0]);
    box(base,len,.015,.08,mat('#c8ded0',{transparent:true,opacity:.55}),(a[0]+b[0])/2,WATER_Y+.025,(a[1]+b[1])/2,angle);
  }
  const selectionMaterial=new THREE.MeshBasicMaterial({color:'#f1b472',transparent:true,opacity:.28,depthWrite:false});materials.add(selectionMaterial);
  let selectedGeometry;
  function select(block) {
    selection.clear();if(selectedGeometry){selectedGeometry.dispose();selectedGeometry=null;}
    if(!block)return;
    selectedGeometry=polygonGeometry(block.polygon);const mesh=new THREE.Mesh(selectedGeometry,selectionMaterial);mesh.position.y=BLOCK_Y+.052;selection.add(mesh);
  }
  function setView(mode) {
    architecture.visible=mode==='city';gardens.visible=mode==='city';traffic.visible=mode==='city';districts.visible=mode==='district';network.visible=mode==='network';
    for(const proxy of selectables)proxy.visible=mode==='city';
  }
  function update(dt,time) {
    waterMaterial.uniforms.uTime.value=time;native?.update(dt,dt,time,dt===0);
    for(const car of cars) {
      let edge=plan.network.edges[car.edge];car.distance+=dt*car.speed;
      if(car.distance>edge.length) {
        car.distance-=edge.length;
        const nodeId=car.forward?edge.b:edge.a,node=plan.network.nodes[nodeId],options=node.edges.filter(id=>id!==car.edge);
        car.edge=options[Math.floor(car.rng()*options.length)]??car.edge;edge=plan.network.edges[car.edge];car.forward=edge.a===nodeId;
      }
      const a=plan.network.nodes[car.forward?edge.a:edge.b].p,b=plan.network.nodes[car.forward?edge.b:edge.a].p,d=sub(b,a),len=Math.hypot(...d),u=d.map(v=>v/len),road=plan.roads[edge.road],offset=road.width*.23;
      const t=Math.min(1,car.distance/len);
      car.mesh.position.set(a[0]+d[0]*t-u[1]*offset,.115,a[1]+d[1]*t+u[0]*offset);car.mesh.rotation.y=Math.atan2(u[0],u[1]);
    }
    for(const boat of boats){boat.mesh.position.y=WATER_Y+.03+Math.sin(time*.8+boat.phase)*.022;boat.mesh.rotation.z=Math.sin(time*.65+boat.phase)*.018;}
  }
  function setLight(time) {
    const night=time==='night';
    for(const m of kit.materials.values())if(m.emissive&&m.emissive.getHex()!==0)m.emissiveIntensity=night?.85:time==='sunset'?.38:.08;
  }
  function updateEnvironment(env) {
    native?.updateEnvironment(env);
    waterMaterial.uniforms.uDeep.value.copy(env.waterDeep);waterMaterial.uniforms.uShallow.value.copy(env.waterShallow);waterMaterial.uniforms.uFoam.value.copy(env.waterFoam);
    for(const m of kit.materials.values())if(m.emissive&&m.emissive.getHex()!==0)m.emissiveIntensity=.04+env.lights*1.95;
  }
  function dispose(){native?.dispose();if(selectedGeometry)selectedGeometry.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();kit.dispose();root.clear();root.removeFromParent();}
  root.updateMatrixWorld(true);update(0,0);
  return {root,architecture,ground,roads,builtFootprints,buildings,selectables,cars,boats,select,setView,update,setLight,updateEnvironment,dispose};
}

export function randomCitySeed(){return Math.floor(Math.random()*0xffffffff)>>>0;}
export function createCity({seed=0xA1B2C3D4}={}) {
  const plan=createPlan(seed),city=createProposalCity(plan);let time=0;
  if(plan.diagnostics.failures.length){city.dispose();throw new Error(plan.diagnostics.failures.join(', '));}
  return {...city,group:city.root,seed,blocks:plan.blocks,diagnostics:plan.diagnostics,stats:{population:city.buildings.reduce((s,b)=>s+b.population,0),jobs:city.buildings.reduce((s,b)=>s+b.jobs,0),buildings:city.buildings.length,cars:city.cars.length,boats:city.boats.length,districts:new Set(plan.blocks.map(b=>b.district)).size,parks:plan.diagnostics.openSpaces},update(dt,ambientDt,elapsed,paused){if(!paused)time+=dt;city.update(paused?0:dt,elapsed);},get time(){return time;}};
}
