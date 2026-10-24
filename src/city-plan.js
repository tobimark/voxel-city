// City plan for Pixel Bay.
//
// The old generator painted a 5x5 lattice of identical blocks on a square
// island. Real harbour cities grow from a sheltered bay: a fine-grained old
// town at the water, a CBD on the headland, port sheds along the quays,
// residential rings behind them, and heavy industry pushed to the rail edge.
// This module encodes that structure as data so the renderer can fill it.

export const ISLAND_EXTENT = 23.2;

export const BAY = { x0: 6.2, z0: 6.2, x1: 23.2, z1: 23.2 };

export const LAND_RECTS = [
  { x0: -23.2, x1: 23.2, z0: -23.2, z1: 6.2 },
  { x0: -23.2, x1: 6.2, z0: 6.2, z1: 23.2 },
];

// Edges that meet water. `nx`/`nz` points away from land so the renderer can
// place quay walls and shore foam on the correct side.
export const EDGE_SEGMENTS = [
  { x0: -23.2, z0: -23.2, x1: 23.2, z1: -23.2, nx: 0, nz: -1, kind: "shore" },
  { x0: -23.2, z0: -23.2, x1: -23.2, z1: 23.2, nx: -1, nz: 0, kind: "shore" },
  { x0: -23.2, z0: 23.2, x1: 5.4, z1: 23.2, nx: 0, nz: 1, kind: "shore" },
  { x0: 23.2, z0: -23.2, x1: 23.2, z1: 5.4, nx: 1, nz: 0, kind: "shore" },
  { x0: 6.2, z0: 6.2, x1: 23.2, z1: 6.2, nx: 0, nz: 1, kind: "quay" },
  { x0: 6.2, z0: 6.2, x1: 6.2, z1: 23.2, nx: 1, nz: 0, kind: "quay" },
];

// Each zone is a buildable district bounded by water or arterial streets.
// Blocks are cut out of it with a district-specific grain, so old-town lanes
// are tight while the port and CBD use wide superblocks. `angle` rotates the
// district's street grid, which is how real cities end up with downtown grids
// meeting old-town lanes at odd angles instead of one endless orthogonal net.
const ZONES = [
  {
    id: "downtown",
    district: "downtown",
    rect: [-2.8, 11.2, -4.8, 3.8],
    cols: 3,
    rows: 2,
    street: 1.95,
    streetKind: "avenue",
    morph: "tower",
    density: 1.2,
    angle: 0.3,
  },
  {
    id: "oldtown",
    district: "oldtown",
    rect: [-10.2, 4.6, 6.8, 13.6],
    cols: 3,
    rows: 2,
    street: 0.8,
    streetKind: "lane",
    morph: "row",
    density: 0.72,
    angle: -0.3,
  },
  {
    id: "civic",
    district: "civic",
    rect: [-10.2, -4.0, -6.0, 3.6],
    cols: 1,
    rows: 1,
    street: 0,
    streetKind: "lane",
    morph: "civic",
    density: 0.9,
    angle: -0.06,
  },
  {
    id: "commercial",
    district: "commercial",
    rect: [-2.8, 8.6, -12.8, -6.4],
    cols: 2,
    rows: 2,
    street: 1.25,
    streetKind: "street",
    morph: "perimeter",
    density: 1.0,
    angle: 0.1,
  },
  {
    id: "resA",
    district: "residential",
    rect: [-21.4, -15.4, -8.0, 13.2],
    cols: 1,
    rows: 6,
    street: 1.1,
    streetKind: "street",
    morph: "perimeter",
    density: 0.86,
    angle: 0,
  },
  {
    id: "parkwest",
    district: "green",
    rect: [-13.4, -10.6, -12.8, 12.6],
    cols: 1,
    rows: 3,
    street: 1.4,
    streetKind: "street",
    morph: "green",
    density: 0,
    angle: 0,
  },
  {
    id: "resB",
    district: "residential",
    rect: [-12.2, 8.4, -20.8, -15.0],
    cols: 5,
    rows: 2,
    street: 1.05,
    streetKind: "street",
    morph: "row",
    density: 0.7,
    angle: 0,
  },
  {
    id: "academic",
    district: "academic",
    rect: [9.4, 21.2, -20.4, -7.8],
    cols: 2,
    rows: 2,
    street: 1.35,
    streetKind: "street",
    morph: "campus",
    density: 0.62,
    angle: 0.3,
  },
  {
    id: "industrial",
    district: "industrial",
    rect: [-21.4, -15.8, -20.8, -9.6],
    cols: 1,
    rows: 3,
    street: 1.5,
    streetKind: "street",
    morph: "warehouse",
    density: 0.8,
    angle: 0,
  },
  {
    id: "station",
    district: "green",
    rect: [-15.2, -12.8, -20.6, -15.2],
    cols: 1,
    rows: 1,
    street: 0,
    streetKind: "lane",
    morph: "green",
    density: 0,
    angle: 0,
  },
  {
    id: "port",
    district: "harbor",
    rect: [12.4, 21.4, -5.8, 4.8],
    cols: 1,
    rows: 3,
    street: 1.75,
    streetKind: "avenue",
    morph: "warehouse",
    density: 0.9,
    angle: 0,
  },
  {
    id: "suburb",
    district: "residential",
    rect: [-21.0, -6.4, 14.8, 22.2],
    cols: 4,
    rows: 2,
    street: 0.95,
    streetKind: "lane",
    morph: "row",
    density: 0.55,
    angle: 0.25,
  },
  {
    id: "amusement",
    district: "amusement",
    rect: [-5.0, 1.4, 14.8, 21.2],
    cols: 1,
    rows: 1,
    street: 0,
    streetKind: "lane",
    morph: "amusement",
    density: 0,
    angle: 0,
  },
  {
    id: "southpark",
    district: "green",
    rect: [2.2, 4.6, 14.6, 22.2],
    cols: 1,
    rows: 1,
    street: 0,
    streetKind: "lane",
    morph: "green",
    density: 0,
    angle: 0,
  },
];

// Arterials, quays and coast roads. They are drawn as asphalt under the
// blocks, so only the gaps between blocks read as carriageway. The widths are
// deliberately uneven: a 2.8 waterfront boulevard, 1.8 avenues, 1.2 lanes.
const ARTERIALS = [
  { x0: -10.2, z0: 5.4, x1: 22.6, z1: 5.4, width: 2.6, kind: "boulevard" },
  { x0: 5.4, z0: 5.4, x1: 5.4, z1: 22.6, width: 2.4, kind: "quay" },
  { x0: -5.8, z0: 7.0, x1: 5.4, z1: 3.6, width: 2.6, kind: "boulevard" },
  { x0: 9.0, z0: 4.9, x1: 12.7, z1: -7.6, width: 1.7, kind: "avenue" },
  { x0: -14.4, z0: -8.0, x1: -13.2, z1: 13.4, width: 1.5, kind: "avenue" },
  { x0: -22.4, z0: -22.6, x1: -22.4, z1: 22.6, width: 1.4, kind: "coast" },
  { x0: -22.6, z0: -22.4, x1: 22.6, z1: -22.4, width: 1.4, kind: "coast" },
  { x0: 22.4, z0: -22.6, x1: 22.4, z1: 5.2, width: 1.4, kind: "coast" },
  { x0: -22.6, z0: 22.6, x1: 5.2, z1: 22.6, width: 1.2, kind: "coast" },
  { x0: -22.6, z0: -13.9, x1: 9.0, z1: -13.9, width: 1.8, kind: "avenue" },
  { x0: -3.4, z0: -6.4, x1: -3.4, z1: 3.8, width: 1.2, kind: "street" },
  { x0: 11.8, z0: -5.8, x1: 11.8, z1: 4.8, width: 1.2, kind: "avenue" },
  { x0: 9.0, z0: -6.8, x1: 22.6, z1: -6.8, width: 1.8, kind: "avenue" },
  { x0: 9.0, z0: -20.8, x1: 9.0, z1: -7.8, width: 1.0, kind: "street" },
  { x0: -15.5, z0: -20.8, x1: -15.5, z1: -9.6, width: 0.8, kind: "lane" },
];

const PIERS = [
  { x: 8.6, z: 6.2, dir: "south", length: 4.6, width: 1.35 },
  { x: 12.4, z: 6.2, dir: "south", length: 3.4, width: 1.1 },
  { x: 16.6, z: 6.2, dir: "south", length: 5.0, width: 1.4 },
  { x: 20.4, z: 6.2, dir: "south", length: 3.0, width: 1.0 },
  { x: 6.2, z: 10.2, dir: "east", length: 3.2, width: 1.0 },
  { x: 6.2, z: 17.2, dir: "east", length: 4.0, width: 1.2 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shuffled(rng, list) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function splitSpan(span, count, rng, jitter = 0.18) {
  if (count <= 1) return [span];
  const weights = Array.from({ length: count }, () => 1 + (rng() - 0.5) * 2 * jitter);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => (span * weight) / total);
}

function rotateOffset(offsetX, offsetZ, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [offsetX * cos + offsetZ * sin, -offsetX * sin + offsetZ * cos];
}

function cornersInside(worldX, worldZ, width, depth, angle, rect, pad = 0.12) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const [offsetX, offsetZ] = rotateOffset((sx * width) / 2, (sz * depth) / 2, angle);
      const px = worldX + offsetX;
      const pz = worldZ + offsetZ;
      if (px < rect[0] + pad || px > rect[1] - pad || pz < rect[2] + pad || pz > rect[3] - pad) {
        return false;
      }
    }
  }
  return true;
}

function clipSegmentToRect(x0, z0, x1, z1, rect) {
  const [minX, maxX, minZ, maxZ] = rect;
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const checks = [
    [-dx, x0 - minX],
    [dx, maxX - x0],
    [-dz, z0 - minZ],
    [dz, maxZ - z0],
  ];
  for (const [p, q] of checks) {
    if (Math.abs(p) < 1e-8) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  return {
    x0: x0 + dx * t0,
    z0: z0 + dz * t0,
    x1: x0 + dx * t1,
    z1: z0 + dz * t1,
  };
}

function layoutZone(zone, rng) {
  const [x0, x1, z0, z1] = zone.rect;
  const centerX = (x0 + x1) / 2;
  const centerZ = (z0 + z1) / 2;
  const angle = zone.angle ?? 0;
  const absCos = Math.abs(Math.cos(angle));
  const absSin = Math.abs(Math.sin(angle));
  const desiredWidth = x1 - x0 - zone.street * (zone.cols - 1);
  const desiredDepth = z1 - z0 - zone.street * (zone.rows - 1);
  const halfZoneW = (x1 - x0) / 2 - 0.22;
  const halfZoneD = (z1 - z0) / 2 - 0.22;
  const fitScale = Math.min(
    1,
    (halfZoneW * 1.1) / ((desiredWidth / 2) * absCos + (desiredDepth / 2) * absSin || 1),
    (halfZoneD * 1.1) / ((desiredWidth / 2) * absSin + (desiredDepth / 2) * absCos || 1)
  );
  const innerWidth = desiredWidth * fitScale;
  const innerDepth = desiredDepth * fitScale;
  const widths = splitSpan(innerWidth, zone.cols, rng);
  const depths = splitSpan(innerDepth, zone.rows, rng, 0.14);
  const blocks = [];
  const streets = [];

  const pushSegment = (ax, az, bx, bz) => {
    const clipped = clipSegmentToRect(ax, az, bx, bz, [x0 + 0.1, x1 - 0.1, z0 + 0.1, z1 - 0.1]);
    if (!clipped) return;
    const length = Math.hypot(clipped.x1 - clipped.x0, clipped.z1 - clipped.z0);
    if (length < 1.4) return;
    streets.push({
      x0: clipped.x0,
      z0: clipped.z0,
      x1: clipped.x1,
      z1: clipped.z1,
      width: zone.street,
      kind: zone.streetKind,
      angle,
    });
  };

  let localZ = -innerDepth / 2;
  for (let row = 0; row < zone.rows; row += 1) {
    let localX = -innerWidth / 2;
    for (let col = 0; col < zone.cols; col += 1) {
      const [offsetX, offsetZ] = rotateOffset(
        localX + widths[col] / 2,
        localZ + depths[row] / 2,
        angle
      );
      if (widths[col] >= 1.5 && depths[row] >= 1.5) {
        blocks.push({
          x: centerX + offsetX,
          z: centerZ + offsetZ,
          w: widths[col],
          d: depths[row],
          angle,
          zone: zone.id,
          district: zone.district,
          morph: zone.morph,
          density: zone.density,
          role: null,
          parkKind: null,
          row,
          col,
        });
      }
      localX += widths[col] + zone.street;
    }
    localZ += depths[row] + zone.street;
  }

  let lineX = -innerWidth / 2;
  for (let col = 0; col < zone.cols - 1; col += 1) {
    lineX += widths[col] + zone.street / 2;
    const [ax, az] = rotateOffset(lineX, -innerDepth / 2, angle);
    const [bx, bz] = rotateOffset(lineX, innerDepth / 2, angle);
    pushSegment(centerX + ax, centerZ + az, centerX + bx, centerZ + bz);
    lineX += zone.street / 2;
  }
  let lineZ = -innerDepth / 2;
  for (let row = 0; row < zone.rows - 1; row += 1) {
    lineZ += depths[row] + zone.street / 2;
    const [ax, az] = rotateOffset(-innerWidth / 2, lineZ, angle);
    const [bx, bz] = rotateOffset(innerWidth / 2, lineZ, angle);
    pushSegment(centerX + ax, centerZ + az, centerX + bx, centerZ + bz);
    lineZ += zone.street / 2;
  }

  return { blocks, streets };
}

function distance(block, x, z) {
  return Math.hypot(block.x - x, block.z - z);
}

function takeNearest(blocks, x, z, filter = () => true) {
  const pool = blocks.filter(filter);
  if (!pool.length) return null;
  return pool.reduce((best, block) =>
    distance(block, x, z) < distance(best, x, z) ? block : best
  );
}

function assignRoles(blocks) {
  const groups = new Map();
  for (const block of blocks) {
    if (!groups.has(block.zone)) groups.set(block.zone, []);
    groups.get(block.zone).push(block);
  }
  const group = (id) => groups.get(id) ?? [];

  const downtown = group("downtown").sort((a, b) => a.z - b.z);
  const landmark = takeNearest(group("downtown"), 8.4, 4.0);
  const skyscraperPool = group("downtown")
    .filter((block) => block !== landmark)
    .sort((a, b) => b.w * b.d - a.w * a.d);
  for (let index = 0; index < Math.min(2, skyscraperPool.length); index += 1) {
    skyscraperPool[index].role = "skyscraper";
  }
  if (landmark) landmark.role = "landmark";
  for (const block of group("downtown")) {
    if (!block.role) block.role = "office";
  }

  const oldtown = group("oldtown");
  const clocktower = takeNearest(oldtown, 0.2, 10.4);
  if (clocktower) {
    clocktower.role = "clocktower";
    clocktower.morph = "row";
  }
  const creative = oldtown
    .filter((block) => block !== clocktower)
    .sort((a, b) => b.x - a.x)[0];
  if (creative) {
    creative.district = "creative";
    creative.morph = "adaptive";
  }

  const commercial = group("commercial");
  const market = takeNearest(commercial, 3.0, -8.0);
  if (market) {
    market.role = "market";
    market.morph = "perimeter";
  }
  const flagship = commercial
    .filter((block) => block !== market)
    .sort((a, b) => b.w * b.d - a.w * a.d)[0];
  if (flagship) flagship.role = "department";

  const civic = takeNearest(group("civic"), -7.0, 2.0);
  if (civic) {
    civic.role = "civic";
    civic.morph = "civic";
  }

  const academic = group("academic");
  const school = takeNearest(academic, 15.0, -9.0);
  if (school) school.role = "school";
  const campusPark = academic
    .filter((block) => block !== school)
    .sort((a, b) => b.z - a.z)[0];
  if (campusPark) {
    campusPark.role = "campus-green";
    campusPark.morph = "campus";
  }

  const industrial = group("industrial");
  const energy = takeNearest(industrial, -18.0, -18.0);
  if (energy) energy.role = "energy";

  const port = group("port").sort((a, b) => a.z - b.z);
  if (port[0]) port[0].role = "warehouse";
  if (port[1]) port[1].role = "yard";
  if (port[2]) port[2].role = "harbor-office";

  const resA = group("resA");
  const resAPark = resA.sort((a, b) => b.z - a.z)[0];
  if (resAPark) {
    resAPark.role = "neighbourhood-park";
    resAPark.morph = "green";
    resAPark.district = "green";
    resAPark.parkKind = "pocket";
  }

  const resB = group("resB").sort((a, b) => b.x - a.x);
  if (resB[0]) {
    resB[0].role = "construction";
    resB[0].morph = "construction";
  }
  if (resB[1]) {
    resB[1].role = "neighbourhood-park";
    resB[1].morph = "green";
    resB[1].district = "green";
    resB[1].parkKind = "playground";
  }

  const suburb = group("suburb");
  const cottage = suburb.sort((a, b) => a.x - b.x)[0];
  if (cottage) cottage.morph = "cottage";

  const station = takeNearest(group("station"), -14.0, -18.0);
  if (station) {
    station.role = "station";
    station.morph = "station";
    station.district = "green";
  }

  const southpark = takeNearest(group("southpark"), 3.4, 18.0);
  if (southpark) {
    southpark.role = "promenade-park";
    southpark.parkKind = "waterfront";
  }

  const parkwest = group("parkwest").sort((a, b) => a.z - b.z);
  const parkKinds = ["pond", "cherry", "sports"];
  parkwest.forEach((block, index) => {
    block.parkKind = parkKinds[index % parkKinds.length];
    block.role = `greenway-${block.parkKind}`;
  });

  const amusement = group("amusement")[0];
  if (amusement) amusement.role = "amusement";
}

export function createCityPlan(rng) {
  const blocks = [];
  const streets = [];

  for (const zone of shuffled(rng, ZONES)) {
    const layout = layoutZone(zone, rng);
    blocks.push(...layout.blocks);
    streets.push(...layout.streets);
  }

  assignRoles(blocks);

  const core = { x: 4.0, z: 1.5 };
  for (const block of blocks) {
    const falloff = 1.22 - distance(block, core.x, core.z) / 25;
    block.density = clamp(block.density * falloff + 0.16, 0.32, 1.28);
  }

  blocks.sort((a, b) => a.z - b.z || a.x - b.x);
  blocks.forEach((block, index) => {
    block.label = `${String.fromCharCode(65 + Math.floor(index / 10))}-${String(
      (index % 10) + 1
    ).padStart(2, "0")}`;
  });

  const arterialStreets = ARTERIALS.map((street) => ({ ...street }));
  const allStreets = [...streets, ...arterialStreets];

  const piers = PIERS.map((pier) => ({ ...pier }));

  return {
    island: { extent: ISLAND_EXTENT, bay: BAY, land: LAND_RECTS, edges: EDGE_SEGMENTS },
    blocks,
    streets: allStreets,
    arterials: arterialStreets,
    piers,
    rail: {
      z: -21.4,
      x0: -22.4,
      x1: 22.4,
      station: { x: -14.0, z: -20.9 },
    },
    promenades: [
      { x0: -10.2, z0: 5.4, x1: 22.6, z1: 5.4, width: 2.6 },
      { x0: 5.4, z0: 5.4, x1: 5.4, z1: 22.6, width: 2.6 },
      { x0: -22.4, z0: 22.6, x1: 5.2, z1: 22.6, width: 2.2 },
      { x0: 22.4, z0: -22.4, x1: 22.4, z1: 5.2, width: 2.2 },
    ],
    bayLoop: { x: 15.0, z: 17.0, half: 4.4 },
    quayRoads: {
      north: 5.4,
      west: 5.4,
    },
  };
}
