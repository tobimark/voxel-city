// Style variants: parks, amusement rides and vehicles.
// Keyed by base asset id; `object-catalog.js` turns each entry into the "· 2" edition.
export const PARK_VARIANTS = {
  "p-pocket": {
    description: "干草铺成的街角，白色长椅靠着矮篱，午后的光把碎石照得很亮。",
    tags: ["干草地面", "白色长椅", "秋日"],
    facts: [
      { label: "配色", value: "干草 / 月白" },
      { label: "面积", value: "8×8 m" },
      { label: "设施", value: "长椅与花坛" },
    ],
    model: { accent: "#e8d9a8", ground: "#c8b276", features: ["bench", "flowers", "tree", "hedge"] },
  },
  "p-fountain": {
    description: "秋叶落满碎石地面，喷泉换成暖砂色石阶，水声比夏天更轻。",
    tags: ["秋叶地面", "暖砂喷泉", "黄昏"],
    facts: [
      { label: "配色", value: "秋叶 / 暖砂" },
      { label: "喷泉", value: "三阶" },
      { label: "面积", value: "18×18 m" },
    ],
    model: { accent: "#f0c98a", ground: "#b0703f", features: ["fountain", "paths", "benches", "trees", "flowers"] },
  },
  "p-pond": {
    description: "池边铺着浅灰石板，长椅刷成雾蓝，冬日水面把天空映得很淡。",
    tags: ["浅灰石板", "雾蓝长椅", "冬日"],
    facts: [
      { label: "配色", value: "浅石 / 雾蓝" },
      { label: "设施", value: "木桥与长椅" },
      { label: "面积", value: "18×18 m" },
    ],
    model: { accent: "#4f7fa0", ground: "#cfc6b2", features: ["pond", "bridge", "reeds", "benches", "trees"] },
  },
  "p-playground": {
    description: "松绿地面映着蜜黄围栏，滑梯在傍晚只剩一道浅浅的影子。",
    tags: ["松绿地面", "蜜黄围栏", "傍晚"],
    facts: [
      { label: "配色", value: "松绿 / 蜜黄" },
      { label: "设施", value: "滑梯与秋千" },
      { label: "面积", value: "15×15 m" },
    ],
    model: { accent: "#ffcf6b", ground: "#5f7d5c", features: ["sandbox", "slide", "swing", "flags", "bench"] },
  },
  "p-sports": {
    description: "浅灰混凝土铺满场边，红色篮筐压低在暮色里，灯还没亮。",
    tags: ["混凝土场边", "红色篮筐", "暮色"],
    facts: [
      { label: "配色", value: "混凝土 / 暗红" },
      { label: "球架", value: "两座" },
      { label: "面积", value: "18×16 m" },
    ],
    model: { accent: "#e94f3d", ground: "#b3a88f", features: ["court", "hoops", "bleachers", "lights", "bench"] },
  },
  "p-botanical": {
    description: "温室外铺着砂白碎石，陶土花盆沿着小径排开，空气里有一点土腥。",
    tags: ["砂白碎石", "陶土花盆", "温室外"],
    facts: [
      { label: "配色", value: "砂白 / 陶土" },
      { label: "花坛", value: "六座" },
      { label: "面积", value: "18×18 m" },
    ],
    model: { accent: "#c9724a", ground: "#d3ccb8", features: ["greenhouse", "flowerBeds", "palms", "paths", "bench"] },
  },
  "p-cherry": {
    description: "雪后石院泛着冷灰，长椅和灯笼换成酒红，枝头安静得像还没醒。",
    tags: ["雪后石院", "酒红灯笼", "冷灰"],
    facts: [
      { label: "配色", value: "雪灰 / 酒红" },
      { label: "石院", value: "五块石板" },
      { label: "面积", value: "14×14 m" },
    ],
    model: { accent: "#b0567f", ground: "#c9c2b0", features: ["cherryTrees", "stonePath", "lanterns", "bench"] },
  },
};

export const ATTRACTION_VARIANTS = {
  "a-ferris": {
    description: "座舱换成铜橙与奶油，轮盘抬高到能越过钟楼，黄昏时一格一格亮起。",
    tags: ["铜橙座舱", "落日灯", "更大轮盘"],
    facts: [
      { label: "配色", value: "铜橙 / 奶油" },
      { label: "高度", value: "33 m" },
      { label: "座舱", value: "12 个" },
    ],
    model: { accent: "#c9763f", hub: "#f0e3c8", colors: ["#c9763f", "#e8c07a", "#7f9e8e", "#f0e3c8"], radius: 2.5 },
  },
  "a-carousel": {
    description: "雾蓝顶篷压得很低，木马排得稀疏，转起来像一小段旧舞曲。",
    tags: ["雾蓝顶篷", "低矮转台", "旧舞曲"],
    facts: [
      { label: "配色", value: "雾蓝 / 象牙" },
      { label: "直径", value: "6 m" },
      { label: "座位", value: "8 个" },
    ],
    model: { accent: "#e8d9b8", canopy: "#4f6f96", colors: ["#5b7fa8", "#e8d9b8", "#d99aa8", "#f2ead6"], radius: 0.72 },
  },
  "a-tent": {
    description: "墨绿帆布配奶白条纹，帐篷收得比从前更宽，傍晚檐下挂起小灯。",
    tags: ["墨绿帆布", "奶白条纹", "檐下灯"],
    facts: [
      { label: "配色", value: "松绿 / 奶白" },
      { label: "面积", value: "6×6 m" },
      { label: "入口", value: "1 个" },
    ],
    model: { accent: "#4f7f6b", stripe: "#e6d2a8", radius: 0.86 },
  },
  "a-gate": {
    description: "拱门刷成雾蓝，灯泡换成冷白，夜里看起来像一条安静的光带。",
    tags: ["雾蓝拱门", "冷白灯泡", "夜光带"],
    facts: [
      { label: "配色", value: "雾蓝 / 冰白" },
      { label: "灯泡", value: "15 只" },
      { label: "高度", value: "4 m" },
    ],
    model: { accent: "#5f86a8", light: "#9fe0f0" },
  },
  "a-gazebo": {
    description: "青瓷色屋顶换下旧木色，浅木长凳留在原处，雨天听着比别处响。",
    tags: ["青瓷屋顶", "浅木长凳", "听雨"],
    facts: [
      { label: "配色", value: "青瓷 / 浅木" },
      { label: "座位", value: "6 个" },
      { label: "材质", value: "木与石" },
    ],
    model: { accent: "#5f8a7e", deck: "#d8c9a8" },
  },
};

export const VEHICLE_VARIANTS = {
  "v-sedan": {
    description: "墨绿车身配米白内饰，轴距比常见款更长，安静地滑过环路。",
    tags: ["墨绿车身", "长轴距", "米白内饰"],
    facts: [
      { label: "配色", value: "墨绿 / 米白" },
      { label: "长度", value: "5.0 m" },
      { label: "座位", value: "5" },
    ],
    model: { color: "#3f5f52", accent: "#e8dcc2", length: 0.66, width: 0.27, speed: 1.3 },
  },
  "v-taxi": {
    description: "海绿涂装的老式出租车，车身更长，顶灯换成温润的象牙色。",
    tags: ["海绿涂装", "长车身", "象牙顶灯"],
    facts: [
      { label: "配色", value: "海绿 / 象牙" },
      { label: "长度", value: "5.0 m" },
      { label: "座位", value: "4" },
    ],
    model: { color: "#5c8f86", accent: "#e9ddc0", length: 0.62, width: 0.27, speed: 1.5 },
  },
  "v-compact": {
    description: "梅紫小车收得更短，停在花店门口时，只占半个车位。",
    tags: ["梅紫车身", "短轴距", "花店门口"],
    facts: [
      { label: "配色", value: "梅紫 / 浅米" },
      { label: "长度", value: "2.7 m" },
      { label: "座位", value: "2" },
    ],
    model: { color: "#b45d7a", accent: "#f0dcc0", length: 0.38, width: 0.24, speed: 1.1 },
  },
  "v-van": {
    description: "石板蓝厢式车，车身加长，侧门贴着已经褪色的送货单。",
    tags: ["石板蓝", "加长厢体", "送货单"],
    facts: [
      { label: "配色", value: "石板蓝 / 米白" },
      { label: "长度", value: "5.6 m" },
      { label: "容量", value: "3.2 m³" },
    ],
    model: { color: "#475f7a", accent: "#ead9b0", length: 0.72, width: 0.3, speed: 1.05 },
  },
  "v-bus": {
    description: "钢蓝长途巴士，车身压得很低，靠窗的位置能看到更远的海。",
    tags: ["钢蓝涂装", "长途巴士", "低地板"],
    facts: [
      { label: "配色", value: "钢蓝 / 沙金" },
      { label: "长度", value: "12.4 m" },
      { label: "座位", value: "32" },
    ],
    model: { color: "#5b7f9a", accent: "#e8d9b4", length: 1.24, width: 0.33, speed: 0.95 },
  },
  "v-truck": {
    description: "赭石色重载卡车，车斗更长，木箱摞得比驾驶室还高。",
    tags: ["赭石涂装", "加长车斗", "重载"],
    facts: [
      { label: "配色", value: "赭石 / 沙色" },
      { label: "长度", value: "9.2 m" },
      { label: "载重", value: "5 t" },
    ],
    model: { color: "#8a5a4a", accent: "#e6d2a6", length: 1.12, width: 0.34, speed: 1.0 },
  },
  "v-foodtruck": {
    description: "松石色小餐车，车身收短，杏橙雨棚收起来也不显得空。",
    tags: ["松石色", "短车身", "杏橙雨棚"],
    facts: [
      { label: "配色", value: "松石 / 杏橙" },
      { label: "长度", value: "4.4 m" },
      { label: "窗口", value: "1" },
    ],
    model: { color: "#4f7f74", accent: "#e9a05c", length: 0.58, width: 0.28, speed: 0.7 },
  },
  "v-police": {
    description: "藏蓝巡逻车，轴距拉长，车顶灯白天也蒙着一层薄灰。",
    tags: ["藏蓝涂装", "长轴距", "薄灰"],
    facts: [
      { label: "配色", value: "藏蓝 / 月白" },
      { label: "长度", value: "5.5 m" },
      { label: "速度", value: "54 km/h" },
    ],
    model: { color: "#4a5a6e", accent: "#e8dfc8", length: 0.68, width: 0.27, speed: 1.7 },
  },
};
