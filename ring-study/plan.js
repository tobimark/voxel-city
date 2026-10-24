// Ring Waterways — an independent map for Pixel Bay.
//
// The reference is a circular canal community seen from the air: a garden at
// the centre, concentric ring roads, radial spokes, and a fringe of finger
// piers cut by canals where every house reaches the water. This module encodes
// that geometry as data; the renderer only fills polygons, roads and lots.
//
// Coordinate system matches the rest of the project: X east, Z south, angles
// measured counter-clockwise from +X (so south is +90°, north is -90°).

export const DISTRICTS = {
  garden: {
    name: "中央花园",
    en: "CENTRAL GARDEN",
    color: "#b9c08a",
    description: "圆形草坪、喷泉和一圈长椅。所有环路都从这里开始数自己的半径。",
    center: [0, 0],
  },
  inner: {
    name: "内环街坊",
    en: "INNER RING",
    color: "#b98f76",
    description: "贴着内环路的联排住宅，前门朝街、后院朝环廊，是这座水城最老的一圈。",
    center: [-6, 0],
  },
  midtown: {
    name: "中环市集",
    en: "MIDDLE RING",
    color: "#c8ae84",
    description: "书店、咖啡馆和街角市集沿中环路展开，步行十分钟就能绕完整个中心。",
    center: [0, -9],
  },
  waterside: {
    name: "运河水岸",
    en: "CANAL FRINGE",
    color: "#93b0a1",
    description: "十二条手指状的水岸街坊被运河分开，每家后院都有自己的小码头。",
    center: [0, 16],
  },
  marina: {
    name: "北岸码头",
    en: "NORTH MARINA",
    color: "#b6a08a",
    description: "三条水岸街坊让给游艇码头，系船柱、浮桥和白色桅杆一路排进海面。",
    center: [0, -16],
  },
  gateway: {
    name: "南岸门户",
    en: "SOUTH GATEWAY",
    color: "#a9ada3",
    description: "跨海堤道从南边进城，桥头是一排仓库和两层高的门房门面。",
    center: [0, 22],
  },
};

export const WATER_Y = -1.12;
export const BLOCK_Y = 0.39;

// Radii are measured from the centre of the garden. Every band stops a little
// short of the neighbouring road corridor so blocks never touch asphalt.
export const MAP = {
  parkRadius: 1.75,
  ringA: 3.9,
  ringAWidth: 1.2,
  innerIn: 4.55,
  innerOut: 7.8,
  ringB: 8.6,
  ringBWidth: 1.4,
  midIn: 9.4,
  midOut: 13.05,
  ringC: 13.9,
  ringCWidth: 1.6,
  outerIn: 14.75,
  tip: 16.8,
  headRadius: 16.6,
  fingerBlockOuter: 16.15,
  fingers: 12,
  fingerHalf: (13.5 * Math.PI) / 180,
  mainland: { x0: -6.2, x1: 6.2, z0: 20.95, z1: 26.4 },
  causewayZ: 21.2,
};

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
export const area = (p) => Math.abs(p.reduce((s, a, i) => s + cross(a, p[(i + 1) % p.length]), 0)) / 2;
export const rect = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
export const polar = (angle, radius) => [Math.cos(angle) * radius, Math.sin(angle) * radius];
export const radial = (deg) => deg * DEG;

export function rngFor(value) {
  let v = 2166136261;
  for (const ch of String(value)) v = Math.imul(v ^ ch.charCodeAt(0), 16777619);
  return () => {
    v = (v + 0x6d2b79f5) >>> 0;
    let t = v;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function centroid(p) {
  let a = 0;
  let x = 0;
  let z = 0;
  p.forEach((u, i) => {
    const v = p[(i + 1) % p.length];
    const c = cross(u, v);
    a += c;
    x += (u[0] + v[0]) * c;
    z += (u[1] + v[1]) * c;
  });
  return [x / (3 * a), z / (3 * a)];
}

// Convex containment (kept for callers that only handle convex polygons).
export function contains(polygon, p, padding = 0) {
  return polygon.every((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const e = sub(b, a);
    return cross(e, sub(p, a)) >= padding * Math.hypot(...e) - 1e-7;
  });
}

// Winding sign of a simple polygon (+1 counter-clockwise).
export function polygonSign(polygon) {
  let sum = 0;
  for (let i = 0; i < polygon.length; i += 1) sum += cross(polygon[i], polygon[(i + 1) % polygon.length]);
  return sum >= 0 ? 1 : -1;
}

// Concave-safe containment with an inset margin: annular sectors are curved, so
// a plain convex test would reject lots that really are inside.
export function insideWithMargin(polygon, p, margin = 0) {
  const sign = polygonSign(polygon);
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const e = sub(b, a);
    const length = Math.hypot(...e) || 1;
    if ((sign * cross(e, sub(p, a))) / length < margin) return false;
  }
  return true;
}

function segmentsCross(a, b, c, d) {
  const d1 = cross(sub(b, a), sub(c, a));
  const d2 = cross(sub(b, a), sub(d, a));
  const d3 = cross(sub(d, c), sub(a, c));
  const d4 = cross(sub(d, c), sub(b, c));
  return (
    ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) &&
    ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9))
  );
}

// General polygon overlap: proper edge crossings plus centroid containment.
// Sharing a boundary is not an overlap, which matters because neighbouring
// blocks meet exactly on sector edges.
export function polygonsOverlap(a, b) {
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      if (segmentsCross(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true;
    }
  }
  return pointInPolygon(a, centroid(b)) || pointInPolygon(b, centroid(a));
}

// True when `inner` is fully inside `outer`: every corner inside and no edge of
// the inner polygon crossing the outer boundary.
export function polygonFits(outer, inner) {
  if (!inner.every((v) => pointInPolygon(outer, v))) return false;
  for (let i = 0; i < inner.length; i += 1) {
    for (let j = 0; j < outer.length; j += 1) {
      if (segmentsCross(inner[i], inner[(i + 1) % inner.length], outer[j], outer[(j + 1) % outer.length])) return false;
    }
  }
  return true;
}

// Concave-safe containment for the island outline (gear shape) and mainland.
export function pointInPolygon(polygon, p) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if (a[1] > p[1] !== b[1] > p[1]) {
      const x = ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0];
      if (p[0] < x) inside = !inside;
    }
  }
  return inside;
}

export function clip(polygon, normal, offset) {
  const out = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const da = a[0] * normal[0] + a[1] * normal[1] - offset;
    const db = b[0] * normal[0] + b[1] * normal[1] - offset;
    if (da >= -1e-8) out.push(a);
    if ((da > 1e-8 && db < -1e-8) || (da < -1e-8 && db > 1e-8)) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

export function lotPolygon(lot, extra = 0) {
  const c = Math.cos(lot.angle);
  const s = Math.sin(lot.angle);
  const w = lot.w + extra * 2;
  const d = lot.d + extra * 2;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [
    lot.x + (x * w) / 2 * c + (z * d) / 2 * s,
    lot.z - (x * w) / 2 * s + (z * d) / 2 * c,
  ]);
}

export function roadPolygon(r) {
  const dx = r.b[0] - r.a[0];
  const dz = r.b[1] - r.a[1];
  const length = Math.hypot(dx, dz);
  return lotPolygon({ x: (r.a[0] + r.b[0]) / 2, z: (r.a[1] + r.b[1]) / 2, w: length, d: r.width, angle: -Math.atan2(dz, dx) });
}

// Radial roads split blocks: keep the half-plane on the block's own side only.
// (A corridor is a subtraction, not an intersection, so the block centroid
// decides which side survives.)
function clipByRadialRoad(polygon, road, point, margin = 0.1) {
  const dx = road.b[0] - road.a[0];
  const dz = road.b[1] - road.a[1];
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) return polygon;
  const n = [-dz / length, dx / length];
  const offset = n[0] * road.a[0] + n[1] * road.a[1];
  const half = road.width / 2 + margin;
  const side = point[0] * n[0] + point[1] * n[1] - offset;
  if (side >= 0) return clip(polygon, n, offset + half);
  return clip(polygon, [-n[0], -n[1]], -(offset - half));
}

function annularSector(a0, a1, r0, r1, steps = 6) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) points.push(polar(a0 + ((a1 - a0) * i) / steps, r1));
  for (let i = steps; i >= 0; i -= 1) points.push(polar(a0 + ((a1 - a0) * i) / steps, r0));
  return points;
}

function circlePolygon(radius, steps = 40) {
  return Array.from({ length: steps }, (_, i) => polar((i / steps) * TAU, radius));
}

// The island outline is a gear: twelve waterfront fingers separated by canals
// that cut inward to the outer boulevard.
function gearLand() {
  const { fingers, tip, outerIn, fingerHalf } = MAP;
  const pitch = TAU / fingers;
  const points = [];
  for (let k = 0; k < fingers; k += 1) {
    const centre = k * pitch;
    const a0 = centre - fingerHalf;
    const a1 = centre + fingerHalf;
    // The canal of this sector runs from the previous fingertip edge to a0.
    const canalStart = centre - pitch + fingerHalf;
    const canalSteps = 4;
    for (let i = 0; i <= canalSteps; i += 1) {
      const a = canalStart + ((a0 - canalStart) * i) / canalSteps;
      points.push(polar(a, outerIn));
    }
    points.push(polar(a0, tip));
    for (let i = 1; i <= 4; i += 1) points.push(polar(a0 + ((a1 - a0) * i) / 4, tip));
    points.push(polar(a1, outerIn));
  }
  return points;
}

function ringRoad({ prefix, radius, count, width, kind }) {
  const roads = [];
  let previous = polar(0, radius);
  for (let i = 0; i < count; i += 1) {
    const next = polar(((i + 1) / count) * TAU, radius);
    roads.push({ id: `${prefix}${i}`, a: previous, b: next, width, kind, radial: false });
    previous = next;
  }
  return roads;
}

function makeNetwork(roads) {
  const cuts = roads.map(() => [0, 1]);
  const nodes = [];
  const edges = [];
  const byKey = new Map();
  for (let i = 0; i < roads.length; i += 1) {
    for (let j = i + 1; j < roads.length; j += 1) {
      const a = roads[i];
      const b = roads[j];
      const u = sub(a.b, a.a);
      const v = sub(b.b, b.a);
      const den = cross(u, v);
      if (Math.abs(den) < 1e-8) continue;
      const t = cross(sub(b.a, a.a), v) / den;
      const s = cross(sub(b.a, a.a), u) / den;
      if (t >= -1e-7 && t <= 1 + 1e-7 && s >= -1e-7 && s <= 1 + 1e-7) {
        cuts[i].push(Math.max(0, Math.min(1, t)));
        cuts[j].push(Math.max(0, Math.min(1, s)));
      }
    }
  }
  function node(p) {
    const key = p.map((n) => (Math.round(n * 1e5) / 1e5 + 0).toFixed(5)).join(",");
    if (!byKey.has(key)) {
      byKey.set(key, nodes.length);
      nodes.push({ id: nodes.length, p, edges: [] });
    }
    return byKey.get(key);
  }
  roads.forEach((road, i) => {
    const ts = [...new Set(cuts[i].map((v) => v.toFixed(7)))].map(Number).sort((a, b) => a - b);
    const d = sub(road.b, road.a);
    for (let j = 1; j < ts.length; j += 1) {
      const p = ts.slice(j - 1, j + 1).map((t) => [road.a[0] + d[0] * t, road.a[1] + d[1] * t]);
      if (Math.hypot(...sub(p[1], p[0])) < 1e-4) continue;
      const a = node(p[0]);
      const b = node(p[1]);
      const id = edges.length;
      edges.push({ id, a, b, road: i, length: Math.hypot(...sub(p[1], p[0])) });
      nodes[a].edges.push(id);
      nodes[b].edges.push(id);
    }
  });
  return { nodes, edges };
}

// Sector programme for the middle ring (six 60° sectors, ordered from 30°).
const MID_SECTORS = [
  { district: "midtown", kind: "perimeter", name: "南门市集" },
  { district: "midtown", kind: "civic", name: "南岸广场" },
  { district: "midtown", kind: "perimeter", name: "西门市集" },
  { district: "garden", kind: "park", name: "西环公园" },
  { district: "marina", kind: "perimeter", name: "码头事务所" },
  { district: "midtown", kind: "landmark", name: "环湾之塔" },
];

function districtAssets(district) {
  if (district === "inner") return ["b-townhouse", "b-townhouse", "b-lowrise", "b-cottage"];
  if (district === "midtown") return ["b-market", "b-cafe", "b-bookshop", "b-department", "b-office", "b-courtyard"];
  if (district === "waterside") return ["b-townhouse", "b-cottage", "b-lowrise", "b-townhouse"];
  if (district === "marina") return ["b-warehouse", "b-workshop", "b-cafe"];
  if (district === "gateway") return ["b-warehouse", "b-office", "b-lowrise"];
  return ["b-lowrise"];
}

function targetHeight(district, rng) {
  if (district === "midtown") return 8 + Math.floor(rng() * 3);
  if (district === "inner") return 6 + Math.floor(rng() * 3);
  if (district === "waterside") return 5 + Math.floor(rng() * 3);
  if (district === "marina") return 4 + Math.floor(rng() * 3);
  if (district === "gateway") return 6 + Math.floor(rng() * 3);
  return 6;
}

function addLot(lots, block, lot) {
  const polygon = lotPolygon(lot, 0.1);
  if (!polygonFits(block.polygon, polygon)) return false;
  if (lots.some((other) => polygonsOverlap(lotPolygon(other, 0.1), polygon))) return false;
  lots.push(lot);
  return true;
}

// The clipped block polygon is not always a clean sector (diagonal lane cuts),
// so the usable angular range is sampled at the row radius instead of trusting
// the sector metadata.
function angularFreeRange(block, radius, a0, a1, steps = 72) {
  const inside = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = a0 + ((a1 - a0) * i) / steps;
    inside.push(pointInPolygon(block.polygon, polar(angle, radius)));
  }
  let mid = Math.floor(steps / 2);
  if (!inside[mid]) {
    let best = -1;
    for (let i = 0; i <= steps; i += 1) {
      if (inside[i] && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    }
    if (best < 0) return null;
    mid = best;
  }
  let start = mid;
  while (start > 0 && inside[start - 1]) start -= 1;
  let end = mid;
  while (end < steps && inside[end + 1]) end += 1;
  if (end - start < 2) return null;
  return [a0 + ((a1 - a0) * start) / steps, a0 + ((a1 - a0) * end) / steps];
}

// Houses in a radial band line up along arcs: their depth points at the
// centre, their width follows the circumference.
function radialLots(block, rng, existing = []) {
  const lots = existing.slice();
  const startCount = lots.length;
  const { a0, a1, r0, r1, district } = block.meta;
  const inset = 0.16;
  const usable = r1 - r0 - inset * 2;
  const rows = usable > 2.1 ? 2 : 1;
  const assets = districtAssets(district);
  const depth = Math.min(1.85, usable / rows - 0.26);
  for (let row = 0; row < rows; row += 1) {
    const radius = r0 + inset + (usable / rows) * (row + 0.5);
    const range = angularFreeRange(block, radius, a0, a1);
    if (!range) continue;
    const arc = (range[1] - range[0]) * radius;
    const target = district === "midtown" ? 1.5 : district === "waterside" ? 1.15 : 1.3;
    const count = Math.max(1, Math.floor((arc - 0.45) / (target + 0.26)));
    const step = (range[1] - range[0]) / count;
    for (let i = 0; i < count; i += 1) {
      const angle = range[0] + step * (i + 0.5);
      // A few gaps in the row read as yards and driveways instead of barracks.
      if (count > 3 && rng() < 0.12) continue;
      for (const shrink of [1, 0.82, 0.64]) {
        const width = Math.min(target * shrink * (0.82 + rng() * 0.34), step * radius - 0.24);
        if (width < 0.55) break;
        const lot = {
          id: `${block.id}-${lots.length}`,
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          w: width,
          d: depth * (0.9 + rng() * 0.2),
          angle: Math.PI / 2 - angle,
          asset: assets[Math.floor(rng() * assets.length)],
          height: targetHeight(district, rng),
        };
        if (addLot(lots, block, lot)) break;
      }
    }
  }
  return lots.slice(startCount);
}

function gridLots(block, rng) {
  const lots = [];
  const { x0, x1, z0, z1, district } = block.meta;
  const assets = districtAssets(district);
  const inset = 0.16;
  const usable = z1 - z0 - inset * 2;
  const rows = usable > 1.4 ? 2 : 1;
  const depth = Math.min(1.9, usable / rows - 0.08);
  for (let row = 0; row < rows; row += 1) {
    const z = z0 + inset + (usable / rows) * (row + 0.5);
    const width = 1.4;
    const count = Math.max(1, Math.floor((x1 - x0 - 0.5) / (width + 0.3)));
    const step = (x1 - x0) / count;
    for (let i = 0; i < count; i += 1) {
      const x = x0 + step * (i + 0.5);
      addLot(lots, block, {
        id: `${block.id}-${lots.length}`,
        x,
        z,
        w: Math.min(width, step - 0.26),
        d: depth,
        angle: 0,
        asset: assets[Math.floor(rng() * assets.length)],
        height: targetHeight(district, rng),
      });
    }
  }
  return lots;
}

function civicLots(block) {
  const [cx, cz] = block.center;
  const xs = block.polygon.map((v) => v[0]);
  const zs = block.polygon.map((v) => v[1]);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanZ = Math.max(...zs) - Math.min(...zs);
  const spec = [
    { asset: "b-cityhall", w: 2.6, d: 2.2, dx: 0, dz: -0.9, height: 6 },
    { asset: "b-museum", w: 2.0, d: 1.9, dx: -1.5, dz: 1.2, height: 5 },
    { asset: "b-library", w: 1.9, d: 1.9, dx: 1.5, dz: 1.2, height: 5 },
  ];
  for (const scale of [1, 0.86, 0.72, 0.58]) {
    if (spanX * scale < 1.4 || spanZ * scale < 2.0) continue;
    const placed = [];
    for (const item of spec) {
      const lot = {
        id: `${block.id}-${placed.length}`,
        x: cx + item.dx * scale,
        z: cz + item.dz * scale,
        w: item.w * scale,
        d: item.d * scale,
        angle: 0,
        asset: item.asset,
        height: item.height,
      };
      if (!addLot(placed, block, lot)) break;
    }
    if (placed.length >= 2) return placed;
  }
  const single = [];
  for (const scale of [1, 0.82, 0.66, 0.5]) {
    const lot = {
      id: `${block.id}-0`,
      x: cx,
      z: cz,
      w: 2.4 * scale,
      d: 2.0 * scale,
      angle: 0,
      asset: "b-cityhall",
      height: 6,
    };
    if (addLot(single, block, lot)) return single;
  }
  return [];
}

function landmarkLots(block) {
  const lots = [];
  const [cx, cz] = block.center;
  const xs = block.polygon.map((v) => v[0]);
  const zs = block.polygon.map((v) => v[1]);
  for (const scale of [1, 0.86, 0.72]) {
    const lot = {
      id: `${block.id}-0`,
      x: cx,
      z: cz,
      w: Math.min((Math.max(...xs) - Math.min(...xs)) * 0.72, 5.2) * scale,
      d: Math.min((Math.max(...zs) - Math.min(...zs)) * 0.72, 5.0) * scale,
      angle: 0,
      asset: "s-cloudspire",
      height: 25,
    };
    if (addLot(lots, block, lot)) break;
  }
  return lots;
}

function createRoads() {
  const roads = [];
  roads.push(...ringRoad({ prefix: "A", radius: MAP.ringA, count: 24, width: MAP.ringAWidth, kind: "street" }));
  roads.push(...ringRoad({ prefix: "B", radius: MAP.ringB, count: 36, width: MAP.ringBWidth, kind: "avenue" }));
  roads.push(...ringRoad({ prefix: "C", radius: MAP.ringC, count: 60, width: MAP.ringCWidth, kind: "boulevard" }));

  // Six radial spokes start at the middle-ring boulevard, not at the garden:
  // the inner ring stays a continuous band of houses, exactly like the
  // reference where the radial streets only reach the second ring.
  for (let k = 0; k < 6; k += 1) {
    const angle = radial(30 + k * 60);
    roads.push({
      id: `spoke-${k}`,
      a: polar(angle, MAP.ringB),
      b: polar(angle, MAP.ringC),
      width: 1.1,
      kind: "avenue",
      radial: true,
    });
  }

  // Six lanes radiate from the garden ring so the centre is reachable from
  // every direction, matching the hub circle in the reference.
  for (const angle of [30, 90, 150, 210, 270, 330]) {
    roads.push({
      id: `garden-lane-${angle}`,
      a: polar(radial(angle), MAP.ringA),
      b: polar(radial(angle), MAP.ringB),
      width: 0.9,
      kind: "lane",
      radial: true,
    });
  }

  // One lane per waterfront finger, ending in a small turning loop at the tip:
  // every house on the finger fronts the lane, and no street dead-ends.
  for (let k = 0; k < MAP.fingers; k += 1) {
    const centre = radial(k * 30);
    if (k === 3 || k === 9) continue;
    const out = [Math.cos(centre), Math.sin(centre)];
    const tan = [-out[1], out[0]];
    const a = polar(centre, MAP.headRadius);
    const b = [a[0] + out[0] * 0.85, a[1] + out[1] * 0.85];
    const c = [b[0] + tan[0] * 0.95, b[1] + tan[1] * 0.95];
    const d = [c[0] - out[0] * 0.85, c[1] - out[1] * 0.85];
    roads.push({ id: `finger-${k}-lane`, a: polar(centre, MAP.ringC), b: a, width: 0.65, kind: "lane", radial: true });
    for (const [index, from, to] of [
      [0, a, b],
      [1, b, c],
      [2, c, d],
      [3, d, a],
    ]) {
      roads.push({ id: `finger-${k}-loop${index}`, a: from, b: to, width: 0.55, kind: "lane", radial: false });
    }
  }

  // Causeway to the mainland, a bridgehead street loop and the mainland blocks.
  roads.push({
    id: "causeway",
    a: polar(radial(90), MAP.ringC),
    b: [0, MAP.causewayZ],
    width: 1.6,
    kind: "boulevard",
    radial: true,
  });
  roads.push({ id: "gate-north", a: [0, 21.2], b: [0, 23.2], width: 1.2, kind: "street", radial: true });
  roads.push({ id: "gate-main", a: [-5.6, 23.2], b: [5.6, 23.2], width: 1.1, kind: "avenue", radial: false });
  roads.push({ id: "shore-north", a: [-5.6, 21.2], b: [5.6, 21.2], width: 0.8, kind: "lane", radial: false });
  roads.push({ id: "shore-west", a: [-5.6, 21.2], b: [-5.6, 23.2], width: 0.8, kind: "lane", radial: false });
  roads.push({ id: "shore-east", a: [5.6, 21.2], b: [5.6, 23.2], width: 0.8, kind: "lane", radial: false });
  return roads;
}

function createBlocks(roads) {
  const blocks = [];
  const radialRoads = roads.filter((road) => road.radial);
  const radialRange = (polygon) => {
    let min = Infinity;
    let max = -Infinity;
    for (const v of polygon) {
      const r = Math.hypot(v[0], v[1]);
      min = Math.min(min, r);
      max = Math.max(max, r);
    }
    return [min, max];
  };
  const add = (id, rawPolygon, meta, district, kind, name) => {
    let polygon = rawPolygon.map((p) => p.slice());
    for (const road of radialRoads) {
      // A radial road only removes land along its own radial extent; the finger
      // lanes must not shave the inner rings they never reach.
      const [blockMin, blockMax] = radialRange(polygon);
      const roadMin = Math.min(Math.hypot(...road.a), Math.hypot(...road.b));
      const roadMax = Math.max(Math.hypot(...road.a), Math.hypot(...road.b));
      if (roadMax < blockMin || roadMin > blockMax) continue;
      const point = centroid(polygon);
      polygon = clipByRadialRoad(polygon, road, point);
      if (polygon.length < 3) return;
    }
    if (area(polygon) < 1.4) return;
    blocks.push({
      id,
      polygon,
      district,
      kind,
      name: name ?? `${DISTRICTS[district].name} · ${String(blocks.length + 1).padStart(2, "0")}`,
      area: area(polygon),
      center: centroid(polygon),
      meta,
      lots: [],
    });
  };

  add("G0", circlePolygon(MAP.parkRadius, 40), { kind: "circle" }, "garden", "park", "中央花园");

  // The paved roundabout: eight plaza blocks fill the annulus between the
  // planted island and the inner ring road.
  for (let k = 0; k < 8; k += 1) {
    const a0 = radial(k * 45);
    const a1 = radial(45 + k * 45);
    add(
      `P${k}`,
      annularSector(a0, a1, MAP.parkRadius + 0.12, 3.2, 4),
      { a0, a1, r0: MAP.parkRadius + 0.12, r1: 3.2 },
      "garden",
      "plaza",
      "环岛广场"
    );
  }

  // Inner ring: twelve sectors between spokes, all terraced housing.
  for (let k = 0; k < 12; k += 1) {
    const a0 = radial(30 + k * 30);
    const a1 = radial(60 + k * 30);
    add(
      `I${k}`,
      annularSector(a0, a1, MAP.innerIn, MAP.innerOut, 5),
      { a0, a1, r0: MAP.innerIn, r1: MAP.innerOut },
      "inner",
      "perimeter"
    );
  }

  // Middle ring: six sectors bounded by the spokes — markets, a civic square,
  // a park and the landmark tower.
  for (let k = 0; k < 6; k += 1) {
    const sector = MID_SECTORS[k];
    const a0 = radial(30 + k * 60);
    const a1 = radial(90 + k * 60);
    add(
      `M${k}`,
      annularSector(a0, a1, MAP.midIn, MAP.midOut, 8),
      { a0, a1, r0: MAP.midIn, r1: MAP.midOut },
      sector.district,
      sector.kind,
      sector.name
    );
  }

  // Waterfront fringe: twelve fingers, three given to the marina.
  for (let k = 0; k < MAP.fingers; k += 1) {
    const centre = radial(k * 30);
    const half = MAP.fingerHalf;
    if (k === 9) {
      add(
        `F${k}`,
        annularSector(centre - half + radial(1.4), centre + half - radial(1.4), MAP.outerIn, MAP.fingerBlockOuter, 5),
        { a0: centre - half, a1: centre + half, r0: MAP.outerIn, r1: MAP.fingerBlockOuter },
        "marina",
        "park",
        "北岸游艇码头"
      );
      continue;
    }
    if (k === 3) {
      for (const side of [-1, 1]) {
        const a0 = side < 0 ? centre - half + radial(0.3) : centre + radial(3.6);
        const a1 = side < 0 ? centre - radial(3.6) : centre + half - radial(0.3);
        add(
          `F${k}${side > 0 ? "b" : "a"}`,
          annularSector(a0, a1, MAP.outerIn, MAP.fingerBlockOuter, 4),
          { a0, a1, r0: MAP.outerIn, r1: MAP.fingerBlockOuter },
          "gateway",
          "perimeter",
          "南岸桥头街坊"
        );
      }
      continue;
    }
    const spans = [
      [centre - half + radial(0.3), centre - radial(2.3)],
      [centre + radial(2.3), centre + half - radial(0.3)],
    ];
    spans.forEach(([a0, a1], index) => {
      add(
        `F${k}${index}`,
        annularSector(a0, a1, MAP.outerIn, MAP.fingerBlockOuter, 4),
        { a0, a1, r0: MAP.outerIn, r1: MAP.fingerBlockOuter },
        "waterside",
        "perimeter",
        index === 1 ? "水岸内院" : "水岸街坊"
      );
    });
  }

  // Mainland gateway district across the causeway.
  const mainland = MAP.mainland;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -5.2 : 0.9;
    const x1 = side < 0 ? -0.9 : 5.2;
    add(
      `X${side < 0 ? 1 : 2}`,
      rect(x0, x1, 21.75, 22.55),
      { x0, x1, z0: 21.75, z1: 22.55 },
      "gateway",
      "perimeter",
      side < 0 ? "西侧门房街坊" : "东侧门房街坊"
    );
  }
  add(
    "X0",
    rect(-5.2, 5.2, 23.9, mainland.z1 - 0.6),
    { x0: -5.2, x1: 5.2, z0: 23.9, z1: mainland.z1 - 0.6 },
    "gateway",
    "park",
    "南岸林地"
  );
  return blocks;
}

function fillLots(blocks, seed) {
  for (const block of blocks) {
    const rng = rngFor(`${seed}:${block.id}:lots`);
    if (block.kind === "park" || block.kind === "plaza" || block.kind === "amusement") {
      block.lots = [];
      continue;
    }
    if (block.kind === "landmark") {
      // The tower holds the centre; the rest of the sector is ordinary housing,
      // so the middle ring never leaves a vacant wedge.
      const tower = landmarkLots(block);
      const rest = radialLots(block, rng, tower);
      block.lots = [...tower, ...rest];
      continue;
    }
    if (block.kind === "civic") {
      block.lots = civicLots(block);
      continue;
    }
    block.lots = block.meta && "r0" in block.meta ? radialLots(block, rng) : gridLots(block, rng);
  }
}

function createFeatures(blocks) {
  const features = [];
  for (const block of blocks) {
    if (block.kind !== "park" && block.kind !== "civic") continue;
    const xs = block.polygon.map((v) => v[0]);
    const zs = block.polygon.map((v) => v[1]);
    features.push({
      id: block.id,
      x: block.center[0],
      z: block.center[1],
      w: Math.max(...xs) - Math.min(...xs),
      d: Math.max(...zs) - Math.min(...zs),
      district: block.district,
      districtName: DISTRICTS[block.district].name,
      kind: block.kind === "civic" ? "civicGarden" : "park",
      parkKind: block.district === "marina" ? "waterfront" : "pond",
    });
  }
  return features;
}

function createPiers() {
  const piers = [];
  const { tip, fingerHalf } = MAP;
  for (let k = 0; k < MAP.fingers; k += 1) {
    const centre = radial(k * 30);
    if (k === 9) {
      // Marina: one long spine out into the bay with short perpendicular slips.
      const spineFrom = 16.15;
      const spineTo = 21.1;
      const start = polar(centre, spineFrom);
      const end = polar(centre, spineTo);
      piers.push({
        id: "marina-spine",
        x: (start[0] + end[0]) / 2,
        z: (start[1] + end[1]) / 2,
        angle: Math.atan2(end[1] - start[1], end[0] - start[0]),
        length: spineTo - spineFrom,
        width: 0.8,
        kind: "quay",
      });
      const tangent = [-Math.sin(centre), Math.cos(centre)];
      for (let i = 0; i < 8; i += 1) {
        const radius = 16.9 + i * 0.5;
        for (const side of [-1, 1]) {
          const root = polar(centre, radius);
          const mid = [root[0] + tangent[0] * side * 0.62, root[1] + tangent[1] * side * 0.62];
          const tipPoint = [root[0] + tangent[0] * side * 1.62, root[1] + tangent[1] * side * 1.62];
          piers.push({
            id: `slip-${i}-${side > 0 ? "b" : "a"}`,
            x: (mid[0] + tipPoint[0]) / 2,
            z: (mid[1] + tipPoint[1]) / 2,
            angle: Math.atan2(tipPoint[1] - mid[1], tipPoint[0] - mid[0]),
            length: 1.0,
            width: 0.28,
            kind: "slip",
          });
        }
      }
      continue;
    }
    if (k === 3) {
      // The causeway finger keeps boats on both sides of the bridge.
      for (const side of [-1, 1]) {
        for (const spread of [6.5, 10.2]) {
          const angle = centre + side * radial(spread);
          const start = polar(angle, tip - 0.25);
          const end = polar(angle, tip + 1.95);
          piers.push({
            id: `dock-${k}-${side > 0 ? "b" : "a"}-${spread}`,
            x: (start[0] + end[0]) / 2,
            z: (start[1] + end[1]) / 2,
            angle: Math.atan2(end[1] - start[1], end[0] - start[0]),
            length: 2.2,
            width: 0.46,
            kind: "dock",
          });
        }
      }
      continue;
    }
    // Two docks per canal side: nearly every waterfront lot gets its own slip.
    for (const side of [-1, 1]) {
      for (const spread of [3.2, 7.6]) {
        const angle = centre + side * radial(spread);
        const start = polar(angle, tip - 0.25);
        const end = polar(angle, tip + 1.95);
        piers.push({
          id: `dock-${k}-${side > 0 ? "b" : "a"}-${spread}`,
          x: (start[0] + end[0]) / 2,
          z: (start[1] + end[1]) / 2,
          angle: Math.atan2(end[1] - start[1], end[0] - start[0]),
          length: 2.2,
          width: 0.46,
          kind: "dock",
        });
      }
    }
  }
  return piers;
}

function createBoats(seed, piers) {
  const rng = rngFor(`${seed}:boats`);
  const boats = [];
  // Marina: one boat alongside each slip, alternating sides so the berths read
  // as a real harbour instead of a row of markers.
  for (const slip of piers.filter((p) => p.kind === "slip")) {
    const side = boats.length % 2 === 0 ? 1 : -1;
    const nx = -Math.sin(slip.angle);
    const nz = Math.cos(slip.angle);
    boats.push({
      x: slip.x + Math.cos(slip.angle) * 0.35 + nx * side * 0.42,
      z: slip.z + Math.sin(slip.angle) * 0.35 + nz * side * 0.42,
      angle: slip.angle + Math.PI / 2,
      kind: boats.length % 3 === 0 ? "m-sailboat" : "m-fishing",
    });
  }
  // Private docks: a moored boat at each finger dock.
  for (const dock of piers.filter((p) => p.kind === "dock")) {
    const side = boats.length % 2 === 0 ? 1 : -1;
    const nx = -Math.sin(dock.angle);
    const nz = Math.cos(dock.angle);
    boats.push({
      x: dock.x + Math.cos(dock.angle) * (dock.length * 0.32) + nx * side * 0.4,
      z: dock.z + Math.sin(dock.angle) * (dock.length * 0.32) + nz * side * 0.4,
      angle: dock.angle + Math.PI / 2,
      kind: boats.length % 4 === 0 ? "m-sailboat" : "m-fishing",
    });
  }
  for (let i = 0; i < 8; i += 1) {
    const angle = rng() * TAU;
    const radius = 21.8 + rng() * 3.2;
    const point = polar(angle, radius);
    // Keep the open-water boats off the mainland shelf.
    if (point[1] > 20.4 && Math.abs(point[0]) < 8.6) continue;
    boats.push({ x: point[0], z: point[1], angle: rng() * TAU, kind: rng() > 0.45 ? "m-sailboat" : "m-fishing" });
  }
  return boats;
}

export function validatePlan(plan) {
  const failures = [];
  const onLand = (p) => plan.land.some((polygon) => pointInPolygon(polygon, p));
  for (let i = 0; i < plan.blocks.length; i += 1) {
    const b = plan.blocks[i];
    if (!b.polygon.every(onLand)) failures.push(`land:${b.id}`);
    for (let j = i + 1; j < plan.blocks.length; j += 1) {
      if (polygonsOverlap(b.polygon, plan.blocks[j].polygon)) failures.push(`block-overlap:${b.id}:${plan.blocks[j].id}`);
    }
    for (const road of plan.roads) {
      if (polygonsOverlap(b.polygon, roadPolygon(road))) failures.push(`road-overlap:${b.id}:${road.id}`);
    }
    b.lots.forEach((lot, j) => {
      const polygon = lotPolygon(lot);
      if (!polygonFits(b.polygon, lotPolygon(lot, 0.08))) failures.push(`lot-boundary:${lot.id}`);
      for (let k = j + 1; k < b.lots.length; k += 1) {
        if (polygonsOverlap(polygon, lotPolygon(b.lots[k]))) failures.push(`lot-overlap:${lot.id}:${b.lots[k].id}`);
      }
    });
  }
  let components = 0;
  const visited = new Set();
  for (const node of plan.network.nodes) {
    if (visited.has(node.id)) continue;
    components += 1;
    const stack = [node.id];
    while (stack.length) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id);
      for (const edge of plan.network.nodes[id].edges) {
        const e = plan.network.edges[edge];
        stack.push(e.a === id ? e.b : e.a);
      }
    }
  }
  if (components !== 1) failures.push(`network-components:${components}`);
  if (plan.network.nodes.some((n) => n.edges.length < 2)) failures.push("unplanned-dead-end");
  return {
    failures,
    components,
    blocks: plan.blocks.length,
    buildings: plan.blocks.reduce((s, b) => s + b.lots.length, 0),
    openSpaces: plan.blocks.filter((b) => b.kind === "park" || b.kind === "civic").length,
    roads: plan.roads.length,
    piers: plan.piers.length,
    boats: plan.boats.length,
  };
}

export function createPlan(seed = "RING-01") {
  const roads = createRoads();
  const blocks = createBlocks(roads);
  fillLots(blocks, seed);
  const features = createFeatures(blocks);
  const piers = createPiers();
  const boats = createBoats(seed, piers);
  const land = [gearLand(), rect(MAP.mainland.x0, MAP.mainland.x1, MAP.mainland.z0, MAP.mainland.z1)];
  const network = makeNetwork(roads);
  const plan = {
    seed,
    land,
    roads,
    blocks,
    features,
    piers,
    boats,
    network,
    causeway: { from: polar(radial(90), MAP.ringC), to: [0, MAP.causewayZ], width: 1.6 },
  };
  plan.diagnostics = validatePlan(plan);
  return plan;
}
