// City plan for Pixel Bay.
//
// The island is an L-shaped strip of land around a rectangular bay in the
// south-east corner. This module lays a strictly rectilinear city on it: every
// block edge, every street and every district boundary follows world X or Z.
// Nothing is rotated, so the plan reads as a proper grid from above while the
// districts keep distinct grain — tight old-town lanes, wide CBD blocks, long
// harbour sheds, garden rows and green corridors.
//
// Structure, north (-Z) to south (+Z):
//   - railway belt along the north shore: industry, station, row housing
//   - middle band: west residential strip / green axis / commercial / campus
//   - waterfront band: civic plaza, downtown towers, harbour quays
//   - south-west district: old town at the bay, garden suburb, amusement park

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

// Districts are axis-aligned buildable rectangles. A rectangle is the exact
// space between two street corridors, so blocks fill it edge to edge and the
// gaps between rectangles read as the district boundary streets. `cols`/`rows`
// set the district grain, `street` the width of its internal lanes.
export const ZONES = [
  {
    id: "downtown",
    district: "downtown",
    rect: [-2.35, 10.85, -5.85, 3.05],
    cols: 3,
    rows: 2,
    street: 1.6,
    streetKind: "avenue",
    morph: "tower",
    density: 1.2,
  },
  {
    id: "oldtown",
    district: "oldtown",
    rect: [-9.45, 3.05, 5.75, 13.55],
    cols: 3,
    rows: 2,
    street: 0.8,
    streetKind: "lane",
    morph: "row",
    density: 0.72,
  },
  {
    id: "civic",
    district: "civic",
    rect: [-9.45, -3.85, -5.85, 3.05],
    cols: 1,
    rows: 1,
    street: 0,
    streetKind: "lane",
    morph: "civic",
    density: 0.9,
  },
  {
    id: "commercial",
    district: "commercial",
    rect: [-9.45, 8.45, -13.05, -8.15],
    cols: 3,
    rows: 1,
    street: 1.25,
    streetKind: "street",
    morph: "perimeter",
    density: 1.0,
  },
  {
    id: "resA",
    district: "residential",
    rect: [-21.55, -16.75, -8.75, 13.55],
    cols: 1,
    rows: 6,
    street: 1.1,
    streetKind: "street",
    morph: "perimeter",
    density: 0.86,
  },
  {
    id: "parkwest",
    district: "green",
    rect: [-14.85, -11.35, -13.05, 13.55],
    cols: 1,
    rows: 5,
    street: 1.2,
    streetKind: "street",
    morph: "green",
    density: 0,
  },
  {
    id: "resB",
    district: "residential",
    rect: [-10.45, 8.45, -20.5, -15.35],
    cols: 5,
    rows: 2,
    street: 1.05,
    streetKind: "street",
    morph: "row",
    density: 0.7,
  },
  {
    id: "academic",
    district: "academic",
    rect: [10.35, 21.55, -20.5, -8.15],
    cols: 2,
    rows: 3,
    street: 1.35,
    streetKind: "street",
    morph: "campus",
    density: 0.62,
  },
  {
    id: "industrial",
    district: "industrial",
    rect: [-21.55, -16.75, -20.5, -10.05],
    cols: 1,
    rows: 3,
    street: 1.5,
    streetKind: "street",
    morph: "warehouse",
    density: 0.8,
  },
  {
    id: "station",
    district: "civic",
    rect: [-14.85, -11.75, -20.5, -15.35],
    cols: 1,
    rows: 1,
    street: 0,
    streetKind: "lane",
    morph: "station",
    density: 0.9,
  },
  {
    id: "port",
    district: "harbor",
    rect: [12.75, 21.55, -5.85, 3.05],
    cols: 2,
    rows: 2,
    street: 1.35,
    streetKind: "avenue",
    morph: "warehouse",
    density: 0.9,
  },
  {
    id: "suburb",
    district: "residential",
    rect: [-21.55, -9.15, 15.65, 21.55],
    cols: 3,
    rows: 2,
    street: 1.0,
    streetKind: "lane",
    morph: "row",
    density: 0.55,
  },
  {
    id: "amusement",
    district: "amusement",
    rect: [-7.65, -1.75, 15.65, 21.55],
    cols: 1,
    rows: 1,
    street: 0,
    streetKind: "lane",
    morph: "amusement",
    density: 0,
  },
  {
    id: "southpark",
    district: "green",
    rect: [-0.25, 3.05, 15.65, 21.55],
    cols: 1,
    rows: 1,
    street: 0,
    streetKind: "lane",
    morph: "green",
    density: 0,
  },
];

// Arterials run along district boundaries and along the coast. All of them are
// horizontal or vertical; together with the per-district lanes they tile the
// island into a single connected street network.
export const ARTERIALS = [
  // Coast roads: west, south, east. The north shore is taken by the railway.
  { x0: -22.4, z0: -20.5, x1: -22.4, z1: 22.4, width: 1.2, kind: "coast" },
  { x0: -22.4, z0: 22.4, x1: 5.5, z1: 22.4, width: 1.2, kind: "coast" },
  { x0: 22.4, z0: -20.5, x1: 22.4, z1: 5.5, width: 1.2, kind: "coast" },
  // East-west district streets.
  { x0: -16.75, z0: -14.2, x1: 10.1, z1: -14.2, width: 1.8, kind: "avenue" },
  { x0: -11.35, z0: -7.0, x1: 22.4, z1: -7.0, width: 1.8, kind: "avenue" },
  { x0: -11.35, z0: 4.4, x1: 22.4, z1: 4.4, width: 2.2, kind: "avenue" },
  { x0: -22.4, z0: 14.6, x1: 5.5, z1: 14.6, width: 1.6, kind: "avenue" },
  // North-south district streets.
  { x0: -15.8, z0: -20.5, x1: -15.8, z1: 14.6, width: 1.4, kind: "avenue" },
  { x0: -10.4, z0: -14.2, x1: -10.4, z1: 14.6, width: 1.4, kind: "avenue" },
  { x0: -3.1, z0: -7.0, x1: -3.1, z1: 4.4, width: 1.0, kind: "street" },
  { x0: 9.4, z0: -20.5, x1: 9.4, z1: -7.0, width: 1.4, kind: "avenue" },
  { x0: 11.8, z0: -7.0, x1: 11.8, z1: 4.4, width: 1.4, kind: "avenue" },
  // Quay road along the west edge of the bay.
  { x0: 4.4, z0: 3.3, x1: 4.4, z1: 22.4, width: 2.2, kind: "quay" },
  // Short connectors: station lane, industry lane, suburb lanes.
  { x0: -11.1, z0: -20.5, x1: -11.1, z1: -14.2, width: 0.8, kind: "lane" },
  { x0: -22.4, z0: -9.4, x1: -15.1, z1: -9.4, width: 0.8, kind: "lane" },
  { x0: -8.4, z0: 14.6, x1: -8.4, z1: 22.4, width: 1.0, kind: "street" },
  { x0: -1.0, z0: 14.6, x1: -1.0, z1: 22.4, width: 1.0, kind: "street" },
];

// Piers hang off the two bay quays. `dir: "south"` runs from the north quay
// into the bay, `dir: "east"` from the west quay.
export const PIERS = [
  { x: 8.4, z: 6.2, dir: "south", length: 3.2, width: 1.0 },
  { x: 13.4, z: 6.2, dir: "south", length: 4.2, width: 1.3 },
  { x: 17.4, z: 6.2, dir: "south", length: 3.6, width: 1.2 },
  { x: 20.8, z: 6.2, dir: "south", length: 4.8, width: 1.4 },
  { x: 6.2, z: 9.0, dir: "east", length: 3.4, width: 1.1 },
  { x: 6.2, z: 14.0, dir: "east", length: 4.6, width: 1.3 },
  { x: 6.2, z: 19.0, dir: "east", length: 3.0, width: 1.0 },
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

// Split a span into `count` slice lengths with a little seeded variation. The
// returned lengths sum to exactly `span`, so block rows always fill their
// district rectangle without leaving gaps or spilling over an edge.
function splitSpan(span, count, rng, jitter = 0.18) {
  if (count <= 1) return [span];
  const weights = Array.from({ length: count }, () => 1 + (rng() - 0.5) * 2 * jitter);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => (span * weight) / total);
}

// Cut an axis-aligned district rectangle into blocks. Blocks are laid out
// edge to edge, separated only by the district's internal streets; there is no
// rotation and no boundary clipping, so a block can never leave its district.
function layoutZone(zone, rng) {
  const [x0, x1, z0, z1] = zone.rect;
  const street = zone.street;
  const widths = splitSpan(x1 - x0 - street * (zone.cols - 1), zone.cols, rng);
  const depths = splitSpan(z1 - z0 - street * (zone.rows - 1), zone.rows, rng, 0.12);
  const blocks = [];
  const streets = [];

  let cursorZ = z0;
  for (let row = 0; row < zone.rows; row += 1) {
    let cursorX = x0;
    for (let col = 0; col < zone.cols; col += 1) {
      blocks.push({
        x: cursorX + widths[col] / 2,
        z: cursorZ + depths[row] / 2,
        w: widths[col],
        d: depths[row],
        angle: 0,
        zone: zone.id,
        district: zone.district,
        morph: zone.morph,
        density: zone.density,
        role: null,
        parkKind: null,
        row,
        col,
      });
      cursorX += widths[col] + street;
    }
    cursorZ += depths[row] + street;
  }

  if (street > 0) {
    // Lane centre lines between block columns and rows. They span the whole
    // district so they meet the boundary streets at both ends.
    let lineX = x0;
    for (let col = 0; col < zone.cols - 1; col += 1) {
      lineX += widths[col] + street / 2;
      streets.push({
        x0: lineX,
        z0,
        x1: lineX,
        z1,
        width: street,
        kind: zone.streetKind,
      });
      lineX += street / 2;
    }
    let lineZ = z0;
    for (let row = 0; row < zone.rows - 1; row += 1) {
      lineZ += depths[row] + street / 2;
      streets.push({
        x0,
        z0: lineZ,
        x1,
        z1: lineZ,
        width: street,
        kind: zone.streetKind,
      });
      lineZ += street / 2;
    }
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

// Give every district its landmarks and public spaces. The role names are read
// by the renderer to force a specific catalogue building (clock tower, market,
// school, energy plant, harbour sheds...) rather than random stock.
function assignRoles(blocks) {
  const groups = new Map();
  for (const block of blocks) {
    if (!groups.has(block.zone)) groups.set(block.zone, []);
    groups.get(block.zone).push(block);
  }
  const group = (id) => groups.get(id) ?? [];

  const downtown = group("downtown");
  const landmark = takeNearest(downtown, 8.4, 2.2);
  // Keep the tower cluster together: put the secondary towers on the blocks
  // closest to the landmark instead of scattering them over the whole CBD.
  const skyscraperPool = downtown
    .filter((block) => block !== landmark)
    .sort(
      (a, b) =>
        distance(a, landmark.x, landmark.z) - distance(b, landmark.x, landmark.z)
    );
  for (let index = 0; index < Math.min(2, skyscraperPool.length); index += 1) {
    skyscraperPool[index].role = "skyscraper";
  }
  if (landmark) landmark.role = "landmark";
  for (const block of downtown) {
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
  const market = takeNearest(commercial, 3.0, -8.4);
  if (market) {
    market.role = "market";
    market.morph = "perimeter";
  }
  const flagship = commercial
    .filter((block) => block !== market)
    .sort((a, b) => b.w * b.d - a.w * a.d)[0];
  if (flagship) flagship.role = "department";

  const civic = takeNearest(group("civic"), -6.6, 0.0);
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
  const energy = takeNearest(industrial, -19.0, -19.0);
  if (energy) energy.role = "energy";

  const port = group("port").sort((a, b) => a.z - b.z);
  if (port[0]) port[0].role = "warehouse";
  if (port[1]) port[1].role = "yard";
  if (port[2]) port[2].role = "harbor-office";

  const resA = group("resA").sort((a, b) => b.z - a.z);
  if (resA[0]) {
    resA[0].role = "neighbourhood-park";
    resA[0].morph = "green";
    resA[0].district = "green";
    resA[0].parkKind = "pocket";
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

  const suburb = group("suburb").sort((a, b) => a.x - b.x);
  if (suburb[0]) suburb[0].morph = "cottage";

  const station = takeNearest(group("station"), -13.3, -18.0);
  if (station) {
    station.role = "station";
    station.morph = "station";
  }

  const southpark = takeNearest(group("southpark"), 1.4, 18.5);
  if (southpark) {
    southpark.role = "promenade-park";
    southpark.parkKind = "waterfront";
  }

  const parkwest = group("parkwest").sort((a, b) => a.z - b.z);
  const parkKinds = ["pond", "cherry", "sports", "pond", "cherry"];
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

  const core = { x: 3.5, z: 0.5 };
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

  const arterials = ARTERIALS.map((street) => ({ ...street }));
  const allStreets = [...streets, ...arterials];

  return {
    island: { extent: ISLAND_EXTENT, bay: BAY, land: LAND_RECTS, edges: EDGE_SEGMENTS },
    blocks,
    streets: allStreets,
    arterials,
    streetsOnly: streets,
    piers: PIERS.map((pier) => ({ ...pier })),
    rail: {
      z: -21.4,
      x0: -22.4,
      x1: 22.4,
      station: { x: -13.3, z: -20.9 },
    },
    // Pedestrian promenades along the two bay quays. Their centre lines are
    // where the street furniture goes; the renderer also uses them for trees.
    promenades: [
      { x0: 5.5, z0: 5.5, x1: 22.4, z1: 6.2 },
      { x0: 5.5, z0: 5.5, x1: 6.2, z1: 22.4 },
    ],
    // Monument roundabout where the waterfront boulevard meets the west quay.
    plaza: { x: 4.4, z: 4.4, radius: 0.95 },
    bayLoop: { x: 15.0, z: 17.0, half: 4.4 },
    quayRoads: {
      north: 4.4,
      west: 4.4,
    },
  };
}
