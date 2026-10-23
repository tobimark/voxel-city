import * as THREE from "three";
import {
  BUILDINGS,
  BUILDINGS_BY_ID,
  DISTRICTS_BY_ID,
  MARITIME,
  NATURE_BY_ID,
  PARKS,
  SKYSCRAPERS,
  VEHICLES,
  transformDistrictLayout,
} from "./object-catalog.js";

const GRID_SIZE = 5;
const ROAD_LINES = Array.from({ length: GRID_SIZE + 1 }, (_, index) => -20 + index * 8);
const BLOCK_CENTERS = Array.from({ length: GRID_SIZE }, (_, index) => -16 + index * 8);
const CITY_EXTENT = 21;
const PLATEAU_SIZE = 46.4;
const BLOCK_TOP = 0.39;
const ROAD_TOP = 0.09;
const WATER_LEVEL = -1.12;
const FLOOR_HEIGHT = 0.42;
const TAU = Math.PI * 2;

const CITY_ZONE_LAYOUT = [
  ["oldtown", "residential", "green", "residential", "academic"],
  ["oldtown", "creative", "commercial", "civic", "academic"],
  ["residential", "commercial", "downtown", "commercial", "harbor"],
  ["green", "civic", "green", "creative", "amusement"],
  ["green", "green", "harbor", "industrial", "construction"],
];

const AMUSEMENT_DISTRICT = {
  id: "amusement",
  name: "游乐区",
  en: "AMUSEMENT DISTRICT",
  description: "摩天轮、旋转木马和彩色帐篷占据的城市角落。",
};

const DISTRICT_GROUND = {
  residential: "#779757",
  oldtown: "#b69376",
  commercial: "#b89b7c",
  downtown: "#b8b3a7",
  civic: "#d2c7b2",
  academic: "#89a56a",
  industrial: "#767d78",
  harbor: "#899796",
  creative: "#b58b77",
  green: "#789a58",
  amusement: "#c3a77e",
};

const DISTRICT_LOTS = {
  residential: [
    { x: -1.3, z: -1.28, w: 1.65, d: 1.55 },
    { x: 1.3, z: -1.28, w: 1.65, d: 1.55 },
    { x: -1.3, z: 1.28, w: 1.65, d: 1.55 },
    { x: 1.3, z: 1.28, w: 1.65, d: 1.55 },
  ],
  oldtown: [
    { x: -1.52, z: -1.2, w: 0.84, d: 1.5 },
    { x: -0.5, z: -1.18, w: 0.84, d: 1.5 },
    { x: 0.62, z: -1.18, w: 0.84, d: 1.5 },
    { x: 1.62, z: -1.16, w: 0.84, d: 1.5 },
    { x: -0.8, z: 1.4, w: 1.9, d: 1.4, role: "clocktower" },
  ],
  commercial: [
    { x: -1.32, z: -1.18, w: 1.95, d: 1.7 },
    { x: 1.3, z: -1.16, w: 1.85, d: 1.65 },
    { x: -1.12, z: 1.3, w: 2.05, d: 1.6, role: "market" },
  ],
  creative: [
    { x: -1.32, z: -1.25, w: 1.55, d: 1.5 },
    { x: 1.18, z: -1.2, w: 1.55, d: 1.5 },
    { x: -1.08, z: 1.28, w: 1.8, d: 1.5 },
  ],
  downtown: [
    { x: -0.04, z: -0.05, w: 4.3, d: 3.9, role: "skyscraper" },
  ],
  civic: [
    { x: -0.65, z: -0.58, w: 2.6, d: 2.2, role: "civic" },
    { x: 1.62, z: 1.42, w: 1.66, d: 1.45 },
  ],
  academic: [
    { x: -0.95, z: -0.72, w: 2.45, d: 1.95, role: "school" },
    { x: 1.4, z: 1.32, w: 1.75, d: 1.55 },
    { x: -1.5, z: 1.45, w: 1.5, d: 1.25 },
  ],
  industrial: [
    { x: -0.9, z: -0.76, w: 2.5, d: 2.05, role: "industrial" },
    { x: 1.58, z: 1.24, w: 1.82, d: 1.65 },
    { x: -1.6, z: 1.52, w: 1.5, d: 1.3 },
  ],
  harbor: [
    { x: -1.1, z: -0.9, w: 2.35, d: 1.9, role: "warehouse" },
    { x: 1.45, z: -0.8, w: 1.8, d: 1.65, role: "lighthouse" },
    { x: -0.8, z: 1.45, w: 1.95, d: 1.35 },
  ],
};

const SPECIAL_LOT_LAYOUTS = {
  "b-clocktower": ["oldtown"],
  "b-lighthouse": ["harbor"],
  "b-observation": ["downtown"],
  "b-skygarden": ["downtown"],
  "b-cityhall": ["civic"],
  "b-museum": ["civic"],
  "b-school": ["academic"],
  "b-market": ["commercial", "harbor"],
  "b-energy": ["industrial"],
  "b-warehouse": ["industrial", "harbor"],
};

const BUILDING_COLORS = [
  "#e6d5b8",
  "#d7aa8d",
  "#aebfb8",
  "#ddba72",
  "#8fa8b2",
  "#d67f69",
  "#b7a5c6",
  "#e3c27d",
  "#7f9da7",
  "#c9b59c",
  "#d8c4a3",
  "#9caf98",
];

const ROOF_COLORS = ["#645b52", "#755c50", "#4f5b60", "#7f6655", "#58605c"];
const TREE_COLORS = ["#5f8c4b", "#719d56", "#4f7f4a", "#84a95c", "#668e43"];
const ACCENT_COLORS = ["#ffb36b", "#72cec0", "#ef816c", "#ffd166"];
const NIGHT_SHORE = new THREE.Color("#24455a");

const NAME_BANK = {
  residential: {
    prefix: ["晨光", "海风", "杉木", "白露", "云雀", "银杏", "南巷", "灯塔", "青苔", "晚潮", "风铃", "芒草"],
    suffix: ["公寓", "小筑", "庭院", "住宅", "里", "之家", "居"],
  },
  commercial: {
    prefix: ["齿轮", "蓝鲸", "光年", "拾光", "山海", "第七街", "橘子", "银河", "月台", "松果", "面包", "回声"],
    suffix: ["商行", "书店", "咖啡", "事务所", "百货", "工作室", "旅馆", "食堂"],
  },
  downtown: {
    prefix: ["像素湾", "云顶", "远洋", "星港", "潮汐", "白塔", "天际", "港湾", "灯塔", "晴空"],
    suffix: ["中心", "大厦", "塔", "金融", "总部", "广场", "大楼"],
  },
  amusement: {
    prefix: ["星轮", "风车", "糖果", "白鲸", "橘子", "灯塔", "棉花", "旋转"],
    suffix: ["乐园", "游园", "嘉年华", "游乐场", "欢乐谷"],
  },
  civic: {
    prefix: ["像素湾", "港湾", "中央", "潮汐", "白塔"],
    suffix: ["市政厅", "市政中心", "市民广场", "行政中心"],
  },
  park: {
    prefix: ["云雀", "海风", "银杏", "潮汐", "青苔", "晚风", "芦苇"],
    suffix: ["公园", "绿地", "花园", "植物园"],
  },
  office: {
    prefix: ["远洋", "像素湾", "云顶", "白塔", "星港", "潮汐", "天际", "折光"],
    suffix: ["大厦", "中心", "写字楼", "塔", "事务所", "总部"],
  },
  industrial: {
    prefix: ["铁锚", "灰鲸", "齿轮", "旧港", "北岸", "焊光"],
    suffix: ["工坊", "仓库", "厂", "能源站", "码头"],
  },
  leisure: {
    prefix: ["海盐", "潮声", "橘子", "月台", "晚风", "灯塔"],
    suffix: ["旅馆", "影院", "餐厅", "游戏厅", "俱乐部"],
  },
  landmark: {
    prefix: ["潮汐", "晴空", "星港", "云顶", "白塔"],
    suffix: ["塔", "之眼", "纪念碑", "观景台"],
  },
};

const SPECIAL_NOTES = {
  amusement: [
    "摩天轮升到最高点时，整片海湾会在脚下翻个面。",
    "每逢整点，旋转木马的手风琴会准时响起来。",
    "夜市摊位收摊后，彩灯还会亮上很久。",
    "售票亭的阿姨记得每一个常客的生日。",
  ],
  civic: [
    "大厅的穹顶会把正午的阳光收成一枚圆形的光斑。",
    "每周三下午，市民可以在这里旁听规划会议。",
    "门口的旗杆在台风天也不肯低头。",
    "台阶上总是坐着写生的学生和喂鸽子的人。",
    "档案馆里放着这座城第一张手绘地图。",
  ],
  park: [
    "湖里的锦鲤比公园的年纪还大。",
    "春天时，整条小径会落满白色的花瓣。",
    "长椅上刻着一句已经看不清的告白。",
    "傍晚的喷泉会映出一小段彩虹。",
    "附近的居民把这里叫作城市的口袋。",
  ],
};

const FUN_COLORS = ["#e8735f", "#f2b65c", "#6fc3b2", "#e8d9b0", "#c78db5", "#7fa8d8"];
const CIVIC_COLORS = ["#e2dac4", "#cfd6cd", "#d9cdb6", "#c3cec8"];

const BUILDING_NOTES = [
  "清晨的第一班巴士，从这里出发。",
  "屋顶水箱在午后发出轻轻的嗡鸣。",
  "一层咖啡店每天七点准时开门。",
  "这里的窗灯总是亮到很晚。",
  "港口的风会穿过狭长的楼梯间。",
  "据说顶层能看到整片像素海。",
  "门口的银杏树比楼里任何人都年长。",
  "傍晚时分，总有人在台阶上等一场日落。",
  "旧招牌修了三次，老板还是没舍得换。",
  "屋顶上种着番茄，还有一把褪色的躺椅。",
  "每逢周日，天台会放一场露天电影。",
  "送货的自行车会在巷口按两声铃。",
];

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rand(rng, min, max) {
  return min + (max - min) * rng();
}

function choose(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

function makePyramidGeometry() {
  const vertices = new Float32Array([
    // four sides, non-indexed for crisp flat shading
    -0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, 0,
    0.5, 0, -0.5, 0.5, 0, 0.5, 0, 1, 0,
    0.5, 0, 0.5, -0.5, 0, 0.5, 0, 1, 0,
    -0.5, 0, 0.5, -0.5, 0, -0.5, 0, 1, 0,
    // base
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 0, -0.5,
    -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, -0.5,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function makeGableGeometry() {
  const vertices = new Float32Array([
    // front slope (+z)
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 1, 0,
    -0.5, 0, 0.5, 0.5, 1, 0, -0.5, 1, 0,
    // back slope (-z)
    0.5, 0, -0.5, -0.5, 0, -0.5, -0.5, 1, 0,
    0.5, 0, -0.5, -0.5, 1, 0, 0.5, 1, 0,
    // gable ends
    0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 1, 0,
    -0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 1, 0,
    // underside
    -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, -0.5,
    -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0, 0.5,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  gradient.addColorStop(0, "rgba(255, 215, 145, 0.85)");
  gradient.addColorStop(0.25, "rgba(255, 197, 112, 0.42)");
  gradient.addColorStop(0.65, "rgba(255, 178, 85, 0.1)");
  gradient.addColorStop(1, "rgba(255, 170, 80, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color("#1d6173") },
      uShallow: { value: new THREE.Color("#5ea8ae") },
      uFoam: { value: new THREE.Color("#d2eee8") },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uFoam;
      varying vec3 vWorld;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float ripple(vec2 p, vec2 density, float chance, float offset) {
        vec2 q = p * density;
        vec2 id = floor(q);
        vec2 f = fract(q);
        float h = hash21(id + offset);
        float wave = abs(f.y - (0.5 + sin(f.x * 6.283 + h * 6.283 + uTime * 0.28) * 0.055));
        float dash = step(0.16, f.x) * step(f.x, 0.68) * step(wave, 0.055);
        return step(chance, h) * dash;
      }

      void main() {
        vec2 p = vWorld.xz;
        vec3 col = mix(uDeep, uShallow, 0.17);

        float marks = max(
          ripple(p, vec2(0.62, 0.92), 0.935, 0.0),
          ripple(p, vec2(0.31, 0.5), 0.976, 7.0) * 0.8
        );
        col = mix(col, uFoam, marks * 0.14);

        col = floor(col * 32.0 + 0.5) / 32.0;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.DoubleSide,
  });
}

function makeLoopCurve(cx, cz, half = 3.54, radius = 0.62, y = ROAD_TOP + 0.012) {
  const points = [];
  const addCorner = (cornerX, cornerZ, start, end) => {
    const steps = 5;
    for (let i = 0; i <= steps; i += 1) {
      const angle = start + ((end - start) * i) / steps;
      points.push(
        new THREE.Vector3(
          cx + cornerX + Math.cos(angle) * radius,
          y,
          cz + cornerZ + Math.sin(angle) * radius
        )
      );
    }
  };

  addCorner(half - radius, -half + radius, -Math.PI / 2, 0);
  addCorner(half - radius, half - radius, 0, Math.PI / 2);
  addCorner(-half + radius, half - radius, Math.PI / 2, Math.PI);
  addCorner(-half + radius, -half + radius, Math.PI, (Math.PI * 3) / 2);

  const curve = new THREE.CatmullRomCurve3(points, true, "centripetal");
  curve.arcLengthDivisions = 160;
  return curve;
}

export function randomCitySeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

export function createCity({ seed = randomCitySeed() } = {}) {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  group.name = "PixelBayCity";

  const materials = new Set();
  const geometries = new Set();
  const materialCache = new Map();
  const buildings = [];
  const blocks = [];
  const cars = [];
  const boats = [];
  const birds = [];
  const fountains = [];
  const beacons = [];
  const rotors = [];
  const neonMaterials = [];
  const selectables = [];
  const windowSpecs = [];
  const usedNames = new Set();

  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const pyramidGeometry = makePyramidGeometry();
  const gableGeometry = makeGableGeometry();
  const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  const roundGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
  const coneGeometry = new THREE.ConeGeometry(0.5, 1, 6);
  const sphereGeometry = new THREE.SphereGeometry(0.5, 14, 8, 0, TAU, 0, Math.PI / 2);
  const foliageGeometry = new THREE.IcosahedronGeometry(0.5, 0);
  const planeGeometry = new THREE.PlaneGeometry(1, 1);
  const boxEdgesGeometry = new THREE.EdgesGeometry(boxGeometry);
  const pyramidEdgesGeometry = new THREE.EdgesGeometry(pyramidGeometry);
  const gableEdgesGeometry = new THREE.EdgesGeometry(gableGeometry);
  const glowTexture = makeGlowTexture();
  geometries.add(boxGeometry);
  geometries.add(pyramidGeometry);
  geometries.add(gableGeometry);
  geometries.add(cylinderGeometry);
  geometries.add(roundGeometry);
  geometries.add(coneGeometry);
  geometries.add(sphereGeometry);
  geometries.add(foliageGeometry);
  geometries.add(planeGeometry);
  geometries.add(boxEdgesGeometry);
  geometries.add(pyramidEdgesGeometry);
  geometries.add(gableEdgesGeometry);

  const standard = (color, options = {}) => {
    const key = `${color}|${JSON.stringify(options)}`;
    if (!materialCache.has(key)) {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9,
        metalness: 0,
        flatShading: true,
        ...options,
      });
      materials.add(material);
      materialCache.set(key, material);
    }
    return materialCache.get(key);
  };

  const basic = (color, options = {}) => {
    const key = `basic|${color}|${JSON.stringify(options)}`;
    if (!materialCache.has(key)) {
      const material = new THREE.MeshBasicMaterial({ color, ...options });
      materials.add(material);
      materialCache.set(key, material);
    }
    return materialCache.get(key);
  };

  const asphaltMat = standard("#3b424e", { roughness: 1 });
  const sidewalkMat = standard("#c5bb9f");
  const plazaMat = standard("#cbbf9f");
  const grassMat = standard("#7c9d59");
  const grassDarkMat = standard("#678748");
  const pathMat = standard("#b8a17a");
  const deckMat = standard("#8c8878");
  const soilMat = standard("#55483b");
  const rockMat = standard("#373633");
  const trimMat = standard("#938b77");
  const curbMat = standard("#a79e87");
  const laneMat = standard("#b9aa82");
  const crosswalkMat = standard("#c8bda2");
  const glassMat = standard("#45626e", { roughness: 0.3, metalness: 0.18 });
  const doorMat = standard("#4b4942");
  const trunkMat = standard("#6f4e37");
  const roofPineMat = standard("#a35d4d");
  const roofSlateMat = standard("#566066");
  const roofMossMat = standard("#7d7154");
  const stoneMat = standard("#d0c6ab");
  const whiteMat = standard("#ece2ce");
  const sandMat = standard("#dcc79a");
  const steelMat = standard("#cfd6d2", { roughness: 0.42, metalness: 0.34 });
  const steelDarkMat = standard("#7d8a8a", { roughness: 0.55, metalness: 0.2 });
  const steelLightMat = standard("#dfe2da", { roughness: 0.35, metalness: 0.22 });
  const domeMat = standard("#a9bdbb", { roughness: 0.5, metalness: 0.18 });
  const blackMat = standard("#262b2f", { roughness: 0.65 });
  const waterStillMat = standard("#74c1c1", { roughness: 0.25, metalness: 0.1 });
  const shoreMat = standard("#cfeae1", { roughness: 0.9, transparent: true, opacity: 0.9 });
  const birdMat = basic("#f4ead9", { toneMapped: false });
  const beaconMat = standard("#ff766f", {
    emissive: "#ff3f3f",
    emissiveIntensity: 0.2,
    roughness: 0.4,
  });
  const lampHeadMat = standard("#ffe1a1", {
    emissive: "#ffb954",
    emissiveIntensity: 0.1,
    roughness: 0.45,
  });
  const headlightMat = standard("#fff2c0", {
    emissive: "#ffe09a",
    emissiveIntensity: 0.25,
    roughness: 0.3,
  });
  const taillightMat = standard("#ff8a74", {
    emissive: "#ff4938",
    emissiveIntensity: 0.2,
    roughness: 0.4,
  });
  const boatLanternMat = standard("#ffd78e", {
    emissive: "#ffba58",
    emissiveIntensity: 0.1,
    roughness: 0.5,
  });
  const darkWindowMaterial = new THREE.MeshStandardMaterial({
    color: "#3a505c",
    emissive: "#0b1923",
    emissiveIntensity: 0.2,
    roughness: 0.32,
    metalness: 0.18,
  });
  const litWindowMaterial = new THREE.MeshStandardMaterial({
    color: "#81796a",
    emissive: "#ffb85a",
    emissiveIntensity: 0,
    roughness: 0.5,
    metalness: 0,
  });
  materials.add(darkWindowMaterial);
  materials.add(litWindowMaterial);

  const outlineMaterial = new THREE.LineBasicMaterial({
    color: "#1b2430",
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    toneMapped: false,
  });
  materials.add(outlineMaterial);

  const glowMaterial = new THREE.MeshBasicMaterial({
    map: glowTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  materials.add(glowMaterial);

  const wakeMaterial = new THREE.MeshBasicMaterial({
    color: "#ddf5ef",
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    toneMapped: false,
  });
  materials.add(wakeMaterial);

  let waterMaterial = null;
  let waterMesh = null;
  let simulationTime = 0;

  function addBox(parent, sx, sy, sz, material, x, y, z, options = {}) {
    const mesh = new THREE.Mesh(boxGeometry, material);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(x, y, z);
    mesh.castShadow = options.cast ?? true;
    mesh.receiveShadow = options.receive ?? true;
    parent.add(mesh);
    return mesh;
  }

  function addPyramid(parent, sx, sy, sz, material, x, y, z, rotation = 0) {
    const mesh = new THREE.Mesh(pyramidGeometry, material);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addCylinder(parent, radius, height, material, x, y, z) {
    const mesh = new THREE.Mesh(cylinderGeometry, material);
    mesh.scale.set(radius * 2, height, radius * 2);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addRoundCylinder(parent, radius, height, material, x, y, z) {
    const mesh = new THREE.Mesh(roundGeometry, material);
    mesh.scale.set(radius * 2, height, radius * 2);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addIcosa(parent, radius, material, x, y, z) {
    const mesh = new THREE.Mesh(foliageGeometry, material);
    mesh.scale.setScalar(radius * 2);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rng() * TAU, rng() * TAU, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addGable(parent, sx, sy, sz, material, x, y, z, rotation = 0) {
    const mesh = new THREE.Mesh(gableGeometry, material);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addGableOutline(parent, sx, sy, sz, x, y, z, rotation = 0, scale = 1.003) {
    const lines = new THREE.LineSegments(gableEdgesGeometry, outlineMaterial);
    lines.scale.set(sx * scale, sy * scale, sz * scale);
    lines.position.set(x, y, z);
    lines.rotation.y = rotation;
    lines.castShadow = false;
    lines.receiveShadow = false;
    lines.renderOrder = 2;
    parent.add(lines);
    return lines;
  }

  function addBoxOutline(parent, sx, sy, sz, x, y, z, scale = 1.003) {
    const lines = new THREE.LineSegments(boxEdgesGeometry, outlineMaterial);
    lines.scale.set(sx * scale, sy * scale, sz * scale);
    lines.position.set(x, y, z);
    lines.castShadow = false;
    lines.receiveShadow = false;
    lines.renderOrder = 2;
    parent.add(lines);
    return lines;
  }

  function addPyramidOutline(parent, sx, sy, sz, x, y, z, scale = 1.003) {
    const lines = new THREE.LineSegments(pyramidEdgesGeometry, outlineMaterial);
    lines.scale.set(sx * scale, sy * scale, sz * scale);
    lines.position.set(x, y, z);
    lines.castShadow = false;
    lines.receiveShadow = false;
    lines.renderOrder = 2;
    parent.add(lines);
    return lines;
  }

  function addGlowPlane(parent, x, y, z, scale = 1) {
    const mesh = new THREE.Mesh(planeGeometry, glowMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(scale);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 3;
    parent.add(mesh);
    return mesh;
  }

  function addTree(parent, x, z, scale = 1, baseY = 0, species = null) {
    const tree = new THREE.Group();
    tree.position.set(x, baseY, z);
    tree.rotation.y = rng() * TAU;
    const treeScale = scale * rand(rng, 0.82, 1.15);
    tree.scale.setScalar(treeScale);
    const speciesKey =
      species ?? choose(rng, ["broadleaf", "conifer", "palm", "cherry", "broadleaf"]);
    const natureDef = NATURE_BY_ID.get(`n-${speciesKey}`);
    const leafColorA = natureDef?.model.leaf ?? choose(rng, TREE_COLORS);
    const leafColorB = natureDef?.model.leaf2 ?? choose(rng, TREE_COLORS);
    const leafA = standard(leafColorA);
    const leafB = standard(leafColorB);
    const trunk = standard(natureDef?.model.trunk ?? "#6f4e37");

    if (speciesKey === "conifer") {
      addBox(tree, 0.08, 0.38, 0.08, trunk, 0, 0.19, 0);
      addPyramid(tree, 0.58, 0.42, 0.58, leafA, 0, 0.32, 0, Math.PI / 4);
      addPyramid(tree, 0.44, 0.46, 0.44, leafB, 0, 0.54, 0, Math.PI / 4);
      addPyramid(tree, 0.3, 0.44, 0.3, leafA, 0, 0.76, 0, Math.PI / 4);
      addPyramid(tree, 0.15, 0.34, 0.15, leafB, 0, 0.94, 0, Math.PI / 4);
    } else if (speciesKey === "palm") {
      const trunkMesh = addCylinder(tree, 0.05, 0.88, trunk, 0, 0.44, 0);
      trunkMesh.rotation.z = 0.08;
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * TAU;
        const leaf = addBox(
          tree,
          0.62,
          0.04,
          0.14,
          i % 2 === 0 ? leafA : leafB,
          Math.cos(angle) * 0.26,
          0.9,
          Math.sin(angle) * 0.26
        );
        leaf.rotation.y = -angle;
        leaf.rotation.z = 0.34;
      }
      addIcosa(tree, 0.1, leafB, 0, 0.87, 0);
      addIcosa(tree, 0.055, standard("#b48b52"), 0.07, 0.79, 0.03);
    } else if (speciesKey === "cherry") {
      addBox(tree, 0.09, 0.42, 0.09, trunk, 0, 0.21, 0);
      addIcosa(tree, 0.3, leafA, 0, 0.56, 0.02);
      addIcosa(tree, 0.24, leafB, 0.13, 0.7, 0.04);
      addIcosa(tree, 0.2, leafA, -0.12, 0.48, -0.06);
      addIcosa(tree, 0.17, leafB, 0.02, 0.8, -0.09);
    } else {
      addBox(tree, 0.09, 0.48, 0.09, trunk, 0, 0.24, 0);
      addIcosa(tree, 0.34, leafA, 0, 0.6, 0);
      addIcosa(tree, 0.25, leafB, 0.13, 0.76, 0.04);
      addIcosa(tree, 0.21, leafA, -0.12, 0.47, -0.08);
    }
    parent.add(tree);
    return tree;
  }

  function addBush(parent, x, z, scale = 1, baseY = 0) {
    const material = standard(choose(rng, TREE_COLORS));
    if (rng() < 0.58) {
      addIcosa(parent, 0.15 * scale, material, x, baseY + 0.12 * scale, z);
    } else {
      addBox(parent, 0.26 * scale, 0.19 * scale, 0.22 * scale, material, x, baseY + 0.095 * scale, z);
    }
  }

  function addFlowers(parent, x, z, baseY = 0) {
    const colors = ["#ffd166", "#ef816c", "#f4e4c1", "#8fc8ad"];
    for (let i = 0; i < 4; i += 1) {
      const material = basic(choose(rng, colors), { toneMapped: false });
      addBox(
        parent,
        0.035,
        0.035,
        0.035,
        material,
        x + rand(rng, -0.08, 0.08),
        baseY + 0.07,
        z + rand(rng, -0.08, 0.08),
        { cast: false, receive: false }
      );
    }
  }

  function addBench(parent, x, z, rotation = 0, baseY = 0) {
    const bench = new THREE.Group();
    bench.position.set(x, baseY, z);
    bench.rotation.y = rotation;
    addBox(bench, 0.58, 0.055, 0.2, doorMat, 0, 0.16, 0);
    addBox(bench, 0.58, 0.24, 0.045, doorMat, 0, 0.3, -0.085);
    addBox(bench, 0.04, 0.16, 0.16, blackMat, -0.22, 0.07, 0);
    addBox(bench, 0.04, 0.16, 0.16, blackMat, 0.22, 0.07, 0);
    parent.add(bench);
    return bench;
  }

  function addStreetLamp(x, z, baseY = 0.3, scale = 1) {
    const lamp = new THREE.Group();
    lamp.position.set(x, baseY, z);
    lamp.scale.setScalar(scale);
    addBox(lamp, 0.045, 0.7, 0.045, blackMat, 0, 0.35, 0);
    addBox(lamp, 0.18, 0.028, 0.028, blackMat, 0.075, 0.69, 0);
    addBox(lamp, 0.11, 0.09, 0.11, lampHeadMat, 0.16, 0.665, 0, {
      cast: false,
      receive: false,
    });
    addGlowPlane(lamp, 0.16, 0.012, 0, 1.15);
    group.add(lamp);
    return lamp;
  }

  function addParkFountain(parent, bx, bz, baseY = BLOCK_TOP) {
    const fountain = new THREE.Group();
    fountain.position.set(bx, baseY, bz);
    addBox(fountain, 1.28, 0.18, 1.28, stoneMat, 0, 0.09, 0);
    addBox(fountain, 1.08, 0.035, 1.08, waterStillMat, 0, 0.19, 0, { cast: false });
    addBox(fountain, 0.19, 0.38, 0.19, stoneMat, 0, 0.35, 0);
    addBox(fountain, 0.48, 0.07, 0.48, stoneMat, 0, 0.54, 0);
    addBox(fountain, 0.32, 0.025, 0.32, waterStillMat, 0, 0.585, 0, { cast: false });

    const jets = [];
    const jetMat = basic("#d5fbf5", { toneMapped: false });
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * TAU + rng() * 0.2;
      const drop = addBox(fountain, 0.038, 0.038, 0.038, jetMat, 0, 0.6, 0, {
        cast: false,
        receive: false,
      });
      jets.push({ mesh: drop, angle, phase: rng(), radius: rand(rng, 0.16, 0.34) });
    }

    parent.add(fountain);
    fountains.push({ group: fountain, jets });
  }

  function addSphere(parent, radius, material, x, y, z, scaleY = 1) {
    const mesh = new THREE.Mesh(sphereGeometry, material);
    mesh.scale.set(radius * 2, radius * 2 * scaleY, radius * 2);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addFerrisWheel(parent, x, z, baseY) {
    const root = new THREE.Group();
    root.position.set(x, baseY, z);
    root.scale.setScalar(1.3);
    parent.add(root);

    const radius = 1.22;
    const axleY = 1.64;
    const segments = 16;

    addBox(root, 1.9, 0.1, 0.72, deckMat, 0, 0.05, 0);
    for (const side of [-1, 1]) {
      const leg = addBox(root, 0.085, axleY + 0.3, 0.085, steelDarkMat, side * 0.4, (axleY + 0.3) / 2, 0);
      leg.rotation.z = side * 0.3;
      addBox(root, 0.13, 0.13, 0.5, steelDarkMat, side * 0.4, axleY, 0);
    }
    addBox(root, 1.02, 0.055, 0.055, steelDarkMat, 0, 0.74, 0);

    const wheel = new THREE.Group();
    wheel.position.set(0, axleY, 0);
    root.add(wheel);

    const cabins = [];
    const cabinColors = FUN_COLORS.slice();
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * TAU;
      const mid = angle + Math.PI / segments;
      const rimRadius = radius * Math.cos(Math.PI / segments);
      const chord = 2 * radius * Math.sin(Math.PI / segments) + 0.015;

      const rim = addBox(
        wheel,
        chord,
        0.05,
        0.055,
        steelMat,
        Math.cos(mid) * rimRadius,
        Math.sin(mid) * rimRadius,
        0
      );
      rim.rotation.z = mid + Math.PI / 2;

      const spoke = addBox(
        wheel,
        radius,
        0.025,
        0.025,
        steelMat,
        (Math.cos(angle) * radius) / 2,
        (Math.sin(angle) * radius) / 2,
        0
      );
      spoke.rotation.z = angle;

      if (i % 2 === 0) {
        addBox(
          wheel,
          0.055,
          0.055,
          0.055,
          lampHeadMat,
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0.02,
          { cast: false, receive: false }
        );
      }

      const cabin = new THREE.Group();
      cabin.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.11);
      const cabinMat = standard(cabinColors[i % cabinColors.length], { roughness: 0.6 });
      addBox(cabin, 0.05, 0.12, 0.05, steelDarkMat, 0, 0.08, 0);
      addBox(cabin, 0.23, 0.16, 0.2, cabinMat, 0, -0.02, 0);
      addBox(cabin, 0.15, 0.08, 0.02, glassMat, 0, -0.01, 0.105, { cast: false });
      addBox(cabin, 0.18, 0.025, 0.21, whiteMat, 0, -0.11, 0);
      wheel.add(cabin);
      cabins.push(cabin);
    }

    const hub = addCylinder(wheel, 0.14, 0.26, steelDarkMat, 0, 0, 0);
    hub.rotation.x = Math.PI / 2;
    addCylinder(wheel, 0.085, 0.34, standard(FUN_COLORS[0]), 0, 0, 0).rotation.x = Math.PI / 2;

    rotors.push({ group: wheel, axis: "z", speed: 0.13, cabins });
    return wheel;
  }

  function addCarousel(parent, x, z, baseY) {
    const root = new THREE.Group();
    root.position.set(x, baseY, z);
    root.scale.setScalar(0.92);
    parent.add(root);

    addCylinder(root, 0.84, 0.1, deckMat, 0, 0.05, 0);
    const spin = new THREE.Group();
    spin.position.y = 0.1;
    root.add(spin);

    addCylinder(spin, 0.72, 0.055, standard("#d8c08e"), 0, 0.028, 0);
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * TAU;
      const horse = new THREE.Group();
      horse.position.set(Math.cos(angle) * 0.52, 0.19, Math.sin(angle) * 0.52);
      horse.rotation.y = -angle;
      const horseMat = standard(FUN_COLORS[i % FUN_COLORS.length], { roughness: 0.6 });
      addBox(horse, 0.16, 0.11, 0.3, horseMat, 0, 0.1, 0);
      addBox(horse, 0.1, 0.13, 0.1, horseMat, 0, 0.23, 0.09);
      addBox(horse, 0.02, 0.34, 0.02, whiteMat, 0, 0.15, 0);
      spin.add(horse);
    }

    addCylinder(spin, 0.055, 0.95, whiteMat, 0, 0.48, 0);
    addPyramid(spin, 1.78, 0.42, 1.78, standard(FUN_COLORS[1]), 0, 0.9, 0, Math.PI / 4);
    addPyramid(spin, 1.32, 0.24, 1.32, standard("#f4e6c9"), 0, 1.29, 0, Math.PI / 4);
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TAU;
      addBox(
        spin,
        0.05,
        0.05,
        0.05,
        lampHeadMat,
        Math.cos(angle) * 0.8,
        0.88,
        Math.sin(angle) * 0.8,
        { cast: false, receive: false }
      );
    }

    rotors.push({ group: spin, axis: "y", speed: 0.4 });
    return spin;
  }

  function addTent(parent, x, z, baseY, scale = 1) {
    const tent = new THREE.Group();
    tent.position.set(x, baseY, z);
    tent.scale.setScalar(scale);
    parent.add(tent);
    addBox(tent, 0.92, 0.5, 0.92, standard("#f1e4c8"), 0, 0.25, 0);
    addBox(tent, 0.2, 0.44, 0.05, doorMat, 0, 0.22, 0.47);
    addPyramid(tent, 1.14, 0.52, 1.14, standard(choose(rng, FUN_COLORS)), 0, 0.5, 0, Math.PI / 4);
    addPyramid(tent, 0.2, 0.55, 1.16, standard("#f7edd7"), 0, 0.5, 0, Math.PI / 4);
    addBox(tent, 0.025, 0.25, 0.025, blackMat, 0, 1.02, 0);
    addBox(tent, 0.16, 0.08, 0.012, standard(choose(rng, FUN_COLORS)), 0.08, 1.08, 0, {
      cast: false,
      receive: false,
    });
    return tent;
  }

  function addPlayground(parent, x, z, baseY) {
    const play = new THREE.Group();
    play.position.set(x, baseY, z);
    parent.add(play);

    addBox(play, 1.2, 0.06, 1.0, sandMat, 0, 0.03, 0, { cast: false });
    addBox(play, 1.24, 0.1, 0.05, trimMat, 0, 0.06, -0.5, { cast: false });
    addBox(play, 1.24, 0.1, 0.05, trimMat, 0, 0.06, 0.5, { cast: false });
    addBox(play, 0.05, 0.1, 1.0, trimMat, -0.6, 0.06, 0, { cast: false });
    addBox(play, 0.05, 0.1, 1.0, trimMat, 0.6, 0.06, 0, { cast: false });

    const slideMat = standard("#e8735f", { roughness: 0.55 });
    addBox(play, 0.34, 0.5, 0.34, slideMat, -0.28, 0.31, -0.1);
    addPyramid(play, 0.44, 0.28, 0.44, standard("#f2b65c"), -0.28, 0.56, -0.1, Math.PI / 4);
    const chute = addBox(play, 0.62, 0.05, 0.2, standard("#6fc3b2"), 0.12, 0.23, -0.1);
    chute.rotation.z = -0.42;
    addBox(play, 0.035, 0.28, 0.035, steelDarkMat, 0.42, 0.2, -0.1);

    for (const side of [-1, 1]) {
      addBox(play, 0.045, 0.5, 0.045, steelDarkMat, 0.18 + side * 0.16, 0.25, 0.34);
    }
    addBox(play, 0.36, 0.04, 0.04, steelDarkMat, 0.18, 0.5, 0.34);
    for (const offset of [-0.09, 0.09]) {
      addBox(play, 0.012, 0.24, 0.012, blackMat, 0.18 + offset, 0.34, 0.34, {
        cast: false,
        receive: false,
      });
      addBox(play, 0.09, 0.02, 0.05, doorMat, 0.18 + offset, 0.22, 0.34, {
        cast: false,
        receive: false,
      });
    }
    return play;
  }

  function addPond(parent, x, z, baseY) {
    addBox(parent, 1.62, 0.05, 1.16, waterStillMat, x, baseY + 0.025, z, { cast: false });
    addBox(parent, 1.82, 0.1, 0.1, stoneMat, x, baseY + 0.05, z - 0.6, { cast: false });
    addBox(parent, 1.82, 0.1, 0.1, stoneMat, x, baseY + 0.05, z + 0.6, { cast: false });
    addBox(parent, 0.1, 0.1, 1.2, stoneMat, x - 0.88, baseY + 0.05, z, { cast: false });
    addBox(parent, 0.1, 0.1, 1.2, stoneMat, x + 0.88, baseY + 0.05, z, { cast: false });
    for (let i = 0; i < 3; i += 1) {
      addBox(
        parent,
        0.24,
        0.05,
        0.16,
        standard(choose(rng, TREE_COLORS)),
        x + rand(rng, -0.6, 0.6),
        baseY + 0.07,
        z + rand(rng, -0.35, 0.35),
        { cast: false }
      );
    }
  }

  function addGazebo(parent, x, z, baseY) {
    const gazebo = new THREE.Group();
    gazebo.position.set(x, baseY, z);
    parent.add(gazebo);
    addCylinder(gazebo, 0.54, 0.08, deckMat, 0, 0.04, 0);
    for (let i = 0; i < 4; i += 1) {
      const angle = (i / 4) * TAU + Math.PI / 4;
      addBox(gazebo, 0.05, 0.55, 0.05, whiteMat, Math.cos(angle) * 0.4, 0.35, Math.sin(angle) * 0.4);
    }
    addPyramid(gazebo, 1.28, 0.42, 1.28, roofPineMat, 0, 0.62, 0, Math.PI / 4);
    addBox(gazebo, 0.05, 0.18, 0.05, blackMat, 0, 1.1, 0);
    addBox(gazebo, 0.07, 0.07, 0.07, lampHeadMat, 0, 1.18, 0, { cast: false, receive: false });
    return gazebo;
  }

  function addAmusementBlock(blockGroup, blockX, blockZ, label) {
    const feature = new THREE.Group();
    blockGroup.add(feature);

    addBox(feature, 5.2, 0.03, 0.66, pathMat, 0, BLOCK_TOP + 0.012, 2.12, { cast: false });
    addBox(feature, 0.66, 0.03, 4.5, pathMat, 0, BLOCK_TOP + 0.011, 0, { cast: false });

    const arch = new THREE.Group();
    arch.position.set(0, BLOCK_TOP, 2.52);
    feature.add(arch);
    for (const side of [-1, 1]) {
      addBox(arch, 0.14, 1.02, 0.14, standard(FUN_COLORS[0]), side * 0.56, 0.51, 0);
    }
    addBox(arch, 1.4, 0.16, 0.18, standard("#f4e6c9"), 0, 1.04, 0);
    addBox(arch, 0.52, 0.24, 0.04, lampHeadMat, 0, 1.04, 0.11, { cast: false, receive: false });
    for (let i = 0; i < 5; i += 1) {
      addBox(arch, 0.05, 0.05, 0.05, lampHeadMat, -0.52 + i * 0.26, 1.2, 0.11, {
        cast: false,
        receive: false,
      });
    }

    addFerrisWheel(feature, 0, -0.82, BLOCK_TOP);
    addCarousel(feature, -1.48, 1.2, BLOCK_TOP);
    addTent(feature, 1.52, 1.12, BLOCK_TOP, 0.9);
    addTent(feature, 1.98, 0.0, BLOCK_TOP, 0.68);

    const fenceMat = standard("#e8dcc4");
    for (const z of [-2.56, 2.56]) {
      if (z > 0) {
        addBox(feature, 1.76, 0.05, 0.05, fenceMat, -1.68, BLOCK_TOP + 0.3, z, { cast: false });
        addBox(feature, 1.76, 0.05, 0.05, fenceMat, 1.68, BLOCK_TOP + 0.3, z, { cast: false });
        for (const side of [-1, 1]) {
          addBox(feature, 0.08, 0.56, 0.08, whiteMat, side * 0.8, BLOCK_TOP + 0.28, z, {
            cast: false,
          });
        }
      } else {
        addBox(feature, 5.2, 0.05, 0.05, fenceMat, 0, BLOCK_TOP + 0.3, z, { cast: false });
      }
      for (let i = 0; i < 9; i += 1) {
        const x = -2.4 + i * 0.6;
        if (z > 0 && Math.abs(x) < 0.79) continue;
        addBox(feature, 0.05, 0.4, 0.05, whiteMat, x, BLOCK_TOP + 0.2, z, {
          cast: false,
        });
      }
    }
    for (const x of [-2.56, 2.56]) {
      addBox(feature, 0.05, 0.05, 5.2, fenceMat, x, BLOCK_TOP + 0.3, 0, { cast: false });
      for (let i = 0; i < 9; i += 1) {
        addBox(feature, 0.05, 0.4, 0.05, whiteMat, x, BLOCK_TOP + 0.2, -2.4 + i * 0.6, {
          cast: false,
        });
      }
    }

    addTree(feature, -2.12, 2.05, 0.58, BLOCK_TOP);
    addTree(feature, 2.16, -2.05, 0.54, BLOCK_TOP);
    addBench(feature, 0.92, 2.1, Math.PI, BLOCK_TOP);
    addBench(feature, -0.92, 2.1, Math.PI, BLOCK_TOP);
    addStreetLamp(blockX + 2.2, blockZ + 2.1, BLOCK_TOP, 0.78);
    addStreetLamp(blockX - 2.2, blockZ + 2.1, BLOCK_TOP, 0.78);

    const record = {
      id: `${label}-amusement`,
      name: makeName("amusement", label),
      kind: "amusement",
      label,
      floors: 0,
      detailLabel: "游乐设施",
      detailValue: "摩天轮等 5 项",
      height: Math.round((BLOCK_TOP + 3.2) * 3.2 * 10) / 10,
      population: 0,
      jobs: Math.round(rand(rng, 58, 92)),
      occupancy: Math.round(rand(rng, 0.72, 0.98) * 100),
      year: 2038 + Math.floor(rng() * 16),
      color: "#e8735f",
      note: choose(rng, SPECIAL_NOTES.amusement),
      address: `BLOCK ${label} · 游乐区`,
      root: feature,
      typeLabel: "AMUSEMENT / 游乐区",
      description: AMUSEMENT_DISTRICT.description,
      districtId: "amusement",
      districtName: AMUSEMENT_DISTRICT.name,
    };
    addBuildingInfo(feature, record);
    return record;
  }

  function addCivicBlock(blockGroup, blockX, blockZ, label) {
    const feature = new THREE.Group();
    blockGroup.add(feature);

    const wallColor = choose(rng, CIVIC_COLORS);
    const wallMaterial = standard(wallColor);
    const trimMaterial = standard("#c9bfa8");
    const hallWidth = 3.5;
    const hallDepth = 1.7;
    const hallZ = -0.88;
    const hallBase = 0.24;
    const hallHeight = 1.06;

    addBox(feature, hallWidth + 0.8, 0.12, hallDepth + 1.0, trimMaterial, 0, 0.06, hallZ + 0.14);
    addBox(feature, hallWidth + 0.46, 0.12, hallDepth + 0.66, stoneMat, 0, 0.18, hallZ + 0.1);
    for (let i = 0; i < 3; i += 1) {
      addBox(
        feature,
        hallWidth - 0.7 - i * 0.5,
        0.08,
        0.34,
        stoneMat,
        0,
        0.1 + i * 0.08,
        hallZ + hallDepth / 2 + 0.58 - i * 0.26
      );
    }

    addBox(feature, hallWidth, hallHeight, hallDepth, wallMaterial, 0, hallBase + hallHeight / 2, hallZ);
    addBox(feature, hallWidth - 0.28, 0.24, 0.035, glassMat, 0, hallBase + hallHeight * 0.42, hallZ + hallDepth / 2 + 0.02, {
      cast: false,
    });
    for (let i = 0; i < 6; i += 1) {
      addBox(
        feature,
        0.13,
        hallHeight * 0.82,
        0.13,
        whiteMat,
        -hallWidth / 2 + 0.34 + (i * (hallWidth - 0.68)) / 5,
        hallBase + hallHeight * 0.41,
        hallZ + hallDepth / 2 + 0.16
      );
    }

    addBox(feature, hallWidth + 0.34, 0.15, hallDepth + 0.32, trimMaterial, 0, hallBase + hallHeight + 0.075, hallZ + 0.02);
    addPyramid(feature, hallWidth + 0.1, 0.36, hallDepth + 0.22, trimMaterial, 0, hallBase + hallHeight + 0.15, hallZ);
    addCylinder(feature, 0.52, 0.2, domeMat, 0, hallBase + hallHeight + 0.62, hallZ);
    const domeBase = hallBase + hallHeight + 0.72;
    addSphere(feature, 0.62, domeMat, 0, domeBase, hallZ, 0.72);
    addCylinder(feature, 0.07, 0.22, whiteMat, 0, domeBase + 0.5, hallZ);
    addBox(feature, 0.06, 0.06, 0.06, beaconMat, 0, domeBase + 0.63, hallZ, {
      cast: false,
      receive: false,
    });

    addBox(feature, 2.9, 0.035, 1.9, pathMat, 0, 0.028, 2.02, { cast: false });
    addCylinder(feature, 0.44, 0.1, stoneMat, 1.72, 0.05, 1.72);
    addCylinder(feature, 0.34, 0.02, waterStillMat, 1.72, 0.11, 1.72, { cast: false });

    for (let i = 0; i < 3; i += 1) {
      const poleX = -2.08 + i * 0.3;
      addBox(feature, 0.035, 1.16, 0.035, whiteMat, poleX, 0.58, 2.12);
      addBox(feature, 0.26, 0.14, 0.015, standard(["#e8735f", "#6fc3b2", "#f2b65c"][i]), poleX + 0.14, 1.06, 2.12, {
        cast: false,
        receive: false,
      });
    }

    addBench(feature, -1.55, 1.86, 0, BLOCK_TOP);
    addBench(feature, 1.55, 2.42, Math.PI, BLOCK_TOP);
    addTree(feature, 2.24, -2.08, 0.68, BLOCK_TOP);
    addTree(feature, -2.24, -2.08, 0.62, BLOCK_TOP);
    addBush(feature, 2.24, 1.14, 0.8, BLOCK_TOP);
    addFlowers(feature, -1.2, 2.3, BLOCK_TOP);

    const record = {
      id: `${label}-civic`,
      name: makeName("civic", label),
      kind: "civic",
      label,
      floors: 3,
      detailLabel: "办事窗口",
      detailValue: `${Math.round(rand(rng, 18, 32))} 个`,
      height: Math.round((BLOCK_TOP + domeBase + 0.66) * 3.2 * 10) / 10,
      population: 0,
      jobs: Math.round(rand(rng, 120, 180)),
      occupancy: Math.round(rand(rng, 0.86, 0.99) * 100),
      year: 2032 + Math.floor(rng() * 10),
      color: wallColor,
      note: choose(rng, SPECIAL_NOTES.civic),
      address: `BLOCK ${label} · 像素湾${blockX > 0 ? "东" : "西"}区`,
      root: feature,
    };
    addBuildingInfo(feature, record);
    return record;
  }

  function addIsland() {
    addBox(group, PLATEAU_SIZE, 0.5, PLATEAU_SIZE, deckMat, 0, -0.25, 0, {
      cast: false,
      receive: true,
    });
    addBox(group, PLATEAU_SIZE - 0.4, 0.9, PLATEAU_SIZE - 0.4, soilMat, 0, -0.9, 0, {
      cast: false,
      receive: false,
    });
    addBox(group, PLATEAU_SIZE - 1.2, 1.4, PLATEAU_SIZE - 1.2, rockMat, 0, -1.9, 0, {
      cast: false,
      receive: false,
    });

    const trim = PLATEAU_SIZE / 2 - 0.35;
    addBox(group, PLATEAU_SIZE + 0.6, 0.12, 0.42, trimMat, 0, 0.06, trim);
    addBox(group, PLATEAU_SIZE + 0.6, 0.12, 0.42, trimMat, 0, 0.06, -trim);
    addBox(group, 0.42, 0.12, PLATEAU_SIZE + 0.6, trimMat, trim, 0.06, 0);
    addBox(group, 0.42, 0.12, PLATEAU_SIZE + 0.6, trimMat, -trim, 0.06, 0);

    const shore = PLATEAU_SIZE / 2 + 0.15;
    addBox(group, PLATEAU_SIZE + 0.85, 0.02, 0.34, shoreMat, 0, WATER_LEVEL + 0.008, shore, {
      cast: false,
      receive: false,
    });
    addBox(group, PLATEAU_SIZE + 0.85, 0.02, 0.34, shoreMat, 0, WATER_LEVEL + 0.008, -shore, {
      cast: false,
      receive: false,
    });
    addBox(group, 0.34, 0.02, PLATEAU_SIZE + 0.85, shoreMat, shore, WATER_LEVEL + 0.008, 0, {
      cast: false,
      receive: false,
    });
    addBox(group, 0.34, 0.02, PLATEAU_SIZE + 0.85, shoreMat, -shore, WATER_LEVEL + 0.008, 0, {
      cast: false,
      receive: false,
    });

    waterMaterial = makeWaterMaterial();
    materials.add(waterMaterial);
    waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600), waterMaterial);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = WATER_LEVEL;
    waterMesh.receiveShadow = false;
    waterMesh.renderOrder = -1;
    group.add(waterMesh);

    // Promenade greenery and seats frame the larger island.
    const promenade = PLATEAU_SIZE / 2 - 1.15;
    for (const [x, z, scale, species] of [
      [-promenade, -13.2, 0.78, "broadleaf"],
      [promenade, 12.1, 0.72, "palm"],
      [-12.4, promenade, 0.75, "conifer"],
      [13.4, -promenade, 0.68, "broadleaf"],
      [-promenade, 11.8, 0.64, "palm"],
      [promenade, -10.6, 0.62, "broadleaf"],
      [-8.2, promenade, 0.7, "cherry"],
      [9.6, -promenade, 0.66, "conifer"],
      [-promenade, 2.4, 0.56, "cherry"],
      [promenade, 3.1, 0.58, "broadleaf"],
    ]) {
      addTree(group, x, z, scale, 0.02, species);
    }
    for (const [x, z, rotation] of [
      [-promenade, 1.4, Math.PI / 2],
      [promenade, -1.3, -Math.PI / 2],
      [1.2, promenade, Math.PI],
      [-1.2, -promenade, 0],
      [-promenade, -7.8, Math.PI / 2],
      [promenade, 7.4, -Math.PI / 2],
    ]) {
      addBench(group, x, z, rotation, 0.01);
    }
    for (const [x, z] of [
      [-promenade, -4.2],
      [promenade, 4.2],
      [-4.2, promenade],
      [4.2, -promenade],
      [-promenade, 18],
      [promenade, -18],
      [18, -promenade],
      [-18, promenade],
    ]) {
      addStreetLamp(x, z, 0.01, 0.9);
    }
  }

  function addRoads() {
    const roadSpan = CITY_EXTENT * 2;
    for (const line of ROAD_LINES) {
      addBox(group, 2, 0.06, roadSpan, asphaltMat, line, 0.03, 0, {
        cast: false,
        receive: true,
      });
      addBox(group, roadSpan, 0.06, 2, asphaltMat, 0, 0.031, line, {
        cast: false,
        receive: true,
      });
    }

    const dashTransforms = [];
    for (const line of ROAD_LINES) {
      for (let position = -CITY_EXTENT + 0.9; position <= CITY_EXTENT - 0.9; position += 1.45) {
        const nearIntersection = ROAD_LINES.some((cross) => Math.abs(position - cross) < 2.1);
        if (nearIntersection) continue;
        dashTransforms.push({
          x: line,
          z: position,
          sx: 0.075,
          sz: 0.56,
        });
        dashTransforms.push({
          x: position,
          z: line,
          sx: 0.56,
          sz: 0.075,
        });
      }
    }
    const dashMesh = new THREE.InstancedMesh(boxGeometry, laneMat, dashTransforms.length);
    const dummy = new THREE.Object3D();
    dashTransforms.forEach((item, index) => {
      dummy.position.set(item.x, 0.076, item.z);
      dummy.scale.set(item.sx, 0.018, item.sz);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      dashMesh.setMatrixAt(index, dummy.matrix);
    });
    dashMesh.instanceMatrix.needsUpdate = true;
    dashMesh.receiveShadow = true;
    group.add(dashMesh);

    const crossTransforms = [];
    for (const roadX of ROAD_LINES) {
      for (const roadZ of ROAD_LINES) {
        for (const offset of [-2.22, 2.22]) {
          if (Math.abs(roadZ + offset) < CITY_EXTENT - 0.25) {
            for (let stripe = -1; stripe <= 1; stripe += 1) {
              crossTransforms.push({
                x: roadX,
                z: roadZ + offset + stripe * 0.22,
                sx: 1.62,
                sz: 0.075,
              });
            }
          }
          if (Math.abs(roadX + offset) < CITY_EXTENT - 0.25) {
            for (let stripe = -1; stripe <= 1; stripe += 1) {
              crossTransforms.push({
                x: roadX + offset + stripe * 0.22,
                z: roadZ,
                sx: 0.075,
                sz: 1.62,
              });
            }
          }
        }
      }
    }
    const crossMesh = new THREE.InstancedMesh(boxGeometry, crosswalkMat, crossTransforms.length);
    crossTransforms.forEach((item, index) => {
      dummy.position.set(item.x, 0.078, item.z);
      dummy.scale.set(item.sx, 0.016, item.sz);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      crossMesh.setMatrixAt(index, dummy.matrix);
    });
    crossMesh.instanceMatrix.needsUpdate = true;
    crossMesh.receiveShadow = true;
    group.add(crossMesh);

    // Street lamps at the inner intersections.
    for (const x of [-12, -4, 4, 12]) {
      for (const z of [-12, -4, 4, 12]) {
        addStreetLamp(x + 1.42, z + 1.42, 0.31);
      }
    }
  }

  function blockLabel(i, j) {
    return `${String.fromCharCode(65 + i)}-${String(j + 1).padStart(2, "0")}`;
  }

  function makeName(kind, label) {
    const bank = NAME_BANK[kind] ?? NAME_BANK.residential;
    let name = "";
    for (let attempt = 0; attempt < 12; attempt += 1) {
      name = `${choose(rng, bank.prefix)}${choose(rng, bank.suffix)}`;
      if (!usedNames.has(name)) break;
    }
    if (usedNames.has(name)) name = `${name}·${label}`;
    usedNames.add(name);
    return name;
  }

  function addBuildingInfo(root, record) {
    root.userData.building = record;
    record.root = root;
    buildings.push(record);
    root.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        selectables.push(child);
      }
    });
  }

  function addWindows({
    worldX,
    worldZ,
    width,
    depth,
    floors,
    bodyStart,
    baseY = BLOCK_TOP,
    floorHeight = FLOOR_HEIGHT,
    litChance = 0.42,
    skipGround = true,
  }) {
    const firstRow = skipGround ? 1 : 0;

    const addSide = (length, axis, side, rotation) => {
      const columns = Math.max(1, Math.floor(length / 0.42));
      const spacing = length / (columns + 1);
      for (let row = firstRow; row < floors; row += 1) {
        for (let col = 0; col < columns; col += 1) {
          if (rng() < 0.18) continue;
          const offset = -length / 2 + spacing * (col + 1);
          const y = baseY + bodyStart + row * floorHeight + floorHeight * 0.53;
          if (axis === "z") {
            windowSpecs.push({
              x: worldX + offset,
              y,
              z: worldZ + side * (depth / 2 + 0.022),
              rotation,
              lit: rng() < litChance,
              scale: rand(rng, 0.86, 1.08),
            });
          } else {
            windowSpecs.push({
              x: worldX + side * (width / 2 + 0.022),
              y,
              z: worldZ + offset,
              rotation,
              lit: rng() < litChance,
              scale: rand(rng, 0.86, 1.08),
            });
          }
        }
      }
    };

    addSide(width, "z", 1, 0);
    addSide(width, "z", -1, Math.PI);
    addSide(depth, "x", 1, Math.PI / 2);
    addSide(depth, "x", -1, -Math.PI / 2);
  }

  function addTower({
    blockGroup,
    blockX,
    blockZ,
    localX,
    localZ,
    width,
    depth,
    floors,
    kind,
    label,
    color,
    apartment = false,
    landmark = false,
    setback = false,
    typeDef = null,
    style = null,
  }) {
    const root = new THREE.Group();
    root.position.set(localX, BLOCK_TOP, localZ);
    const wallColor = color ?? choose(rng, BUILDING_COLORS);
    const wallMaterial = standard(wallColor);
    const roofMaterial = standard(choose(rng, ROOF_COLORS));
    const floorHeight = FLOOR_HEIGHT;
    const bodyStart = 0.22;
    const stepped = setback && !landmark && floors >= 8;
    const upperFloors = stepped ? Math.max(2, Math.round(floors * 0.34)) : 0;
    const lowerFloors = floors - upperFloors;
    const lowerHeight = lowerFloors * floorHeight;
    const upperHeight = upperFloors * floorHeight;
    const upperWidth = width * 0.7;
    const upperDepth = depth * 0.7;
    const bodyHeight = floors * floorHeight;
    const top = bodyStart + bodyHeight;
    const roofWidth = stepped ? upperWidth : width;
    const roofDepth = stepped ? upperDepth : depth;
    const accentMaterial = standard(choose(rng, ACCENT_COLORS), {
      roughness: 0.72,
      emissive: choose(rng, ACCENT_COLORS),
      emissiveIntensity: 0.04,
    });

    addBox(root, width + 0.18, 0.24, depth + 0.18, trimMat, 0, 0.12, 0);
    addBox(root, width, lowerHeight, depth, wallMaterial, 0, bodyStart + lowerHeight / 2, 0);
    addBoxOutline(root, width, lowerHeight, depth, 0, bodyStart + lowerHeight / 2, 0);
    if (stepped) {
      addBox(root, width + 0.13, 0.1, depth + 0.13, trimMat, 0, bodyStart + lowerHeight + 0.05, 0);
      addBox(
        root,
        upperWidth,
        upperHeight,
        upperDepth,
        wallMaterial,
        0,
        bodyStart + lowerHeight + upperHeight / 2,
        0
      );
      addBoxOutline(
        root,
        upperWidth,
        upperHeight,
        upperDepth,
        0,
        bodyStart + lowerHeight + upperHeight / 2,
        0
      );
    }
    addBox(root, roofWidth + 0.11, 0.13, roofDepth + 0.11, roofMaterial, 0, top + 0.065, 0);
    addBoxOutline(root, roofWidth + 0.11, 0.13, roofDepth + 0.11, 0, top + 0.065, 0);

    // Horizontal cornices make tall blocks read more clearly from a distance.
    for (let floor = 4; floor < floors; floor += 4) {
      const aboveStep = stepped && floor > lowerFloors;
      addBox(
        root,
        (aboveStep ? upperWidth : width) + 0.045,
        0.035,
        (aboveStep ? upperDepth : depth) + 0.045,
        trimMat,
        0,
        bodyStart + floor * floorHeight,
        0,
        { cast: false, receive: false }
      );
    }

    // Ground-floor storefront, door, and a small awning.
    if (kind === "commercial" || kind === "downtown") {
      addBox(
        root,
        Math.min(width * 0.62, 0.93),
        0.34,
        0.035,
        glassMat,
        0,
        0.46,
        depth / 2 + 0.026
      );
      addBox(
        root,
        Math.min(width * 0.72, 1.1),
        0.075,
        0.27,
        accentMaterial,
        0,
        0.7,
        depth / 2 + 0.14
      );
    } else {
      addBox(root, 0.25, 0.4, 0.035, doorMat, 0, 0.4, depth / 2 + 0.028);
      addBox(root, 0.38, 0.045, 0.28, trimMat, 0, 0.63, depth / 2 + 0.12, {
        cast: false,
        receive: false,
      });
    }

    if (kind === "residential") {
      const balconyMat = standard("#d6cebb");
      const balconyFloors = Math.min(floors, stepped ? lowerFloors : floors);
      for (let floor = 2; floor < balconyFloors; floor += 2) {
        const y = bodyStart + floor * floorHeight + 0.02;
        addBox(root, width * 0.54, 0.045, 0.2, balconyMat, 0, y, depth / 2 + 0.1, {
          cast: false,
          receive: true,
        });
        addBox(root, width * 0.54, 0.09, 0.03, balconyMat, 0, y + 0.06, depth / 2 + 0.19, {
          cast: false,
          receive: false,
        });
      }
    }

    let visualTop = top + 0.35;

    if (landmark) {
      const crownWidth = width * 0.62;
      const crownDepth = depth * 0.62;
      const crownHeight = 0.92;
      const crownBase = top + 0.13;
      const goldMaterial = standard("#dbbd72", {
        roughness: 0.55,
        metalness: 0.12,
        emissive: "#ffd47e",
        emissiveIntensity: 0.04,
      });
      neonMaterials.push(goldMaterial);
      addBox(root, crownWidth, crownHeight, crownDepth, wallMaterial, 0, crownBase + crownHeight / 2, 0);
      addBoxOutline(root, crownWidth, crownHeight, crownDepth, 0, crownBase + crownHeight / 2, 0);
      addBox(root, crownWidth + 0.09, 0.08, crownDepth + 0.09, goldMaterial, 0, crownBase + crownHeight + 0.04, 0);
      addBox(root, 0.045, 1.35, 0.045, blackMat, 0, crownBase + crownHeight + 0.72, 0);
      const beacon = addBox(root, 0.085, 0.085, 0.085, beaconMat, 0, crownBase + crownHeight + 1.42, 0, {
        cast: false,
        receive: false,
      });
      beacons.push({ mesh: beacon, phase: rng() * TAU });
      visualTop = crownBase + crownHeight + 1.48;
    } else {
      addBox(
        root,
        rand(rng, 0.22, 0.38),
        0.16,
        rand(rng, 0.2, 0.35),
        roofMaterial,
        roofWidth * rand(rng, -0.2, 0.2),
        top + 0.16,
        roofDepth * rand(rng, -0.19, 0.16)
      );
      if (rng() < 0.64) {
        addCylinder(
          root,
          rand(rng, 0.12, 0.18),
          rand(rng, 0.24, 0.34),
          standard("#8c8b80"),
          roofWidth * rand(rng, 0.15, 0.26),
          top + 0.29,
          roofDepth * rand(rng, -0.24, -0.12)
        );
      }
      if (floors >= 7) {
        addBox(root, 0.028, rand(rng, 0.55, 0.95), 0.028, blackMat, 0, top + 0.42, 0);
        const beacon = addBox(root, 0.065, 0.065, 0.065, beaconMat, 0, top + 0.9, 0, {
          cast: false,
          receive: false,
        });
        beacons.push({ mesh: beacon, phase: rng() * TAU });
      }
      if (rng() < 0.36) {
        const planter = standard(choose(rng, TREE_COLORS), { roughness: 0.95 });
        addBox(root, roofWidth * 0.34, 0.08, roofDepth * 0.24, trimMat, roofWidth * 0.16, top + 0.2, roofDepth * 0.1, {
          cast: false,
          receive: true,
        });
        addBox(root, roofWidth * 0.3, 0.07, roofDepth * 0.2, planter, roofWidth * 0.16, top + 0.27, roofDepth * 0.1, {
          cast: false,
          receive: true,
        });
        addBush(root, -roofWidth * 0.18, roofDepth * 0.05, 0.5, top + 0.24);
      }
    }

    let neonMaterial = null;
    if (kind === "commercial" && rng() < 0.78) {
      const neonColor = choose(rng, ACCENT_COLORS);
      neonMaterial = standard(neonColor, {
        emissive: neonColor,
        emissiveIntensity: 0.12,
        roughness: 0.5,
      });
      neonMaterials.push(neonMaterial);
      addBox(
        root,
        0.07,
        rand(rng, 0.42, 0.8),
        0.06,
        neonMaterial,
        width * 0.36,
        bodyStart + lowerHeight - 0.48,
        depth / 2 + 0.04,
        { cast: false, receive: false }
      );
    }

    if (kind === "commercial" && rng() < 0.34) {
      const boardColor = choose(rng, ACCENT_COLORS);
      const boardMaterial = standard(boardColor, {
        emissive: boardColor,
        emissiveIntensity: 0.1,
        roughness: 0.55,
      });
      neonMaterials.push(boardMaterial);
      addBox(root, roofWidth * 0.58, 0.3, 0.05, boardMaterial, 0, top + 0.3, roofDepth / 2 + 0.04, {
        cast: false,
        receive: false,
      });
      addBox(root, roofWidth * 0.64, 0.05, 0.06, blackMat, 0, top + 0.12, roofDepth / 2 + 0.04, {
        cast: false,
        receive: false,
      });
    }

    addWindows({
      worldX: blockX + localX,
      worldZ: blockZ + localZ,
      width,
      depth,
      floors: lowerFloors,
      bodyStart,
      floorHeight,
      litChance: kind === "downtown" ? 0.42 : 0.32,
    });
    if (stepped) {
      addWindows({
        worldX: blockX + localX,
        worldZ: blockZ + localZ,
        width: upperWidth,
        depth: upperDepth,
        floors: upperFloors,
        bodyStart: 0,
        baseY: BLOCK_TOP + bodyStart + lowerHeight,
        floorHeight,
        litChance: 0.4,
      });
    }

    root.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = child.material !== neonMaterial;
        child.receiveShadow = true;
      }
    });

    const areaFactor = width * depth;
    const residential = apartment || kind === "residential";
    const population = residential ? Math.round(floors * 12 + areaFactor * 9 + rng() * 18) : 0;
    const jobs = residential ? 0 : Math.round(floors * (kind === "downtown" ? 34 : 13) + areaFactor * 16);
    let name = makeName(kind === "downtown" ? "downtown" : kind, label);
    if (landmark) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = choose(rng, ["潮汐塔", "晴空塔", "星港一号", "云顶之眼"]);
        if (!usedNames.has(candidate)) {
          name = candidate;
          usedNames.add(candidate);
          break;
        }
      }
    }
    const record = {
      id: `${label}-${buildings.length}`,
      name,
      kind,
      label,
      floors,
      height: Math.round(visualTop * 3.2 * 10) / 10,
      population,
      jobs,
      occupancy: Math.round(rand(rng, 0.58, 0.97) * 100),
      year: 2038 + Math.floor(rng() * 18),
      color: wallColor,
      note: choose(rng, BUILDING_NOTES),
      address: `BLOCK ${label} · 像素湾${localX > 0 ? "东" : "西"}区`,
      landmark,
      root,
      footprint: { width, depth },
      style,
      topY: visualTop,
      bodyTop: top,
    };
    if (typeDef) {
      record.typeId = typeDef.id;
      record.typeLabel = `${typeDef.en} / ${typeDef.name}`;
      record.description = typeDef.description;
      record.note = typeDef.description;
      record.family = typeDef.family;
      if (typeDef.family === "landmark") record.name = typeDef.name;
    }
    addBuildingInfo(root, record);
    blockGroup.add(root);
    return record;
  }

  function addRoundTower({
    blockGroup,
    blockX,
    blockZ,
    localX,
    localZ,
    radius,
    floors,
    kind,
    label,
    color,
    typeDef = null,
    style = null,
  }) {
    const root = new THREE.Group();
    root.position.set(localX, BLOCK_TOP, localZ);
    const wallColor = color ?? choose(rng, BUILDING_COLORS);
    const wallMaterial = standard(wallColor);
    const roofMaterial = standard(choose(rng, ROOF_COLORS));
    const floorHeight = FLOOR_HEIGHT;
    const bodyStart = 0.22;
    const bodyHeight = floors * floorHeight;
    const top = bodyStart + bodyHeight;
    const columns = 8;

    addRoundCylinder(root, radius + 0.16, 0.22, trimMat, 0, 0.11, 0);
    addRoundCylinder(root, radius, bodyHeight, wallMaterial, 0, bodyStart + bodyHeight / 2, 0);
    addRoundCylinder(root, radius + 0.015, 0.3, glassMat, 0, 0.5, 0);

    for (let floor = 3; floor < floors; floor += 3) {
      addRoundCylinder(root, radius + 0.04, 0.045, trimMat, 0, bodyStart + floor * floorHeight, 0);
    }
    for (let i = 0; i < columns; i += 1) {
      const angle = (i / columns) * TAU;
      const fin = addBox(
        root,
        0.05,
        bodyHeight * 0.9,
        0.1,
        trimMat,
        Math.cos(angle) * (radius + 0.02),
        bodyStart + bodyHeight * 0.45,
        Math.sin(angle) * (radius + 0.02)
      );
      fin.rotation.y = Math.PI / 2 - angle;
    }

    addRoundCylinder(root, radius + 0.11, 0.12, roofMaterial, 0, top + 0.06, 0);
    addRoundCylinder(root, radius * 0.52, 0.24, standard("#8c8b80"), 0, top + 0.24, 0);
    if (floors >= 8) {
      addBox(root, 0.03, rand(rng, 0.6, 1.0), 0.03, blackMat, 0, top + 0.72, 0);
      const beacon = addBox(root, 0.065, 0.065, 0.065, beaconMat, 0, top + 1.2, 0, {
        cast: false,
        receive: false,
      });
      beacons.push({ mesh: beacon, phase: rng() * TAU });
    }

    for (let row = 1; row < floors; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        if (rng() < 0.14) continue;
        const angle = ((col + 0.5) / columns) * TAU;
        windowSpecs.push({
          x: blockX + localX + Math.cos(angle) * (radius + 0.035),
          y: BLOCK_TOP + bodyStart + row * floorHeight + floorHeight * 0.53,
          z: blockZ + localZ + Math.sin(angle) * (radius + 0.035),
          rotation: Math.PI / 2 - angle,
          lit: rng() < (kind === "downtown" ? 0.42 : 0.3),
          scale: rand(rng, 0.9, 1.06),
        });
      }
    }

    root.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const areaFactor = Math.PI * radius * radius;
    const jobs = Math.round(floors * (kind === "downtown" ? 32 : 12) + areaFactor * 18);
    const record = {
      id: `${label}-${buildings.length}`,
      name: makeName(kind, label),
      kind,
      label,
      floors,
      height: Math.round((top + (floors >= 8 ? 1.28 : 0.42)) * 3.2 * 10) / 10,
      population: 0,
      jobs,
      occupancy: Math.round(rand(rng, 0.58, 0.96) * 100),
      year: 2038 + Math.floor(rng() * 18),
      color: wallColor,
      note: choose(rng, BUILDING_NOTES),
      address: `BLOCK ${label} · 像素湾${localX > 0 ? "东" : "西"}区`,
      root,
      footprint: { width: radius * 2, depth: radius * 2 },
      style,
      topY: top + (floors >= 8 ? 1.28 : 0.42),
      bodyTop: top,
    };
    if (typeDef) {
      record.typeId = typeDef.id;
      record.typeLabel = `${typeDef.en} / ${typeDef.name}`;
      record.description = typeDef.description;
      record.note = typeDef.description;
      record.family = typeDef.family;
      if (typeDef.family === "landmark") record.name = typeDef.name;
    }
    blockGroup.add(root);
    addBuildingInfo(root, record);
    return record;
  }

  function addHouse({
    blockGroup,
    blockX,
    blockZ,
    localX,
    localZ,
    width,
    depth,
    floors,
    label,
    color,
    typeDef = null,
    style = null,
  }) {
    const root = new THREE.Group();
    root.position.set(localX, BLOCK_TOP, localZ);
    const wallColor = color ?? choose(rng, BUILDING_COLORS);
    const wallMaterial = standard(wallColor);
    const roofMaterial = standard(rng() < 0.5 ? roofPineMat : choose(rng, ROOF_COLORS));
    const bodyStart = 0.1;
    const bodyHeight = floors * 0.34;
    const top = bodyStart + bodyHeight;

    addBox(root, width + 0.12, 0.16, depth + 0.12, trimMat, 0, 0.08, 0);
    addBox(root, width, bodyHeight, depth, wallMaterial, 0, bodyStart + bodyHeight / 2, 0);
    addBoxOutline(root, width, bodyHeight, depth, 0, bodyStart + bodyHeight / 2, 0);
    const roofHeight = rand(rng, 0.48, 0.7);
    const useGable = style === "townhouse" || (style !== "courtyard" && rng() < 0.64);
    if (useGable) {
      const alongX = style === "townhouse" ? width < depth : rng() < 0.5;
      if (alongX) {
        addGable(root, width * 1.2, roofHeight, depth * 1.16, roofMaterial, 0, top, 0);
        addGableOutline(root, width * 1.2, roofHeight, depth * 1.16, 0, top, 0);
      } else {
        addGable(root, depth * 1.2, roofHeight, width * 1.16, roofMaterial, 0, top, 0, Math.PI / 2);
        addGableOutline(root, depth * 1.2, roofHeight, width * 1.16, 0, top, 0, Math.PI / 2);
      }
    } else {
      addPyramid(
        root,
        width * 1.16,
        roofHeight,
        depth * 1.16,
        roofMaterial,
        0,
        top,
        0,
        Math.PI / 4
      );
      addPyramidOutline(root, width * 1.16, roofHeight, depth * 1.16, 0, top, 0);
    }

    if (style === "townhouse") {
      addBox(root, width + 0.14, 0.08, depth + 0.14, trimMat, 0, top + 0.04, 0, {
        cast: false,
        receive: false,
      });
      addBox(root, width * 0.56, 0.28, 0.38, trimMat, 0, 0.16, depth / 2 + 0.2);
      addBox(root, width * 0.32, 0.04, 0.03, blackMat, 0, 0.35, depth / 2 + 0.025);
    }

    if (style === "courtyard") {
      const gardenMat = standard("#7f9c61");
      const wallMat = standard("#c8b99e");
      const gardenSize = Math.max(width, depth) * 1.34;
      addBox(root, gardenSize, 0.025, gardenSize, gardenMat, 0, 0.01, 0, {
        cast: false,
        receive: true,
      });
      addBox(root, gardenSize, 0.2, 0.06, wallMat, 0, 0.1, -gardenSize / 2);
      addBox(root, 0.06, 0.2, gardenSize, wallMat, -gardenSize / 2, 0.1, 0);
      addBox(root, 0.06, 0.2, gardenSize, wallMat, gardenSize / 2, 0.1, 0);
      addBox(root, gardenSize * 0.3, 0.2, 0.06, wallMat, -gardenSize * 0.35, 0.1, gardenSize / 2);
      addBox(root, gardenSize * 0.3, 0.2, 0.06, wallMat, gardenSize * 0.35, 0.1, gardenSize / 2);
      addTree(root, -gardenSize * 0.35, -gardenSize * 0.36, 0.38, 0.02, "broadleaf");
      addBush(root, gardenSize * 0.36, -gardenSize * 0.32, 0.5);
    }

    addBox(root, 0.29, 0.32, 0.035, doorMat, 0, 0.27, depth / 2 + 0.024);
    addBox(root, 0.49, 0.045, 0.22, trimMat, 0, 0.45, depth / 2 + 0.1, {
      cast: false,
      receive: false,
    });
    if (rng() < 0.44) {
      const porchDepth = rand(rng, 0.28, 0.38);
      addBox(root, width * 0.66, 0.05, porchDepth, deckMat, 0, 0.03, depth / 2 + porchDepth / 2, {
        cast: false,
        receive: true,
      });
      for (const side of [-1, 1]) {
        addBox(
          root,
          0.05,
          0.3,
          0.05,
          whiteMat,
          side * width * 0.3,
          0.18,
          depth / 2 + porchDepth
        );
      }
      addBox(
        root,
        width * 0.72,
        0.05,
        0.05,
        trimMat,
        0,
        0.34,
        depth / 2 + porchDepth,
        { cast: false, receive: false }
      );
    }
    addBox(root, width * 0.24, 0.18, 0.18, standard("#9f7c5f"), width * 0.22, top + 0.36, -depth * 0.2);
    addBox(root, 0.42, 0.025, 0.58, pathMat, 0, 0.012, depth / 2 + 0.44, {
      cast: false,
      receive: true,
    });

    addWindows({
      worldX: blockX + localX,
      worldZ: blockZ + localZ,
      width,
      depth,
      floors,
      bodyStart,
      floorHeight: 0.34,
      litChance: 0.42,
      skipGround: false,
    });

    if (rng() < 0.5) {
      addBush(root, -width * 0.42, depth * 0.32, 0.8);
      addBush(root, width * 0.44, depth * 0.22, 0.65);
    }

    const record = {
      id: `${label}-${buildings.length}`,
      name: makeName("residential", label),
      kind: "residential",
      label,
      floors,
      height: Math.round((top + 0.52) * 3.2 * 10) / 10,
      population: Math.round(8 + floors * 8 + width * depth * 8),
      jobs: 0,
      occupancy: Math.round(rand(rng, 0.67, 0.98) * 100),
      year: 2040 + Math.floor(rng() * 16),
      color: wallColor,
      note: choose(rng, BUILDING_NOTES),
      address: `BLOCK ${label} · 像素湾${localX > 0 ? "东" : "西"}区`,
      root,
      footprint: { width, depth },
      style,
      topY: top + roofHeight + 0.1,
      bodyTop: top,
    };
    if (typeDef) {
      record.typeId = typeDef.id;
      record.typeLabel = `${typeDef.en} / ${typeDef.name}`;
      record.description = typeDef.description;
      record.note = typeDef.description;
      record.family = typeDef.family;
      if (typeDef.family === "landmark") record.name = typeDef.name;
    }
    addBuildingInfo(root, record);
    blockGroup.add(root);
    return record;
  }

  function addPlotDetails(blockGroup) {
    const possible = [
      [-2.18, -2.02],
      [2.15, -2.15],
      [-2.12, 2.18],
      [2.17, 2.12],
    ];
    for (const [x, z] of possible) {
      if (rng() < 0.6) addTree(blockGroup, x, z, rand(rng, 0.62, 0.85), BLOCK_TOP);
    }
    for (let i = 0; i < 3; i += 1) {
      addBush(
        blockGroup,
        rand(rng, -2.35, 2.35),
        rng() < 0.5 ? rand(rng, -2.45, -2.1) : rand(rng, 2.1, 2.45),
        rand(rng, 0.6, 0.9),
        BLOCK_TOP
      );
    }
  }

  function addResidentialBlock(blockGroup, blockX, blockZ, label) {
    const lots = [
      [-1.28, -1.28],
      [1.28, -1.28],
      [-1.28, 1.28],
      [1.28, 1.28],
    ];
    lots.forEach(([lotX, lotZ], index) => {
      if (rng() < 0.06) return;
      const x = lotX + rand(rng, -0.07, 0.07);
      const z = lotZ + rand(rng, -0.07, 0.07);
      const house = rng() < 0.56;
      if (house) {
        addHouse({
          blockGroup,
          blockX,
          blockZ,
          localX: x,
          localZ: z,
          width: rand(rng, 0.9, 1.18),
          depth: rand(rng, 0.85, 1.12),
          floors: rng() < 0.7 ? 1 : 2,
          label,
          color: choose(rng, BUILDING_COLORS),
        });
      } else {
        addTower({
          blockGroup,
          blockX,
          blockZ,
          localX: x,
          localZ: z,
          width: rand(rng, 1.02, 1.34),
          depth: rand(rng, 0.98, 1.3),
          floors: 3 + Math.floor(rng() * 3),
          kind: "residential",
          label,
          color: choose(rng, BUILDING_COLORS),
          apartment: true,
        });
      }
      if (index === 0 || index === 3) {
        addFlowers(blockGroup, x + (x > 0 ? 0.82 : -0.82), z + 0.62, BLOCK_TOP);
      }
    });
    addPlotDetails(blockGroup);
    addTree(blockGroup, -2.25, 0.15, 0.56, BLOCK_TOP);
    addBush(blockGroup, 2.32, 0.02, 0.78, BLOCK_TOP);
  }

  function addCommercialBlock(blockGroup, blockX, blockZ, label) {
    const layouts = [
      [-1.28, -1.25, 1.55, 1.45],
      [1.32, -1.22, 1.46, 1.5],
      [-1.2, 1.25, 1.52, 1.38],
      [1.28, 1.29, 1.3, 1.28],
    ];
    const buildCount = rng() < 0.25 ? 2 : 3;
    const indexes = buildCount === 2 ? [0, 2] : [0, 1, 2];
    indexes.forEach((index) => {
      const [x, z, maxW, maxD] = layouts[index];
      const localX = x + rand(rng, -0.05, 0.05);
      const localZ = z + rand(rng, -0.05, 0.05);
      const floors = 2 + Math.floor(rng() * 5);
      const color = choose(rng, BUILDING_COLORS);
      if (index === 0 && rng() < 0.26) {
        addRoundTower({
          blockGroup,
          blockX,
          blockZ,
          localX,
          localZ,
          radius: Math.min(maxW, maxD) * 0.42,
          floors,
          kind: "commercial",
          label,
          color,
        });
      } else {
        addTower({
          blockGroup,
          blockX,
          blockZ,
          localX,
          localZ,
          width: rand(rng, maxW * 0.78, maxW),
          depth: rand(rng, maxD * 0.78, maxD),
          floors,
          kind: "commercial",
          label,
          color,
        });
      }
    });
    const plazaIndex = buildCount === 2 ? 3 : 2;
    addTree(
      blockGroup,
      layouts[plazaIndex][0] * 0.7,
      layouts[plazaIndex][1] * 0.7,
      0.62,
      BLOCK_TOP
    );
    addBench(blockGroup, 1.9, 1.95, Math.PI * 0.2, BLOCK_TOP);
    addBush(blockGroup, -2.17, 2.1, 0.72, BLOCK_TOP);
    if (rng() < 0.7) addFlowers(blockGroup, 1.7, 1.95, BLOCK_TOP);
  }

  function addDowntownBlock(blockGroup, blockX, blockZ, label, landmark = false) {
    const floors = landmark ? 15 + Math.floor(rng() * 5) : 8 + Math.floor(rng() * 8);
    const width = landmark ? 2.3 : rand(rng, 2.1, 2.6);
    const depth = landmark ? 2.25 : rand(rng, 2.05, 2.55);
    const color = landmark
      ? choose(rng, ["#d7c29d", "#a7c3bd", "#d4a58e"])
      : choose(rng, ["#c6d1c8", "#d9c6a9", "#aebdc4", "#d8b58b", "#b9adc2"]);
    const localX = rand(rng, -0.15, 0.15);
    const localZ = rand(rng, -0.18, 0.18);
    if (!landmark && rng() < 0.32) {
      addRoundTower({
        blockGroup,
        blockX,
        blockZ,
        localX,
        localZ,
        radius: Math.min(width, depth) * 0.46,
        floors,
        kind: "downtown",
        label,
        color,
      });
    } else {
      addTower({
        blockGroup,
        blockX,
        blockZ,
        localX,
        localZ,
        width,
        depth,
        floors,
        kind: "downtown",
        label,
        color,
        landmark,
        setback: floors >= 10 && rng() < 0.62,
      });
    }
    if (rng() < 0.72) {
      addTower({
        blockGroup,
        blockX,
        blockZ,
        localX: rand(rng, 1.65, 1.95),
        localZ: rand(rng, 1.55, 1.8),
        width: rand(rng, 0.78, 1.02),
        depth: rand(rng, 0.78, 1.0),
        floors: 2 + Math.floor(rng() * 3),
        kind: "commercial",
        label,
        color: choose(rng, BUILDING_COLORS),
      });
    }
    addTree(blockGroup, -2.15, 2.08, 0.72, BLOCK_TOP);
    addTree(blockGroup, 2.2, -2.02, 0.56, BLOCK_TOP);
    addBench(blockGroup, -1.85, 1.58, Math.PI * 0.1, BLOCK_TOP);
    addFlowers(blockGroup, -1.7, -2.0, BLOCK_TOP);
  }

  function addParkBlock(blockGroup, blockX, blockZ, label) {
    const feature = new THREE.Group();
    feature.rotation.y = Math.floor(rng() * 4) * (Math.PI / 2);
    blockGroup.add(feature);

    addBox(feature, 5.25, 0.03, 0.62, pathMat, 0, BLOCK_TOP + 0.012, 0, { cast: false });
    addBox(feature, 0.62, 0.03, 5.25, pathMat, 0, BLOCK_TOP + 0.014, 0, { cast: false });
    addBox(feature, 1.5, 0.025, 0.5, pathMat, 1.55, BLOCK_TOP + 0.013, 1.2, { cast: false });

    addParkFountain(feature, 0, 0);
    addPond(feature, -1.42, 1.42, BLOCK_TOP);
    addGazebo(feature, 1.58, 1.52, BLOCK_TOP);
    addPlayground(feature, -1.38, -1.58, BLOCK_TOP);

    const treePositions = [
      [-2.2, -2.14, 0.74],
      [2.14, -2.02, 0.66],
      [2.22, 0.36, 0.56],
      [-2.22, 0.34, 0.52],
      [0.42, 2.3, 0.5],
      [2.28, 2.28, 0.7],
      [-2.28, -0.7, 0.48],
    ];
    for (const [x, z, scale] of treePositions) {
      addTree(feature, x, z, scale, BLOCK_TOP);
    }
    addBench(feature, 0.98, 0.78, -Math.PI / 2, BLOCK_TOP);
    addBench(feature, -0.98, -0.78, Math.PI / 2, BLOCK_TOP);
    addBench(feature, -1.42, 2.2, Math.PI, BLOCK_TOP);
    addBush(feature, 2.3, 2.3, 0.82, BLOCK_TOP);
    addBush(feature, -2.3, -2.3, 0.7, BLOCK_TOP);
    addBush(feature, 1.02, 1.98, 0.6, BLOCK_TOP);
    for (let i = 0; i < 5; i += 1) {
      addFlowers(feature, rand(rng, -2.25, 2.25), rand(rng, -2.25, 2.25), BLOCK_TOP);
    }
    addStreetLamp(blockX + 2.05, blockZ + 2.25, BLOCK_TOP, 0.76);
    addStreetLamp(blockX - 2.05, blockZ - 2.25, BLOCK_TOP, 0.76);

    const record = {
      id: `${label}-park`,
      name: makeName("park", label),
      kind: "park",
      label,
      floors: 0,
      detailLabel: "绿化覆盖",
      detailValue: `${Math.round(rand(rng, 58, 84))}%`,
      height: Math.round((BLOCK_TOP + 1.1) * 3.2 * 10) / 10,
      population: 0,
      jobs: Math.round(rand(rng, 12, 24)),
      occupancy: Math.round(rand(rng, 0.7, 0.96) * 100),
      year: 2034 + Math.floor(rng() * 14),
      color: "#7c9d59",
      note: choose(rng, SPECIAL_NOTES.park),
      address: `BLOCK ${label} · 像素湾${blockX > 0 ? "东" : "西"}区`,
      root: feature,
    };
    addBuildingInfo(feature, record);
    return record;
  }

  const defUseCount = new Map();

  function chooseWeightedDef(pool) {
    if (!pool.length) return null;
    const weights = pool.map((def) => 1 / (1 + (defUseCount.get(def.id) ?? 0) * 1.35));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = rng() * total;
    for (let index = 0; index < pool.length; index += 1) {
      roll -= weights[index];
      if (roll <= 0) return pool[index];
    }
    return pool[pool.length - 1];
  }

  function pickBuildingDef(district, lot, role) {
    const forcedPool = {
      clocktower: ["b-clocktower"],
      lighthouse: ["b-lighthouse"],
      landmark: ["b-observation", "b-skygarden"],
      skyscraper: SKYSCRAPERS.map((asset) => asset.id),
      school: ["b-school"],
      civic: ["b-cityhall", "b-museum", "b-library"],
      industrial: ["b-energy", "b-warehouse", "b-workshop"],
      warehouse: ["b-warehouse", "b-workshop", "b-market"],
      market: ["b-market", "b-department", "b-bookshop"],
    };
    if (role && forcedPool[role]) {
      const candidatePool =
        role === "skyscraper" ? SKYSCRAPERS : forcedPool[role].map((id) => BUILDINGS_BY_ID.get(id));
      const candidates = candidatePool.filter(Boolean);
      if (candidates.length) {
        const def = choose(rng, candidates);
        defUseCount.set(def.id, (defUseCount.get(def.id) ?? 0) + 1);
        return def;
      }
    }

    const allowedFamilies = district.model.families ?? [];
    const pool = BUILDINGS.filter((def) => {
      if (def.family === "landmark") return false;
      if (def.districts && !def.districts.includes(district.id)) return false;
      if (allowedFamilies.length && !allowedFamilies.includes(def.family)) return false;
      return def.model.width[0] <= lot.w + 0.12 && def.model.depth[0] <= lot.d + 0.12;
    });
    const fallback = BUILDINGS.filter(
      (def) =>
        def.family !== "landmark" &&
        def.districts?.includes(district.id) &&
        def.model.width[0] <= lot.w + 0.12
    );
    const def = chooseWeightedDef(pool.length ? pool : fallback);
    if (def) defUseCount.set(def.id, (defUseCount.get(def.id) ?? 0) + 1);
    return def;
  }

  function addSignPanel(parent, color, width, height, x, y, z, rotationY = 0) {
    const material = standard(color, {
      emissive: color,
      emissiveIntensity: 0.08,
      roughness: 0.45,
    });
    neonMaterials.push(material);
    addBox(parent, width, height, 0.05, material, x, y, z, {
      cast: false,
      receive: false,
    }).rotation.y = rotationY;
    return material;
  }

  function addAwning(parent, width, x, y, z, color) {
    addBox(parent, width, 0.06, 0.26, standard(color), x, y, z, {
      cast: false,
      receive: false,
    });
    const strip = standard(color, { emissive: color, emissiveIntensity: 0.05 });
    neonMaterials.push(strip);
    for (let i = 0; i < Math.max(3, Math.round(width / 0.18)); i += 1) {
      addBox(
        parent,
        0.06,
        0.12,
        0.035,
        i % 2 === 0 ? whiteMat : strip,
        x - width / 2 + 0.09 + (i * (width - 0.18)) / Math.max(1, Math.round(width / 0.18) - 1),
        y - 0.08,
        z + 0.12,
        { cast: false, receive: false }
      );
    }
  }

  function decorateCityBuilding(record, def) {
    if (!record?.root || !def) return;
    const root = record.root;
    const width = record.footprint.width;
    const depth = record.footprint.depth;
    const top = record.bodyTop ?? record.topY;
    const style = record.style ?? def.model.style;
    const accent = def.model.accent;
    const wall = standard(record.color);
    const trim = trimMat;
    const front = depth / 2 + 0.05;

    if (["library", "museum", "cityhall"].includes(style)) {
      const columnHeight = Math.min(top - 0.25, 0.82);
      const columnCount = Math.max(3, Math.round(width / 0.32));
      for (let index = 0; index < columnCount; index += 1) {
        const x = -width * 0.38 + (index * width * 0.76) / Math.max(1, columnCount - 1);
        addBox(root, 0.065, columnHeight, 0.065, whiteMat, x, 0.22 + columnHeight / 2, front + 0.08);
      }
      addBox(
        root,
        width * 0.86,
        0.12,
        depth * 0.24,
        trim,
        0,
        0.22 + columnHeight + 0.06,
        front + 0.02
      );
      addGable(root, width * 0.8, 0.28, depth * 0.86, trim, 0, 0.22 + columnHeight + 0.12, 0);
      addBox(root, width * 0.62, 0.06, 0.32, stoneMat, 0, 0.08, front + 0.26, {
        cast: false,
      });
      addBox(root, width * 0.52, 0.06, 0.24, stoneMat, 0, 0.14, front + 0.18, {
        cast: false,
      });
      if (style === "museum" || style === "cityhall") {
        addRoundCylinder(root, Math.min(width, depth) * 0.18, 0.16, trim, 0, top + 0.18, 0);
        addSphere(root, Math.min(width, depth) * 0.21, domeMat, 0, top + 0.25, 0, 0.62);
        addBox(root, 0.04, 0.18, 0.04, blackMat, 0, top + 0.24 + Math.min(width, depth) * 0.2, 0);
      }
      if (style === "cityhall") {
        const face = addRoundCylinder(root, 0.16, 0.04, whiteMat, 0, top * 0.72, front + 0.16);
        face.rotation.x = Math.PI / 2;
        addBox(root, 0.025, 0.11, 0.015, blackMat, 0, top * 0.72, front + 0.2);
      }
    }

    if (style === "school") {
      addBox(root, 0.07, 0.75, 0.07, whiteMat, width * 0.32, top + 0.38, depth * 0.14);
      addBox(root, 0.34, 0.2, 0.03, standard("#e56f5e"), width * 0.32 + 0.18, top + 0.65, depth * 0.14, {
        cast: false,
      });
      addBox(root, 0.36, 0.26, 0.36, trim, -width * 0.24, top + 0.2, depth * 0.12);
      addRoundCylinder(root, 0.09, 0.1, standard("#d9b869"), -width * 0.24, top + 0.38, depth * 0.12);
      addBox(root, width * 0.42, 0.26, 0.04, glassMat, 0, 0.44, front + 0.08, {
        cast: false,
      });
    }

    if (style === "fire") {
      addBox(root, width * 0.64, 0.52, 0.05, standard("#b24f44"), 0, 0.4, front + 0.04, {
        cast: false,
      });
      for (const x of [-width * 0.18, width * 0.18]) {
        addBox(root, width * 0.22, 0.36, 0.03, glassMat, x, 0.36, front + 0.08, {
          cast: false,
        });
      }
      addBox(root, width * 0.18, 1.1, width * 0.18, wall, width * 0.28, top + 0.55, -depth * 0.2);
      addSignPanel(root, "#c94f45", width * 0.28, 0.12, 0, 0.8, front + 0.08);
    }

    if (style === "clinic") {
      addSignPanel(root, "#e7695d", 0.26, 0.26, 0, top * 0.66, front + 0.1);
      addBox(root, 0.1, 0.1, 0.01, whiteMat, 0, top * 0.66, front + 0.13, {
        cast: false,
      });
      addRoundCylinder(root, width * 0.16, 0.025, standard("#8c9d94"), 0, top + 0.14, 0, {
        cast: false,
      });
      addBox(root, width * 0.26, 0.03, 0.34, trim, 0, 0.045, front + 0.26, {
        cast: false,
      });
    }

    if (style === "warehouse") {
      const bays = 3;
      for (let index = 0; index < bays; index += 1) {
        const bayWidth = (width * 0.94) / bays;
        const x = -width * 0.47 + bayWidth * (index + 0.5);
        addGable(root, bayWidth * 1.02, 0.23, depth * 0.72, standard(def.model.roof), x, top, 0, 0);
      }
      addBox(root, width * 0.54, 0.38, 0.05, glassMat, 0, 0.36, front + 0.045, {
        cast: false,
      });
      addBox(root, width * 0.62, 0.04, 0.38, trim, 0, 0.22, front + 0.2, { cast: false });
      for (let index = 0; index < 3; index += 1) {
        addBox(
          root,
          rand(rng, 0.16, 0.26),
          rand(rng, 0.14, 0.22),
          rand(rng, 0.16, 0.24),
          standard("#8b6d4e"),
          width * 0.25 + rand(rng, -0.1, 0.1),
          0.18 + index * 0.13,
          front + 0.45
        );
      }
    }

    if (style === "workshop") {
      addRoundCylinder(root, 0.11, 1.2, standard("#6f6f68"), -width * 0.28, top + 0.58, -depth * 0.25);
      addRoundCylinder(root, 0.15, 0.12, standard("#4a4b46"), -width * 0.28, top + 1.18, -depth * 0.25);
      addBox(root, 0.05, 0.55, 0.05, steelDarkMat, width * 0.28, top + 0.28, -depth * 0.18);
      addBox(root, 0.2, 0.04, 0.2, steelMat, width * 0.28, top + 0.58, -depth * 0.18);
      addSignPanel(root, "#e0a24e", width * 0.34, 0.1, 0, 0.52, front + 0.06);
    }

    if (style === "energy") {
      for (const x of [-width * 0.24, width * 0.24]) {
        addRoundCylinder(root, width * 0.16, 0.62, standard("#9da5a0"), x, top + 0.31, -depth * 0.05);
        addRoundCylinder(root, width * 0.13, 0.03, standard("#3e4947"), x, top + 0.62, -depth * 0.05);
      }
      for (let index = 0; index < 4; index += 1) {
        addBox(
          root,
          0.09,
          0.16,
          0.09,
          steelDarkMat,
          -width * 0.34 + index * 0.18,
          0.28,
          front + 0.22
        );
      }
      addBox(root, 0.07, 0.07, 0.07, beaconMat, width * 0.1, top + 0.8, -depth * 0.05, {
        cast: false,
        receive: false,
      });
    }

    if (style === "market") {
      addGable(root, width * 0.96, 0.42, depth * 0.8, glassMat, 0, top, 0, 0);
      for (let index = 0; index < 3; index += 1) {
        const stallColor = ["#e3765d", "#e4b455", "#6eb7a8"][index];
        const x = -width * 0.3 + index * width * 0.3;
        addBox(root, width * 0.22, 0.035, depth * 0.22, standard(stallColor), x, 0.25, front + 0.28, {
          cast: false,
        });
        addAwning(root, width * 0.2, x, 0.48, front + 0.3, stallColor);
      }
      addSignPanel(root, accent, width * 0.42, 0.12, 0, 0.78, front + 0.08);
    }

    if (style === "glass") {
      for (let index = 0; index < 4; index += 1) {
        const x = -width * 0.36 + index * width * 0.24;
        addBox(root, 0.035, top * 0.82, 0.03, steelMat, x, top * 0.51, front + 0.02, {
          cast: false,
        });
      }
      addBox(root, width * 0.58, 0.14, depth * 0.58, steelMat, 0, top + 0.2, 0);
      addBox(root, width * 0.5, 0.05, depth * 0.5, glassMat, 0, top + 0.29, 0);
    }

    if (style === "media") {
      addSignPanel(root, accent, width * 0.72, 0.28, 0, top - 0.25, front + 0.07);
      addBox(root, 0.035, 1.5, 0.035, blackMat, 0, top + 0.78, 0);
      addRoundCylinder(root, 0.22, 0.035, steelMat, 0, top + 0.3, -depth * 0.12);
    }

    if (style === "hotel") {
      for (let floor = 2; floor < record.floors; floor += 2) {
        addBox(root, width * 0.74, 0.045, 0.18, trimMat, 0, 0.22 + floor * FLOOR_HEIGHT, front + 0.1, {
          cast: false,
        });
        addBox(root, width * 0.74, 0.11, 0.03, steelLightMat, 0, 0.22 + floor * FLOOR_HEIGHT + 0.08, front + 0.19, {
          cast: false,
        });
      }
      addSignPanel(root, "#ee8d6c", width * 0.64, 0.28, 0, top + 0.32, front + 0.04);
      addAwning(root, width * 0.44, 0, 0.62, front + 0.18, "#e9896a");
    }

    if (style === "cinema") {
      addBox(root, width * 0.67, 0.12, 0.42, accent, 0, 0.83, front + 0.28, {
        cast: false,
      });
      addSignPanel(root, "#f2c45a", width * 0.47, 0.2, 0, 0.93, front + 0.51);
      for (let index = 0; index < 2; index += 1) {
        addBox(root, width * 0.12, 0.3, 0.035, glassMat, -width * 0.18 + index * width * 0.36, 0.38, front + 0.04, {
          cast: false,
        });
      }
    }

    if (style === "arcade") {
      addSignPanel(root, "#71d6c9", width * 0.66, 0.16, 0, 0.82, front + 0.06);
      for (let index = 0; index < 4; index += 1) {
        addBox(root, 0.11, 0.24, 0.03, index % 2 === 0 ? standard("#d773a3", { emissive: "#c2528b", emissiveIntensity: 0.16 }) : standard("#f0c15c", { emissive: "#e3a93f", emissiveIntensity: 0.16 }), -width * 0.27 + index * width * 0.18, 0.43, front + 0.04, {
          cast: false,
          receive: false,
        });
      }
    }

    if (style === "diner" || style === "cafe") {
      addAwning(root, width * 0.58, 0, 0.73, front + 0.17, style === "diner" ? "#e9896c" : accent);
      addSignPanel(root, accent, width * 0.36, 0.16, 0, 0.94, front + 0.06);
      if (style === "diner") {
        addBox(root, 0.3, 0.04, 0.3, whiteMat, width * 0.25, 0.14, front + 0.45, { cast: false });
        addRoundCylinder(root, 0.04, 0.18, steelDarkMat, width * 0.25, 0.24, front + 0.45);
      }
    }

    if (style === "bookshop") {
      addBox(root, width * 0.45, 0.16, 0.06, accent, 0, 0.94, front + 0.05);
      addAwning(root, width * 0.56, 0, 0.7, front + 0.16, "#d2b06d");
      addBox(root, width * 0.12, 0.3, 0.18, standard("#8b6b4c"), -width * 0.3, 0.18, front + 0.24);
    }

    if (style === "department") {
      addBox(root, width * 0.72, 0.24, depth * 0.72, trim, 0, top + 0.18, 0);
      addBox(root, width * 0.52, 0.18, depth * 0.52, trim, 0, top + 0.38, 0);
      addSignPanel(root, accent, width * 0.5, 0.16, 0, 0.92, front + 0.05);
      addAwning(root, width * 0.62, 0, 0.72, front + 0.16, accent);
    }

    if (style === "office") {
      for (let floor = 2; floor < record.floors; floor += 2) {
        addBox(root, width * 0.76, 0.04, depth * 0.76, standard("#9d9f95", { roughness: 0.7 }), 0, 0.22 + floor * FLOOR_HEIGHT, 0, {
          cast: false,
        });
      }
    }

    if (style === "clocktower") {
      const faceMaterial = standard("#efe3c6");
      for (const zSide of [-1, 1]) {
        const face = addRoundCylinder(
          root,
          0.2,
          0.04,
          faceMaterial,
          0,
          top * 0.76,
          zSide * (depth / 2 + 0.05)
        );
        face.rotation.x = Math.PI / 2;
        addBox(root, 0.025, 0.12, 0.01, blackMat, 0, top * 0.76, zSide * (depth / 2 + 0.08));
      }
      addGable(root, width * 0.8, 0.5, depth * 0.8, standard(def.model.roof), 0, top + 0.1, 0);
      addBox(root, 0.05, 0.8, 0.05, blackMat, 0, top + 0.9, 0);
      const beacon = addBox(root, 0.08, 0.08, 0.08, beaconMat, 0, top + 1.32, 0, {
        cast: false,
        receive: false,
      });
      beacons.push({ mesh: beacon, phase: rng() * TAU });
    }

    if (style === "observation") {
      addRoundCylinder(root, width * 0.42, 0.12, trim, 0, top + 0.2, 0);
      addRoundCylinder(root, width * 0.3, 0.14, glassMat, 0, top + 0.33, 0);
      addRoundCylinder(root, width * 0.2, 0.18, trim, 0, top + 0.49, 0);
      addBox(root, 0.03, 0.9, 0.03, blackMat, 0, top + 0.92, 0);
      const beacon = addBox(root, 0.07, 0.07, 0.07, beaconMat, 0, top + 1.4, 0, {
        cast: false,
        receive: false,
      });
      beacons.push({ mesh: beacon, phase: rng() * TAU });
      addBox(root, 0.028, top * 0.8, 0.028, headlightMat, width * 0.42, top * 0.4, 0, {
        cast: false,
        receive: false,
      });
    }

    if (style === "skygarden") {
      const levels = Math.min(4, Math.floor(record.floors / 2));
      for (let level = 1; level <= levels; level += 1) {
        const y = 0.22 + level * 2 * FLOOR_HEIGHT;
        addBox(root, width * 0.88, 0.06, 0.24, standard(def.model.accent), 0, y, front + 0.09, {
          cast: false,
        });
        addBush(root, -width * 0.24 + level * width * 0.12, front + 0.08, 0.28, y + 0.04);
        addBush(root, width * 0.24 - level * width * 0.04, front + 0.08, 0.28, y + 0.04);
      }
      addBox(root, width * 0.56, 0.12, depth * 0.56, standard("#6f9a60"), 0, top + 0.18, 0);
    }
  }

  function addCatalogBuilding({
    blockGroup,
    blockX,
    blockZ,
    localX,
    localZ,
    lot,
    def,
    label,
    district,
    role,
  }) {
    if (!def) return null;
    const model = def.model;
    const width = Math.max(0.55, Math.min(lot.w, rand(rng, model.width[0], model.width[1])));
    const depth = Math.max(0.55, Math.min(lot.d, rand(rng, model.depth[0], model.depth[1])));
    let floors = Math.max(1, Math.round(rand(rng, model.floors[0], model.floors[1])));
    if (role === "landmark" || role === "clocktower" || role === "lighthouse") {
      floors = Math.max(floors, model.floors[0]);
    }
    const color = choose(rng, model.walls);
    const style = model.style;
    const kind = def.family === "skyscraper" ? "downtown" : def.family;
    let record = null;

    if (def.family === "skyscraper") {
      const baseSize = Math.min(lot.w + 0.28, Math.max(width, depth) * (model.plinthScale ?? 1.3));
      addBox(blockGroup, baseSize, 0.06, baseSize, stoneMat, localX, BLOCK_TOP + 0.015, localZ, {
        cast: false,
      });
      addBox(blockGroup, baseSize * 0.86, 0.055, baseSize * 0.86, trimMat, localX, BLOCK_TOP + 0.065, localZ, {
        cast: false,
      });
      for (let step = 0; step < 3; step += 1) {
        addBox(
          blockGroup,
          width * 0.58 - step * 0.14,
          0.035,
          0.18,
          stoneMat,
          localX,
          BLOCK_TOP + 0.09 + step * 0.03,
          localZ + depth * 0.55 + 0.12 + step * 0.09,
          { cast: false }
        );
      }
      addPlanter(blockGroup, localX - baseSize * 0.43, localZ + baseSize * 0.32, 0, BLOCK_TOP + 0.09);
      addPlanter(blockGroup, localX + baseSize * 0.43, localZ - baseSize * 0.32, 0, BLOCK_TOP + 0.09);
    }

    if (["gable", "townhouse", "courtyard"].includes(style)) {
      record = addHouse({
        blockGroup,
        blockX,
        blockZ,
        localX,
        localZ,
        width,
        depth,
        floors: Math.min(floors, 3),
        label,
        color,
        typeDef: def,
        style,
      });
      decorateCityBuilding(record, def);
    } else if (style === "lighthouse") {
      record = addRoundTower({
        blockGroup,
        blockX,
        blockZ,
        localX,
        localZ,
        radius: Math.min(width, depth) * 0.48,
        floors: Math.max(4, floors),
        kind,
        label,
        color,
        typeDef: def,
        style,
      });
      const root = record.root;
      const radius = Math.min(width, depth) * 0.48;
      const top = record.bodyTop;
      for (let band = 1; band < record.floors; band += 2) {
        addRoundCylinder(
          root,
          radius + 0.015,
          0.24,
          standard(def.model.roof),
          0,
          0.22 + band * FLOOR_HEIGHT,
          0
        );
      }
      addRoundCylinder(root, radius * 0.72, 0.3, glassMat, 0, top + 0.34, 0);
      addPyramid(root, radius * 1.5, 0.35, radius * 1.5, standard(def.model.roof), 0, top + 0.64, 0, Math.PI / 4);
      addBox(root, 0.06, 0.06, 0.06, lampHeadMat, 0, top + 0.47, 0, { cast: false, receive: false });
      addGlowPlane(root, 0, top + 0.06, 0, 1.4);
      decorateCityBuilding(record, def);
    } else if (style === "observation") {
      record = addRoundTower({
        blockGroup,
        blockX,
        blockZ,
        localX,
        localZ,
        radius: Math.min(width, depth) * 0.38,
        floors: Math.max(8, floors),
        kind,
        label,
        color,
        typeDef: def,
        style,
      });
      decorateCityBuilding(record, def);
    } else if (style === "twin") {
      const towerWidth = width * 0.48;
      const left = addTower({
        blockGroup,
        blockX,
        blockZ,
        localX: localX - width * 0.28,
        localZ,
        width: towerWidth,
        depth,
        floors,
        kind: "downtown",
        label,
        color,
        typeDef: def,
        style,
      });
      const right = addTower({
        blockGroup,
        blockX,
        blockZ,
        localX: localX + width * 0.28,
        localZ,
        width: towerWidth,
        depth,
        floors,
        kind: "downtown",
        label,
        color,
        typeDef: def,
        style,
      });
      addBox(
        blockGroup,
        width * 0.34,
        0.13,
        depth * 0.48,
        glassMat,
        localX,
        BLOCK_TOP + floors * FLOOR_HEIGHT * 0.56,
        localZ
      );
      decorateCityBuilding(left, def);
      decorateCityBuilding(right, def);
      applySkyscraperHeight(left, def);
      applySkyscraperHeight(right, def);
      record = left;
      addBuildingRecordDistrict(left, district);
      addBuildingRecordDistrict(right, district);
      return left;
    } else {
      const setback = ["stepped", "skygarden"].includes(style) && floors >= 6;
      record = addTower({
        blockGroup,
        blockX,
        blockZ,
        localX,
        localZ,
        width,
        depth,
        floors,
        kind,
        label,
        color,
        apartment: def.family === "residential",
        landmark: role === "landmark",
        setback,
        typeDef: def,
        style,
      });
      decorateCityBuilding(record, def);
    }

    if (record) {
      decorateCitySkyscraper(record, def);
      applySkyscraperHeight(record, def);
      addBuildingRecordDistrict(record, district);
    }
    return record;
  }

  function applySkyscraperHeight(record, def) {
    if (!record || def?.family !== "skyscraper") return;
    const crownHeight = record.style === "observation" ? 24 : record.style === "skygarden" ? 18 : 14;
    record.height = Math.round((record.floors * 4.2 + crownHeight) * 10) / 10;
    record.isSupertall = true;
  }

  function addBuildingRecordDistrict(record, district) {
    if (!record || !district) return;
    record.districtId = district.id;
    record.districtName = district.name;
    record.address = `BLOCK ${record.label} · ${district.name}`;
    if (district.model?.accent) record.districtAccent = district.model.accent;
  }

  function decorateCitySkyscraper(record, def) {
    if (!record || def?.family !== "skyscraper") return;
    if (["twin", "observation", "skygarden"].includes(record.style)) return;
    const root = record.root;
    const width = record.footprint.width;
    const depth = record.footprint.depth;
    const top = record.bodyTop;
    const accentColor = def.model.accent;
    const accentMaterial = standard(accentColor, {
      emissive: accentColor,
      emissiveIntensity: 0.1,
      roughness: 0.55,
    });
    neonMaterials.push(accentMaterial);

    addBox(root, width * 0.78, 0.26, depth * 0.78, trimMat, 0, top + 0.18, 0);
    addBox(root, width * 0.62, 0.46, depth * 0.62, glassMat, 0, top + 0.54, 0, {
      cast: false,
    });
    addBox(root, width * 0.42, 0.3, depth * 0.42, wallMaterialFor(record.color), 0, top + 0.92, 0);
    addBox(root, width * 0.3, 0.08, depth * 0.3, accentMaterial, 0, top + 1.1, 0, {
      cast: false,
      receive: false,
    });
    addBox(root, 0.028, 1.55, 0.028, blackMat, 0, top + 1.85, 0);
    const beacon = addBox(root, 0.075, 0.075, 0.075, beaconMat, 0, top + 2.66, 0, {
      cast: false,
      receive: false,
    });
    beacons.push({ mesh: beacon, phase: rng() * TAU });
  }

  function wallMaterialFor(color) {
    return standard(color);
  }

  function addBusShelter(parent, x, z, rotation = 0, baseY = BLOCK_TOP) {
    const shelter = new THREE.Group();
    shelter.position.set(x, baseY, z);
    shelter.rotation.y = rotation;
    addBox(shelter, 0.86, 0.04, 0.42, deckMat, 0, 0.02, 0, { cast: false });
    for (const px of [-0.34, 0.34]) {
      for (const pz of [-0.15, 0.15]) {
        addBox(shelter, 0.035, 0.55, 0.035, steelDarkMat, px, 0.29, pz);
      }
    }
    addBox(shelter, 0.9, 0.055, 0.46, trimMat, 0, 0.57, 0);
    addBox(shelter, 0.77, 0.33, 0.025, glassMat, 0, 0.35, -0.17, { cast: false });
    addBox(shelter, 0.48, 0.045, 0.15, doorMat, 0, 0.23, -0.1);
    addSignPanel(shelter, "#e6b95b", 0.34, 0.12, 0.42, 0.57, 0);
    parent.add(shelter);
    return shelter;
  }

  function addNewsKiosk(parent, x, z, rotation = 0, baseY = BLOCK_TOP) {
    const kiosk = new THREE.Group();
    kiosk.position.set(x, baseY, z);
    kiosk.rotation.y = rotation;
    addBox(kiosk, 0.42, 0.46, 0.32, standard("#816747"), 0, 0.25, 0);
    addBox(kiosk, 0.46, 0.05, 0.38, trimMat, 0, 0.5, 0);
    addBox(kiosk, 0.3, 0.18, 0.025, glassMat, 0, 0.3, 0.17, { cast: false });
    addAwning(kiosk, 0.4, 0, 0.42, 0.2, "#d6ab5a");
    addSignPanel(kiosk, "#e0c06e", 0.24, 0.08, 0, 0.48, 0.2);
    parent.add(kiosk);
    return kiosk;
  }

  function addPostbox(parent, x, z, rotation = 0, baseY = BLOCK_TOP) {
    const box = new THREE.Group();
    box.position.set(x, baseY, z);
    box.rotation.y = rotation;
    addBox(box, 0.2, 0.42, 0.2, standard("#bd5349"), 0, 0.22, 0);
    addBox(box, 0.24, 0.08, 0.24, standard("#8e3f39"), 0, 0.45, 0);
    addBox(box, 0.1, 0.025, 0.025, blackMat, 0, 0.34, 0.11);
    parent.add(box);
    return box;
  }

  function addTrashBin(parent, x, z, rotation = 0, baseY = BLOCK_TOP) {
    const bin = new THREE.Group();
    bin.position.set(x, baseY, z);
    bin.rotation.y = rotation;
    addRoundCylinder(bin, 0.105, 0.3, standard("#4e6958"), 0, 0.15, 0);
    addRoundCylinder(bin, 0.12, 0.045, standard("#a9a28f"), 0, 0.32, 0);
    parent.add(bin);
    return bin;
  }

  function addPlanter(parent, x, z, rotation = 0, baseY = BLOCK_TOP) {
    const planter = new THREE.Group();
    planter.position.set(x, baseY, z);
    planter.rotation.y = rotation;
    addBox(planter, 0.66, 0.18, 0.28, stoneMat, 0, 0.09, 0);
    addBox(planter, 0.56, 0.035, 0.2, standard("#665542"), 0, 0.18, 0, { cast: false });
    addBush(planter, -0.19, 0, 0.44, 0.18);
    addBush(planter, 0.1, 0, 0.38, 0.18);
    addFlowers(planter, 0.22, 0.02, 0.2);
    parent.add(planter);
    return planter;
  }

  function addStatue(parent, x, z, rotation = 0, baseY = BLOCK_TOP) {
    const statue = new THREE.Group();
    statue.position.set(x, baseY, z);
    statue.rotation.y = rotation;
    addBox(statue, 0.55, 0.13, 0.55, stoneMat, 0, 0.065, 0);
    addBox(statue, 0.42, 0.12, 0.42, trimMat, 0, 0.18, 0);
    addBox(statue, 0.13, 0.56, 0.16, standard("#6f8279", { roughness: 0.55, metalness: 0.18 }), 0, 0.5, 0);
    addBox(statue, 0.28, 0.09, 0.17, standard("#6f8279", { roughness: 0.55, metalness: 0.18 }), 0, 0.66, 0);
    addIcosa(statue, 0.1, standard("#6f8279", { roughness: 0.55, metalness: 0.18 }), 0, 0.85, 0);
    parent.add(statue);
    return statue;
  }

  function addBillboard(parent, x, z, rotation = 0, baseY = BLOCK_TOP) {
    const board = new THREE.Group();
    board.position.set(x, baseY, z);
    board.rotation.y = rotation;
    for (const side of [-1, 1]) {
      addBox(board, 0.045, 0.8, 0.045, steelDarkMat, side * 0.32, 0.4, 0);
    }
    addBox(board, 0.9, 0.46, 0.05, blackMat, 0, 0.78, 0);
    addSignPanel(board, choose(rng, ACCENT_COLORS), 0.82, 0.38, 0, 0.78, 0.05);
    parent.add(board);
    return board;
  }

  function addBikeRack(parent, x, z, rotation = 0, baseY = BLOCK_TOP) {
    const rack = new THREE.Group();
    rack.position.set(x, baseY, z);
    rack.rotation.y = rotation;
    for (let index = 0; index < 3; index += 1) {
      const offset = -0.22 + index * 0.22;
      addBox(rack, 0.025, 0.34, 0.025, steelDarkMat, offset, 0.17, -0.16);
      addBox(rack, 0.025, 0.34, 0.025, steelDarkMat, offset, 0.17, 0.16);
      addBox(rack, 0.025, 0.025, 0.32, steelDarkMat, offset, 0.34, 0);
    }
    parent.add(rack);
    return rack;
  }

  function addCrateStack(parent, x, z, rotation = 0, baseY = BLOCK_TOP) {
    const stack = new THREE.Group();
    stack.position.set(x, baseY, z);
    stack.rotation.y = rotation;
    const crateMat = standard("#846544");
    for (let index = 0; index < 5; index += 1) {
      addBox(
        stack,
        rand(rng, 0.22, 0.32),
        rand(rng, 0.16, 0.24),
        rand(rng, 0.22, 0.3),
        crateMat,
        rand(rng, -0.22, 0.22),
        0.08 + (index > 2 ? 0.18 : 0),
        rand(rng, -0.2, 0.2)
      );
    }
    parent.add(stack);
    return stack;
  }

  function addSportsCourt(parent, x, z, rotation = 0, baseY = BLOCK_TOP) {
    const court = new THREE.Group();
    court.position.set(x, baseY, z);
    court.rotation.y = rotation;
    addBox(court, 2.25, 0.08, 1.38, standard("#527b92"), 0, 0.04, 0, { cast: false });
    addBox(court, 2.38, 0.05, 1.5, trimMat, 0, 0.025, 0, { cast: false });
    const line = standard("#e3e6db", { roughness: 0.8 });
    addBox(court, 2.06, 0.012, 0.045, line, 0, 0.09, -0.58, { cast: false });
    addBox(court, 2.06, 0.012, 0.045, line, 0, 0.09, 0.58, { cast: false });
    addBox(court, 0.045, 0.012, 1.2, line, -1.02, 0.09, 0, { cast: false });
    addBox(court, 0.045, 0.012, 1.2, line, 1.02, 0.09, 0, { cast: false });
    addBox(court, 0.045, 0.012, 1.2, line, 0, 0.09, 0, { cast: false });
    for (const side of [-1, 1]) {
      addBox(court, 0.045, 0.72, 0.045, steelDarkMat, side * 1.13, 0.4, 0);
      addBox(court, 0.035, 0.3, 0.52, whiteMat, side * 1.1, 0.68, 0);
      addBox(court, 0.14, 0.028, 0.14, standard("#e8865d"), side * 0.98, 0.53, 0, {
        cast: false,
      });
    }
    addBench(court, -0.75, 1.02, Math.PI, 0.02);
    addBench(court, 0.75, 1.02, Math.PI, 0.02);
    parent.add(court);
    return court;
  }

  function addGreenhouse(parent, x, z, rotation = 0, baseY = BLOCK_TOP) {
    const house = new THREE.Group();
    house.position.set(x, baseY, z);
    house.rotation.y = rotation;
    addBox(house, 1.45, 0.08, 1.0, stoneMat, 0, 0.04, 0, { cast: false });
    addBox(house, 1.25, 0.58, 0.8, glassMat, 0, 0.35, 0, { cast: false });
    for (const px of [-0.62, 0, 0.62]) {
      for (const pz of [-0.4, 0.4]) {
        addBox(house, 0.035, 0.62, 0.035, whiteMat, px, 0.34, pz);
      }
    }
    addGable(house, 1.35, 0.32, 0.9, glassMat, 0, 0.64, 0);
    addBox(house, 0.3, 0.05, 0.85, whiteMat, 0, 0.3, 0, { cast: false });
    for (let index = 0; index < 4; index += 1) {
      addBox(house, 0.18, 0.1, 0.18, standard("#765b43"), -0.46 + index * 0.31, 0.12, 0.46);
      addFlowers(house, -0.46 + index * 0.31, 0.46, 0.12);
    }
    parent.add(house);
    return house;
  }

  function addParkLantern(parent, x, z, baseY = BLOCK_TOP) {
    addBox(parent, 0.045, 0.28, 0.045, blackMat, x, baseY + 0.14, z);
    addBox(parent, 0.11, 0.12, 0.11, lampHeadMat, x, baseY + 0.32, z, {
      cast: false,
      receive: false,
    });
  }

  function addCatalogParkBlock(blockGroup, blockX, blockZ, label, parkDef) {
    const parkType = parkDef?.model.park ?? "fountain";
    const feature = new THREE.Group();
    feature.rotation.y = Math.floor(rng() * 4) * (Math.PI / 2);
    blockGroup.add(feature);
    const baseY = BLOCK_TOP;
    const addTreeHere = (x, z, scale = 0.7, species = null) =>
      addTree(feature, x, z, scale, baseY, species);

    if (parkType === "pocket") {
      addBox(feature, 2.2, 0.03, 0.48, pathMat, 0, baseY + 0.012, 1.72, { cast: false });
      addBox(feature, 0.48, 0.03, 1.8, pathMat, -1.55, baseY + 0.012, 0.3, { cast: false });
      addTreeHere(-1.55, -1.45, 0.72, "broadleaf");
      addTreeHere(1.55, -1.28, 0.56, "cherry");
      addBench(feature, 0.7, 1.72, Math.PI, baseY);
      addBush(feature, 1.9, 1.7, 0.7, baseY);
      addFlowers(feature, 0.2, 1.9, baseY);
      addPlanter(feature, -2.05, 1.9, 0, baseY);
    } else if (parkType === "playground") {
      addBox(feature, 3.3, 0.035, 2.7, sandMat, 0, baseY + 0.015, 0, { cast: false });
      addBox(feature, 5.2, 0.03, 0.55, pathMat, 0, baseY + 0.012, 2.2, { cast: false });
      addPlayground(feature, 0, 0.15, baseY);
      addBench(feature, -1.8, 2.22, 0, baseY);
      addBench(feature, 1.8, 2.22, 0, baseY);
      addTreeHere(-2.15, -1.75, 0.6, "broadleaf");
      addTreeHere(2.1, -1.8, 0.54, "cherry");
      addFlowers(feature, -1.9, 1.6, baseY);
    } else if (parkType === "sports") {
      addBox(feature, 5.25, 0.03, 0.6, pathMat, 0, baseY + 0.012, 2.05, { cast: false });
      addSportsCourt(feature, 0, 0, 0, baseY);
      addTreeHere(-2.25, -1.9, 0.55, "conifer");
      addTreeHere(2.25, 1.9, 0.55, "broadleaf");
      addPlanter(feature, -2.2, 1.9, 0, baseY);
    } else if (parkType === "botanical") {
      addBox(feature, 2.0, 0.03, 0.56, pathMat, 0, baseY + 0.012, 1.9, { cast: false });
      addBox(feature, 0.56, 0.03, 3.3, pathMat, 1.65, baseY + 0.013, 0.2, { cast: false });
      addGreenhouse(feature, -1.1, 1.0, 0.08, baseY);
      addTreeHere(-1.9, -1.8, 0.58, "palm");
      addTreeHere(0.3, -1.9, 0.5, "palm");
      addTreeHere(2.1, -1.7, 0.45, "broadleaf");
      for (let index = 0; index < 3; index += 1) {
        addBox(feature, 0.34, 0.08, 0.75, standard("#8d6d4d"), 0.5 + index * 0.56, baseY + 0.05, 1.96, {
          cast: false,
        });
        addFlowers(feature, 0.5 + index * 0.56, 1.96, baseY + 0.04);
      }
      addBench(feature, -2.15, 1.95, 0, baseY);
    } else if (parkType === "cherry") {
      addBox(feature, 3.8, 0.03, 0.72, stoneMat, 0, baseY + 0.015, 0, { cast: false });
      addBox(feature, 0.72, 0.03, 2.5, stoneMat, 0, baseY + 0.016, 0.82, { cast: false });
      for (const [x, z, scale] of [
        [-1.9, -1.7, 0.8],
        [1.85, -1.55, 0.72],
        [-1.8, 1.75, 0.66],
        [1.8, 1.72, 0.78],
      ]) {
        addTreeHere(x, z, scale, "cherry");
      }
      addParkLantern(feature, -0.9, 1.7, baseY);
      addParkLantern(feature, 0.9, 1.7, baseY);
      addBench(feature, 0.92, -0.4, -Math.PI / 2, baseY);
      addBench(feature, -0.92, -0.4, Math.PI / 2, baseY);
      addFlowers(feature, 1.9, 0.8, baseY);
    } else if (parkType === "pond") {
      addBox(feature, 4.9, 0.03, 0.52, pathMat, 0, baseY + 0.012, 2.02, { cast: false });
      addPond(feature, -0.7, 0.95, baseY);
      addGazebo(feature, 1.7, 1.62, baseY);
      addBox(feature, 0.36, 0.05, 0.85, standard("#8b6547"), -0.7, baseY + 0.24, 0.95, {
        cast: false,
      });
      addTreeHere(-2.05, -1.8, 0.65, "broadleaf");
      addTreeHere(2.1, -1.7, 0.58, "palm");
      addBench(feature, -1.8, 1.95, Math.PI, baseY);
      addFlowers(feature, 1.5, 1.9, baseY);
      addBush(feature, 2.15, 2.15, 0.7, baseY);
    } else {
      addBox(feature, 5.2, 0.03, 0.62, pathMat, 0, baseY + 0.012, 0, { cast: false });
      addBox(feature, 0.62, 0.03, 5.2, pathMat, 0, baseY + 0.013, 0, { cast: false });
      addParkFountain(feature, 0, 0, baseY);
      addTreeHere(-2.15, -2.0, 0.7, "broadleaf");
      addTreeHere(2.1, -1.9, 0.56, "cherry");
      addTreeHere(-2.0, 2.0, 0.6, "conifer");
      addTreeHere(2.05, 2.02, 0.62, "broadleaf");
      addBench(feature, 1.0, 0.8, -Math.PI / 2, baseY);
      addBench(feature, -1.0, -0.8, Math.PI / 2, baseY);
      addBush(feature, 2.2, 2.2, 0.72, baseY);
      addFlowers(feature, -1.8, 1.8, baseY);
    }

    addStreetLamp(blockX + 2.1, blockZ + 2.2, baseY, 0.72);
    addStreetLamp(blockX - 2.1, blockZ - 2.2, baseY, 0.72);

    const record = {
      id: `${label}-park`,
      name: parkDef?.name ?? "街角公园",
      kind: "park",
      family: "park",
      label,
      floors: 0,
      detailLabel: "公园类型",
      detailValue: parkDef?.en ?? "PARK",
      height: Math.round((baseY + 1.1) * 3.2 * 10) / 10,
      population: 0,
      jobs: Math.round(rand(rng, 10, 24)),
      occupancy: Math.round(rand(rng, 0.72, 0.98) * 100),
      year: 2034 + Math.floor(rng() * 14),
      color: parkDef?.model.ground ?? "#7c9d59",
      note: parkDef?.description ?? "附近居民常来散步的小公园。",
      address: `BLOCK ${label} · 中央绿轴`,
      root: feature,
      typeId: parkDef?.id,
      typeLabel: parkDef ? `${parkDef.en} / ${parkDef.name}` : "PARK / 公园",
      description: parkDef?.description,
    };
    addBuildingInfo(feature, record);
    return record;
  }

  function addDistrictDetails(blockGroup, blockX, blockZ, district) {
    const speciesByDistrict = {
      residential: "broadleaf",
      oldtown: "cherry",
      commercial: "broadleaf",
      downtown: "palm",
      civic: "broadleaf",
      academic: "conifer",
      industrial: "conifer",
      harbor: "palm",
      creative: "cherry",
      green: "broadleaf",
      amusement: "palm",
    };
    const species = speciesByDistrict[district.id] ?? "broadleaf";
    const treePositions = [
      [-2.76, -2.48],
      [2.76, 2.44],
      [2.64, -2.55],
      [-2.55, 2.64],
      [-2.76, 0.42],
      [2.72, -0.34],
    ];
    const usedTrees = new Set();
    for (let index = 0; index < 3; index += 1) {
      let positionIndex = Math.floor(rng() * treePositions.length);
      while (usedTrees.has(positionIndex)) {
        positionIndex = (positionIndex + 1) % treePositions.length;
      }
      usedTrees.add(positionIndex);
      const [x, z] = treePositions[positionIndex];
      addTree(blockGroup, x, z, rand(rng, 0.38, 0.58), BLOCK_TOP, species);
    }

    const propPositions = [
      [-2.55, 2.55],
      [2.55, 2.55],
      [-2.55, -2.55],
    ];
    const [px, pz] = propPositions[Math.floor(rng() * propPositions.length)];
    if (district.id === "residential" || district.id === "academic") {
      if (rng() < 0.5) addBusShelter(blockGroup, px, pz, -Math.PI / 2, BLOCK_TOP);
      else addBikeRack(blockGroup, px, pz, 0, BLOCK_TOP);
      addBench(blockGroup, -px, pz, rng() < 0.5 ? 0 : Math.PI, BLOCK_TOP);
    } else if (district.id === "oldtown") {
      addPostbox(blockGroup, px, pz, 0, BLOCK_TOP);
      if (rng() < 0.6) addNewsKiosk(blockGroup, -px, pz, 0, BLOCK_TOP);
    } else if (district.id === "commercial" || district.id === "creative") {
      if (rng() < 0.5) addBillboard(blockGroup, px, pz, 0, BLOCK_TOP);
      else addNewsKiosk(blockGroup, px, pz, 0, BLOCK_TOP);
      addPlanter(blockGroup, -px, -pz, 0, BLOCK_TOP);
      addBikeRack(blockGroup, px, -pz, 0, BLOCK_TOP);
    } else if (district.id === "civic") {
      addStatue(blockGroup, 0.95, 2.0, Math.PI * 0.15, BLOCK_TOP);
      addPlanter(blockGroup, -2.1, 2.2, 0, BLOCK_TOP);
      addBench(blockGroup, 2.2, 1.5, Math.PI, BLOCK_TOP);
    } else if (district.id === "industrial" || district.id === "harbor") {
      addCrateStack(blockGroup, px, pz, 0, BLOCK_TOP);
      addCrateStack(blockGroup, -px * 0.78, pz * 0.9, 0.4, BLOCK_TOP);
      if (rng() < 0.6) addTrashBin(blockGroup, -px, pz, 0, BLOCK_TOP);
    } else if (district.id === "downtown") {
      addPlanter(blockGroup, px, pz, 0, BLOCK_TOP);
      addBench(blockGroup, -px * 0.9, pz * 0.9, Math.PI, BLOCK_TOP);
      addNewsKiosk(blockGroup, px * 0.9, -pz * 0.9, -Math.PI / 2, BLOCK_TOP);
    } else if (district.id === "amusement") {
      addPlanter(blockGroup, px, pz, 0, BLOCK_TOP);
    }
    addPlanter(blockGroup, -2.5, -2.5, 0, BLOCK_TOP);
    if (district.id === "residential" || district.id === "creative") {
      addFlowers(blockGroup, 2.0, -2.2, BLOCK_TOP);
    }
  }

  function addDistrictBuildings(blockGroup, blockX, blockZ, label, district) {
    const lots = DISTRICT_LOTS[district.id] ?? [];
    lots.forEach((lot, index) => {
      if (!lot.role && rng() < 0.06) return;
      const def = pickBuildingDef(district, lot, lot.role);
      if (!def) return;
      addCatalogBuilding({
        blockGroup,
        blockX,
        blockZ,
        localX: lot.x + rand(rng, -0.03, 0.03),
        localZ: lot.z + rand(rng, -0.03, 0.03),
        lot,
        def,
        label,
        district,
        role: lot.role,
      });
      if (district.id === "residential" && index === 3) {
        addFlowers(blockGroup, lot.x + 0.7, lot.z + 0.75, BLOCK_TOP);
      }
    });
  }

  function addConstructionBlock(blockGroup, blockX, blockZ, label, district) {
    const feature = new THREE.Group();
    feature.position.y = BLOCK_TOP;
    blockGroup.add(feature);

    const dirt = standard("#9c8463", { roughness: 1 });
    const concrete = standard("#aaa69a", { roughness: 0.95 });
    const concreteDark = standard("#858379", { roughness: 1 });
    const craneYellow = standard("#e0b24f", { roughness: 0.65, metalness: 0.08 });
    const safetyOrange = standard("#d7844d", { roughness: 0.8 });
    const netGreen = standard("#617e67", { roughness: 0.9 });

    addBox(feature, 5.2, 0.035, 5.2, dirt, 0, 0.018, 0, { cast: false });
    addBox(feature, 2.3, 0.03, 1.4, standard("#8a7459"), -0.8, 0.04, 1.5, { cast: false });

    // Site hoarding with an opening toward the street.
    for (let panel = -2.4; panel <= 2.4; panel += 0.85) {
      addBox(feature, 0.78, 0.38, 0.045, safetyOrange, panel, 0.22, -2.55, {
        cast: false,
      });
      if (Math.abs(panel) > 0.65) {
        addBox(feature, 0.78, 0.38, 0.045, safetyOrange, panel, 0.22, 2.55, {
          cast: false,
        });
      }
      addBox(feature, 0.045, 0.38, 0.78, safetyOrange, -2.55, 0.22, panel, {
        cast: false,
      });
      addBox(feature, 0.045, 0.38, 0.78, safetyOrange, 2.55, 0.22, panel, {
        cast: false,
      });
    }
    addBox(feature, 1.0, 0.34, 0.04, blackMat, 0.95, 0.25, 2.56);
    addSignPanel(feature, "#e7c36a", 0.86, 0.24, 0.95, 0.27, 2.58);

    // Unfinished concrete frame.
    const frameX = -0.9;
    const frameZ = -0.85;
    const frameWidth = 1.75;
    const frameDepth = 1.45;
    const frameFloors = 7;
    for (let floor = 0; floor < frameFloors; floor += 1) {
      const y = 0.08 + floor * 0.4;
      addBox(feature, frameWidth, 0.075, frameDepth, concrete, frameX, y, frameZ);
      for (const dx of [-1, 1]) {
        for (const dz of [-1, 1]) {
          addBox(
            feature,
            0.075,
            0.4,
            0.075,
            floor === frameFloors - 1 ? concreteDark : concrete,
            frameX + dx * (frameWidth / 2 - 0.075),
            y + 0.2,
            frameZ + dz * (frameDepth / 2 - 0.075)
          );
        }
      }
      if (floor === 2 || floor === 4) {
        addBox(feature, frameWidth * 0.88, 0.2, 0.02, netGreen, frameX, y + 0.22, frameZ + frameDepth / 2 + 0.02, {
          cast: false,
        });
      }
    }
    for (let rebar = 0; rebar < 5; rebar += 1) {
      addBox(
        feature,
        0.016,
        0.32,
        0.016,
        standard("#5e5446"),
        frameX - frameWidth / 2 + 0.12 + rebar * 0.34,
        frameFloors * 0.4 + 0.24,
        frameZ
      );
    }

    // Tower crane.
    const craneX = 1.45;
    const craneZ = -1.4;
    addBox(feature, 0.12, 4.15, 0.12, craneYellow, craneX, 2.1, craneZ);
    for (let brace = 0; brace < 6; brace += 1) {
      addBox(feature, 0.32, 0.035, 0.035, craneYellow, craneX, 0.55 + brace * 0.62, craneZ, {
        ry: brace % 2 === 0 ? Math.PI / 4 : -Math.PI / 4,
      });
    }
    addBox(feature, 3.05, 0.08, 0.08, craneYellow, craneX + 0.95, 4.15, craneZ);
    addBox(feature, 1.2, 0.08, 0.1, craneYellow, craneX - 0.9, 4.18, craneZ);
    addBox(feature, 0.48, 0.42, 0.42, concreteDark, craneX - 1.26, 4.0, craneZ);
    addBox(feature, 0.08, 0.75, 0.08, craneYellow, craneX, 4.55, craneZ);
    addBox(feature, 0.28, 0.035, 0.035, craneYellow, craneX + 0.5, 4.5, craneZ);
    addBox(feature, 0.28, 0.035, 0.035, craneYellow, craneX - 0.5, 4.5, craneZ);
    addBox(feature, 0.018, 1.4, 0.018, blackMat, craneX + 2.25, 3.45, craneZ);
    addBox(feature, 0.18, 0.2, 0.18, concreteDark, craneX + 2.25, 2.7, craneZ);
    addBox(feature, 0.035, 0.035, 0.035, beaconMat, craneX, 4.95, craneZ, {
      cast: false,
      receive: false,
    });

    // Excavator and material piles.
    const digger = new THREE.Group();
    digger.position.set(1.42, 0.08, 1.42);
    digger.rotation.y = -0.32;
    feature.add(digger);
    addBox(digger, 0.54, 0.16, 0.34, standard("#4b504c"), 0, 0.08, 0);
    addBox(digger, 0.34, 0.24, 0.3, standard("#d8a847"), 0.03, 0.25, 0);
    addBox(digger, 0.2, 0.2, 0.2, glassMat, -0.09, 0.34, 0.04, { cast: false });
    const arm = addBox(digger, 0.56, 0.08, 0.08, standard("#d8a847"), 0.36, 0.31, 0.18);
    arm.rotation.z = -0.5;
    addBox(digger, 0.14, 0.2, 0.18, standard("#6d7068"), 0.61, 0.12, 0.18);
    addBox(feature, 0.86, 0.24, 0.56, standard("#c9b083"), -1.4, 0.13, 1.45);
    addBox(feature, 0.5, 0.16, 0.44, standard("#b7a078"), 2.0, 0.1, 0.8);
    for (let pipe = 0; pipe < 3; pipe += 1) {
      const pipeMesh = addCylinder(feature, 0.055, 1.1, steelDarkMat, 0.2, 0.12 + pipe * 0.1, 1.9);
      pipeMesh.rotation.z = Math.PI / 2;
    }
    addBox(feature, 1.05, 0.5, 0.66, standard("#7fa69c"), -1.6, 0.27, -2.0);
    addBox(feature, 0.85, 0.05, 0.5, trimMat, -1.6, 0.54, -2.0);
    addBox(feature, 0.24, 0.2, 0.03, glassMat, -1.32, 0.32, -1.66, { cast: false });
    addBox(feature, 0.18, 0.3, 0.03, doorMat, -1.88, 0.2, -1.66);
    addBox(feature, 0.22, 0.12, 0.18, steelDarkMat, -1.6, 0.62, -2.0);

    // Scaffolding on the remaining frame edge.
    for (const side of [-1, 1]) {
      addBox(feature, 0.035, 0.9, 0.035, steelMat, -2.1 + side * 0.3, 0.45, 0.42);
    }
    for (let level = 0; level < 3; level += 1) {
      addBox(feature, 0.7, 0.035, 0.035, steelMat, -1.95, 0.2 + level * 0.3, 0.42);
    }

    addBox(feature, 0.65, 0.06, 0.34, pathMat, 0.15, 0.03, 0.28, { cast: false });
    addBox(feature, 0.32, 0.22, 0.24, standard("#8b6b4c"), 0.2, 0.11, 0.44);
    addBox(feature, 0.22, 0.16, 0.2, standard("#b9a27e"), 0.06, 0.08, 0.1);

    const progress = Math.round(rand(rng, 38, 78));
    const record = {
      id: `${label}-construction`,
      name: "建设中的像素湾",
      kind: "construction",
      family: "construction",
      label,
      floors: 0,
      detailLabel: "施工进度",
      detailValue: `${progress}%`,
      height: Math.round(18 + progress * 0.25),
      population: 0,
      jobs: Math.round(rand(rng, 28, 64)),
      occupancy: Math.round(rand(rng, 0.4, 0.72) * 100),
      year: 2052,
      color: "#d98f57",
      note: "围挡后面，新的塔楼正在从土里长出来。",
      address: `BLOCK ${label} · 建设新区`,
      root: feature,
      typeId: "construction-site",
      typeLabel: "CONSTRUCTION SITE / 建筑工地",
      description: "塔吊、脚手架与未完工的楼体，是城市继续生长的证据。",
      districtId: district.id,
      districtName: district.name,
      progress,
    };
    addBuildingInfo(feature, record);
    return record;
  }

  function addBlocks() {
    const layout = transformDistrictLayout(
      CITY_ZONE_LAYOUT,
      Math.floor(rng() * 4),
      rng() < 0.5
    );
    const parkDeck = [...PARKS];
    for (let index = parkDeck.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(rng() * (index + 1));
      [parkDeck[index], parkDeck[swap]] = [parkDeck[swap], parkDeck[index]];
    }
    let parkIndex = 0;

    for (let i = 0; i < GRID_SIZE; i += 1) {
      for (let j = 0; j < GRID_SIZE; j += 1) {
        const districtId = layout[i][j];
        const districtAsset = DISTRICTS_BY_ID.get(`d-${districtId}`);
        const district = districtAsset
          ? { ...districtAsset, id: districtId }
          : AMUSEMENT_DISTRICT;
        const blockX = BLOCK_CENTERS[i];
        const blockZ = BLOCK_CENTERS[j];
        const label = blockLabel(i, j);
        const blockGroup = new THREE.Group();
        blockGroup.position.set(blockX, 0, blockZ);
        group.add(blockGroup);

        addBox(blockGroup, 6, 0.3, 6, sidewalkMat, 0, 0.15, 0, { cast: false });
        const groundMaterial = standard(DISTRICT_GROUND[districtId] ?? "#cbbf9f", {
          roughness: 1,
        });
        addBox(blockGroup, 5.45, 0.09, 5.45, groundMaterial, 0, 0.345, 0, {
          cast: false,
        });
        addBox(blockGroup, 6.02, 0.09, 0.06, curbMat, 0, 0.36, -2.98, { cast: false });
        addBox(blockGroup, 6.02, 0.09, 0.06, curbMat, 0, 0.36, 2.98, { cast: false });
        addBox(blockGroup, 0.06, 0.09, 6.02, curbMat, -2.98, 0.36, 0, { cast: false });
        addBox(blockGroup, 0.06, 0.09, 6.02, curbMat, 2.98, 0.36, 0, { cast: false });
        if (districtId !== "green" && districtId !== "amusement") {
          const pavingMat = standard(
            districtId === "industrial" || districtId === "harbor" ? "#a5a79c" : "#c3b28f",
            { roughness: 1 }
          );
          addBox(blockGroup, 5.24, 0.024, 0.14, pavingMat, 0, BLOCK_TOP + 0.008, -2.5, {
            cast: false,
          });
          addBox(blockGroup, 5.24, 0.024, 0.14, pavingMat, 0, BLOCK_TOP + 0.008, 2.5, {
            cast: false,
          });
          addBox(blockGroup, 0.14, 0.024, 5.24, pavingMat, -2.5, BLOCK_TOP + 0.009, 0, {
            cast: false,
          });
          addBox(blockGroup, 0.14, 0.024, 5.24, pavingMat, 2.5, BLOCK_TOP + 0.009, 0, {
            cast: false,
          });
          const accent = standard(district.model?.accent ?? "#ffd166", {
            roughness: 0.8,
          });
          addBox(blockGroup, 0.72, 0.02, 0.2, accent, 2.1, BLOCK_TOP + 0.012, 2.28, {
            cast: false,
          });
        }

        if (districtId === "green") {
          const parkDef = parkDeck[parkIndex % parkDeck.length] ?? PARKS[0];
          parkIndex += 1;
          addCatalogParkBlock(blockGroup, blockX, blockZ, label, parkDef);
        } else if (districtId === "amusement") {
          addAmusementBlock(blockGroup, blockX, blockZ, label);
        } else if (districtId === "construction") {
          addConstructionBlock(blockGroup, blockX, blockZ, label, district);
        } else {
          addDistrictBuildings(blockGroup, blockX, blockZ, label, district);
          addDistrictDetails(blockGroup, blockX, blockZ, district);
        }

        blocks.push({
          i,
          j,
          blockX,
          blockZ,
          type: districtId,
          label,
          group: blockGroup,
          district,
          districtName: district.name,
        });
      }
    }
  }

  function addWindowMeshes() {
    const dark = [];
    const lit = [];
    for (const spec of windowSpecs) {
      if (spec.lit) lit.push(spec);
      else dark.push(spec);
    }
    const dummy = new THREE.Object3D();
    const buildMesh = (specs, material) => {
      if (specs.length === 0) return;
      const mesh = new THREE.InstancedMesh(boxGeometry, material, specs.length);
      specs.forEach((spec, index) => {
        dummy.position.set(spec.x, spec.y, spec.z);
        dummy.rotation.set(0, spec.rotation, 0);
        dummy.scale.set(0.13 * spec.scale, 0.17 * spec.scale, 0.032);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);
    };
    buildMesh(dark, darkWindowMaterial);
    buildMesh(lit, litWindowMaterial);
  }

  function addCars() {
    const wheelMaterial = standard("#24282d", { roughness: 0.7 });
    const windowMaterial = standard("#3b5562", { roughness: 0.3, metalness: 0.2 });
    const vehicleDeck = [...VEHICLES];
    for (let index = vehicleDeck.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(rng() * (index + 1));
      [vehicleDeck[index], vehicleDeck[swap]] = [vehicleDeck[swap], vehicleDeck[index]];
    }

    const addVehicle = (def) => {
      const model = def.model;
      const vehicle = new THREE.Group();
      const bodyMat = standard(model.color, { roughness: 0.6 });
      const accentMat = standard(model.accent, { roughness: 0.55 });
      const L = model.length;
      const W = model.width;
      const bodyY = 0.12;

      const wheels = (frontZ, backZ, radius = 0.045) => {
        for (const x of [-W * 0.46, W * 0.46]) {
          for (const z of [frontZ, backZ]) {
            addBox(vehicle, radius, 0.085, 0.095, wheelMaterial, x, 0.045, z, {
              receive: false,
            });
          }
        }
      };

      if (def.model.vehicle === "bus") {
        addBox(vehicle, W, 0.22, L, bodyMat, 0, 0.16, 0);
        addBox(vehicle, W * 0.9, 0.12, L * 0.93, accentMat, 0, 0.31, 0);
        addBox(vehicle, W + 0.005, 0.08, L * 0.72, windowMaterial, 0, 0.27, 0.02, {
          cast: false,
        });
        addBox(vehicle, W * 0.7, 0.15, 0.02, windowMaterial, 0, 0.26, L / 2 + 0.01, {
          cast: false,
        });
        addBox(vehicle, W * 0.42, 0.18, 0.025, glassMat, 0, 0.25, -L / 2 - 0.01, {
          cast: false,
        });
        wheels(L * 0.36, -L * 0.34, 0.052);
        addBox(vehicle, W * 0.7, 0.045, 0.025, headlightMat, 0, 0.16, L / 2 + 0.01, {
          cast: false,
          receive: false,
        });
        addBox(vehicle, W * 0.7, 0.045, 0.025, taillightMat, 0, 0.16, -L / 2 - 0.01, {
          cast: false,
          receive: false,
        });
      } else if (def.model.vehicle === "truck") {
        addBox(vehicle, W * 0.88, 0.2, L * 0.34, bodyMat, 0, 0.19, L * 0.32);
        addBox(vehicle, W * 0.7, 0.16, L * 0.12, windowMaterial, 0, 0.34, L * 0.37, {
          cast: false,
        });
        addBox(vehicle, W * 0.96, 0.34, L * 0.56, accentMat, 0, 0.31, -L * 0.2);
        addBox(vehicle, W * 0.6, 0.07, L * 0.5, standard("#d2c5a9"), 0, 0.5, -L * 0.2);
        wheels(L * 0.36, -L * 0.34, 0.05);
        addBox(vehicle, W * 0.62, 0.04, 0.02, headlightMat, 0, 0.17, L / 2 + 0.01, {
          cast: false,
          receive: false,
        });
        addBox(vehicle, W * 0.72, 0.04, 0.02, taillightMat, 0, 0.17, -L / 2 - 0.01, {
          cast: false,
          receive: false,
        });
      } else if (def.model.vehicle === "van") {
        addBox(vehicle, W, 0.2, L, bodyMat, 0, 0.18, 0);
        addBox(vehicle, W * 0.86, 0.2, L * 0.8, accentMat, 0, 0.35, -L * 0.04);
        addBox(vehicle, W * 0.72, 0.12, 0.03, windowMaterial, 0, 0.31, L / 2 + 0.01, {
          cast: false,
        });
        addBox(vehicle, W * 0.74, 0.13, 0.03, windowMaterial, 0, 0.31, -L / 2 - 0.01, {
          cast: false,
        });
        wheels(L * 0.32, -L * 0.3);
        addBox(vehicle, W * 0.68, 0.045, 0.025, headlightMat, 0, 0.16, L / 2 + 0.01, {
          cast: false,
          receive: false,
        });
      } else if (def.model.vehicle === "foodtruck") {
        addBox(vehicle, W, 0.23, L, bodyMat, 0, 0.19, 0);
        addBox(vehicle, W * 0.8, 0.28, L * 0.66, accentMat, 0, 0.38, -L * 0.04);
        addBox(vehicle, W * 0.26, 0.17, 0.03, glassMat, 0, 0.36, -L / 2 - 0.01, {
          cast: false,
        });
        addBox(vehicle, W * 0.48, 0.04, 0.36, standard("#f2d18a"), W * 0.25, 0.55, L * 0.1, {
          cast: false,
        });
        addSignPanel(vehicle, accentMat.color.getStyle(), 0.18, 0.12, -W * 0.25, 0.55, 0, 0);
        wheels(L * 0.31, -L * 0.32);
      } else if (def.model.vehicle === "police") {
        addBox(vehicle, W, 0.13, L, bodyMat, 0, 0.14, 0);
        addBox(vehicle, W * 0.78, 0.12, L * 0.44, accentMat, 0, 0.25, -L * 0.04);
        addBox(vehicle, W * 0.74, 0.08, L * 0.34, windowMaterial, 0, 0.28, 0.02, {
          cast: false,
        });
        addBox(vehicle, W * 0.6, 0.07, 0.08, standard("#d95d51", { emissive: "#ff3d2e", emissiveIntensity: 0.2 }), 0, 0.35, -L * 0.04, {
          cast: false,
          receive: false,
        });
        addBox(vehicle, W * 0.28, 0.07, 0.08, standard("#4f8bd6", { emissive: "#3f77e0", emissiveIntensity: 0.2 }), W * 0.17, 0.35, -L * 0.04, {
          cast: false,
          receive: false,
        });
        wheels(L * 0.3, -L * 0.29);
      } else if (def.model.vehicle === "taxi") {
        addBox(vehicle, W, 0.13, L, bodyMat, 0, 0.14, 0);
        addBox(vehicle, W * 0.8, 0.1, L * 0.43, accentMat, 0, 0.25, -L * 0.03);
        addBox(vehicle, W * 0.78, 0.08, L * 0.33, windowMaterial, 0, 0.27, 0.01, {
          cast: false,
        });
        addBox(vehicle, W * 0.3, 0.07, 0.11, standard("#f0cd69", { emissive: "#ffd166", emissiveIntensity: 0.22 }), 0, 0.34, -L * 0.03);
        wheels(L * 0.3, -L * 0.29);
      } else if (def.model.vehicle === "compact") {
        addBox(vehicle, W, 0.14, L, bodyMat, 0, 0.14, 0);
        addBox(vehicle, W * 0.84, 0.13, L * 0.5, accentMat, 0, 0.26, -L * 0.02);
        addBox(vehicle, W * 0.76, 0.08, L * 0.36, windowMaterial, 0, 0.28, 0.01, {
          cast: false,
        });
        wheels(L * 0.3, -L * 0.3);
        addBox(vehicle, W * 0.6, 0.04, 0.02, headlightMat, 0, 0.14, L / 2 + 0.01, {
          cast: false,
          receive: false,
        });
      } else {
        addBox(vehicle, W, 0.13, L, bodyMat, 0, 0.14, 0);
        addBox(vehicle, W * 0.82, 0.11, L * 0.44, accentMat, 0, 0.25, -L * 0.03);
        addBox(vehicle, W * 0.76, 0.08, L * 0.34, windowMaterial, 0, 0.28, 0.01, {
          cast: false,
        });
        wheels(L * 0.3, -L * 0.29);
        addBox(vehicle, W * 0.58, 0.04, 0.02, headlightMat, 0, 0.14, L / 2 + 0.01, {
          cast: false,
          receive: false,
        });
        addBox(vehicle, W * 0.58, 0.035, 0.02, taillightMat, 0, 0.14, -L / 2 - 0.01, {
          cast: false,
          receive: false,
        });
      }

      return vehicle;
    };

    const carCurves = blocks.map((block) => ({
      block,
      curve: makeLoopCurve(block.blockX, block.blockZ, 3.54, 0.62),
    }));

    let carIndex = 0;
    for (const { block, curve } of carCurves) {
      const count = rng() < 0.56 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const def =
          vehicleDeck.pop() ??
          (rng() < 0.2
            ? choose(rng, VEHICLES.filter((item) => ["bus", "truck", "foodtruck"].includes(item.model.vehicle)))
            : choose(rng, VEHICLES.filter((item) => ["sedan", "taxi", "compact", "van", "police"].includes(item.model.vehicle))));
        if (!def) continue;
        const car = addVehicle(def);
        const t = rng();
        const speed = def.model.speed * rand(rng, 0.9, 1.12);
        car.position.copy(curve.getPointAt(t));
        const tangent = curve.getTangentAt(t);
        car.rotation.y = Math.atan2(tangent.x, tangent.z);
        group.add(car);
        cars.push({
          group: car,
          curve,
          t,
          speed,
          length: curve.getLength(),
          lane: carIndex,
          phase: rng() * TAU,
          typeId: def.id,
        });
        carIndex += 1;
      }
    }
  }

  function addBoat(def, half, t, direction, speed, phase) {
    const model = def.model;
    const boat = new THREE.Group();
    const hullMat = standard(model.color, { roughness: 0.72 });
    const accentMat = standard(model.accent, { roughness: 0.55 });
    const L = model.length * 1.25;
    const W = model.width * 1.25;

    if (def.model.vessel === "sailboat") {
      addBox(boat, W, 0.16, L, hullMat, 0, 0.1, 0);
      addBox(boat, W * 0.68, 0.12, L * 0.44, accentMat, 0, 0.24, -L * 0.08);
      addBox(boat, 0.025, 1.0, 0.025, blackMat, 0, 0.72, 0.06);
      addBox(boat, 0.02, 0.58, 0.42, whiteMat, 0, 0.72, -0.08);
      addBox(boat, 0.025, 0.06, 0.52, blackMat, 0, 0.48, -0.08);
    } else if (def.model.vessel === "fishing") {
      addBox(boat, W, 0.18, L, hullMat, 0, 0.11, 0);
      addBox(boat, W * 0.7, 0.18, L * 0.32, standard("#e1d6bd"), 0, 0.29, -L * 0.12);
      addBox(boat, W * 0.58, 0.08, 0.03, glassMat, 0, 0.31, -L * 0.12 + L * 0.17, {
        cast: false,
      });
      addBox(boat, 0.025, 0.58, 0.025, blackMat, 0, 0.52, L * 0.2);
      addBox(boat, W * 0.2, 0.1, L * 0.14, standard("#8c704f"), 0, 0.22, L * 0.25);
      for (let index = 0; index < 3; index += 1) {
        addBox(boat, W * 0.16, 0.08, L * 0.14, standard("#6f8b86"), W * 0.28, 0.2, -L * 0.1 + index * 0.16);
      }
    } else if (def.model.vessel === "ferry") {
      addBox(boat, W, 0.2, L, hullMat, 0, 0.12, 0);
      addBox(boat, W * 0.9, 0.18, L * 0.8, accentMat, 0, 0.3, -0.02);
      addBox(boat, W * 0.84, 0.16, L * 0.56, hullMat, 0, 0.46, -0.04);
      addBox(boat, W * 0.9, 0.07, L * 0.72, glassMat, 0, 0.35, -0.02, {
        cast: false,
      });
      addBox(boat, W * 0.86, 0.06, L * 0.48, glassMat, 0, 0.5, -0.04, {
        cast: false,
      });
      addBox(boat, 0.03, 0.55, 0.03, whiteMat, 0, 0.82, -0.18);
      addBox(boat, 0.18, 0.12, 0.03, standard("#dd6a59"), 0.1, 0.92, -0.18);
      for (let index = 0; index < 4; index += 1) {
        addBox(boat, W * 0.92, 0.035, 0.035, whiteMat, 0, 0.38, -L * 0.36 + index * L * 0.2);
      }
    } else {
      addBox(boat, W, 0.14, L, hullMat, 0, 0.09, 0);
      addBox(boat, W * 0.76, 0.035, L * 0.82, accentMat, 0, 0.17, 0, { cast: false });
      addBox(boat, 0.03, 0.32, 0.03, blackMat, -W * 0.3, 0.35, 0.08);
      addBox(boat, 0.03, 0.32, 0.03, blackMat, W * 0.3, 0.35, 0.08);
      addBox(boat, W * 0.7, 0.025, 0.025, blackMat, 0, 0.34, 0.08);
    }

    addBox(boat, 0.45, 0.018, 0.22, wakeMaterial, 0, 0.015, -L * 0.7, {
      cast: false,
      receive: false,
    });
    addBox(boat, 0.24, 0.016, 0.3, wakeMaterial, 0, 0.014, -L * 0.98, {
      cast: false,
      receive: false,
    });
    addBox(boat, 0.05, 0.05, 0.05, boatLanternMat, 0, 0.42, L * 0.18, {
      cast: false,
      receive: false,
    });
    const curve = makeLoopCurve(0, 0, half, 4.2, WATER_LEVEL);
    boat.position.copy(curve.getPointAt(t));
    boat.position.y = WATER_LEVEL + 0.02;
    const tangent = curve.getTangentAt(t);
    boat.rotation.y = Math.atan2(tangent.x * direction, tangent.z * direction);
    group.add(boat);
    boats.push({
      group: boat,
      curve,
      t,
      direction,
      speed,
      phase,
      length: curve.getLength(),
      typeId: def.id,
    });
  }

  function addBoats() {
    const types = ["sailboat", "fishing", "ferry", "dinghy"]
      .map((id) => MARITIME.find((asset) => asset.model.vessel === id))
      .filter(Boolean);
    const halves = [27.1, 29.4, 31.8, 28.2];
    types.forEach((def, index) => {
      addBoat(def, halves[index], rng(), index % 2 === 0 ? 1 : -1, rand(rng, 0.4, 0.68), rng() * TAU);
    });

    const buoyDef = MARITIME.find((asset) => asset.model.vessel === "buoy");
    if (buoyDef) {
      for (const [x, z] of [
        [24.2, 21.5],
        [-22.8, 23.6],
        [23.9, -22.8],
      ]) {
        const buoy = new THREE.Group();
        addRoundCylinder(buoy, 0.11, 0.22, standard(buoyDef.model.color), 0, 0.18, 0);
        addRoundCylinder(buoy, 0.07, 0.16, steelDarkMat, 0, 0.35, 0);
        addBox(buoy, 0.055, 0.055, 0.055, beaconMat, 0, 0.47, 0, {
          cast: false,
          receive: false,
        });
        buoy.position.set(x, WATER_LEVEL + 0.01, z);
        group.add(buoy);
      }
    }
  }

  function addBirds() {
    for (let i = 0; i < 6; i += 1) {
      const bird = new THREE.Group();
      const wingA = addBox(bird, 0.16, 0.018, 0.035, birdMat, -0.08, 0, 0, {
        cast: false,
        receive: false,
      });
      const wingB = addBox(bird, 0.16, 0.018, 0.035, birdMat, 0.08, 0, 0, {
        cast: false,
        receive: false,
      });
      wingA.rotation.z = 0.26;
      wingB.rotation.z = -0.26;
      group.add(bird);
      birds.push({
        group: bird,
        radius: rand(rng, 12, 21),
        height: rand(rng, 6.2, 9.2),
        angle: rng() * TAU,
        speed: rand(rng, 0.08, 0.16) * (rng() < 0.5 ? -1 : 1),
        phase: rng() * TAU,
      });
    }
  }

  function addPointCluster() {
    const promenade = PLATEAU_SIZE / 2 - 1.2;
    addBusShelter(group, -promenade, -17.3, Math.PI / 2, 0.02);
    addNewsKiosk(group, promenade, -15.4, -Math.PI / 2, 0.02);
    addPostbox(group, -promenade, -10.1, Math.PI / 2, 0.02);
    addTrashBin(group, promenade, 16.2, 0, 0.02);
    addPlanter(group, -promenade, 15.4, 0, 0.02);
    addBikeRack(group, -15.8, promenade, 0, 0.02);
    addBillboard(group, 16.7, promenade - 0.2, 0, 0.02);
    addCrateStack(group, promenade, 6.1, 0, 0.02);
    addStatue(group, -9.8, -promenade, Math.PI, 0.02);

    const pierX = PLATEAU_SIZE / 2 + 2.35;
    const pierZ = 7.5;
    const wood = standard("#896a4c");
    addBox(group, 4.9, 0.1, 1.0, wood, pierX - 0.9, -0.02, pierZ);
    for (let index = 0; index < 6; index += 1) {
      addBox(group, 0.09, 1.45, 0.09, standard("#6f553d"), pierX - 2.95 + index * 0.92, -0.72, pierZ - 0.42);
      addBox(group, 0.09, 1.45, 0.09, standard("#6f553d"), pierX - 2.95 + index * 0.92, -0.72, pierZ + 0.42);
    }
    addStreetLamp(pierX + 1.3, pierZ, -0.02, 0.82);
    addBench(group, pierX + 0.35, pierZ - 0.27, Math.PI / 2, 0.01);
    addBox(group, 0.3, 0.18, 0.28, standard("#8b6b4c"), pierX - 1.0, 0.08, pierZ + 0.24);
  }

  addIsland();
  addRoads();
  addBlocks();
  addWindowMeshes();
  addCars();
  addBoats();
  addBirds();
  addPointCluster();

  group.updateMatrixWorld(true);
  for (const record of buildings) {
    record.bounds = new THREE.Box3().setFromObject(record.root);
  }

  const stats = {
    population: buildings.reduce((total, building) => total + building.population, 0),
    jobs: buildings.reduce((total, building) => total + building.jobs, 0),
    buildings: buildings.length,
    cars: cars.length,
    boats: boats.length,
    districts: new Set(blocks.map((block) => block.districtName ?? block.type)).size,
    parks: buildings.filter((building) => building.kind === "park").length,
  };

  function update(dt, ambientDt, elapsed, paused) {
    const simDt = paused ? 0 : dt;
    simulationTime += simDt;
    if (waterMaterial) {
      waterMaterial.uniforms.uTime.value += ambientDt;
    }

    for (const car of cars) {
      car.t = (car.t + (simDt * car.speed) / car.length) % 1;
      const position = car.curve.getPointAt(car.t);
      const tangent = car.curve.getTangentAt(car.t);
      car.group.position.copy(position);
      car.group.position.y = ROAD_TOP + 0.016;
      car.group.rotation.y = Math.atan2(tangent.x, tangent.z);
      car.group.position.y += Math.sin(elapsed * 5 + car.phase) * 0.0018 * (paused ? 0 : 1);
    }

    for (const boat of boats) {
      boat.t =
        (boat.t + (simDt * boat.speed * boat.direction) / boat.length + 1) % 1;
      const position = boat.curve.getPointAt(boat.t);
      const tangent = boat.curve.getTangentAt(boat.t);
      boat.group.position.set(position.x, WATER_LEVEL + 0.02, position.z);
      boat.group.position.y += Math.sin(elapsed * 1.4 + boat.phase) * 0.022;
      boat.group.rotation.y = Math.atan2(
        tangent.x * boat.direction,
        tangent.z * boat.direction
      );
    }

    for (const bird of birds) {
      bird.angle += ambientDt * bird.speed;
      const x = Math.cos(bird.angle) * bird.radius;
      const z = Math.sin(bird.angle) * bird.radius;
      bird.group.position.set(x, bird.height + Math.sin(elapsed * 0.8 + bird.phase) * 0.3, z);
      bird.group.rotation.y = Math.atan2(-Math.sin(bird.angle), Math.cos(bird.angle)) + Math.PI / 2;
      bird.group.children[0].rotation.z = 0.18 + Math.sin(elapsed * 6 + bird.phase) * 0.28;
      bird.group.children[1].rotation.z = -0.18 - Math.sin(elapsed * 6 + bird.phase) * 0.28;
    }

    for (const rotor of rotors) {
      rotor.group.rotation[rotor.axis] += simDt * rotor.speed;
      if (rotor.cabins) {
        for (const cabin of rotor.cabins) {
          cabin.rotation.z = -rotor.group.rotation.z;
        }
      }
    }

    for (const fountain of fountains) {
      for (const jet of fountain.jets) {
        const cycle = (simulationTime * 0.7 + jet.phase) % 1;
        const arc = Math.sin(cycle * Math.PI);
        jet.mesh.position.x = Math.cos(jet.angle) * jet.radius * (0.3 + cycle * 0.9);
        jet.mesh.position.z = Math.sin(jet.angle) * jet.radius * (0.3 + cycle * 0.9);
        jet.mesh.position.y = 0.56 + arc * 0.58;
      }
    }

    if (!paused) {
      for (const beacon of beacons) {
        beacon.mesh.scale.y = 0.8 + Math.sin(elapsed * 3 + beacon.phase) * 0.2;
      }
    }
  }

  function updateEnvironment(env) {
    if (waterMaterial) {
      waterMaterial.uniforms.uDeep.value.copy(env.waterDeep);
      waterMaterial.uniforms.uShallow.value.copy(env.waterShallow);
      waterMaterial.uniforms.uFoam.value.copy(env.waterFoam);
    }
    const lights = env.lights;
    litWindowMaterial.emissiveIntensity = 0.015 + lights * 1.95;
    darkWindowMaterial.emissiveIntensity = 0.1 + lights * 0.35;
    lampHeadMat.emissiveIntensity = 0.04 + lights * 3.2;
    glowMaterial.opacity = lights * 0.7;
    headlightMat.emissiveIntensity = 0.12 + lights * 3.6;
    taillightMat.emissiveIntensity = 0.12 + lights * 2.4;
    boatLanternMat.emissiveIntensity = 0.05 + lights * 2.8;
    beaconMat.emissiveIntensity = 0.1 + lights * 2.6;
    for (const material of neonMaterials) {
      material.emissiveIntensity = 0.08 + lights * 2.2;
    }
    shoreMat.color.copy(env.waterFoam).lerp(NIGHT_SHORE, env.night * 0.55);
    wakeMaterial.opacity = 0.18 + (1 - env.night) * 0.16;
  }

  function dispose() {
    group.traverse((object) => {
      if (object.isMesh) {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          const list = Array.isArray(object.material) ? object.material : [object.material];
          list.forEach((material) => {
            materials.add(material);
            for (const value of Object.values(material)) {
              if (value && value.isTexture) materials.add(value);
            }
          });
        }
      }
    });

    for (const material of materials) {
      if (material && material.isTexture) {
        material.dispose();
        continue;
      }
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (value && value.isTexture) value.dispose();
      }
      material.dispose();
    }
    for (const geometry of geometries) {
      geometry.dispose();
    }
    group.removeFromParent();
    group.clear();
  }

  return {
    group,
    seed,
    buildings,
    cars,
    boats,
    blocks,
    selectables,
    stats,
    update,
    updateEnvironment,
    dispose,
    get time() {
      return simulationTime;
    },
  };
}
