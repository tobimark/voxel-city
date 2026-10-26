import { VARIANTS } from "./catalog-variants/index.js";

const fact = (label, value) => ({ label, value });

const building = (id, family, name, en, description, tags, facts, model, districts) => ({
  id: `b-${id}`,
  group: "buildings",
  family,
  name,
  en,
  description,
  tags,
  facts,
  model: { kind: "building", ...model },
  districts,
});

export const GROUPS = [
  {
    id: "buildings",
    name: "建筑",
    en: "ARCHITECTURE",
    description: "住宅、商铺、写字楼、公共建筑、工业建筑与城市地标。",
    accent: "#ffd166",
  },
  {
    id: "skyscrapers",
    name: "摩天大楼",
    en: "SKYSCRAPERS",
    description: "玻璃幕墙、收分塔身、空中大堂与结构外露的塔楼，构成城市真正的天际线。",
    accent: "#e7b65d",
  },
  {
    id: "construction",
    name: "建筑工地",
    en: "CONSTRUCTION SITES",
    description: "塔吊、脚手架、围挡与未完工的楼体，城市仍在持续生长。",
    accent: "#d98f57",
  },
  {
    id: "parks",
    name: "公园",
    en: "PARKS",
    description: "从街角花园到运动场和植物园，城市里的呼吸空间。",
    accent: "#9fd06d",
  },
  {
    id: "attractions",
    name: "游乐设施",
    en: "AMUSEMENT RIDES",
    description: "摩天轮、旋转木马与节庆帐篷，城市里最鲜艳的部分。",
    accent: "#e8735f",
  },
  {
    id: "vehicles",
    name: "载具",
    en: "VEHICLES",
    description: "穿行在环街区道路上的日常交通工具。",
    accent: "#ef816c",
  },
  {
    id: "street",
    name: "街道设施",
    en: "STREET FURNITURE",
    description: "路灯、长椅、站台和小物件，构成街道的尺度感。",
    accent: "#e0b978",
  },
  {
    id: "nature",
    name: "植被与生态",
    en: "NATURE & ECOLOGY",
    description: "树木、灌木、花丛与海鸥，让城市保持呼吸。",
    accent: "#7fc56d",
  },
  {
    id: "maritime",
    name: "滨水物体",
    en: "MARITIME",
    description: "围绕像素岛航行的船只，以及码头与海上标记。",
    accent: "#70c7dc",
  },
];

export const BUILDING_FAMILIES = [
  { id: "residential", name: "住宅", en: "RESIDENTIAL", description: "从坡顶小屋到高层公寓。" },
  { id: "commercial", name: "商业", en: "COMMERCIAL", description: "街角店铺、市场与百货公司。" },
  { id: "office", name: "商务", en: "OFFICE", description: "构成城市天际线的办公楼宇。" },
  { id: "civic", name: "公共", en: "CIVIC", description: "面向所有居民开放的公共建筑。" },
  { id: "industrial", name: "工业", en: "INDUSTRIAL", description: "仓库、工坊与能源基础设施。" },
  { id: "leisure", name: "休闲", en: "LEISURE", description: "旅馆、影院、餐厅与游戏厅。" },
  { id: "landmark", name: "地标", en: "LANDMARKS", description: "远远就能认出的城市坐标。" },
];

const buildingAssets = [
  building(
    "cottage",
    "residential",
    "坡顶小屋",
    "GABLE COTTAGE",
    "一对年轻夫妇和一只猫的家。坡屋顶会在雨天收集整座城市的回声。",
    ["坡屋顶", "小家庭", "烟囱"],
    [fact("楼层", "1–2F"), fact("占地", "9×8 m"), fact("容量", "4–10 人")],
    {
      style: "gable",
      floors: [1, 2],
      width: [1.0, 1.35],
      depth: [0.9, 1.2],
      walls: ["#e6d5b8", "#d9c3a0", "#e9d9c2"],
      roof: "#a75b4b",
      accent: "#f0c36b",
      features: ["porch", "chimney", "garden"],
    },
    ["residential", "oldtown", "academic"]
  ),
  building(
    "townhouse",
    "residential",
    "联排住宅",
    "TOWNHOUSE ROW",
    "窄面宽、高挑檐，邻居之间只隔一堵薄墙。老城最典型的居住单元。",
    ["联排", "砖墙", "门廊"],
    [fact("楼层", "2–3F"), fact("占地", "7×12 m"), fact("容量", "8–18 人")],
    {
      style: "townhouse",
      floors: [2, 3],
      width: [0.72, 0.95],
      depth: [1.12, 1.42],
      walls: ["#c98f76", "#d3a487", "#b87c69"],
      roof: "#596167",
      accent: "#f2d18a",
      features: ["stoop", "cornice", "chimney", "windowBox"],
    },
    ["oldtown", "creative", "residential"]
  ),
  building(
    "courtyard",
    "residential",
    "合院住宅",
    "COURTYARD HOUSE",
    "房屋围着一方小天井，雨水顺着瓦檐落进院子里的水缸。",
    ["合院", "天井", "瓦屋顶"],
    [fact("楼层", "1–2F"), fact("占地", "14×14 m"), fact("容量", "10–20 人")],
    {
      style: "courtyard",
      floors: [1, 2],
      width: [1.55, 1.85],
      depth: [1.55, 1.85],
      walls: ["#e7dcc6", "#d9c9ae", "#ede1cd"],
      roof: "#8f6552",
      accent: "#7fa35b",
      features: ["courtyard", "gate", "trees", "well"],
    },
    ["residential", "oldtown"]
  ),
  building(
    "lowrise",
    "residential",
    "低层公寓",
    "LOW-RISE APARTMENT",
    "每层四户，阳台正对街心花园。傍晚会飘出不同人家的饭菜香。",
    ["公寓", "阳台", "街心花园"],
    [fact("楼层", "3–5F"), fact("占地", "12×11 m"), fact("容量", "28–52 人")],
    {
      style: "apartment",
      floors: [3, 5],
      width: [1.2, 1.58],
      depth: [1.08, 1.45],
      walls: ["#d7c9ad", "#bfcbbf", "#e0c9a8"],
      roof: "#62594e",
      accent: "#e58a70",
      features: ["balconies", "roofTank", "laundry", "garden"],
    },
    ["residential", "academic", "creative", "harbor"]
  ),
  building(
    "highrise",
    "residential",
    "高层公寓",
    "HIGH-RISE APARTMENT",
    "老居民说，顶层能同时看到海湾和钟楼。电梯里永远贴着新的告示。",
    ["高层", "天际线", "屋顶花园"],
    [fact("楼层", "7–11F"), fact("占地", "13×12 m"), fact("容量", "80–160 人")],
    {
      style: "apartmentTall",
      floors: [7, 11],
      width: [1.3, 1.65],
      depth: [1.2, 1.55],
      walls: ["#c7d2cc", "#d6c7b0", "#b8c8ce"],
      roof: "#576368",
      accent: "#f0b56e",
      features: ["balconies", "roofGarden", "antenna", "lobby"],
    },
    ["downtown", "residential", "harbor"]
  ),

  building(
    "cafe",
    "commercial",
    "街角咖啡",
    "CORNER CAFÉ",
    "面向十字路口的两层小店，红色雨棚下永远坐着几位熟客。",
    ["咖啡", "雨棚", "街角"],
    [fact("楼层", "2–3F"), fact("占地", "11×9 m"), fact("岗位", "8–16 人")],
    {
      style: "cafe",
      floors: [2, 3],
      width: [1.1, 1.45],
      depth: [1.0, 1.3],
      walls: ["#dca184", "#e2b793", "#d5a18f"],
      roof: "#6a554b",
      accent: "#f1c96b",
      features: ["awning", "sign", "seats", "flowerBox", "bigWindow"],
    },
    ["creative", "commercial", "oldtown", "harbor"]
  ),
  building(
    "bookshop",
    "commercial",
    "旧书店",
    "SECONDHAND BOOKSHOP",
    "木门总是半掩着。橱窗里摞着不会再版的地图册和旧小说。",
    ["书店", "木质", "橱窗"],
    [fact("楼层", "2–4F"), fact("占地", "9×13 m"), fact("岗位", "5–12 人")],
    {
      style: "bookshop",
      floors: [2, 4],
      width: [0.95, 1.3],
      depth: [1.15, 1.45],
      walls: ["#768c72", "#8b9b7e", "#9b8d72"],
      roof: "#5e5145",
      accent: "#e0b978",
      features: ["sign", "bayWindow", "awning", "bookCrates"],
    },
    ["creative", "oldtown", "academic"]
  ),
  building(
    "market",
    "commercial",
    "市场大厅",
    "MARKET HALL",
    "绿色玻璃顶棚把天光切成格子，摊位在下面排成温暖的迷宫。",
    ["市场", "玻璃顶", "摊位"],
    [fact("楼层", "1–2F"), fact("占地", "20×17 m"), fact("岗位", "24–48 人")],
    {
      style: "market",
      floors: [1, 2],
      width: [1.85, 2.2],
      depth: [1.55, 1.9],
      walls: ["#d8c39d", "#c9b18e", "#d5c7ae"],
      roof: "#6b8c7a",
      accent: "#e36f5f",
      features: ["glassRoof", "stalls", "awnings", "clock"],
    },
    ["commercial", "creative", "oldtown", "harbor"]
  ),
  building(
    "department",
    "commercial",
    "百货公司",
    "DEPARTMENT STORE",
    "老牌百货的旋转门依旧锃亮，顶层咖啡座能俯瞰整条商业街。",
    ["百货", "装饰艺术", "橱窗"],
    [fact("楼层", "4–6F"), fact("占地", "18×16 m"), fact("岗位", "60–120 人")],
    {
      style: "department",
      floors: [4, 6],
      width: [1.65, 1.95],
      depth: [1.45, 1.75],
      walls: ["#d7c4a2", "#c7b393", "#e0d2b8"],
      roof: "#645a50",
      accent: "#f0b85d",
      features: ["sign", "displayWindows", "cornice", "roofSign", "awning"],
    },
    ["commercial", "downtown", "creative"]
  ),

  building(
    "office",
    "office",
    "中庭写字楼",
    "ATRIUM OFFICE",
    "中庭里种了一棵很高的树。午休时，电梯厅会变成临时咖啡角。",
    ["写字楼", "中庭", "玻璃门厅"],
    [fact("楼层", "4–7F"), fact("占地", "15×14 m"), fact("岗位", "70–140 人")],
    {
      style: "office",
      floors: [4, 7],
      width: [1.45, 1.8],
      depth: [1.35, 1.7],
      walls: ["#aabcc2", "#c2b8a4", "#98adb5"],
      roof: "#596367",
      accent: "#74c9be",
      features: ["lobby", "windowBands", "roofTank", "cafe"],
    },
    ["downtown", "commercial"]
  ),
  building(
    "glass",
    "office",
    "玻璃塔",
    "GLASS TOWER",
    "立面会随着一天的光线改变颜色，黄昏时像一块烧热的琥珀。",
    ["玻璃幕墙", "高塔", "反光"],
    [fact("楼层", "8–12F"), fact("占地", "16×16 m"), fact("岗位", "160–320 人")],
    {
      style: "glass",
      floors: [8, 12],
      width: [1.45, 1.8],
      depth: [1.45, 1.8],
      walls: ["#9fb8c2", "#8ca9b5", "#aebfc1"],
      roof: "#495b63",
      accent: "#78d4c5",
      features: ["glassFacade", "crown", "lobby", "windowBands"],
    },
    ["downtown", "commercial"]
  ),
  building(
    "stepped",
    "office",
    "阶梯塔",
    "STEPPED TOWER",
    "体量一层层向上收窄，像一座可以攀爬的山。每层露台都种着植物。",
    ["退台", "露台", "天际线"],
    [fact("楼层", "9–14F"), fact("占地", "17×17 m"), fact("岗位", "200–380 人")],
    {
      style: "stepped",
      floors: [9, 14],
      width: [1.55, 1.9],
      depth: [1.55, 1.9],
      walls: ["#c9b89a", "#b8c5bb", "#d2bfa2"],
      roof: "#625a4e",
      accent: "#e8b267",
      features: ["setbacks", "terraces", "crown", "windowBands"],
    },
    ["downtown"]
  ),
  building(
    "twin",
    "office",
    "双塔中心",
    "TWIN TOWERS",
    "两座塔楼在中间以空中连廊相连，像在城市上空握住彼此的手。",
    ["双塔", "空中连廊", "商务"],
    [fact("楼层", "7–10F"), fact("占地", "24×14 m"), fact("岗位", "180–300 人")],
    {
      style: "twin",
      floors: [7, 10],
      width: [2.1, 2.45],
      depth: [1.25, 1.5],
      walls: ["#b6c6c9", "#cdbba2", "#aebdc5"],
      roof: "#536166",
      accent: "#71c7bd",
      features: ["twinTowers", "skybridge", "plinth", "windowBands"],
    },
    ["downtown", "commercial"]
  ),
  building(
    "media",
    "office",
    "媒体塔",
    "MEDIA TOWER",
    "顶层有一圈向外倾斜的玻璃演播室，晚上会亮起滚动字幕。",
    ["媒体", "天线", "广告牌"],
    [fact("楼层", "7–12F"), fact("占地", "14×14 m"), fact("岗位", "120–240 人")],
    {
      style: "media",
      floors: [7, 12],
      width: [1.25, 1.6],
      depth: [1.25, 1.6],
      walls: ["#8e9ca4", "#a99b8b", "#899ca7"],
      roof: "#4b555c",
      accent: "#ef816c",
      features: ["antenna", "billboard", "newsroom", "windowBands"],
    },
    ["downtown", "commercial"]
  ),

  building(
    "library",
    "civic",
    "图书馆",
    "PUBLIC LIBRARY",
    "高窗、长桌和安静的翻页声。门口的石阶被几代读者磨得发亮。",
    ["公共建筑", "柱廊", "阅读"],
    [fact("楼层", "2–3F"), fact("占地", "18×15 m"), fact("岗位", "18–40 人")],
    {
      style: "library",
      floors: [2, 3],
      width: [1.65, 1.95],
      depth: [1.35, 1.65],
      walls: ["#d8d0bd", "#c6c9b7", "#e1d4ba"],
      roof: "#697064",
      accent: "#d8b66a",
      features: ["columns", "steps", "pediment", "roofLantern", "sign"],
    },
    ["civic", "academic", "oldtown"]
  ),
  building(
    "school",
    "civic",
    "学校",
    "NEIGHBORHOOD SCHOOL",
    "操场的白线刚重新刷过，钟声会在整点穿过两个街区。",
    ["学校", "钟声", "操场"],
    [fact("楼层", "2–4F"), fact("占地", "22×17 m"), fact("岗位", "40–90 人")],
    {
      style: "school",
      floors: [2, 4],
      width: [1.95, 2.25],
      depth: [1.4, 1.7],
      walls: ["#bf9a7b", "#d1af8d", "#b7a082"],
      roof: "#5e5a51",
      accent: "#ef816c",
      features: ["bellTower", "flag", "courtyard", "awnings", "sign"],
    },
    ["academic", "civic"]
  ),
  building(
    "museum",
    "civic",
    "博物馆",
    "CITY MUSEUM",
    "收藏这座岛从渔村变成城市的全部证据，以及一只来路不明的旧时钟。",
    ["博物馆", "穹顶", "柱廊"],
    [fact("楼层", "1–2F"), fact("占地", "22×19 m"), fact("岗位", "22–48 人")],
    {
      style: "museum",
      floors: [1, 2],
      width: [1.95, 2.25],
      depth: [1.7, 2.0],
      walls: ["#dfd7c4", "#d2c8b1", "#e7ddc8"],
      roof: "#6a675d",
      accent: "#d6b565",
      features: ["dome", "columns", "steps", "sign", "statue"],
    },
    ["civic", "oldtown"]
  ),
  building(
    "clinic",
    "civic",
    "社区医院",
    "COMMUNITY CLINIC",
    "顶楼的直升机坪大多数时候空着。门口的花坛总有人照料。",
    ["医院", "十字标志", "直升机坪"],
    [fact("楼层", "3–5F"), fact("占地", "15×14 m"), fact("岗位", "60–130 人")],
    {
      style: "clinic",
      floors: [3, 5],
      width: [1.35, 1.7],
      depth: [1.25, 1.55],
      walls: ["#c7d6cb", "#d8d4bd", "#b8ccc7"],
      roof: "#5d6967",
      accent: "#ef816c",
      features: ["crossSign", "helipad", "ambulanceBay", "lobby"],
    },
    ["civic", "residential"]
  ),
  building(
    "fire",
    "civic",
    "消防站",
    "FIRE STATION",
    "红色的车库门正对主街，警报响起时整条街都会侧目。",
    ["消防", "车库", "瞭望塔"],
    [fact("楼层", "2–3F"), fact("占地", "17×14 m"), fact("岗位", "20–45 人")],
    {
      style: "fire",
      floors: [2, 3],
      width: [1.55, 1.85],
      depth: [1.3, 1.55],
      walls: ["#c4a38b", "#d5b49a", "#b98f79"],
      roof: "#5e5149",
      accent: "#d75348",
      features: ["garageDoors", "hoseTower", "sign", "roofBeacon"],
    },
    ["civic", "industrial", "harbor"]
  ),
  building(
    "cityhall",
    "civic",
    "市政厅",
    "CITY HALL",
    "城市所有的图纸、印章和争吵都存放在这里。钟楼每天慢四分钟。",
    ["市政", "钟楼", "广场"],
    [fact("楼层", "3–5F"), fact("占地", "21×18 m"), fact("岗位", "70–150 人")],
    {
      style: "cityhall",
      floors: [3, 5],
      width: [1.9, 2.2],
      depth: [1.6, 1.9],
      walls: ["#d7ccb5", "#c8bda8", "#e0d5bf"],
      roof: "#5e625d",
      accent: "#d7b663",
      features: ["clockTower", "columns", "steps", "flag", "plaza"],
    },
    ["civic", "downtown"]
  ),

  building(
    "warehouse",
    "industrial",
    "港口仓库",
    "HARBOR WAREHOUSE",
    "铁皮屋顶在下午会发出轻微的爆裂声。里面堆着没有标记的木箱。",
    ["仓库", "锯齿顶", "装卸台"],
    [fact("楼层", "1F"), fact("占地", "23×18 m"), fact("岗位", "10–30 人")],
    {
      style: "warehouse",
      floors: [1, 1],
      width: [2.0, 2.3],
      depth: [1.55, 1.9],
      walls: ["#8c918b", "#a0a095", "#7d8887"],
      roof: "#59605e",
      accent: "#d6a858",
      features: ["sawtooth", "loadingDock", "crates", "sign"],
    },
    ["harbor", "industrial"]
  ),
  building(
    "workshop",
    "industrial",
    "修船工坊",
    "BOAT WORKSHOP",
    "门外停着一艘修了半年的船。焊枪的光会在夜里映到水面。",
    ["工坊", "烟囱", "修船"],
    [fact("楼层", "2–3F"), fact("占地", "16×14 m"), fact("岗位", "12–28 人")],
    {
      style: "workshop",
      floors: [2, 3],
      width: [1.45, 1.8],
      depth: [1.25, 1.55],
      walls: ["#9b806a", "#aa8f75", "#8e7b69"],
      roof: "#55534e",
      accent: "#e88a5f",
      features: ["smokestack", "pipes", "sign", "crates"],
    },
    ["industrial", "harbor"]
  ),
  building(
    "energy",
    "industrial",
    "能源站",
    "ENERGY STATION",
    "城市所有灯光的起点。夜晚靠近时能听见持续而低沉的嗡鸣。",
    ["能源", "冷却塔", "变电站"],
    [fact("楼层", "1–2F"), fact("占地", "24×21 m"), fact("岗位", "20–50 人")],
    {
      style: "energy",
      floors: [1, 2],
      width: [2.0, 2.3],
      depth: [1.8, 2.1],
      walls: ["#a6a9a1", "#b6b4a8", "#939c97"],
      roof: "#5a5e5c",
      accent: "#e4b34f",
      features: ["coolingTower", "transformers", "warningLights", "pipes"],
    },
    ["industrial"]
  ),

  building(
    "hotel",
    "leisure",
    "海风旅馆",
    "SEASIDE HOTEL",
    "每个房间都有一个小阳台。顶层招牌会在雨后闪两下。",
    ["旅馆", "阳台", "招牌"],
    [fact("楼层", "5–8F"), fact("占地", "17×15 m"), fact("岗位", "45–90 人")],
    {
      style: "hotel",
      floors: [5, 8],
      width: [1.55, 1.9],
      depth: [1.35, 1.65],
      walls: ["#d7c3a4", "#e0b294", "#cbbca9"],
      roof: "#65564b",
      accent: "#ef8e6c",
      features: ["balconies", "roofSign", "awning", "lobby", "pool"],
    },
    ["harbor", "downtown", "commercial"]
  ),
  building(
    "cinema",
    "leisure",
    "像素影院",
    "PIXEL CINEMA",
    "只有两个放映厅，但每到周五晚上，门口都会排起很长的队。",
    ["影院", "霓虹", "售票亭"],
    [fact("楼层", "2–3F"), fact("占地", "19×16 m"), fact("岗位", "16–35 人")],
    {
      style: "cinema",
      floors: [2, 3],
      width: [1.7, 2.0],
      depth: [1.4, 1.7],
      walls: ["#8d5d58", "#a36b61", "#7b5755"],
      roof: "#4f4749",
      accent: "#ffd166",
      features: ["marquee", "neonSign", "ticketBooth", "posterBoxes"],
    },
    ["creative", "commercial", "downtown"]
  ),
  building(
    "diner",
    "leisure",
    "海味餐厅",
    "SEAFOOD DINER",
    "蓝白条纹的雨棚，全天供应浓汤。靠窗的位置能看到归航的船。",
    ["餐厅", "雨棚", "海景"],
    [fact("楼层", "2–3F"), fact("占地", "14×13 m"), fact("岗位", "12–26 人")],
    {
      style: "diner",
      floors: [2, 3],
      width: [1.25, 1.55],
      depth: [1.15, 1.4],
      walls: ["#7faeb0", "#8eb8b2", "#d2c3a4"],
      roof: "#59615c",
      accent: "#ee8d6f",
      features: ["awning", "roofSign", "seats", "seafoodSign"],
    },
    ["harbor", "creative", "commercial"]
  ),
  building(
    "arcade",
    "leisure",
    "游戏厅",
    "PIXEL ARCADE",
    "卷帘门拉起后，整条街都能听见电子音。奖券柜台永远亮着灯。",
    ["游戏厅", "霓虹", "街机"],
    [fact("楼层", "2–3F"), fact("占地", "15×13 m"), fact("岗位", "8–18 人")],
    {
      style: "arcade",
      floors: [2, 3],
      width: [1.35, 1.65],
      depth: [1.2, 1.45],
      walls: ["#5c596b", "#6e5a6c", "#4f5565"],
      roof: "#3f414b",
      accent: "#71d6c9",
      features: ["neonSign", "billboard", "awning", "arcadeBoxes"],
    },
    ["creative", "commercial"]
  ),

  building(
    "clocktower",
    "landmark",
    "老城钟楼",
    "OLD CLOCK TOWER",
    "比城市本身还年长。整点报时仍然准确，只是没有人知道是谁在维护。",
    ["钟楼", "地标", "报时"],
    [fact("楼层", "8–12F"), fact("高度", "38–52 m"), fact("岗位", "2–6 人")],
    {
      style: "clocktower",
      floors: [8, 12],
      width: [0.85, 1.1],
      depth: [0.85, 1.1],
      walls: ["#c8bca5", "#d7c9b1", "#b7ab95"],
      roof: "#59625d",
      accent: "#d8b25d",
      features: ["clock", "spire", "belfry", "steps"],
    },
    ["oldtown", "civic"]
  ),
  building(
    "observation",
    "landmark",
    "观景塔",
    "OBSERVATION TOWER",
    "顶层观景台像一只停在空中的飞碟。天气好时能看到海平线。",
    ["观景台", "高塔", "飞碟顶"],
    [fact("楼层", "10–15F"), fact("高度", "52–76 m"), fact("岗位", "20–40 人")],
    {
      style: "observation",
      floors: [10, 15],
      width: [1.2, 1.5],
      depth: [1.2, 1.5],
      walls: ["#b9c8c6", "#d4c9b2", "#a9bdc4"],
      roof: "#4f5a60",
      accent: "#ffd166",
      features: ["saucer", "antenna", "glassLift", "lightRing"],
    },
    ["downtown", "harbor"]
  ),
  building(
    "lighthouse",
    "landmark",
    "灯塔",
    "HARBOR LIGHTHOUSE",
    "红白相间的塔身每到入夜就会亮起。它看过太多次离港和归来。",
    ["灯塔", "红白条纹", "港口"],
    [fact("楼层", "4–6F"), fact("高度", "24–34 m"), fact("岗位", "2–4 人")],
    {
      style: "lighthouse",
      floors: [4, 6],
      width: [0.9, 1.15],
      depth: [0.9, 1.15],
      walls: ["#e7e0d1", "#d76a5a", "#f0e8d8"],
      roof: "#4f5b62",
      accent: "#ffd166",
      features: ["stripes", "lanternRoom", "gallery", "rocks"],
    },
    ["harbor"]
  ),
  building(
    "skygarden",
    "landmark",
    "空中花园",
    "SKY GARDEN",
    "层层退台都种着植物，风把树影投在玻璃上，像一座垂直的公园。",
    ["垂直花园", "露台", "绿色建筑"],
    [fact("楼层", "8–12F"), fact("高度", "40–58 m"), fact("岗位", "90–160 人")],
    {
      style: "skygarden",
      floors: [8, 12],
      width: [1.5, 1.85],
      depth: [1.35, 1.65],
      walls: ["#c4d1c2", "#d7cfb7", "#b8c9c1"],
      roof: "#56675a",
      accent: "#8bc56b",
      features: ["terraces", "skyGarden", "trees", "glassCore"],
    },
    ["downtown", "creative"]
  ),
];

const skyscraper = (id, name, en, description, tags, facts, model) => ({
  id: `s-${id}`,
  group: "skyscrapers",
  family: "skyscraper",
  name,
  en,
  description,
  tags,
  facts,
  districts: ["downtown", "commercial"],
  model: {
    kind: "skyscraper",
    plinthScale: 1.32,
    glass: "#8fb8c4",
    mullion: "#d9ddd6",
    roof: "#46545c",
    accent: "#79d6c8",
    rise: [13.2, 14.4],
    floors: [60, 70],
    tall: [250, 280],
    features: [],
    ...model,
  },
});

// Real tower typologies. `rise` is the height of the shaft in city units,
// `floors` is the real floor count shown in the info panel, and `tall` is
// the real height in metres used for the same panel.
const skyscraperAssets = [
  skyscraper(
    "trade",
    "世贸双塔",
    "WORLD TRADE TWINS",
    "两座方塔笔直地立在同一个抬升广场上，密排的铝包钢立柱把窄窗切成细长的竖条纹，全高没有一次退台。北塔屋顶只留一根细长天线。",
    ["双塔", "玻璃幕墙", "铝鳍", "广场"],
    [fact("高度", "417 m"), fact("楼层", "110F"), fact("底座", "双塔广场")],
    {
      style: "wtc",
      floors: [104, 110],
      tall: [415, 417],
      rise: [13.4, 14.2],
      width: [4.1, 4.35],
      depth: [3.2, 3.4],
      walls: ["#b9bdc1", "#c8ccce"],
      glass: "#39434a",
      mullion: "#c3c9cd",
      roof: "#49545a",
      accent: "#ffd166",
      features: ["twinTowers", "verticalFins", "chamferedCorners", "plaza", "antenna", "lobby"],
      plinthScale: 1.06,
    }
  ),
  skyscraper(
    "twincrest",
    "云桥双塔",
    "TWIN CREST",
    "一高一低两座玻璃塔在云下相望，六十层处的空中连廊从不关闭，成了城市里最长的走廊。",
    ["双塔", "空中连廊", "玻璃幕墙"],
    [fact("高度", "320 m"), fact("楼层", "82F"), fact("底座", "共享裙楼")],
    {
      style: "twinbridge",
      floors: [78, 84],
      tall: [308, 322],
      plan: [34, 30],
      rise: [11.8, 12.8],
      width: [3.6, 3.9],
      depth: [2.9, 3.1],
      walls: ["#c2cdcd", "#cbc1a9"],
      glass: "#8db4c1",
      mullion: "#e4e7df",
      roof: "#4e5b61",
      accent: "#e8b267",
      features: ["twinTowers", "skybridge", "glassFacade", "plaza", "crown"],
      plinthScale: 1.28,
    }
  ),
  skyscraper(
    "cloudspire",
    "云端尖塔",
    "CLOUDSPIRE",
    "塔身两次收分，浅色石柱把玻璃幕墙夹在中间，冠部是一圈发光的玻璃灯亭和一根细长的尖顶。",
    ["收分", "灯亭", "尖顶"],
    [fact("高度", "366 m"), fact("楼层", "92F"), fact("底座", "阶梯广场")],
    {
      style: "pinnacle",
      floors: [88, 94],
      tall: [352, 372],
      plan: [50, 46],
      rise: [14.6, 15.6],
      width: [2.95, 3.15],
      depth: [2.8, 3.0],
      walls: ["#bcc9cb", "#cdd0c6"],
      glass: "#8db8c7",
      mullion: "#e6e8e1",
      roof: "#3f4d57",
      accent: "#79d6c8",
      features: ["glassFacade", "setbacks", "spire", "crown", "cornerPiers"],
      plinthScale: 1.36,
    }
  ),
  skyscraper(
    "obsidian",
    "黑曜石大厦",
    "OBSIDIAN TOWER",
    "深色玻璃贴着四道白色斜撑，整座塔像被一只看不见的手拧紧。日落时折面会短暂反射整片海湾。",
    ["深色玻璃", "斜撑", "巨构框架"],
    [fact("高度", "310 m"), fact("楼层", "82F"), fact("底座", "双层退台")],
    {
      style: "facet",
      floors: [74, 82],
      tall: [296, 312],
      plan: [52, 48],
      rise: [13.6, 14.6],
      width: [2.95, 3.15],
      depth: [2.85, 3.05],
      walls: ["#414b55", "#4c5159"],
      glass: "#36414b",
      mullion: "#cfc7b6",
      roof: "#232b32",
      accent: "#f0b85d",
      features: ["darkGlass", "megaframe", "diagonalBracing", "crown"],
      plinthScale: 1.34,
    }
  ),
  skyscraper(
    "terrace",
    "空中梯田",
    "SKY TERRACE",
    "玻璃核心筒外面挂着一圈圈种树的露台，从远处看像一座被搬到云上的绿色山谷。",
    ["垂直花园", "退台", "绿色建筑"],
    [fact("高度", "285 m"), fact("楼层", "70F"), fact("底座", "花园广场")],
    {
      style: "terrace",
      floors: [64, 72],
      tall: [272, 288],
      plan: [54, 48],
      rise: [12.8, 13.8],
      width: [3.0, 3.2],
      depth: [2.85, 3.05],
      walls: ["#b9cbb5", "#cbd2bc"],
      glass: "#8fb9b2",
      mullion: "#dfe3d5",
      roof: "#4b6352",
      accent: "#8bc56b",
      features: ["skyGardens", "terraces", "glassCore", "greenRoof"],
      plinthScale: 1.46,
    }
  ),
  skyscraper(
    "helix",
    "螺旋塔",
    "HELIX TOWER",
    "楼板一层层错开角度往上叠，浅色边梁绕着深色核心转了一整圈，正午会在广场投下锯齿状的影子。",
    ["螺旋", "扭转", "办公"],
    [fact("高度", "318 m"), fact("楼层", "84F"), fact("底座", "圆形广场")],
    {
      style: "twist",
      floors: [76, 84],
      tall: [306, 324],
      plan: [48, 48],
      rise: [13.6, 14.6],
      width: [2.9, 3.1],
      depth: [2.8, 3.0],
      walls: ["#bcae99", "#c9bba5"],
      glass: "#8faeb8",
      mullion: "#e8e4d7",
      roof: "#4b565d",
      accent: "#ef816c",
      features: ["twistedFloors", "finBands", "crown", "spire"],
      plinthScale: 1.38,
    }
  ),
  skyscraper(
    "apex",
    "像素之巅",
    "PIXEL APEX",
    "八边形的塔身分四段收窄，最高处悬挑出一圈观景环廊，再往上是通透的灯亭和一根桅杆。",
    ["观景台", "灯亭", "地标"],
    [fact("高度", "468 m"), fact("楼层", "108F"), fact("底座", "观景广场")],
    {
      style: "lantern",
      floors: [100, 108],
      tall: [452, 468],
      plan: [56, 56],
      rise: [15.8, 16.8],
      width: [2.95, 3.2],
      depth: [2.95, 3.2],
      walls: ["#c3ced0", "#d2cbb9"],
      glass: "#9cc3ce",
      mullion: "#e9ece5",
      roof: "#46545c",
      accent: "#ffd166",
      features: ["observationRing", "lantern", "spire", "taperedShaft", "landmark"],
      plinthScale: 1.52,
    }
  ),
  skyscraper(
    "empire",
    "帝国大厦",
    "EMPIRE STATE",
    "浅色石灰岩一层层向天空收窄，最后收成一圈灯窗和一根系泊桅杆。它的轮廓几乎定义了二十世纪的天际线。",
    ["装饰艺术", "退台", "桅杆", "石灰岩"],
    [fact("高度", "443 m"), fact("楼层", "102F"), fact("竣工", "1931")],
    {
      style: "deco",
      floors: [96, 102],
      tall: [435, 443],
      rise: [14.2, 15.0],
      width: [3.0, 3.2],
      depth: [2.9, 3.1],
      walls: ["#c9bfa6", "#d8cfb8"],
      glass: "#3f4447",
      mullion: "#b9bcb8",
      roof: "#4b4a45",
      accent: "#e0b04f",
      features: ["setbacks", "artDeco", "mooringMast", "limestone", "lobby"],
      plinthScale: 1.44,
    }
  ),
  skyscraper(
    "chrysler",
    "克莱斯勒大厦",
    "CHRYSLER BUILDING",
    "塔顶叠着七层不锈钢冠冕，每层都嵌三角天窗，一层层向天空收窄，最后只留下一根针尖般的尖顶。",
    ["装饰艺术", "不锈钢冠", "尖顶"],
    [fact("高度", "319 m"), fact("楼层", "77F"), fact("竣工", "1930")],
    {
      style: "chrysler",
      floors: [72, 77],
      tall: [312, 319],
      rise: [12.6, 13.4],
      width: [2.75, 2.95],
      depth: [2.7, 2.9],
      walls: ["#ddd9ce", "#c9c5b8"],
      glass: "#3c4145",
      mullion: "#c9ccd1",
      roof: "#4a4f52",
      accent: "#e6d8b4",
      features: ["artDeco", "terracedCrown", "needle", "steelCrown"],
      plinthScale: 1.4,
    }
  ),
  skyscraper(
    "burj",
    "哈利法塔",
    "BURJ KHALIFA",
    "二十多级退台沿着三翼平面盘旋而上，每一级都比下一级更窄，最后收进一根细长的尖顶。",
    ["超高层", "退台", "尖顶", "玻璃幕墙"],
    [fact("高度", "828 m"), fact("楼层", "163F"), fact("竣工", "2010")],
    {
      style: "tiered",
      floors: [150, 163],
      tall: [808, 828],
      rise: [18.2, 19.2],
      width: [3.05, 3.25],
      depth: [3.0, 3.2],
      walls: ["#a8b8c6", "#7e93a3"],
      glass: "#9fbcc8",
      mullion: "#c7ced3",
      roof: "#5b6a70",
      accent: "#cfe8e4",
      features: ["spiralSetbacks", "taperedShaft", "spire", "glassFacade"],
      plinthScale: 1.34,
    }
  ),
  skyscraper(
    "taipei",
    "台北 101",
    "TAIPEI 101",
    "八段向外张开的塔身像叠起来的竹节，每段顶端都有一圈斗拱和灯带，屋顶立着一根带环的尖塔。",
    ["竹节", "斗拱", "绿玻璃", "尖塔"],
    [fact("高度", "508 m"), fact("楼层", "101F"), fact("竣工", "2004")],
    {
      style: "pagoda",
      floors: [94, 101],
      tall: [498, 508],
      rise: [16.0, 17.0],
      width: [3.0, 3.2],
      depth: [3.0, 3.2],
      walls: ["#c2c8ca", "#b7bdb6"],
      glass: "#3f6b62",
      mullion: "#c2c8ca",
      roof: "#40564f",
      accent: "#4fa07a",
      features: ["stackedSegments", "flaredCaps", "pagoda", "spire", "lantern"],
      plinthScale: 1.42,
    }
  ),
  skyscraper(
    "petronas",
    "国油双塔",
    "PETRONAS TWINS",
    "两座圆塔在四十二层被一座双层天桥连在一起，塔身一圈圈收缩，塔顶各立一根不锈钢尖顶。",
    ["双塔", "天桥", "尖顶", "不锈钢"],
    [fact("高度", "452 m"), fact("楼层", "88F"), fact("竣工", "1998")],
    {
      style: "petronas",
      floors: [84, 88],
      tall: [442, 452],
      rise: [13.0, 13.8],
      width: [4.1, 4.3],
      depth: [3.1, 3.3],
      walls: ["#b9bfc4", "#8d959c"],
      glass: "#5a6a74",
      mullion: "#b9bfc4",
      roof: "#59636b",
      accent: "#cfe8e4",
      features: ["twinTowers", "doubleSkybridge", "setbacks", "spire", "rings"],
      plinthScale: 1.16,
    }
  ),
  skyscraper(
    "onewtc",
    "世贸中心一号楼",
    "ONE WORLD TRADE CENTER",
    "方塔从基座起缓缓扭转，四个切角在顶部合成一个旋转了四十五度的方形，最后接上一根很长的尖顶。",
    ["切角", "扭转", "玻璃幕墙", "尖顶"],
    [fact("高度", "541 m"), fact("楼层", "94F"), fact("竣工", "2014")],
    {
      style: "onewtc",
      floors: [88, 94],
      tall: [532, 541],
      rise: [16.0, 17.0],
      width: [3.0, 3.2],
      depth: [3.0, 3.2],
      walls: ["#b9c9cf", "#c7d2d4"],
      glass: "#9fb8c8",
      mullion: "#d6dde0",
      roof: "#4a5960",
      accent: "#cfe8e4",
      features: ["chamferedCube", "twistedSquare", "glassFacade", "spire", "podium"],
      plinthScale: 1.46,
    }
  ),
];

const construction = (id, name, en, description, tags, facts, model) => ({
  id: `c-${id}`,
  group: "construction",
  family: "construction",
  name,
  en,
  description,
  tags,
  facts,
  model: { kind: "construction", construction: id, ...model },
});

const constructionAssets = [
  construction(
    "crane",
    "塔式起重机",
    "TOWER CRANE",
    "高出所有屋顶的黄色塔吊，吊臂每天缓慢扫过同一个扇形。",
    ["塔吊", "钢结构", "高空"],
    [fact("高度", "42 m"), fact("臂长", "30 m"), fact("载重", "8 t")],
    { accent: "#e4b84f", steel: "#d7a93f", length: 2.8 }
  ),
  construction(
    "skeleton",
    "未完工楼体",
    "UNFINISHED TOWER",
    "裸露的混凝土柱和楼板停在一个恰好的高度，像一座可以走进去的立体草图。",
    ["混凝土", "框架", "未完工"],
    [fact("高度", "26 m"), fact("楼层", "8F"), fact("状态", "结构封顶")],
    { accent: "#cfc2a8", wall: "#b8b3a5", floors: 8, width: 1.5, depth: 1.3 }
  ),
  construction(
    "excavator",
    "履带式挖掘机",
    "EXCAVATOR",
    "黄色履带车停在土堆旁，铲斗里还挂着一点湿泥。",
    ["挖掘机", "土方", "黄色"],
    [fact("长度", "7 m"), fact("铲斗", "1.2 m³"), fact("状态", "待命")],
    { accent: "#d8a847", body: "#c99c3f", dark: "#454b46" }
  ),
  construction(
    "scaffold",
    "脚手架",
    "SCAFFOLDING",
    "银色钢管围着正在翻新的立面，绿色安全网在风里轻轻鼓起。",
    ["脚手架", "钢管", "安全网"],
    [fact("高度", "18 m"), fact("层数", "6"), fact("材质", "镀锌钢")],
    { accent: "#94a58e", steel: "#aab4b1", net: "#617e67" }
  ),
  construction(
    "fence",
    "工地围挡",
    "SITE HOARDING",
    "一排橙色围挡，贴着褪色的项目效果图和“施工重地”的告示。",
    ["围挡", "橙色", "告示"],
    [fact("长度", "8 m"), fact("高度", "2.4 m"), fact("材质", "彩钢板")],
    { accent: "#d7844d", panel: "#d9c5a3" }
  ),
  construction(
    "materials",
    "建材堆场",
    "MATERIAL YARD",
    "沙堆、碎石、钢管和木托盘，在泥地上整齐又不整齐地堆放着。",
    ["沙堆", "钢管", "托盘"],
    [fact("面积", "10×8 m"), fact("材料", "砂石与钢材"), fact("状态", "露天")],
    { accent: "#d4b07a", sand: "#c9b083", pipe: "#9ca3a0" }
  ),
  construction(
    "office",
    "工地办公室",
    "SITE OFFICE",
    "两只集装箱拼成的临时办公室，窗边贴着排班表和一张手绘进度图。",
    ["集装箱", "临时建筑", "进度表"],
    [fact("面积", "12×3 m"), fact("房间", "2"), fact("状态", "使用中")],
    { accent: "#6d968e", wall: "#7fa69c", trim: "#e6d8bb" }
  ),
];

const park = (id, name, en, description, tags, facts, model) => ({
  id: `p-${id}`,
  group: "parks",
  family: "park",
  name,
  en,
  description,
  tags,
  facts,
  model: { kind: "park", park: id, ...model },
});

const parkAssets = [
  park(
    "pocket",
    "街角花园",
    "POCKET GARDEN",
    "被两栋楼夹住的一小块绿地，有一张长椅、一棵树和几丛花。",
    ["小型", "长椅", "花丛"],
    [fact("面积", "8×8 m"), fact("设施", "长椅与花坛"), fact("适合", "街角")],
    {
      accent: "#9fd06d",
      ground: "#7fa35b",
      features: ["bench", "flowers", "tree", "hedge"],
    }
  ),
  park(
    "fountain",
    "喷泉公园",
    "FOUNTAIN PARK",
    "十字步道中央是一座小喷泉。夏天孩子们会围着水池奔跑。",
    ["喷泉", "十字步道", "广场"],
    [fact("面积", "18×18 m"), fact("设施", "喷泉与长椅"), fact("适合", "市中心")],
    {
      accent: "#70c7dc",
      ground: "#7fa35b",
      features: ["fountain", "paths", "benches", "trees", "flowers"],
    }
  ),
  park(
    "pond",
    "池塘公园",
    "POND PARK",
    "浅浅的池塘倒映着树和路灯，木桥跨过最窄的一段水面。",
    ["池塘", "木桥", "芦苇"],
    [fact("面积", "18×18 m"), fact("设施", "池塘与木桥"), fact("适合", "住宅区")],
    {
      accent: "#79b8b0",
      ground: "#7d9e5c",
      features: ["pond", "bridge", "reeds", "benches", "trees"],
    }
  ),
  park(
    "playground",
    "儿童游乐场",
    "PLAYGROUND",
    "沙坑、滑梯和秋千占据了公园最好的位置，围栏上挂满了彩色小旗。",
    ["游乐", "沙坑", "秋千"],
    [fact("面积", "15×15 m"), fact("设施", "滑梯与秋千"), fact("适合", "家庭")],
    {
      accent: "#ef816c",
      ground: "#d9bf8e",
      features: ["sandbox", "slide", "swing", "flags", "bench"],
    }
  ),
  park(
    "sports",
    "篮球公园",
    "SPORTS COURT",
    "一块蓝色球场、两个篮架和一圈看台，夜里也会亮着两盏灯。",
    ["运动", "球场", "夜灯"],
    [fact("面积", "18×16 m"), fact("设施", "球场与篮架"), fact("适合", "年轻人")],
    {
      accent: "#ef9b62",
      ground: "#7f9a5e",
      features: ["court", "hoops", "bleachers", "lights", "bench"],
    }
  ),
  park(
    "botanical",
    "植物园",
    "BOTANICAL GARDEN",
    "玻璃温室里是另一套气候。标牌上写着一些很难念的拉丁名字。",
    ["温室", "花坛", "植物"],
    [fact("面积", "18×18 m"), fact("设施", "温室与花坛"), fact("适合", "漫游")],
    {
      accent: "#8bc56b",
      ground: "#6f9657",
      features: ["greenhouse", "flowerBeds", "palms", "paths", "bench"],
    }
  ),
  park(
    "cherry",
    "樱花庭院",
    "CHERRY COURT",
    "几棵樱花树围着一方石铺小院。春天时，长椅上会落满花瓣。",
    ["樱花", "石院", "灯笼"],
    [fact("面积", "14×14 m"), fact("设施", "石院与灯笼"), fact("适合", "安静散步")],
    {
      accent: "#e8a0b4",
      ground: "#829c61",
      features: ["cherryTrees", "stonePath", "lanterns", "bench"],
    }
  ),
];

const attraction = (id, name, en, description, tags, facts, model) => ({
  id: `a-${id}`,
  group: "attractions",
  family: "attraction",
  name,
  en,
  description,
  tags,
  facts,
  model: { kind: "attraction", attraction: id, ...model },
});

const attractionAssets = [
  attraction(
    "ferris",
    "海风摩天轮",
    "FERRIS WHEEL",
    "十二个彩色座舱沿海风缓慢升高，最高点能看见整座岛的轮廓。",
    ["摩天轮", "彩灯", "地标"],
    [fact("高度", "28 m"), fact("座舱", "12 个"), fact("转速", "慢")],
    {
      accent: "#ef816c",
      hub: "#e8d8b8",
      colors: ["#e8735f", "#f2b65c", "#6fc3b2", "#e8d9b0"],
      radius: 2.1,
    }
  ),
  attraction(
    "carousel",
    "旋转木马",
    "CAROUSEL",
    "手风琴声一响，木马就会沿着同一个圆继续奔跑。",
    ["旋转木马", "音乐", "亲子"],
    [fact("直径", "8 m"), fact("座位", "12 个"), fact("转速", "慢")],
    {
      accent: "#f2b65c",
      canopy: "#e8735f",
      colors: ["#f2b65c", "#e8d9b0", "#6fc3b2", "#c78db5"],
      radius: 0.95,
    }
  ),
  attraction(
    "tent",
    "条纹帐篷",
    "STRIPED TENT",
    "红白条纹的临时帐篷，白天卖棉花糖，晚上变成小舞台。",
    ["帐篷", "集市", "条纹"],
    [fact("面积", "4×4 m"), fact("入口", "1 个"), fact("用途", "摊位")],
    {
      accent: "#e8735f",
      stripe: "#f4e6c9",
      radius: 0.7,
    }
  ),
  attraction(
    "gate",
    "乐园入口",
    "PARK GATE",
    "一排小灯泡组成的拱门，检票员总在中午之后才出现。",
    ["入口", "灯串", "拱门"],
    [fact("高度", "4 m"), fact("宽度", "6 m"), fact("灯光", "暖色")],
    {
      accent: "#e8735f",
      light: "#ffd166",
    }
  ),
  attraction(
    "gazebo",
    "公园凉亭",
    "PARK GAZEBO",
    "六角木亭悬在池塘边，是躲雨、下棋和发呆的好地方。",
    ["凉亭", "木构", "池塘"],
    [fact("高度", "3.2 m"), fact("座位", "6 个"), fact("材质", "木材")],
    {
      accent: "#a35d4d",
      deck: "#b9a27e",
    }
  ),
];

const vehicle = (id, name, en, description, tags, facts, model) => ({
  id: `v-${id}`,
  group: "vehicles",
  family: "vehicle",
  name,
  en,
  description,
  tags,
  facts,
  model: { kind: "vehicle", vehicle: id, ...model },
});

const vehicleAssets = [
  vehicle(
    "sedan",
    "小型轿车",
    "COMPACT SEDAN",
    "城市里最常见的代步车，颜色比车型更容易辨认。",
    ["轿车", "日常", "环路"],
    [fact("长度", "4.2 m"), fact("座位", "4"), fact("速度", "36 km/h")],
    { color: "#d9d2c5", accent: "#78c8bd", length: 0.55, width: 0.26, speed: 1.35 }
  ),
  vehicle(
    "taxi",
    "出租车",
    "CITY TAXI",
    "黄色车身和车顶灯箱，永远知道一条更快的小路。",
    ["出租车", "黄车", "顶灯"],
    [fact("长度", "4.5 m"), fact("座位", "4"), fact("速度", "42 km/h")],
    { color: "#e5b94f", accent: "#3d454c", length: 0.56, width: 0.26, speed: 1.45 }
  ),
  vehicle(
    "compact",
    "小型电车",
    "MINI EV",
    "安静、方正的小电车，充电口旁边总贴着一张褪色贴纸。",
    ["电车", "小型", "安静"],
    [fact("长度", "3.2 m"), fact("座位", "2"), fact("速度", "30 km/h")],
    { color: "#89b6ad", accent: "#f0e0bd", length: 0.45, width: 0.24, speed: 1.2 }
  ),
  vehicle(
    "van",
    "面包车",
    "DELIVERY VAN",
    "后排座椅拆掉以后，可以塞下半个花店的全部货物。",
    ["面包车", "配送", "厢体"],
    [fact("长度", "4.8 m"), fact("容量", "2.4 m³"), fact("速度", "34 km/h")],
    { color: "#e2ddd0", accent: "#6d9ca4", length: 0.62, width: 0.28, speed: 1.1 }
  ),
  vehicle(
    "bus",
    "城市巴士",
    "CITY BUS",
    "红白相间的城市巴士，报站声在清晨会显得格外响。",
    ["巴士", "公交", "长车"],
    [fact("长度", "10.5 m"), fact("座位", "28"), fact("速度", "28 km/h")],
    { color: "#d66f5f", accent: "#e9dfc5", length: 1.05, width: 0.32, speed: 0.82 }
  ),
  vehicle(
    "truck",
    "配送卡车",
    "CARGO TRUCK",
    "车斗里装着木箱、蔬果和建筑工地的钢材。",
    ["卡车", "货运", "箱体"],
    [fact("长度", "6.8 m"), fact("载重", "3.5 t"), fact("速度", "26 km/h")],
    { color: "#6c9a91", accent: "#d0b47a", length: 0.82, width: 0.3, speed: 0.92 }
  ),
  vehicle(
    "foodtruck",
    "街角餐车",
    "FOOD TRUCK",
    "白天停在市场旁边，晚上会挪到影院的霓虹灯下。",
    ["餐车", "雨棚", "小吃"],
    [fact("长度", "5.2 m"), fact("窗口", "1"), fact("速度", "20 km/h")],
    { color: "#e9c16d", accent: "#e2725d", length: 0.68, width: 0.29, speed: 0.72 }
  ),
  vehicle(
    "police",
    "巡逻车",
    "POLICE CRUISER",
    "车顶灯通常不亮。它更多时候只是在帮迷路的人指方向。",
    ["警车", "顶灯", "巡逻"],
    [fact("长度", "4.6 m"), fact("座位", "4"), fact("速度", "48 km/h")],
    { color: "#e3e1d8", accent: "#4d6170", length: 0.57, width: 0.27, speed: 1.5 }
  ),
];

const street = (id, name, en, description, tags, facts, model) => ({
  id: `s-${id}`,
  group: "street",
  family: "street",
  name,
  en,
  description,
  tags,
  facts,
  model: { kind: "street", prop: id, ...model },
});

const streetAssets = [
  street(
    "lamp",
    "街灯",
    "STREET LAMP",
    "傍晚亮起，把暖色的光撒在路缘和长椅上。",
    ["照明", "暖光", "街角"],
    [fact("高度", "4.2 m"), fact("灯头", "1"), fact("用途", "街道照明")],
    { color: "#3f444a", accent: "#ffd18a" }
  ),
  street(
    "bench",
    "长椅",
    "PARK BENCH",
    "木条被坐得发亮。靠背的朝向通常面向最好的风景。",
    ["长椅", "木制", "休息"],
    [fact("长度", "1.8 m"), fact("座位", "3"), fact("材质", "深色木材")],
    { color: "#6f5541", accent: "#3e3b35" }
  ),
  street(
    "busstop",
    "公交站",
    "BUS SHELTER",
    "一块透明的挡风板、一条长椅和一块永远被贴纸覆盖的时刻表。",
    ["公交", "站台", "玻璃"],
    [fact("长度", "2.4 m"), fact("座位", "2"), fact("照明", "有")],
    { color: "#7e8d8b", accent: "#e4b758" }
  ),
  street(
    "kiosk",
    "报刊亭",
    "NEWS KIOSK",
    "卖报纸、地图、口香糖和偶尔出现的明信片。",
    ["零售", "报刊", "小亭"],
    [fact("面积", "2×2 m"), fact("窗口", "2"), fact("营业", "7:00–21:00")],
    { color: "#9b7b56", accent: "#e4c77d" }
  ),
  street(
    "postbox",
    "邮筒",
    "POSTBOX",
    "红色铸铁邮筒，投递口已经被磨得发白。",
    ["邮政", "红色", "街角"],
    [fact("高度", "1.2 m"), fact("投递", "2 个"), fact("取件", "每天一次")],
    { color: "#c95f50", accent: "#efe3c8" }
  ),
  street(
    "bin",
    "垃圾桶",
    "TRASH BIN",
    "深绿色的街角垃圾桶，盖子上有一圈海鸥留下的脚印。",
    ["清洁", "街角", "绿色"],
    [fact("容量", "60 L"), fact("分类", "2 类"), fact("材质", "金属")],
    { color: "#55705d", accent: "#b9b29b" }
  ),
  street(
    "planter",
    "花箱",
    "FLOWER PLANTER",
    "混凝土花箱里种着耐风的草和小花，是街角最便宜的景观。",
    ["绿化", "花箱", "街道"],
    [fact("长度", "1.2 m"), fact("植物", "草花"), fact("材质", "混凝土")],
    { color: "#b8ad98", accent: "#e8a0b4" }
  ),
  street(
    "statue",
    "城市雕像",
    "CITY STATUE",
    "一位说不清是谁的奠基者，站在一个被鸽子占领的基座上。",
    ["雕像", "广场", "纪念碑"],
    [fact("高度", "3.6 m"), fact("材质", "青铜"), fact("基座", "石")],
    { color: "#6d8178", accent: "#b7ac95" }
  ),
  street(
    "billboard",
    "广告牌",
    "BILLBOARD",
    "三块面板轮播同一句广告词。夜里它比路灯亮得多。",
    ["广告", "霓虹", "立牌"],
    [fact("高度", "5.2 m"), fact("面板", "3"), fact("照明", "LED")],
    { color: "#3f4851", accent: "#ef816c" }
  ),
  street(
    "bikerack",
    "自行车架",
    "BIKE RACK",
    "U 形金属架，永远缺一个空位。",
    ["自行车", "金属", "停放"],
    [fact("长度", "1.6 m"), fact("车位", "4"), fact("材质", "镀锌钢")],
    { color: "#68777a", accent: "#d4b463" }
  ),
];

const nature = (id, name, en, description, tags, facts, model) => ({
  id: `n-${id}`,
  group: "nature",
  family: "nature",
  name,
  en,
  description,
  tags,
  facts,
  model: { kind: "nature", species: id, ...model },
});

const natureAssets = [
  nature(
    "broadleaf",
    "阔叶树",
    "BROADLEAF TREE",
    "树冠蓬松，夏天能在地上投出一大片移动的阴影。",
    ["乔木", "阔叶", "绿荫"],
    [fact("高度", "8–12 m"), fact("冠幅", "6–9 m"), fact("季相", "常绿")],
    { leaf: "#6b9b53", leaf2: "#7eab5c", trunk: "#6f4e37", scale: 1 }
  ),
  nature(
    "conifer",
    "针叶树",
    "CONIFER",
    "笔直、安静，像一枚竖在公园边缘的绿色图钉。",
    ["乔木", "针叶", "塔形"],
    [fact("高度", "10–16 m"), fact("冠幅", "3–5 m"), fact("季相", "常绿")],
    { leaf: "#4e7f57", leaf2: "#628d5f", trunk: "#5e4636", scale: 1.1 }
  ),
  nature(
    "palm",
    "海风棕榈",
    "SEA PALM",
    "叶片朝着海风的方向微微偏斜，是滨水区最显眼的植物。",
    ["棕榈", "滨水", "热带"],
    [fact("高度", "7–11 m"), fact("冠幅", "4–7 m"), fact("季相", "常绿")],
    { leaf: "#7ca653", leaf2: "#96b965", trunk: "#8d7451", scale: 1.05 }
  ),
  nature(
    "cherry",
    "樱花树",
    "CHERRY TREE",
    "花期只有短短几周，落花却足够铺满一整条石径。",
    ["樱花", "粉冠", "季节"],
    [fact("高度", "5–8 m"), fact("冠幅", "4–7 m"), fact("季相", "春季")],
    { leaf: "#e7a3b6", leaf2: "#f0bccb", trunk: "#6b5144", scale: 0.9 }
  ),
  nature(
    "shrub",
    "低矮灌木",
    "LOW SHRUB",
    "沿路缘或庭院边缘种植，柔软地挡住行人的脚步。",
    ["灌木", "绿篱", "低矮"],
    [fact("高度", "0.5–0.9 m"), fact("冠幅", "1–2 m"), fact("季相", "常绿")],
    { leaf: "#6e9452", leaf2: "#82a45d", trunk: "#6f4e37", scale: 0.6 }
  ),
  nature(
    "flowerbed",
    "花丛",
    "FLOWER BED",
    "一小片不讲章法的颜色，蜜蜂比园丁更常光顾。",
    ["花卉", "彩色", "小景"],
    [fact("面积", "1×1 m"), fact("花期", "春–秋"), fact("颜色", "混合")],
    { flowers: ["#ffd166", "#ef816c", "#f4e4c1", "#8fc8ad"] }
  ),
  nature(
    "gull",
    "海鸥",
    "SEA GULL",
    "沿着海岸线盘旋的白色小鸟，偶尔会停在路灯上观察城市。",
    ["鸟类", "海岸", "动态"],
    [fact("翼展", "0.9 m"), fact("栖息", "海岸"), fact("习性", "群居")],
    { color: "#f1e9d8", accent: "#d7b25f" }
  ),
];

const maritime = (id, name, en, description, tags, facts, model) => ({
  id: `m-${id}`,
  group: "maritime",
  family: "maritime",
  name,
  en,
  description,
  tags,
  facts,
  model: { kind: "maritime", vessel: id, ...model },
});

const maritimeAssets = [
  maritime(
    "sailboat",
    "小帆船",
    "SAILBOAT",
    "白帆在下午的光线里显得很薄，航线总是绕着岛的外缘。",
    ["帆船", "白色", "外海"],
    [fact("长度", "7 m"), fact("帆", "1 面"), fact("速度", "慢")],
    { color: "#e4ddcb", accent: "#d96f5d", length: 0.9, width: 0.4, speed: 0.018 }
  ),
  maritime(
    "fishing",
    "小渔船",
    "FISHING BOAT",
    "清晨出港，傍晚回来。船尾总挂着湿漉漉的绳索。",
    ["渔船", "港口", "清晨"],
    [fact("长度", "9 m"), fact("甲板", "开放"), fact("速度", "慢")],
    { color: "#5d9da1", accent: "#e3d4b8", length: 1.0, width: 0.44, speed: 0.014 }
  ),
  maritime(
    "ferry",
    "环岛渡轮",
    "ISLAND FERRY",
    "慢悠悠地绕过整座岛，船上的广播比引擎声更响。",
    ["渡轮", "环岛", "客运"],
    [fact("长度", "18 m"), fact("载客", "60 人"), fact("速度", "中")],
    { color: "#d8d0bd", accent: "#5b7f88", length: 1.4, width: 0.55, speed: 0.01 }
  ),
  maritime(
    "dinghy",
    "小划艇",
    "DINGHY",
    "停在岸边的一只小木船，偶尔被用来运送花盆和渔具。",
    ["小艇", "木制", "近岸"],
    [fact("长度", "3 m"), fact("桨", "2 支"), fact("速度", "很慢")],
    { color: "#b77b52", accent: "#e2c58d", length: 0.6, width: 0.3, speed: 0.024 }
  ),
  maritime(
    "buoy",
    "航道浮标",
    "CHANNEL BUOY",
    "红光一闪一闪，替夜航的船标出浅水区的位置。",
    ["浮标", "航道", "夜间"],
    [fact("高度", "1.8 m"), fact("灯光", "红色"), fact("用途", "助航")],
    { color: "#d46a58", accent: "#ffe2a1", scale: 1 }
  ),
  maritime(
    "pier",
    "木栈桥",
    "WOODEN PIER",
    "从滨水步道伸进海里的木平台，尽头挂着一盏灯。",
    ["栈桥", "木制", "码头"],
    [fact("长度", "12 m"), fact("宽度", "3 m"), fact("泊位", "2")],
    { color: "#8a6a4d", accent: "#d9c896", length: 2.2, width: 0.52 }
  ),
];

// ---- Catalogue editions --------------------------------------------------
//
// Every archive object is stored twice: the original build (… · 1) and a
// re-styled second edition (… · 2) authored in `src/catalog-variants/`.
// These paired copies are catalogue-only: BUILDINGS / SKYSCRAPERS / VEHICLES /
// … below keep exporting the untouched base assets, so the procedural city,
// its plan and its record labels stay exactly as before.

const asFirstEdition = (base) => ({
  ...base,
  name: `${base.name} · 1`,
  en: `${base.en} · 1`,
  variantOf: base.id,
  variantIndex: 1,
});

const asSecondEdition = (base, spec) => {
  if (!spec) throw new Error(`[catalog] missing second edition spec for ${base.id}`);
  return {
    ...base,
    id: `${base.id}-2`,
    name: `${base.name} · 2`,
    en: `${base.en} · 2`,
    description: spec.description,
    tags: spec.tags,
    facts: spec.facts,
    model: { ...base.model, ...spec.model },
    variantOf: base.id,
    variantIndex: 2,
  };
};

const pairEditions = (assets, variants) =>
  assets.flatMap((base) => [asFirstEdition(base), asSecondEdition(base, variants[base.id])]);

export const ASSETS = [
  ...pairEditions(buildingAssets, VARIANTS.buildings),
  ...pairEditions(skyscraperAssets, VARIANTS.skyscrapers),
  ...pairEditions(constructionAssets, VARIANTS.construction),
  ...pairEditions(parkAssets, VARIANTS.parks),
  ...pairEditions(attractionAssets, VARIANTS.attractions),
  ...pairEditions(vehicleAssets, VARIANTS.vehicles),
  ...pairEditions(streetAssets, VARIANTS.street),
  ...pairEditions(natureAssets, VARIANTS.nature),
  ...pairEditions(maritimeAssets, VARIANTS.maritime),
];

export const ASSET_BY_ID = new Map(ASSETS.map((asset) => [asset.id, asset]));
export const BUILDINGS = buildingAssets;
export const SKYSCRAPERS = skyscraperAssets;
export const CONSTRUCTION = constructionAssets;
export const PARKS = parkAssets;
export const ATTRACTIONS = attractionAssets;
export const VEHICLES = vehicleAssets;
export const STREET_PROPS = streetAssets;
export const NATURE = natureAssets;
export const MARITIME = maritimeAssets;

export const BUILDINGS_BY_ID = new Map(BUILDINGS.map((asset) => [asset.id, asset]));
export const SKYSCRAPERS_BY_ID = new Map(SKYSCRAPERS.map((asset) => [asset.id, asset]));
export const CONSTRUCTION_BY_ID = new Map(CONSTRUCTION.map((asset) => [asset.id, asset]));
export const VEHICLES_BY_ID = new Map(VEHICLES.map((asset) => [asset.id, asset]));
export const STREET_PROPS_BY_ID = new Map(STREET_PROPS.map((asset) => [asset.id, asset]));
export const NATURE_BY_ID = new Map(NATURE.map((asset) => [asset.id, asset]));
export const PARKS_BY_ID = new Map(PARKS.map((asset) => [asset.id, asset]));

export const BUILDINGS_BY_FAMILY = BUILDING_FAMILIES.reduce((grouped, family) => {
  grouped[family.id] = BUILDINGS.filter((asset) => asset.family === family.id);
  return grouped;
}, {});

export function getGroup(groupId) {
  return GROUPS.find((group) => group.id === groupId);
}

export function getGroupAssets(groupId) {
  return groupId === "all" ? ASSETS : ASSETS.filter((asset) => asset.group === groupId);
}

