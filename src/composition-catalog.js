// 组合层（Composition Layer）数据与生成器。
//
// 图鉴（catalog）收录的是“单个物体”；组合层把多个图鉴物体按地块组织成
// 庭院、步行街、广场、工地、居民区等“组合”，是城市街区的中间层。
//
// 规则：
// - 组合内部只使用静态图鉴物体，**不出现任何载具**（vehicles 分组整体排除）；
// - 建筑正放、不旋转、不缩小；道具与植被按真实比例缩小；
// - 每次生成由一个 seed 决定，同 seed 同组合，重掷产生新的 roguelike 变体；
// - 本模块只输出纯数据 plan（不依赖 Three.js），由 composition-models.js 负责
//   按实际模型尺寸排布和建模。

import { ASSET_BY_ID } from "./object-catalog.js";

export const COMPOSITION_LAYERS = [
  { id: "object", name: "物体层", en: "OBJECT LAYER", note: "图鉴中的单件建筑、道具与植被" },
  {
    id: "composition",
    name: "组合层",
    en: "COMPOSITION LAYER",
    note: "按地块组织多个物体，形成可步行街块",
  },
  { id: "city", name: "城市层", en: "CITY LAYER", note: "组合层 + 道路、水系与区域分区" },
];

const RARE_IDS = new Set([
  "s-apex",
  "s-burj",
  "s-taipei",
  "s-petronas",
  "s-onewtc",
  "b-observation",
  "b-skygarden",
  "b-clocktower",
  "a-ferris",
]);

const UNCOMMON_IDS = new Set([
  "b-cityhall",
  "b-museum",
  "b-library",
  "b-lighthouse",
  "b-highrise",
  "p-botanical",
  "p-fountain",
  "a-carousel",
  "a-gazebo",
]);

const RARITY_WEIGHT = { common: 5, uncommon: 2.4, rare: 1 };
const RARITY_LABEL = { common: "常见", uncommon: "少见", rare: "稀有" };

export function rarityOf(assetId) {
  if (RARE_IDS.has(assetId)) return "rare";
  if (UNCOMMON_IDS.has(assetId)) return "uncommon";
  if (/^(s|a|p|c)-/.test(assetId)) return "uncommon";
  return "common";
}

const GROUP_ORDER = [
  "buildings",
  "skyscrapers",
  "construction",
  "parks",
  "attractions",
  "street",
  "nature",
];

export const COMPOSITIONS = [
  {
    id: "residential",
    propCount: [7, 10],
    name: "居民区",
    en: "RESIDENTIAL RING",
    accent: "#9fd06d",
    layout: "ring",
    description:
      "外围一圈六层上下的公寓楼，六栋样式各不相同；中间是一到两座口袋公园。楼间只走人，入口留在朝向观察者的一侧。",
    rule: "6 栋高层/中层公寓沿地块外围围合，中央放 1–2 座公园；建筑正放、不缩小、不旋转。",
    tags: ["居住", "围合", "公园"],
    ground: "#8aa46a",
    inner: "#9db97c",
    count: [6, 6],
    centerCount: [1, 2],
    main: ["b-lowrise", "b-highrise", "b-office", "b-hotel", "b-department", "b-clinic"],
    center: ["p-pocket", "p-cherry", "p-fountain", "p-pond"],
    props: ["s-bench", "s-lamp", "s-planter", "n-broadleaf", "n-cherry", "s-bikerack"],
    variants: ["六层公寓环", "花园住区", "林荫住区"],
  },
  {
    id: "residential-enclosed",
    propCount: [8, 12],
    name: "围合居民区",
    en: "ENCLOSED RESIDENTIAL",
    accent: "#7fb35f",
    layout: "ring-closed",
    camera: [0.58, 1.95, 1.05],
    description:
      "八栋六层上下的公寓沿地块四边完整围成一圈，中央一到两座公园被包在里院。没有入口缺口，是组合层里最封闭的居民区。",
    rule: "8 栋高层/中层公寓沿四边全封闭围合，中央放 1–2 座公园；建筑正放、不缩小、不旋转。",
    tags: ["居住", "封闭", "里院"],
    ground: "#86a166",
    inner: "#9ab67a",
    count: [8, 8],
    centerCount: [1, 2],
    main: ["b-lowrise", "b-highrise", "b-office", "b-hotel", "b-department", "b-clinic"],
    center: ["p-pocket", "p-cherry", "p-fountain", "p-pond"],
    props: ["s-bench", "s-lamp", "s-planter", "n-broadleaf", "n-cherry", "s-bikerack", "s-planter"],
    variants: ["四面围合", "闭合里院", "环形住区"],
  },
  {
    id: "courtyard",
    propCount: [6, 9],
    name: "围合庭院",
    en: "COURTYARD RING",
    accent: "#ffd166",
    layout: "ring",
    description:
      "低层住宅与街角小店围着一方中央庭园，转角留出步行巷口。没有车道，只靠小径把每户门廊串起来。",
    rule: "4–6 栋低层建筑沿地块外围围合，中央放一座口袋公园；建筑正放，入口朝向观察者。",
    tags: ["低层", "居住", "围合"],
    ground: "#c9bd9f",
    inner: "#dccfb2",
    count: [4, 6],
    main: ["b-townhouse", "b-cottage", "b-courtyard", "b-lowrise", "b-cafe", "b-bookshop", "b-office"],
    center: ["p-pocket", "p-cherry", "p-pond"],
    props: ["s-bench", "s-lamp", "s-planter", "n-broadleaf", "n-cherry", "n-shrub"],
    variants: ["向心庭院", "双开口庭院", "错层围合"],
  },
  {
    id: "street",
    propCount: [5, 8],
    name: "步行街墙",
    en: "PEDESTRIAN STREET",
    accent: "#ef816c",
    layout: "street",
    description:
      "两排街墙夹出一条无车步行街，橱窗、长椅和路灯把视线送向街道尽头。商业沿街展开，后巷留给散步。",
    rule: "建筑沿街墙成排布置，街道中心只放路灯、长椅与树池；不设车辆与停车带。",
    tags: ["商业", "街墙", "步行"],
    ground: "#c8bca2",
    inner: "#d8ccb2",
    count: [4, 6],
    main: [
      "b-townhouse",
      "b-cafe",
      "b-bookshop",
      "b-market",
      "b-department",
      "b-cinema",
      "b-diner",
      "b-arcade",
    ],
    center: [],
    props: ["s-lamp", "s-bench", "s-kiosk", "s-planter", "s-billboard", "n-broadleaf", "n-cherry"],
    variants: ["黄昏橱窗街", "双面骑楼街", "尽头有电影院"],
  },
  {
    id: "towerplaza",
    propCount: [5, 8],
    name: "塔楼广场",
    en: "TOWER PLAZA",
    accent: "#e7b65d",
    layout: "plaza",
    description:
      "两到三座塔楼围出硬质广场，雕像、喷泉和旗杆校准城市中轴。广场尺度服务于步行、集会与拍照。",
    rule: "2–3 座塔楼成排布置，中央放喷泉或雕像；硬质铺装，无车道。",
    tags: ["高层", "广场", "地标"],
    ground: "#c9c1ad",
    inner: "#d9d1bd",
    count: [2, 3],
    main: [
      "s-trade",
      "s-cloudspire",
      "s-obsidian",
      "s-terrace",
      "s-empire",
      "s-chrysler",
      "s-twincrest",
      "s-onewtc",
      "s-helix",
    ],
    center: ["p-fountain", "p-pocket"],
    props: ["s-statue", "s-lamp", "s-planter", "s-bench", "n-broadleaf", "b-cityhall"],
    variants: ["中轴广场", "双塔夹景", "塔楼下的集市"],
  },
  {
    id: "marketlane",
    propCount: [5, 8],
    name: "市场巷",
    en: "MARKET LANE",
    accent: "#f1c96b",
    layout: "lane",
    description:
      "市场大厅带着一圈摊位和雨棚，窄巷两侧堆着货箱、招牌和垃圾桶。这里最热闹，也最不适合通车。",
    rule: "市场大厅居中，两侧店铺与摊位挤出一条窄巷；巷内只有摊位、招牌与路灯。",
    tags: ["市场", "窄巷", "烟火气"],
    ground: "#bfae91",
    inner: "#cfbea0",
    count: [3, 4],
    main: ["b-market", "b-bookshop", "b-cafe", "b-diner", "b-department", "b-arcade"],
    center: [],
    props: ["s-kiosk", "s-bin", "s-billboard", "s-planter", "s-lamp", "a-tent", "n-broadleaf"],
    variants: ["早市巷", "夜市巷", "花市窄巷"],
  },
  {
    id: "campus",
    propCount: [6, 9],
    name: "学院院落",
    en: "CAMPUS COURT",
    accent: "#e8b267",
    layout: "ring",
    description:
      "学校、图书馆与博物馆围着一片草坪，树荫和长椅是这里的主要家具。院落内部完全步行，入口只设步行闸口。",
    rule: "3–4 座公共建筑围合草坪，树阵与长椅沿路布置；院内仅步行。",
    tags: ["公共", "学院", "草坪"],
    ground: "#b5b597",
    inner: "#c9c9ab",
    count: [3, 4],
    main: ["b-school", "b-library", "b-museum", "b-clinic", "b-cityhall", "b-lowrise"],
    center: ["p-pocket", "p-cherry", "p-botanical"],
    props: ["n-broadleaf", "n-conifer", "s-bench", "s-bikerack", "s-lamp", "s-planter"],
    variants: ["图书馆庭院", "林荫学院", "博物馆前庭"],
  },
  {
    id: "yard",
    propCount: [6, 9],
    name: "建造工地",
    en: "CONSTRUCTION YARD",
    accent: "#d98f57",
    layout: "yard",
    description:
      "塔吊、脚手架和围挡圈起一块正在生长的地块，仓库与临时板房贴着工地边缘。这里是组合层里唯一的“未完成态”。",
    rule: "施工构件 + 仓库/工坊组合，围挡封住临街面；场内只有工程机械，不设社会车辆。",
    tags: ["工地", "工业", "生长"],
    ground: "#a8967b",
    inner: "#b8a68b",
    count: [3, 5],
    main: ["c-skeleton", "c-crane", "c-scaffold", "c-excavator", "c-office", "b-warehouse", "b-workshop", "b-energy"],
    center: [],
    props: ["c-fence", "c-materials", "s-bin", "s-billboard", "n-shrub", "s-lamp"],
    variants: ["封顶前夜", "基坑阶段", "临街围挡"],
  },
  {
    id: "green",
    propCount: [9, 13],
    name: "口袋绿轴",
    en: "POCKET GREEN",
    accent: "#9fd06d",
    layout: "green",
    description:
      "被建筑余量挤出来的一块绿地：小广场、树阵、长椅和花圃。它没有建筑指标，只负责让组合层喘口气。",
    rule: "1–2 座口袋公园 + 树阵、花圃、长椅与路灯；纯步行空间，无任何载具。",
    tags: ["公园", "植被", "留白"],
    ground: "#87a165",
    inner: "#98b376",
    count: [1, 2],
    main: ["p-pocket", "p-cherry", "p-botanical", "p-pond", "p-playground"],
    center: ["a-gazebo", "p-fountain"],
    props: ["n-broadleaf", "n-conifer", "n-shrub", "n-flowerbed", "s-bench", "s-lamp", "s-planter"],
    variants: ["树阵广场", "樱花小径", "水景口袋公园"],
  },
  {
    id: "fair",
    propCount: [5, 8],
    name: "节庆场",
    en: "FESTIVAL GROUNDS",
    accent: "#e8735f",
    layout: "fair",
    description:
      "摩天轮、旋转木马和条纹帐篷围出的临时场地，灯串比路灯更早亮起。场地按人流组织，不设任何车型通道。",
    rule: "2–4 组游乐设施 + 帐篷/摊位，围出节庆场地；地面为草坪与硬质铺装混合。",
    tags: ["游乐", "节庆", "夜间"],
    ground: "#c2ab8c",
    inner: "#d2bb9c",
    count: [2, 4],
    main: ["a-ferris", "a-carousel", "a-tent", "a-gazebo", "a-gate"],
    center: [],
    props: ["s-billboard", "s-kiosk", "s-lamp", "n-broadleaf", "s-bin", "s-planter"],
    variants: ["灯串夜市", "旋转木马场", "马戏帐篷前"],
  },
];

// ---------- 随机工具 ----------

export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(value) {
  let hash = 0x811c9dc5;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

export function seedToHex(seed) {
  return (seed >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function normalizeSeed(value) {
  if (value == null) return null;
  const text = String(value).trim().replace(/^0x/i, "");
  if (!/^[0-9a-f]{1,8}$/i.test(text)) return null;
  return Number.parseInt(text, 16) >>> 0;
}

const rand = (rng, min, max) => min + (max - min) * rng();
const randInt = (rng, min, max) => Math.floor(rand(rng, min, max + 1));

function weightedPick(rng, ids) {
  const total = ids.reduce((sum, id) => sum + RARITY_WEIGHT[rarityOf(id)], 0);
  let roll = rng() * total;
  for (const id of ids) {
    roll -= RARITY_WEIGHT[rarityOf(id)];
    if (roll <= 0) return id;
  }
  return ids[ids.length - 1];
}

function sampleUnique(rng, ids, count) {
  const pool = [...ids];
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const id = weightedPick(rng, pool);
    picked.push(id);
    pool.splice(pool.indexOf(id), 1);
  }
  return picked;
}

function sampleMain(rng, ids, count) {
  if (count <= ids.length) return sampleUnique(rng, ids, count);
  const picked = sampleUnique(rng, ids, ids.length);
  while (picked.length < count) picked.push(weightedPick(rng, ids));
  for (let index = picked.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [picked[index], picked[swap]] = [picked[swap], picked[index]];
  }
  return picked;
}

function sampleProps(rng, ids, count) {
  const picked = [];
  for (let index = 0; index < count; index += 1) {
    picked.push(weightedPick(rng, ids));
  }
  return picked;
}

// ---------- 生成器 ----------

function buildManifest(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item.assetId, (counts.get(item.assetId) ?? 0) + 1);
  }
  const manifest = [];
  for (const [assetId, count] of counts) {
    const asset = ASSET_BY_ID.get(assetId);
    if (!asset) continue;
    manifest.push({
      id: assetId,
      name: asset.name,
      en: asset.en,
      group: asset.group,
      count,
      rarity: rarityOf(assetId),
      rarityLabel: RARITY_LABEL[rarityOf(assetId)],
    });
  }
  manifest.sort((left, right) => {
    const groupDelta = GROUP_ORDER.indexOf(left.group) - GROUP_ORDER.indexOf(right.group);
    return groupDelta !== 0 ? groupDelta : left.name.localeCompare(right.name, "zh-Hans-CN");
  });
  return manifest;
}

function buildModifiers(plan) {
  const modifiers = [];
  const groups = new Set(plan.manifest.map((entry) => entry.group));
  const rarityScore = plan.manifest.reduce(
    (sum, entry) =>
      sum + (entry.rarity === "rare" ? 3 : entry.rarity === "uncommon" ? 1 : 0),
    0
  );
  if (groups.has("skyscrapers")) modifiers.push({ label: "天际线", tone: "gold" });
  if (groups.has("construction")) modifiers.push({ label: "生长中", tone: "coral" });
  if (groups.has("attractions")) modifiers.push({ label: "节庆灯串", tone: "coral" });
  if (plan.greenCount >= 2) modifiers.push({ label: "浓荫", tone: "teal" });
  if (plan.propCount >= 5) modifiers.push({ label: "烟火气", tone: "gold" });
  if (plan.mainIds.length >= 6) modifiers.push({ label: "围合", tone: "teal" });
  if (rarityScore >= 5) modifiers.push({ label: "稀有组合", tone: "gold" });
  return modifiers;
}

export function generateComposition(definition, seed) {
  const normalized = seed >>> 0;
  const rng = mulberry32(hashSeed(`${definition.id}:${seedToHex(normalized)}`));
  const mainCount = randInt(rng, definition.count[0], definition.count[1]);
  const mainIds = sampleMain(rng, definition.main, mainCount);
  const centerRange = definition.centerCount ?? [1, 1];
  const centerCount = definition.center.length
    ? randInt(rng, centerRange[0], centerRange[1])
    : 0;
  const centerIds = centerCount ? sampleUnique(rng, definition.center, centerCount) : [];
  const propRange = definition.propCount ?? [4, 7];
  const propCount = randInt(rng, propRange[0], propRange[1]);
  const propIds = sampleProps(rng, definition.props, propCount);
  const variant = definition.variants[randInt(rng, 0, definition.variants.length - 1)];

  const items = mainIds.map((assetId) => ({ assetId, role: "building" }));
  for (const assetId of centerIds) items.push({ assetId, role: "center" });
  for (const assetId of propIds) items.push({ assetId, role: "prop" });

  const plan = {
    id: definition.id,
    definition,
    seed: normalized,
    seedHex: seedToHex(normalized),
    layout: definition.layout,
    accent: definition.accent,
    variant,
    ground: definition.ground,
    inner: definition.inner,
    camera: definition.camera ?? null,
    mainIds,
    centerIds,
    centerId: centerIds[0] ?? null,
    propIds,
    items: items.filter((item) => {
      const asset = ASSET_BY_ID.get(item.assetId);
      return asset && asset.group !== "vehicles" && asset.family !== "vehicle";
    }),
  };
  plan.manifest = buildManifest(plan.items);

  plan.greenCount = plan.items.filter((item) => {
    const asset = ASSET_BY_ID.get(item.assetId);
    return asset && (asset.group === "nature" || asset.group === "parks" || asset.group === "attractions");
  }).length;
  plan.propCount = plan.items.filter((item) => item.role === "prop").length;
  plan.buildingCount = plan.items.filter((item) => item.role === "building").length;
  plan.elementCount = plan.items.length;
  plan.modifiers = buildModifiers(plan);
  plan.density = Math.min(
    5,
    Math.max(1, Math.round((plan.buildingCount + plan.propCount / 2) / 1.6))
  );
  return plan;
}

export function compositionStats(plans) {
  const assetIds = new Set();
  const groups = new Set();
  let elements = 0;
  for (const plan of plans) {
    elements += plan.elementCount;
    for (const entry of plan.manifest) {
      assetIds.add(entry.id);
      groups.add(entry.group);
    }
  }
  return {
    compositions: plans.length,
    elements,
    uniqueAssets: assetIds.size,
    groups: groups.size,
  };
}
