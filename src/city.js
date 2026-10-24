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
} from "./object-catalog.js";
import { createCityPlan } from "./city-plan.js";

const BLOCK_TOP = 0.39;
const ROAD_TOP = 0.09;
const WATER_LEVEL = -1.12;
const FLOOR_HEIGHT = 0.42;
const TAU = Math.PI * 2;

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

;

;

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function makeLoopCurve(
  cx,
  cz,
  half = 3.54,
  radius = 0.62,
  y = ROAD_TOP + 0.012,
  halfZ = half,
  rotation = 0
) {
  const points = [];
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  const addCorner = (cornerX, cornerZ, start, end) => {
    const steps = 5;
    for (let i = 0; i <= steps; i += 1) {
      const angle = start + ((end - start) * i) / steps;
      const localX = cornerX + Math.cos(angle) * radius;
      const localZ = cornerZ + Math.sin(angle) * radius;
      points.push(
        new THREE.Vector3(
          cx + localX * cosR + localZ * sinR,
          y,
          cz - localX * sinR + localZ * cosR
        )
      );
    }
  };

  addCorner(half - radius, -halfZ + radius, -Math.PI / 2, 0);
  addCorner(half - radius, halfZ - radius, 0, Math.PI / 2);
  addCorner(-half + radius, halfZ - radius, Math.PI / 2, Math.PI);
  addCorner(-half + radius, -halfZ + radius, Math.PI, (Math.PI * 3) / 2);

  const curve = new THREE.CatmullRomCurve3(points, true, "centripetal");
  curve.arcLengthDivisions = 160;
  return curve;
}

export function randomCitySeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

export function createCity({ seed = randomCitySeed() } = {}) {
  const rng = mulberry32(seed);
  const plan = createCityPlan(rng);
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
  const trains = [];
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

  const asphaltMat = standard("#474e59", { roughness: 1 });
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
  const towerWindowMaterial = new THREE.MeshStandardMaterial({
    color: "#4d6871",
    emissive: "#ffc173",
    emissiveIntensity: 0.04,
    roughness: 0.3,
    metalness: 0.28,
  });
  materials.add(darkWindowMaterial);
  materials.add(litWindowMaterial);
  materials.add(towerWindowMaterial);

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

  function addIsland() {
    for (const rect of plan.island.land) {
      const width = rect.x1 - rect.x0;
      const depth = rect.z1 - rect.z0;
      const cx = (rect.x0 + rect.x1) / 2;
      const cz = (rect.z0 + rect.z1) / 2;
      addBox(group, width, 0.5, depth, deckMat, cx, -0.25, cz, {
        cast: false,
        receive: true,
      });
      addBox(group, width - 0.24, 0.9, depth - 0.24, soilMat, cx, -0.9, cz, {
        cast: false,
        receive: false,
      });
      addBox(group, width - 0.72, 1.4, depth - 0.72, rockMat, cx, -1.9, cz, {
        cast: false,
        receive: false,
      });
      addBox(group, width - 0.5, 0.05, depth - 0.5, asphaltMat, cx, 0.025, cz, {
        cast: false,
        receive: true,
      });
    }

    for (const edge of plan.island.edges) {
      const horizontal = Math.abs(edge.x1 - edge.x0) > Math.abs(edge.z1 - edge.z0);
      const length = horizontal ? Math.abs(edge.x1 - edge.x0) : Math.abs(edge.z1 - edge.z0);
      const cx = (edge.x0 + edge.x1) / 2;
      const cz = (edge.z0 + edge.z1) / 2;
      const nx = edge.nx;
      const nz = edge.nz;
      const trimWidth = horizontal ? length : 0.42;
      const trimDepth = horizontal ? 0.42 : length;
      addBox(
        group,
        trimWidth,
        0.12,
        trimDepth,
        trimMat,
        cx - nx * 0.21,
        0.06,
        cz - nz * 0.21,
        { cast: false }
      );

      if (edge.kind === "quay") {
        addBox(
          group,
          horizontal ? length : 0.34,
          1.7,
          horizontal ? 0.34 : length,
          stoneMat,
          cx - nx * 0.17,
          -0.55,
          cz - nz * 0.17,
          { cast: false }
        );
        addBox(
          group,
          horizontal ? length + 0.12 : 0.48,
          0.16,
          horizontal ? 0.48 : length + 0.12,
          trimMat,
          cx - nx * 0.13,
          0.38,
          cz - nz * 0.13,
          { cast: false }
        );
        addBox(
          group,
          horizontal ? length : 1.55,
          0.035,
          horizontal ? 1.55 : length,
          stoneMat,
          cx - nx * 0.9,
          0.052,
          cz - nz * 0.9,
          { cast: false }
        );
      }

      addBox(
        group,
        horizontal ? length + 0.5 : 0.42,
        0.025,
        horizontal ? 0.42 : length + 0.5,
        shoreMat,
        cx + nx * 0.28,
        WATER_LEVEL + 0.012,
        cz + nz * 0.28,
        { cast: false, receive: false }
      );

      const step = edge.kind === "quay" ? 3.0 : 4.2;
      const along = length - 2.2;
      for (let offset = -along / 2; offset <= along / 2; offset += step) {
        const px = horizontal ? cx + offset : cx - nx * 0.95;
        const pz = horizontal ? cz - nz * 0.95 : cz + offset;
        const rotation = nz > 0 ? 0 : nz < 0 ? Math.PI : nx > 0 ? Math.PI / 2 : -Math.PI / 2;
        if (edge.kind === "quay") {
          addBench(group, px, pz, rotation, 0.03);
        }
        if (Math.abs(offset) < along / 2 - 0.4) {
          addStreetLamp(
            horizontal ? px : cx - nx * 1.15,
            horizontal ? cz - nz * 1.15 : pz,
            0.03,
            0.82
          );
        }
      }
      if (edge.kind === "quay") {
        for (let offset = -along / 2; offset <= along / 2; offset += 2.6) {
          const species = nx > 0 ? "palm" : "broadleaf";
          addTree(
            group,
            horizontal ? cx + offset : cx - nx * 1.65,
            horizontal ? cz - nz * 1.65 : cz + offset,
            rand(rng, 0.46, 0.62),
            0.03,
            species
          );
        }
      }
    }

    waterMaterial = makeWaterMaterial();
    materials.add(waterMaterial);
    waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600), waterMaterial);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = WATER_LEVEL;
    waterMesh.receiveShadow = false;
    waterMesh.renderOrder = -1;
    group.add(waterMesh);

    addPiers();
    addRail();
  }

  function addPiers() {
    const wood = standard("#8a6a4a", { roughness: 0.95 });
    const postMat = standard("#6f553d", { roughness: 1 });
    const ropeMat = standard("#c9b48a");
    for (const pier of plan.piers) {
      const alongX = pier.dir === "east";
      const cx = alongX ? pier.x + pier.length / 2 : pier.x;
      const cz = alongX ? pier.z : pier.z + pier.length / 2;
      const deckX = alongX ? pier.length : pier.width;
      const deckZ = alongX ? pier.width : pier.length;
      addBox(group, deckX, 0.1, deckZ, wood, cx, -0.5, cz, { cast: false });
      addBox(group, deckX * 0.96, 0.02, deckZ * 0.96, standard("#9c7c57"), cx, -0.44, cz, {
        cast: false,
      });
      const postCount = Math.max(2, Math.round(pier.length / 1.15));
      for (let index = 0; index <= postCount; index += 1) {
        const t = (index / postCount) * pier.length;
        for (const side of [-1, 1]) {
          const px = alongX ? pier.x + t : pier.x + (side * pier.width) / 2 - 0.03;
          const pz = alongX ? pier.z + (side * pier.width) / 2 - 0.03 : pier.z + t;
          addBox(group, 0.08, 1.5, 0.08, postMat, px, -1.05, pz, { cast: false });
        }
      }
      const bollard = (x, z) => {
        addCylinder(group, 0.07, 0.24, steelDarkMat, x, -0.33, z);
        addCylinder(group, 0.09, 0.04, steelDarkMat, x, -0.2, z);
      };
      if (alongX) {
        bollard(pier.x + pier.length - 0.2, pier.z - pier.width / 2 + 0.16);
        bollard(pier.x + pier.length - 0.2, pier.z + pier.width / 2 - 0.16);
      } else {
        bollard(pier.x - pier.width / 2 + 0.16, pier.z + pier.length - 0.2);
        bollard(pier.x + pier.width / 2 - 0.16, pier.z + pier.length - 0.2);
      }
      if (pier.length > 4) {
        const craneMat = standard("#dfb24f", { roughness: 0.6, metalness: 0.1 });
        const craneX = alongX ? pier.x + pier.length * 0.62 : pier.x;
        const craneZ = alongX ? pier.z : pier.z + pier.length * 0.62;
        addBox(group, 0.12, 1.8, 0.12, craneMat, craneX, 0.4, craneZ, { cast: false });
        addBox(group, 0.08, 0.08, 1.7, craneMat, craneX, 1.28, craneZ + 0.65, { cast: false });
        addBox(group, 0.28, 0.3, 0.38, standard("#7d8a8a"), craneX, 0.82, craneZ + 1.3, {
          cast: false,
        });
        addBox(group, 0.04, 0.7, 0.04, blackMat, craneX, 1.05, craneZ + 1.3, { cast: false });
        addBox(group, 0.1, 0.1, 0.1, beaconMat, craneX, 1.75, craneZ, {
          cast: false,
          receive: false,
        });
      }
      addBox(group, 0.55, 0.22, 0.4, ropeMat, alongX ? cx : cx + 0.3, -0.35, alongX ? cz + 0.3 : cz, {
        cast: false,
      });
    }
  }

  function addRail() {
    const { z, x0, x1, station } = plan.rail;
    const span = x1 - x0;
    const midX = (x0 + x1) / 2;
    addBox(group, span, 0.05, 1.05, standard("#6c6459", { roughness: 1 }), midX, 0.03, z, {
      cast: false,
    });
    for (const side of [-1, 1]) {
      addBox(group, span, 0.035, 0.05, steelDarkMat, midX, 0.08, z + side * 0.26, {
        cast: false,
      });
    }
    const tieCount = Math.floor(span / 0.52);
    const tieMesh = new THREE.InstancedMesh(boxGeometry, standard("#4b4034"), tieCount);
    const dummy = new THREE.Object3D();
    for (let index = 0; index < tieCount; index += 1) {
      dummy.position.set(x0 + 0.26 + index * 0.52, 0.052, z);
      dummy.scale.set(0.075, 0.035, 0.86);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      tieMesh.setMatrixAt(index, dummy.matrix);
    }
    tieMesh.instanceMatrix.needsUpdate = true;
    group.add(tieMesh);

    addBox(group, 3.9, 0.34, 0.95, stoneMat, station.x, 0.17, -20.55, { cast: false });
    addBox(group, 3.9, 0.04, 0.95, trimMat, station.x, 0.35, -20.55, { cast: false });
    addBox(group, 1.4, 0.55, 0.8, standard("#c9c2b0"), station.x, 0.62, -20.15, { cast: false });
    addBox(group, 1.8, 0.07, 1.15, standard("#8d5d58"), station.x, 0.94, -20.15, { cast: false });
    addSignPanel(group, "#e7c36a", 0.8, 0.22, station.x, 0.86, -20.55);

    const train = new THREE.Group();
    const bodyMat = standard("#d8d2c2", { roughness: 0.55 });
    const stripeMat = standard("#b4574c", { roughness: 0.6 });
    const windowMat = standard("#3b5562", { roughness: 0.3, metalness: 0.2 });
    for (let car = 0; car < 3; car += 1) {
      const offset = car * 2.4;
      addBox(train, 2.1, 0.62, 0.78, bodyMat, offset, 0.38, 0, { cast: false });
      addBox(train, 2.12, 0.08, 0.8, stripeMat, offset, 0.28, 0, { cast: false });
      addBox(train, 1.6, 0.2, 0.82, windowMat, offset, 0.48, 0, { cast: false });
      addBox(train, 0.06, 0.16, 0.5, headlightMat, offset + 1.07, 0.34, 0, {
        cast: false,
        receive: false,
      });
    }
    train.position.set(x0 + 4, 0.03, z);
    group.add(train);
    trains.push({ group: train, x: x0 + 4, min: x0 + 3, max: x1 - 3, speed: 1.6 });
  }

  function addRoads() {
    const dashSpecs = [];
    const laneMaterial = standard("#8f8574", { roughness: 1 });
    for (const street of plan.streets) {
      const dx = street.x1 - street.x0;
      const dz = street.z1 - street.z0;
      const length = Math.hypot(dx, dz);
      if (length < 0.9) continue;
      const angle = Math.atan2(-dz, dx);
      const cx = (street.x0 + street.x1) / 2;
      const cz = (street.z0 + street.z1) / 2;
      const ux = dx / length;
      const uz = dz / length;

      if (street.kind === "lane" && street.width <= 1.1) {
        const lane = addBox(
          group,
          length,
          0.02,
          street.width * 0.92,
          laneMaterial,
          cx,
          0.055,
          cz,
          { cast: false }
        );
        lane.rotation.y = angle;
        continue;
      }
      if (street.width < 1.05) continue;

      const step = street.kind === "boulevard" || street.kind === "quay" ? 1.15 : 1.0;
      const count = Math.floor((length - 1.0) / step);
      for (let index = 0; index <= count; index += 1) {
        const along = -length / 2 + 0.5 + index * step;
        dashSpecs.push({
          x: cx + ux * along,
          z: cz + uz * along,
          angle,
          length: street.kind === "lane" ? 0.3 : 0.44,
        });
      }
    }
    if (dashSpecs.length) {
      const dashMesh = new THREE.InstancedMesh(boxGeometry, laneMat, dashSpecs.length);
      const dummy = new THREE.Object3D();
      dashSpecs.forEach((spec, index) => {
        dummy.position.set(spec.x, 0.078, spec.z);
        dummy.rotation.set(0, spec.angle, 0);
        dummy.scale.set(spec.length, 0.016, 0.055);
        dummy.updateMatrix();
        dashMesh.setMatrixAt(index, dummy.matrix);
      });
      dashMesh.instanceMatrix.needsUpdate = true;
      group.add(dashMesh);
    }

    const crossSpecs = [];
    const crossings = plan.arterials.filter((street) => street.width >= 1.3);
    for (let first = 0; first < crossings.length; first += 1) {
      for (let second = first + 1; second < crossings.length; second += 1) {
        const a = crossings[first];
        const b = crossings[second];
        const ax = a.x1 - a.x0;
        const az = a.z1 - a.z0;
        const bx = b.x1 - b.x0;
        const bz = b.z1 - b.z0;
        const denominator = ax * bz - az * bx;
        if (Math.abs(denominator) < 0.001) continue;
        const t = ((b.x0 - a.x0) * bz - (b.z0 - a.z0) * bx) / denominator;
        const u = ((b.x0 - a.x0) * az - (b.z0 - a.z0) * ax) / denominator;
        if (t < 0.06 || t > 0.94 || u < 0.06 || u > 0.94) continue;
        const px = a.x0 + ax * t;
        const pz = a.z0 + az * t;
        for (const street of [a, b]) {
          const dx = street.x1 - street.x0;
          const dz = street.z1 - street.z0;
          const length = Math.hypot(dx, dz);
          const ux = dx / length;
          const uz = dz / length;
          const nX = -uz;
          const nZ = ux;
          const angle = Math.atan2(-dz, dx);
          for (const side of [-1, 1]) {
            const distance = street.width / 2 + 0.55;
            for (const lane of [-0.34, 0, 0.34]) {
              crossSpecs.push({
                x: px + ux * side * distance + nX * lane,
                z: pz + uz * side * distance + nZ * lane,
                angle,
              });
            }
          }
        }
      }
    }
    if (crossSpecs.length) {
      const crossMesh = new THREE.InstancedMesh(boxGeometry, crosswalkMat, crossSpecs.length);
      const dummy = new THREE.Object3D();
      crossSpecs.forEach((spec, index) => {
        dummy.position.set(spec.x, 0.084, spec.z);
        dummy.rotation.set(0, spec.angle, 0);
        dummy.scale.set(0.07, 0.016, 0.52);
        dummy.updateMatrix();
        crossMesh.setMatrixAt(index, dummy.matrix);
      });
      crossMesh.instanceMatrix.needsUpdate = true;
      group.add(crossMesh);
    }

    for (const street of plan.arterials) {
      const dx = street.x1 - street.x0;
      const dz = street.z1 - street.z0;
      const length = Math.hypot(dx, dz);
      if (length < 1) continue;
      const ux = dx / length;
      const uz = dz / length;
      const angle = Math.atan2(-dz, dx);
      const cx = (street.x0 + street.x1) / 2;
      const cz = (street.z0 + street.z1) / 2;
      if (street.width >= 1.3) {
        for (const side of [-1, 1]) {
          const edge = addBox(
            group,
            length,
            0.02,
            0.1,
            trimMat,
            cx - uz * side * (street.width / 2 - 0.05),
            0.082,
            cz + ux * side * (street.width / 2 - 0.05),
            { cast: false }
          );
          edge.rotation.y = angle;
        }
      }
      if (street.kind === "boulevard" && street.width >= 2.2) {
        const median = addBox(
          group,
          length,
          0.03,
          0.24,
          grassMat,
          cx,
          0.075,
          cz,
          { cast: false }
        );
        median.rotation.y = angle;
        const treeCount = Math.floor(length / 3.2);
        for (let index = 1; index < treeCount; index += 1) {
          const along = -length / 2 + index * 3.2;
          addTree(
            group,
            cx + ux * along,
            cz + uz * along,
            rand(rng, 0.36, 0.48),
            0.08,
            index % 3 === 0 ? "cherry" : "broadleaf"
          );
        }
      }
      const count = Math.floor(length / 4.2);
      for (let index = 0; index <= count; index += 1) {
        const along = -length / 2 + 1.0 + index * 4.2;
        const side = index % 2 === 0 ? 1 : -1;
        const offset = street.width / 2 + 0.32;
        addStreetLamp(
          cx + ux * along - uz * side * offset,
          cz + uz * along + ux * side * offset,
          0.03,
          0.8
        );
      }
    }

    for (let x = -9.6; x <= 22; x += 2.6) {
      addTree(group, x, 4.45, rand(rng, 0.45, 0.58), 0.03, "broadleaf");
    }
    for (let z = 7.3; z <= 21.8; z += 2.6) {
      addTree(group, 4.85, z, rand(rng, 0.42, 0.56), 0.03, "palm");
    }
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
    angle = 0,
  }) {
    const firstRow = skipGround ? 1 : 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const addSide = (length, axis, side, rotation) => {
      const columns = Math.max(1, Math.floor(length / 0.42));
      const spacing = length / (columns + 1);
      for (let row = firstRow; row < floors; row += 1) {
        for (let col = 0; col < columns; col += 1) {
          if (rng() < 0.18) continue;
          const offset = -length / 2 + spacing * (col + 1);
          const y = baseY + bodyStart + row * floorHeight + floorHeight * 0.53;
          const localX = axis === "z" ? offset : side * (width / 2 + 0.022);
          const localZ = axis === "z" ? side * (depth / 2 + 0.022) : offset;
          windowSpecs.push({
            x: worldX + localX * cos + localZ * sin,
            y,
            z: worldZ - localX * sin + localZ * cos,
            rotation: rotation + angle,
            lit: rng() < litChance,
            scale: rand(rng, 0.86, 1.08),
          });
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
    rotation = 0,
    blockAngle = 0,
  }) {
    const root = new THREE.Group();
    root.position.set(localX, BLOCK_TOP, localZ);
    root.rotation.y = rotation;
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

    const cosA = Math.cos(blockAngle);
    const sinA = Math.sin(blockAngle);
    const worldX = blockX + localX * cosA + localZ * sinA;
    const worldZ = blockZ - localX * sinA + localZ * cosA;

    addWindows({
      worldX,
      worldZ,
      width,
      depth,
      floors: lowerFloors,
      bodyStart,
      floorHeight,
      litChance: kind === "downtown" ? 0.42 : 0.32,
      angle: rotation + blockAngle,
    });
    if (stepped) {
      addWindows({
        worldX,
        worldZ,
        width: upperWidth,
        depth: upperDepth,
        floors: upperFloors,
        bodyStart: 0,
        baseY: BLOCK_TOP + bodyStart + lowerHeight,
        floorHeight,
        litChance: 0.4,
        angle: rotation + blockAngle,
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
    rotation = 0,
    blockAngle = 0,
  }) {
    const root = new THREE.Group();
    root.position.set(localX, BLOCK_TOP, localZ);
    root.rotation.y = rotation;
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

    const roundCos = Math.cos(blockAngle);
    const roundSin = Math.sin(blockAngle);
    const roundCenterX = blockX + localX * roundCos + localZ * roundSin;
    const roundCenterZ = blockZ - localX * roundSin + localZ * roundCos;
    const totalAngle = rotation + blockAngle;
    for (let row = 1; row < floors; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        if (rng() < 0.14) continue;
        const angle = ((col + 0.5) / columns) * TAU;
        const offsetX = Math.cos(angle) * (radius + 0.035);
        const offsetZ = Math.sin(angle) * (radius + 0.035);
        windowSpecs.push({
          x: roundCenterX + offsetX * Math.cos(totalAngle) + offsetZ * Math.sin(totalAngle),
          y: BLOCK_TOP + bodyStart + row * floorHeight + floorHeight * 0.53,
          z: roundCenterZ - offsetX * Math.sin(totalAngle) + offsetZ * Math.cos(totalAngle),
          rotation: Math.PI / 2 - angle + totalAngle,
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
    rotation = 0,
    blockAngle = 0,
  }) {
    const root = new THREE.Group();
    root.position.set(localX, BLOCK_TOP, localZ);
    root.rotation.y = rotation;
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

    const houseCos = Math.cos(blockAngle);
    const houseSin = Math.sin(blockAngle);
    addWindows({
      worldX: blockX + localX * houseCos + localZ * houseSin,
      worldZ: blockZ - localX * houseSin + localZ * houseCos,
      width,
      depth,
      floors,
      bodyStart,
      floorHeight: 0.34,
      litChance: 0.42,
      skipGround: false,
      angle: rotation + blockAngle,
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
      school: ["b-school"],
      civic: ["b-cityhall", "b-museum", "b-library"],
      energy: ["b-energy"],
      industrial: ["b-energy", "b-warehouse", "b-workshop"],
      warehouse: ["b-warehouse"],
      market: ["b-market"],
      department: ["b-department"],
      office: ["b-glass", "b-stepped", "b-media", "b-office"],
      "harbor-office": ["b-office", "b-clinic"],
    };
    if (role === "landmark" || role === "skyscraper") {
      const candidates =
        role === "landmark"
          ? SKYSCRAPERS.filter((asset) => asset.id === "s-apex")
          : SKYSCRAPERS.filter((asset) => asset.id !== "s-apex");
      if (candidates.length) {
        const def = choose(rng, candidates);
        defUseCount.set(def.id, (defUseCount.get(def.id) ?? 0) + 1);
        return def;
      }
    }
    if (role && forcedPool[role]) {
      const candidates = forcedPool[role].map((id) => BUILDINGS_BY_ID.get(id)).filter(Boolean);
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
      addBox(root, width * 0.67, 0.12, 0.42, standard(accent), 0, 0.83, front + 0.28, {
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
      addBox(root, width * 0.45, 0.16, 0.06, standard(accent), 0, 0.94, front + 0.05);
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
    density = 1,
    rotation = 0,
    blockAngle = 0,
  }) {
    if (!def) return null;
    if (def.family === "skyscraper") {
      const record = addSkyscraperBlock({
        blockGroup,
        localX,
        localZ,
        lot,
        def,
        label,
        role,
        rotation,
      });
      addBuildingRecordDistrict(record, district);
      return record;
    }
    const model = def.model;
    const width = Math.max(0.55, Math.min(lot.w, rand(rng, model.width[0], model.width[1])));
    const depth = Math.max(0.55, Math.min(lot.d, rand(rng, model.depth[0], model.depth[1])));
    const floorScale = Math.max(0.4, density);
    let floors = Math.max(1, Math.round(rand(rng, model.floors[0], model.floors[1]) * floorScale));
    if (role === "landmark" || role === "clocktower" || role === "lighthouse") {
      floors = Math.max(floors, Math.round(model.floors[0] * floorScale));
    }
    const color = choose(rng, model.walls);
    const style = model.style;
    const kind = def.family;
    let record = null;

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
        rotation,
        blockAngle,
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
        rotation,
        blockAngle,
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
        rotation,
        blockAngle,
      });
      decorateCityBuilding(record, def);
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
        rotation,
        blockAngle,
      });
      decorateCityBuilding(record, def);
    }

    if (record) {
      addBuildingRecordDistrict(record, district);
    }
    return record;
  }

  function addBuildingRecordDistrict(record, district) {
    if (!record || !district) return;
    record.districtId = district.id;
    record.districtName = district.name;
    record.address = `BLOCK ${record.label} · ${district.name}`;
    if (district.model?.accent) record.districtAccent = district.model.accent;
  }

  // ---- Skyscrapers -------------------------------------------------------
  // A tower is assembled from four layers: a granite plaza, a colonnaded
  // lobby, a curtain-wall shaft and a crown. Each catalog style only swaps
  // the shaft and crown recipe, so the family reads as one typology instead
  // of a stretched house.

  function addOctagon(parent, width, height, depth, material, x, y, z, options = {}) {
    const mesh = new THREE.Mesh(cylinderGeometry, material);
    mesh.scale.set(width, height, depth);
    mesh.position.set(x, y, z);
    mesh.rotation.y = Math.PI / 8;
    mesh.castShadow = options.cast ?? true;
    mesh.receiveShadow = options.receive ?? true;
    parent.add(mesh);
    return mesh;
  }

  function addSkyscraperPlaza(root, span, mat) {
    const { mullion, accent } = mat;
    addBox(root, span, 0.07, span, plazaMat, 0, 0.035, 0, { cast: false, receive: true });
    addBox(root, span * 0.93, 0.045, span * 0.93, trimMat, 0, 0.09, 0, { cast: false });
    addBox(root, span * 0.56, 0.012, 0.08, accent, 0, 0.118, span * 0.32, {
      cast: false,
      receive: false,
    });
    addBox(root, 0.08, 0.012, span * 0.3, accent, span * 0.32, 0.118, 0, {
      cast: false,
      receive: false,
    });
    for (const side of [-1, 1]) {
      addPlanter(root, side * span * 0.4, span * 0.4, 0, 0.115);
      addPlanter(root, side * span * 0.4, -span * 0.4, 0, 0.115);
      addBox(root, 0.024, 0.92, 0.024, mullion, side * span * 0.27, 0.57, span * 0.41, {
        cast: false,
      });
      addBox(root, 0.16, 0.1, 0.014, accent, side * span * 0.27 + 0.09, 0.95, span * 0.41, {
        cast: false,
        receive: false,
      });
    }
  }

  function addSkyscraperLobby(root, options) {
    const { x = 0, z = 0, width, depth, height, mat } = options;
    const { glass, mullion, accent, dark } = mat;
    const baseY = 0.12;
    addBox(root, width * 1.07, 0.06, depth * 1.07, trimMat, x, baseY + 0.03, z, { cast: false });
    addBox(root, width, height, depth, glass, x, baseY + height / 2, z, { cast: true });

    const columns = Math.max(3, Math.round(width / 0.42));
    for (let index = 0; index <= columns; index += 1) {
      const columnX = x - width / 2 + (width * index) / columns;
      for (const side of [-1, 1]) {
        addBox(root, 0.07, height, 0.07, mullion, columnX, baseY + height / 2, z + side * (depth / 2 + 0.015), {
          cast: true,
        });
      }
    }
    const sideColumns = Math.max(2, Math.round(depth / 0.55));
    for (let index = 1; index < sideColumns; index += 1) {
      const columnZ = z - depth / 2 + (depth * index) / sideColumns;
      for (const side of [-1, 1]) {
        addBox(root, 0.07, height, 0.07, mullion, x + side * (width / 2 + 0.015), baseY + height / 2, columnZ, {
          cast: true,
        });
      }
    }

    addBox(root, width * 0.46, 0.045, 0.5, mullion, x, baseY + height * 0.86, z + depth / 2 + 0.25, {
      cast: true,
    });
    addBox(root, width * 0.46, 0.014, 0.5, accent, x, baseY + height * 0.86 - 0.03, z + depth / 2 + 0.25, {
      cast: false,
      receive: false,
    });
    addBox(root, 0.5, height * 0.62, 0.04, dark, x, baseY + (height * 0.62) / 2, z + depth / 2 + 0.03);
    addBox(root, 0.34, height * 0.62, 0.05, glass, x, baseY + (height * 0.62) / 2, z + depth / 2 + 0.036, {
      cast: false,
    });
    for (let step = 0; step < 3; step += 1) {
      addBox(
        root,
        width * (0.62 - step * 0.07),
        0.032,
        0.34 - step * 0.04,
        stoneMat,
        x,
        baseY + 0.06 - step * 0.02,
        z + depth / 2 + 0.52 + step * 0.1,
        { cast: false }
      );
    }
    addBox(root, width * 1.08, 0.06, depth * 1.08, trimMat, x, baseY + height + 0.03, z, { cast: false });
    return baseY + height + 0.06;
  }

  function addCurtainWall(parent, options) {
    const {
      width,
      depth,
      height,
      y0,
      floors,
      mat,
      bandEvery = 2,
      finStep = 0.26,
      litChance = 0.24,
      cornerBlades = true,
    } = options;
    const { glass, mullion } = mat;
    const midY = y0 + height / 2;
    addBox(parent, width, height, depth, glass, 0, midY, 0, { cast: true, receive: true });

    const columns = Math.max(3, Math.round(width / finStep));
    const rows = Math.max(3, Math.round(depth / finStep));
    for (let index = 0; index < columns; index += 1) {
      const x = -width / 2 + (width / columns) * (index + 0.5);
      for (const side of [-1, 1]) {
        addBox(parent, 0.03, height, 0.05, mullion, x, midY, side * (depth / 2 + 0.014), {
          cast: false,
          receive: false,
        });
      }
    }
    for (let index = 0; index < rows; index += 1) {
      const z = -depth / 2 + (depth / rows) * (index + 0.5);
      for (const side of [-1, 1]) {
        addBox(parent, 0.05, height, 0.03, mullion, side * (width / 2 + 0.014), midY, z, {
          cast: false,
          receive: false,
        });
      }
    }
    if (cornerBlades) {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const blade = addBox(parent, 0.15, height + 0.02, 0.15, mullion, (sx * width) / 2, midY, (sz * depth) / 2, {
            cast: false,
            receive: false,
          });
          blade.rotation.y = Math.PI / 4;
        }
      }
    }

    const floorCount = Math.max(2, Math.round(floors));
    for (let floor = bandEvery; floor < floorCount; floor += bandEvery) {
      addBox(parent, width + 0.045, 0.02, depth + 0.045, mullion, 0, y0 + (floor * height) / floorCount, 0, {
        cast: false,
        receive: false,
      });
    }
    for (let floor = 0; floor < floorCount; floor += 1) {
      if (rng() >= litChance) continue;
      addBox(
        parent,
        width + 0.008,
        (height / floorCount) * 0.44,
        depth + 0.008,
        towerWindowMaterial,
        0,
        y0 + ((floor + 0.5) * height) / floorCount,
        0,
        { cast: false, receive: false }
      );
    }
    return midY;
  }

  function addMechanicalBand(parent, options) {
    const { width, depth, y, mat } = options;
    addBox(parent, width + 0.07, 0.1, depth + 0.07, mat.dark, 0, y, 0, {
      cast: false,
      receive: false,
    });
    addBox(parent, width + 0.075, 0.014, depth + 0.075, mat.accent, 0, y + 0.056, 0, {
      cast: false,
      receive: false,
    });
  }

  function addSkyscraperRoof(parent, options) {
    const { width, depth, y, mat, machinery = true } = options;
    addBox(parent, width + 0.08, 0.05, depth + 0.08, mat.mullion, 0, y + 0.025, 0);
    if (machinery) {
      addBox(parent, width * 0.6, 0.26, depth * 0.5, mat.dark, 0, y + 0.18, 0);
      addBox(parent, width * 0.66, 0.035, depth * 0.56, mat.mullion, 0, y + 0.33, 0, {
        cast: false,
      });
      addBox(parent, width * 0.24, 0.2, depth * 0.24, mat.dark, width * 0.18, y + 0.15, -depth * 0.14);
    }
    addBox(parent, width + 0.02, 0.012, depth + 0.02, mat.accent, 0, y + 0.056, 0, {
      cast: false,
      receive: false,
    });
    return y + 0.38;
  }

  function addTowerAntenna(parent, options) {
    const { x = 0, z = 0, y, height = 1.5, mat, beacon = true } = options;
    addBox(parent, 0.03, height, 0.03, mat.dark, x, y + height / 2, z, {
      cast: false,
      receive: false,
    });
    for (const level of [0.3, 0.62]) {
      addBox(parent, 0.1, 0.02, 0.1, mat.mullion, x, y + height * level, z, {
        cast: false,
        receive: false,
      });
    }
    if (beacon) {
      const light = addBox(parent, 0.075, 0.075, 0.075, beaconMat, x, y + height + 0.04, z, {
        cast: false,
        receive: false,
      });
      beacons.push({ mesh: light, phase: rng() * TAU });
    }
  }

  function addSpireCrown(parent, options) {
    const { width, depth, y, mat, spireHeight = 1.2 } = options;
    addBox(parent, width * 0.9, 0.08, depth * 0.9, mat.mullion, 0, y + 0.04, 0);
    addBox(parent, width * 0.82, 0.34, depth * 0.82, mat.glass, 0, y + 0.25, 0, {
      cast: false,
    });
    const ribs = 8;
    for (let index = 0; index < ribs; index += 1) {
      const angle = (index / ribs) * TAU;
      addBox(
        parent,
        0.03,
        0.34,
        0.03,
        mat.mullion,
        Math.cos(angle) * width * 0.4,
        y + 0.25,
        Math.sin(angle) * depth * 0.4,
        { cast: false, receive: false }
      );
    }
    addBox(parent, width * 0.86, 0.04, depth * 0.86, mat.accent, 0, y + 0.44, 0, {
      cast: false,
      receive: false,
    });
    addPyramid(parent, width * 0.66, spireHeight, depth * 0.66, mat.roof, 0, y + 0.46, 0, Math.PI / 4);
    addBox(parent, 0.028, 0.4, 0.028, mat.dark, 0, y + 0.46 + spireHeight + 0.2, 0, {
      cast: false,
    });
    const light = addBox(parent, 0.08, 0.08, 0.08, beaconMat, 0, y + 0.46 + spireHeight + 0.44, 0, {
      cast: false,
      receive: false,
    });
    beacons.push({ mesh: light, phase: rng() * TAU });
    return y + 0.46 + spireHeight + 0.5;
  }

  function addObservationCrown(parent, options) {
    const { width, depth, y, mat, lanternHeight = 0.7 } = options;
    addBox(parent, width * 1.24, 0.06, depth * 1.24, mat.mullion, 0, y + 0.03, 0);
    addBox(parent, width * 1.12, 0.3, depth * 1.12, mat.glass, 0, y + 0.21, 0, { cast: false });
    const ribs = 14;
    for (let index = 0; index < ribs; index += 1) {
      const angle = (index / ribs) * TAU;
      addBox(
        parent,
        0.035,
        0.32,
        0.035,
        mat.mullion,
        Math.cos(angle) * width * 0.55,
        y + 0.21,
        Math.sin(angle) * depth * 0.55,
        { cast: false, receive: false }
      );
    }
    addBox(parent, width * 1.2, 0.05, depth * 1.2, mat.mullion, 0, y + 0.4, 0);
    addBox(parent, width * 1.17, 0.02, depth * 1.17, mat.accent, 0, y + 0.43, 0, {
      cast: false,
      receive: false,
    });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const strut = addBox(parent, 0.04, 0.34, 0.04, mat.mullion, sx * width * 0.5, y - 0.15, sz * depth * 0.5, {
          cast: false,
        });
        strut.rotation.z = sx * 0.5;
        strut.rotation.x = sz * 0.5;
      }
    }

    addBox(parent, width * 0.62, lanternHeight, depth * 0.62, mat.glass, 0, y + 0.46 + lanternHeight / 2, 0, {
      cast: false,
    });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        addBox(parent, 0.05, lanternHeight, 0.05, mat.mullion, sx * width * 0.3, y + 0.46 + lanternHeight / 2, sz * depth * 0.3, {
          cast: false,
        });
      }
    }
    addBox(parent, width * 0.68, 0.05, depth * 0.68, mat.mullion, 0, y + 0.46 + lanternHeight + 0.02, 0);
    addBox(parent, width * 0.66, 0.02, depth * 0.66, mat.accent, 0, y + 0.46 + lanternHeight + 0.055, 0, {
      cast: false,
      receive: false,
    });
    addPyramid(parent, width * 0.42, 0.9, depth * 0.42, mat.roof, 0, y + 0.5 + lanternHeight, 0, Math.PI / 4);
    addTowerAntenna(parent, { y: y + 0.5 + lanternHeight + 0.92, height: 0.9, mat });
    return y + 0.5 + lanternHeight + 1.9;
  }

  function addSkyTerrace(parent, options) {
    const { x, z, width, depth, y, side, mat } = options;
    const out = 0.42;
    let sx = x;
    let sz = z;
    let terraceWidth = width * 0.86;
    let terraceDepth = depth * 0.86;
    if (side === "s") {
      sz = z + depth / 2 + out / 2;
      terraceDepth = out;
    } else if (side === "n") {
      sz = z - depth / 2 - out / 2;
      terraceDepth = out;
    } else if (side === "e") {
      sx = x + width / 2 + out / 2;
      terraceWidth = out;
    } else {
      sx = x - width / 2 - out / 2;
      terraceWidth = out;
    }
    addBox(parent, terraceWidth, 0.05, terraceDepth, mat.mullion, sx, y, sz, { cast: false });
    addBox(
      parent,
      terraceWidth * 0.84,
      0.035,
      terraceDepth * 0.68,
      standard("#6f8f5c", { roughness: 0.98 }),
      sx,
      y + 0.04,
      sz,
      { cast: false }
    );
    addBush(parent, sx - terraceWidth * 0.24, sz, 0.42, y + 0.06);
    addBush(parent, sx + terraceWidth * 0.2, sz, 0.34, y + 0.06);
    return y + 0.1;
  }

  function addOctagonShaft(parent, options) {
    const { width, depth, height, y0, floors, mat, litChance = 0.2 } = options;
    const midY = y0 + height / 2;
    addOctagon(parent, width, height, depth, mat.glass, 0, midY, 0);
    for (let index = 0; index < 8; index += 1) {
      const angle = Math.PI / 8 + (index / 8) * TAU;
      const rib = addBox(
        parent,
        0.05,
        height,
        0.05,
        mat.mullion,
        Math.cos(angle) * width * 0.49,
        midY,
        Math.sin(angle) * depth * 0.49,
        { cast: false, receive: false }
      );
      rib.rotation.y = -angle;
    }
    const floorCount = Math.max(2, Math.round(floors));
    for (let floor = 2; floor < floorCount; floor += 2) {
      addOctagon(parent, width + 0.015, 0.018, depth + 0.015, mat.mullion, 0, y0 + (floor * height) / floorCount, 0, {
        cast: false,
        receive: false,
      });
    }
    for (let floor = 0; floor < floorCount; floor += 1) {
      if (rng() >= litChance) continue;
      addOctagon(
        parent,
        width + 0.006,
        (height / floorCount) * 0.42,
        depth + 0.006,
        towerWindowMaterial,
        0,
        y0 + ((floor + 0.5) * height) / floorCount,
        0,
        { cast: false, receive: false }
      );
    }
    return midY;
  }

  const NAMED_SKYSCRAPERS = new Set([
    "s-trade",
    "s-empire",
    "s-chrysler",
    "s-burj",
    "s-taipei",
    "s-petronas",
    "s-onewtc",
  ]);

  function finishSkyscraper(root, options) {
    const { def, label, role, width, depth, topY, bodyTop, color, style } = options;
    const model = def.model;
    const floors = Math.round(rand(rng, model.floors[0], model.floors[1]));
    const height = Math.round(rand(rng, model.tall[0], model.tall[1]));
    const record = {
      id: `${label}-${buildings.length}`,
      name: makeName("downtown", label),
      kind: "skyscraper",
      label,
      floors,
      height,
      population: 0,
      jobs: Math.round(floors * 34 + width * depth * 120),
      occupancy: Math.round(rand(rng, 0.62, 0.97) * 100),
      year: 2039 + Math.floor(rng() * 16),
      color,
      note: def.description,
      address: `BLOCK ${label} · 像素湾中心区`,
      landmark: role === "landmark",
      root,
      footprint: { width, depth },
      style,
      topY,
      bodyTop,
      isSupertall: true,
      typeId: def.id,
      typeLabel: `${def.en} / ${def.name}`,
      description: def.description,
      family: def.family,
    };
    if (NAMED_SKYSCRAPERS.has(def.id)) {
      record.name = usedNames.has(def.name) ? `${def.name}·${label}` : def.name;
      usedNames.add(record.name);
    }
    if (role === "landmark") record.name = def.name;
    addBuildingInfo(root, record);
    return record;
  }

  function addSkyscraperBlock({ blockGroup, localX, localZ, lot, def, label, role = null, rotation = 0 }) {
    const model = def.model;
    const style = model.style ?? "pinnacle";
    const root = new THREE.Group();
    root.position.set(localX, BLOCK_TOP, localZ);
    root.rotation.y = rotation;
    blockGroup.add(root);

    const width = Math.min(lot.w + 1.0, rand(rng, model.width[0], model.width[1]));
    const depth = Math.min(lot.d + 0.6, rand(rng, model.depth[0], model.depth[1]));
    const rise = rand(rng, model.rise[0], model.rise[1]);
    const wallColor = choose(rng, model.walls);
    const accentColor = model.accent ?? "#ffd166";
    const mat = {
      glass: standard(model.glass ?? "#8fb8c4", { roughness: 0.2, metalness: 0.46 }),
      mullion: standard(model.mullion ?? "#d9ddd6", { roughness: 0.34, metalness: 0.42 }),
      dark: standard("#2c363d", { roughness: 0.42, metalness: 0.4 }),
      accent: standard(accentColor, {
        emissive: accentColor,
        emissiveIntensity: 0.1,
        roughness: 0.45,
        metalness: 0.2,
      }),
      roof: standard(model.roof ?? "#46545c", { roughness: 0.55, metalness: 0.18 }),
      trim: standard(wallColor, { roughness: 0.52, metalness: 0.2 }),
    };
    neonMaterials.push(mat.accent);

    const visualFloors = (height) => Math.max(6, Math.round(height / (FLOOR_HEIGHT * 0.92)));
    let topY = 0;
    let bodyTop = 0;

    if (style === "wtc") {
      const span = width * 1.06;
      addSkyscraperPlaza(root, span, mat);
      const gap = Math.max(0.5, width * 0.21);
      const towerWidth = (width - gap) / 2;
      const towerDepth = Math.min(depth, towerWidth * 1.08);
      const offset = (towerWidth + gap) / 2;
      const towerRise = [rise, rise * 0.992];
      let tallest = 0;
      for (let index = 0; index < 2; index += 1) {
        const towerX = (index === 0 ? -1 : 1) * offset;
        const towerGroup = new THREE.Group();
        towerGroup.position.x = towerX;
        root.add(towerGroup);
        const lobbyTop = addSkyscraperLobby(towerGroup, {
          width: towerWidth * 0.98,
          depth: towerDepth * 0.98,
          height: 0.58,
          mat,
        });
        const height = towerRise[index];
        addCurtainWall(towerGroup, {
          width: towerWidth,
          depth: towerDepth,
          height,
          y0: lobbyTop,
          floors: visualFloors(height),
          mat,
          finStep: 0.19,
          bandEvery: 2,
          litChance: 0.26,
        });
        const top = lobbyTop + height;
        addSkyscraperRoof(towerGroup, { width: towerWidth, depth: towerDepth, y: top, mat, machinery: true });
        addTowerAntenna(towerGroup, {
          y: top + 0.36,
          height: index === 0 ? 1.95 : 1.35,
          mat,
        });
        tallest = Math.max(tallest, top + 0.36 + (index === 0 ? 1.95 : 1.35));
      }
      addBox(root, gap + 0.6, 0.14, towerDepth * 0.56, mat.glass, 0, 0.19, 0, { cast: false });
      addBox(root, gap + 0.66, 0.03, towerDepth * 0.6, mat.mullion, 0, 0.28, 0, { cast: false });
      bodyTop = Math.max(bodyTop, tallest - 2.3);
      topY = tallest;
    } else if (style === "twinbridge") {
      addSkyscraperPlaza(root, Math.max(width, depth) * 1.12, mat);
      const gap = Math.max(0.48, width * 0.16);
      const towerWidth = (width - gap) / 2;
      const towerDepth = depth;
      const offset = (towerWidth + gap) / 2;
      const heights = [rise, rise * 0.84];
      const tops = [];
      for (let index = 0; index < 2; index += 1) {
        const towerX = (index === 0 ? -1 : 1) * offset;
        const towerGroup = new THREE.Group();
        towerGroup.position.x = towerX;
        root.add(towerGroup);
        const lobbyTop = addSkyscraperLobby(towerGroup, {
          width: towerWidth * 0.96,
          depth: towerDepth * 0.96,
          height: 0.5,
          mat,
        });
        const height = heights[index];
        addCurtainWall(towerGroup, {
          width: towerWidth,
          depth: towerDepth,
          height,
          y0: lobbyTop,
          floors: visualFloors(height),
          mat,
          finStep: 0.22,
          litChance: 0.28,
        });
        const top = lobbyTop + height;
        addSkyscraperRoof(towerGroup, { width: towerWidth, depth: towerDepth, y: top, mat, machinery: index === 0 });
        addTowerAntenna(towerGroup, { y: top + 0.36, height: index === 0 ? 0.9 : 0.6, mat });
        tops.push(top);
      }
      // Skybridge between the two towers.
      const bridgeY = Math.min(tops[0], tops[1]) - 1.5;
      addBox(root, gap + 0.24, 0.16, towerDepth * 0.42, mat.mullion, 0, bridgeY, 0, { cast: true });
      addBox(root, gap + 0.26, 0.05, towerDepth * 0.36, towerWindowMaterial, 0, bridgeY, 0, {
        cast: false,
        receive: false,
      });
      addBox(root, gap + 0.3, 0.03, towerDepth * 0.46, mat.mullion, 0, bridgeY + 0.09, 0, { cast: false });
      bodyTop = Math.max(topY - 2, tops[1] - 0.2);
      topY = Math.max(...tops) + 0.9;
      bodyTop = tops[1];
    } else if (style === "pinnacle") {
      addSkyscraperPlaza(root, Math.max(width, depth) * 1.46, mat);
      const lobbyTop = addSkyscraperLobby(root, {
        width: width * 1.08,
        depth: depth * 1.08,
        height: 0.62,
        mat,
      });
      const tiers = [
        { scale: 1, share: 0.44 },
        { scale: 0.84, share: 0.3 },
        { scale: 0.7, share: 0.18 },
      ];
      let y = lobbyTop;
      tiers.forEach((tier, index) => {
        const tierHeight = rise * tier.share;
        const tierWidth = width * tier.scale;
        const tierDepth = depth * tier.scale;
        addCurtainWall(root, {
          width: tierWidth,
          depth: tierDepth,
          height: tierHeight,
          y0: y,
          floors: visualFloors(tierHeight),
          mat,
          litChance: 0.24,
        });
        addBox(root, tierWidth + 0.14, 0.07, tierDepth + 0.14, trimMat, 0, y + tierHeight + 0.035, 0);
        addBox(root, tierWidth * 0.94, 0.06, tierDepth * 0.94, standard("#6f8a63", { roughness: 0.98 }), 0, y + tierHeight + 0.08, 0, {
          cast: false,
        });
        if (index < 2) {
          for (const sx of [-1, 1]) {
            for (const sz of [-1, 1]) {
              addBox(root, 0.12, 0.34, 0.12, mat.mullion, (sx * tierWidth) / 2, y + tierHeight + 0.22, (sz * tierDepth) / 2, {
                cast: false,
              });
            }
          }
        }
        y += tierHeight + 0.1;
      });
      topY = addSpireCrown(root, { width: width * 0.7, depth: depth * 0.7, y, mat, spireHeight: 1.35 });
      bodyTop = y;
    } else if (style === "facet") {
      addSkyscraperPlaza(root, Math.max(width, depth) * 1.4, mat);
      const lobbyTop = addSkyscraperLobby(root, {
        width: width * 1.12,
        depth: depth * 1.12,
        height: 0.66,
        mat,
      });
      addCurtainWall(root, {
        width,
        depth,
        height: rise,
        y0: lobbyTop,
        floors: visualFloors(rise),
        mat,
        finStep: 0.3,
        bandEvery: 4,
        litChance: 0.14,
      });
      const modules = 6;
      const moduleHeight = rise / modules;
      const braceAngleX = Math.atan2(moduleHeight, width * 0.86);
      const braceAngleZ = Math.atan2(moduleHeight, depth * 0.86);
      for (let module = 0; module < modules; module += 1) {
        const y = lobbyTop + moduleHeight * (module + 0.5);
        const direction = module % 2 === 0 ? 1 : -1;
        const braceLengthX = Math.hypot(moduleHeight, width * 0.86);
        const braceLengthZ = Math.hypot(moduleHeight, depth * 0.86);
        for (const side of [-1, 1]) {
          const brace = addBox(root, braceLengthX, 0.055, 0.055, mat.mullion, 0, y, side * (depth / 2 + 0.035), {
            cast: false,
            receive: false,
          });
          brace.rotation.z = direction * braceAngleX;
        }
        for (const side of [-1, 1]) {
          const brace = addBox(root, 0.055, 0.055, braceLengthZ, mat.mullion, side * (width / 2 + 0.035), y, 0, {
            cast: false,
            receive: false,
          });
          brace.rotation.x = -direction * braceAngleZ;
        }
        addBox(root, width + 0.08, 0.045, depth + 0.08, mat.mullion, 0, lobbyTop + moduleHeight * (module + 1), 0, {
          cast: false,
          receive: false,
        });
      }
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const column = addBox(root, 0.17, rise, 0.17, mat.mullion, (sx * width) / 2, lobbyTop + rise / 2, (sz * depth) / 2, {
            cast: false,
          });
          column.rotation.y = Math.PI / 4;
        }
      }
      addMechanicalBand(root, { width, depth, y: lobbyTop + rise * 0.66, mat });
      const top = lobbyTop + rise;
      addSkyscraperRoof(root, { width, depth, y: top, mat, machinery: true });
      addBox(root, width * 0.56, 0.34, depth * 0.56, mat.dark, 0, top + 0.56, 0);
      addBox(root, width * 0.6, 0.05, depth * 0.6, mat.accent, 0, top + 0.74, 0, {
        cast: false,
        receive: false,
      });
      topY = addSpireCrown(root, { width: width * 0.56, depth: depth * 0.56, y: top + 0.78, mat, spireHeight: 1.1 });
      bodyTop = top;
    } else if (style === "terrace") {
      addSkyscraperPlaza(root, Math.max(width, depth) * 1.46, mat);
      const lobbyTop = addSkyscraperLobby(root, {
        width: width * 1.06,
        depth: depth * 1.06,
        height: 0.6,
        mat,
      });
      const coreWidth = width * 0.7;
      const coreDepth = depth * 0.7;
      const floors = visualFloors(rise);
      addCurtainWall(root, {
        width: coreWidth,
        depth: coreDepth,
        height: rise,
        y0: lobbyTop,
        floors,
        mat,
        litChance: 0.22,
      });
      const levels = Math.max(4, Math.floor(floors / 3));
      const sides = ["s", "e", "n", "w"];
      for (let level = 1; level <= levels; level += 1) {
        const y = lobbyTop + (rise * level) / (levels + 1);
        addSkyTerrace(root, {
          width: coreWidth,
          depth: coreDepth,
          y,
          side: sides[(level - 1) % 4],
          mat,
        });
        if (level % 2 === 0) {
          addSkyTerrace(root, {
            width: coreWidth,
            depth: coreDepth,
            y: y + 0.42,
            side: sides[(level + 1) % 4],
            mat,
          });
        }
      }
      const top = lobbyTop + rise;
      addBox(root, width * 0.9, 0.1, depth * 0.9, trimMat, 0, top + 0.05, 0);
      addBox(root, width * 0.78, 0.12, depth * 0.78, standard("#6f8f5c", { roughness: 0.98 }), 0, top + 0.15, 0, {
        cast: false,
      });
      addBush(root, width * 0.18, depth * 0.12, 0.6, top + 0.2);
      addBush(root, -width * 0.2, -depth * 0.1, 0.48, top + 0.2);
      addBox(root, 0.05, 0.8, 0.05, mat.dark, width * 0.24, top + 0.55, -depth * 0.1, {
        cast: false,
      });
      const light = addBox(root, 0.07, 0.07, 0.07, beaconMat, width * 0.24, top + 1.0, -depth * 0.1, {
        cast: false,
        receive: false,
      });
      beacons.push({ mesh: light, phase: rng() * TAU });
      topY = top + 1.0;
      bodyTop = top;
    } else if (style === "twist") {
      addSkyscraperPlaza(root, Math.max(width, depth) * 1.4, mat);
      const lobbyTop = addSkyscraperLobby(root, {
        width: width * 1.08,
        depth: depth * 1.08,
        height: 0.6,
        mat,
      });
      const segments = 11;
      const segmentHeight = rise / segments;
      for (let index = 0; index < segments; index += 1) {
        const t = index / (segments - 1);
        const scale = 1 - t * 0.14;
        const segment = new THREE.Group();
        segment.position.y = lobbyTop + segmentHeight * (index + 0.5);
        segment.rotation.y = index * 0.055;
        root.add(segment);
        addBox(segment, width * scale, segmentHeight * 1.005, depth * scale, mat.glass, 0, 0, 0, {
          cast: true,
        });
        addBox(segment, width * scale + 0.04, 0.026, depth * scale + 0.04, mat.mullion, 0, segmentHeight / 2, 0, {
          cast: false,
          receive: false,
        });
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            addBox(segment, 0.09, segmentHeight, 0.09, mat.mullion, (sx * width * scale) / 2, 0, (sz * depth * scale) / 2, {
              cast: false,
              receive: false,
            });
          }
        }
        for (let fin = 0; fin < 2; fin += 1) {
          const offset = (fin === 0 ? -1 : 1) * 0.18 * width * scale;
          addBox(segment, 0.04, segmentHeight, 0.05, mat.mullion, offset, 0, (depth * scale) / 2 + 0.012, {
            cast: false,
            receive: false,
          });
          addBox(segment, 0.05, segmentHeight, 0.04, mat.mullion, (width * scale) / 2 + 0.012, 0, offset, {
            cast: false,
            receive: false,
          });
        }
        if (index % 3 === 0) {
          addBox(segment, width * scale * 0.62, segmentHeight * 0.5, depth * scale * 0.62, mat.accent, 0, 0, 0, {
            cast: false,
            receive: false,
          });
        }
      }
      const top = lobbyTop + rise;
      addBox(root, width * 0.78, 0.08, depth * 0.78, mat.mullion, 0, top + 0.04, 0);
      addBox(root, width * 0.6, 0.2, depth * 0.6, mat.dark, 0, top + 0.18, 0);
      topY = addSpireCrown(root, { width: width * 0.56, depth: depth * 0.56, y: top + 0.3, mat, spireHeight: 1.2 });
      bodyTop = top;
    } else if (style === "deco") {
      addSkyscraperPlaza(root, Math.max(width, depth) * 1.44, mat);
      const lobbyTop = addSkyscraperLobby(root, {
        width: width * 1.12,
        depth: depth * 1.12,
        height: 0.72,
        mat,
      });
      const tiers = [
        { scale: 1, share: 0.34 },
        { scale: 0.82, share: 0.26 },
        { scale: 0.64, share: 0.2 },
        { scale: 0.46, share: 0.12 },
      ];
      let y = lobbyTop;
      tiers.forEach((tier) => {
        const tierHeight = rise * tier.share;
        const tierWidth = width * tier.scale;
        const tierDepth = depth * tier.scale;
        addCurtainWall(root, {
          width: tierWidth,
          depth: tierDepth,
          height: tierHeight,
          y0: y,
          floors: visualFloors(tierHeight),
          mat,
          finStep: 0.2,
          bandEvery: 2,
          litChance: 0.16,
        });
        addBox(root, tierWidth + 0.16, 0.07, tierDepth + 0.16, trimMat, 0, y + tierHeight + 0.035, 0);
        addBox(root, tierWidth + 0.04, 0.03, tierDepth + 0.04, mat.mullion, 0, y + tierHeight + 0.085, 0, {
          cast: false,
        });
        y += tierHeight + 0.09;
      });
      addBox(root, width * 0.46, 0.42, depth * 0.46, mat.trim, 0, y + 0.21, 0);
      addBox(root, width * 0.36, 0.3, depth * 0.36, mat.mullion, 0, y + 0.57, 0);
      addBox(root, width * 0.27, 0.24, depth * 0.27, mat.trim, 0, y + 0.84, 0);
      addBox(root, width * 0.3, 0.045, depth * 0.3, mat.accent, 0, y + 0.98, 0, {
        cast: false,
        receive: false,
      });
      addCylinder(root, width * 0.07, 0.42, mat.mullion, 0, y + 1.05, 0);
      addCylinder(root, width * 0.045, 0.5, mat.mullion, 0, y + 1.45, 0);
      addBox(root, 0.06, 0.03, 0.06, mat.accent, 0, y + 1.3, 0, { cast: false, receive: false });
      addTowerAntenna(root, { y: y + 1.6, height: 1.1, mat });
      topY = y + 3.1;
      bodyTop = y;
    } else if (style === "chrysler") {
      addSkyscraperPlaza(root, Math.max(width, depth) * 1.42, mat);
      const lobbyTop = addSkyscraperLobby(root, {
        width: width * 1.1,
        depth: depth * 1.1,
        height: 0.68,
        mat,
      });
      const tiers = [
        { scale: 1, share: 0.42 },
        { scale: 0.88, share: 0.3 },
        { scale: 0.78, share: 0.18 },
      ];
      let y = lobbyTop;
      tiers.forEach((tier) => {
        const tierHeight = rise * tier.share;
        const tierWidth = width * tier.scale;
        const tierDepth = depth * tier.scale;
        addCurtainWall(root, {
          width: tierWidth,
          depth: tierDepth,
          height: tierHeight,
          y0: y,
          floors: visualFloors(tierHeight),
          mat,
          finStep: 0.2,
          bandEvery: 2,
          litChance: 0.18,
        });
        addBox(root, tierWidth + 0.14, 0.06, tierDepth + 0.14, trimMat, 0, y + tierHeight + 0.03, 0);
        y += tierHeight + 0.08;
      });
      const crownScales = [0.7, 0.62, 0.54, 0.46, 0.38, 0.3];
      crownScales.forEach((scale, index) => {
        const crownWidth = width * scale;
        const crownDepth = depth * scale;
        addBox(root, crownWidth, 0.17, crownDepth, index % 3 === 0 ? mat.trim : mat.mullion, 0, y + 0.085, 0);
        addBox(root, crownWidth + 0.018, 0.012, crownDepth + 0.018, mat.accent, 0, y + 0.175, 0, {
          cast: false,
          receive: false,
        });
        if (index < 4) {
          for (const sx of [-1, 1]) {
            addBox(root, 0.035, 0.1, 0.02, mat.accent, (sx * crownWidth) / 2, y + 0.09, crownDepth / 2 + 0.01, {
              cast: false,
              receive: false,
            });
          }
        }
        y += 0.17;
      });
      addBox(root, 0.05, 1.5, 0.05, mat.mullion, 0, y + 0.75, 0, { cast: false });
      const light = addBox(root, 0.07, 0.07, 0.07, beaconMat, 0, y + 1.52, 0, {
        cast: false,
        receive: false,
      });
      beacons.push({ mesh: light, phase: rng() * TAU });
      topY = y + 1.6;
      bodyTop = y;
    } else if (style === "tiered") {
      addSkyscraperPlaza(root, Math.max(width, depth) * 1.36, mat);
      const lobbyTop = addSkyscraperLobby(root, {
        width: width * 1.1,
        depth: depth * 1.1,
        height: 0.7,
        mat,
      });
      const tiers = [
        { scale: 1, share: 0.24, dx: 0, dz: 0 },
        { scale: 0.93, share: 0.18, dx: 0.09, dz: 0.03 },
        { scale: 0.86, share: 0.15, dx: 0.13, dz: -0.05 },
        { scale: 0.79, share: 0.12, dx: -0.08, dz: 0.07 },
        { scale: 0.71, share: 0.1, dx: -0.12, dz: -0.04 },
        { scale: 0.62, share: 0.08, dx: 0.06, dz: 0.07 },
        { scale: 0.52, share: 0.06, dx: 0.09, dz: -0.05 },
        { scale: 0.42, share: 0.04, dx: -0.04, dz: 0.03 },
      ];
      let y = lobbyTop;
      tiers.forEach((tier) => {
        const tierHeight = rise * tier.share;
        const tierGroup = new THREE.Group();
        tierGroup.position.set(tier.dx, 0, tier.dz);
        root.add(tierGroup);
        addCurtainWall(tierGroup, {
          width: width * tier.scale,
          depth: depth * tier.scale,
          height: tierHeight,
          y0: y,
          floors: visualFloors(tierHeight),
          mat,
          finStep: 0.24,
          bandEvery: 3,
          litChance: 0.2,
        });
        addBox(
          root,
          width * tier.scale + 0.1,
          0.05,
          depth * tier.scale + 0.1,
          mat.mullion,
          tier.dx,
          y + tierHeight + 0.025,
          tier.dz,
          { cast: false }
        );
        y += tierHeight + 0.05;
      });
      addBox(root, width * 0.32, 0.3, depth * 0.32, mat.mullion, 0, y + 0.15, 0);
      addPyramid(root, width * 0.26, 1.9, depth * 0.26, mat.roof, 0, y + 0.3, 0, Math.PI / 4);
      const light = addBox(root, 0.07, 0.07, 0.07, beaconMat, 0, y + 2.24, 0, {
        cast: false,
        receive: false,
      });
      beacons.push({ mesh: light, phase: rng() * TAU });
      topY = y + 2.3;
      bodyTop = y;
    } else if (style === "pagoda") {
      addSkyscraperPlaza(root, Math.max(width, depth) * 1.44, mat);
      const lobbyTop = addSkyscraperLobby(root, {
        width: width * 1.12,
        depth: depth * 1.12,
        height: 0.68,
        mat,
      });
      const segments = 8;
      const segmentHeight = (rise * 0.86) / segments;
      let y = lobbyTop;
      for (let index = 0; index < segments; index += 1) {
        const scale = 1 - index * 0.008;
        const segmentWidth = width * scale;
        const segmentDepth = depth * scale;
        addCurtainWall(root, {
          width: segmentWidth,
          depth: segmentDepth,
          height: segmentHeight,
          y0: y,
          floors: visualFloors(segmentHeight),
          mat,
          finStep: 0.24,
          bandEvery: 2,
          litChance: 0.24,
        });
        addBox(root, segmentWidth + 0.38, 0.1, segmentDepth + 0.38, trimMat, 0, y + segmentHeight + 0.05, 0);
        addBox(
          root,
          segmentWidth + 0.44,
          0.025,
          segmentDepth + 0.44,
          mat.accent,
          0,
          y + segmentHeight + 0.113,
          0,
          { cast: false, receive: false }
        );
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            addBox(
              root,
              0.12,
              0.17,
              0.12,
              mat.mullion,
              (sx * segmentWidth) / 2,
              y + segmentHeight + 0.14,
              (sz * segmentDepth) / 2,
              { cast: false }
            );
          }
        }
        y += segmentHeight + 0.18;
      }
      addBox(root, width * 0.5, 0.58, depth * 0.5, mat.glass, 0, y + 0.29, 0, { cast: false });
      addBox(root, width * 0.56, 0.06, depth * 0.56, mat.mullion, 0, y + 0.61, 0);
      addBox(root, width * 0.52, 0.02, depth * 0.52, mat.accent, 0, y + 0.66, 0, {
        cast: false,
        receive: false,
      });
      addBox(root, 0.06, 1.5, 0.06, mat.mullion, 0, y + 1.36, 0, { cast: false });
      addBox(root, 0.2, 0.03, 0.2, mat.mullion, 0, y + 2.0, 0, { cast: false });
      const light = addBox(root, 0.07, 0.07, 0.07, beaconMat, 0, y + 2.18, 0, {
        cast: false,
        receive: false,
      });
      beacons.push({ mesh: light, phase: rng() * TAU });
      topY = y + 2.25;
      bodyTop = y + 0.66;
    } else if (style === "petronas") {
      const span = width * 1.08;
      addSkyscraperPlaza(root, span, mat);
      const gap = Math.max(0.52, width * 0.19);
      const towerWidth = (width - gap) / 2;
      const towerDepth = depth * 0.92;
      const offset = (towerWidth + gap) / 2;
      let tallest = 0;
      let bridgeBase = 0;
      for (let index = 0; index < 2; index += 1) {
        const towerX = (index === 0 ? -1 : 1) * offset;
        const towerGroup = new THREE.Group();
        towerGroup.position.x = towerX;
        root.add(towerGroup);
        const lobbyTop = addSkyscraperLobby(towerGroup, {
          width: towerWidth * 0.98,
          depth: towerDepth * 0.98,
          height: 0.52,
          mat,
        });
        if (index === 0) bridgeBase = lobbyTop;
        const towerRise = index === 0 ? rise : rise * 0.996;
        let y = lobbyTop;
        const tiers = [
          { scale: 1, share: 0.62 },
          { scale: 0.86, share: 0.2 },
          { scale: 0.72, share: 0.12 },
        ];
        tiers.forEach((tier) => {
          const tierHeight = towerRise * tier.share;
          const tierWidth = towerWidth * tier.scale;
          const tierDepth = towerDepth * tier.scale;
          addCurtainWall(towerGroup, {
            width: tierWidth,
            depth: tierDepth,
            height: tierHeight,
            y0: y,
            floors: visualFloors(tierHeight),
            mat,
            finStep: 0.2,
            bandEvery: 2,
            litChance: 0.26,
          });
          addBox(towerGroup, tierWidth + 0.08, 0.045, tierDepth + 0.08, mat.mullion, 0, y + tierHeight + 0.022, 0);
          addBox(towerGroup, tierWidth + 0.03, 0.012, tierDepth + 0.03, mat.accent, 0, y + tierHeight + 0.053, 0, {
            cast: false,
            receive: false,
          });
          y += tierHeight + 0.07;
        });
        addBox(towerGroup, 0.055, 1.2, 0.055, mat.mullion, 0, y + 0.6, 0, { cast: false });
        addBox(towerGroup, 0.16, 0.035, 0.16, mat.mullion, 0, y + 0.9, 0, { cast: false });
        const light = addBox(towerGroup, 0.07, 0.07, 0.07, beaconMat, 0, y + 1.26, 0, {
          cast: false,
          receive: false,
        });
        beacons.push({ mesh: light, phase: rng() * TAU });
        tallest = Math.max(tallest, y + 1.3);
      }
      const bridgeY = bridgeBase + rise * 0.42;
      addBox(root, gap + 0.3, 0.1, towerDepth * 0.24, mat.mullion, 0, bridgeY, 0, { cast: true });
      addBox(root, gap + 0.32, 0.04, towerDepth * 0.18, towerWindowMaterial, 0, bridgeY, 0, {
        cast: false,
        receive: false,
      });
      addBox(root, gap + 0.3, 0.08, towerDepth * 0.18, mat.mullion, 0, bridgeY + 0.16, 0);
      addBox(root, gap + 0.32, 0.03, towerDepth * 0.14, towerWindowMaterial, 0, bridgeY + 0.16, 0, {
        cast: false,
        receive: false,
      });
      topY = tallest;
      bodyTop = tallest - 1.3;
    } else if (style === "onewtc") {
      addSkyscraperPlaza(root, Math.max(width, depth) * 1.46, mat);
      const lobbyTop = addSkyscraperLobby(root, {
        width: width * 1.1,
        depth: depth * 1.1,
        height: 0.72,
        mat,
      });
      const tiers = [
        { scale: 1, share: 0.46, rotation: 0 },
        { scale: 0.94, share: 0.28, rotation: 0.12 },
        { scale: 0.88, share: 0.16, rotation: 0.24 },
        { scale: 0.8, share: 0.08, rotation: 0.36 },
      ];
      let y = lobbyTop;
      tiers.forEach((tier) => {
        const tierHeight = rise * tier.share;
        const tierGroup = new THREE.Group();
        tierGroup.position.y = y;
        tierGroup.rotation.y = tier.rotation;
        root.add(tierGroup);
        addCurtainWall(tierGroup, {
          width: width * tier.scale,
          depth: depth * tier.scale,
          height: tierHeight,
          y0: 0,
          floors: visualFloors(tierHeight),
          mat,
          finStep: 0.24,
          bandEvery: 2,
          litChance: 0.24,
        });
        addBox(tierGroup, width * tier.scale + 0.05, 0.03, depth * tier.scale + 0.05, mat.mullion, 0, tierHeight + 0.015, 0, {
          cast: false,
        });
        y += tierHeight;
      });
      const crownGroup = new THREE.Group();
      crownGroup.position.y = y;
      crownGroup.rotation.y = 0.36;
      root.add(crownGroup);
      addBox(crownGroup, width * 0.64, 0.44, depth * 0.64, mat.glass, 0, 0.22, 0, { cast: false });
      addBox(crownGroup, width * 0.68, 0.05, depth * 0.68, mat.mullion, 0, 0.465, 0, { cast: false });
      addBox(crownGroup, width * 0.66, 0.016, depth * 0.66, mat.accent, 0, 0.495, 0, {
        cast: false,
        receive: false,
      });
      addCylinder(root, width * 0.09, 0.3, mat.mullion, 0, y + 0.6, 0);
      addTowerAntenna(root, { y: y + 0.72, height: 2.1, mat });
      topY = y + 3.1;
      bodyTop = y;
    } else {
      addSkyscraperPlaza(root, Math.max(width, depth) * 1.5, mat);
      const lobbyTop = addSkyscraperLobby(root, {
        width: width * 1.14,
        depth: depth * 1.14,
        height: 0.72,
        mat,
      });
      const tiers = [
        { scale: 1, share: 0.34 },
        { scale: 0.9, share: 0.28 },
        { scale: 0.8, share: 0.22 },
        { scale: 0.7, share: 0.14 },
      ];
      let y = lobbyTop;
      tiers.forEach((tier, index) => {
        const tierHeight = rise * tier.share;
        const tierWidth = width * tier.scale;
        const tierDepth = depth * tier.scale;
        addOctagonShaft(root, {
          width: tierWidth,
          depth: tierDepth,
          height: tierHeight,
          y0: y,
          floors: visualFloors(tierHeight),
          mat,
          litChance: 0.22,
        });
        addOctagon(root, tierWidth + 0.16, 0.06, tierDepth + 0.16, mat.mullion, 0, y + tierHeight + 0.03, 0, {
          cast: false,
        });
        if (index === 2) {
          addObservationCrown(root, { width: tierWidth, depth: tierDepth, y: y + tierHeight + 0.1, mat });
        }
        y += tierHeight + 0.12;
      });
      topY = addSpireCrown(root, { width: width * 0.6, depth: depth * 0.6, y, mat, spireHeight: 1.5 });
      bodyTop = y;
    }

    const record = finishSkyscraper(root, {
      def,
      label,
      role,
      width,
      depth,
      topY,
      bodyTop,
      color: wallColor,
      style,
    });
    return record;
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

  function districtFor(block) {
    const asset = DISTRICTS_BY_ID.get(`d-${block.district}`);
    if (asset) return { ...asset, id: block.district };
    return AMUSEMENT_DISTRICT;
  }

  function addBlockGround(blockGroup, block, district) {
    const width = block.w;
    const depth = block.d;
    addBox(blockGroup, width, 0.3, depth, sidewalkMat, 0, 0.15, 0, { cast: false });
    const groundColor = DISTRICT_GROUND[district.id] ?? "#cbbf9f";
    const groundMaterial = standard(groundColor, { roughness: 1 });
    addBox(blockGroup, width - 0.52, 0.09, depth - 0.52, groundMaterial, 0, 0.345, 0, {
      cast: false,
    });
    const curbX = width / 2 - 0.02;
    const curbZ = depth / 2 - 0.02;
    addBox(blockGroup, width + 0.04, 0.09, 0.07, curbMat, 0, 0.36, -curbZ, { cast: false });
    addBox(blockGroup, width + 0.04, 0.09, 0.07, curbMat, 0, 0.36, curbZ, { cast: false });
    addBox(blockGroup, 0.07, 0.09, depth + 0.04, curbMat, -curbX, 0.36, 0, { cast: false });
    addBox(blockGroup, 0.07, 0.09, depth + 0.04, curbMat, curbX, 0.36, 0, { cast: false });
    if (district.id === "green" || district.id === "amusement") return;
    const pavingMat = standard(
      district.id === "industrial" || district.id === "harbor" ? "#a5a79c" : "#c3b28f",
      { roughness: 1 }
    );
    const inset = 0.34;
    addBox(blockGroup, width - inset * 2, 0.024, 0.12, pavingMat, 0, BLOCK_TOP + 0.008, -depth / 2 + inset, {
      cast: false,
    });
    addBox(blockGroup, width - inset * 2, 0.024, 0.12, pavingMat, 0, BLOCK_TOP + 0.008, depth / 2 - inset, {
      cast: false,
    });
    addBox(blockGroup, 0.12, 0.024, depth - inset * 2, pavingMat, -width / 2 + inset, BLOCK_TOP + 0.009, 0, {
      cast: false,
    });
    addBox(blockGroup, 0.12, 0.024, depth - inset * 2, pavingMat, width / 2 - inset, BLOCK_TOP + 0.009, 0, {
      cast: false,
    });
    const accent = standard(district.model?.accent ?? "#ffd166", { roughness: 0.8 });
    addBox(blockGroup, 0.62, 0.02, 0.18, accent, width / 2 - 0.85, BLOCK_TOP + 0.012, depth / 2 - 0.6, {
      cast: false,
    });
  }

  function planBlockLots(block) {
    const lots = [];
    const margin = block.morph === "tower" ? 0.36 : 0.42;
    const uw = block.w - margin * 2;
    const ud = block.d - margin * 2;
    if (uw < 0.8 || ud < 0.8) return lots;
    const add = (x, z, w, d, rotation = 0, role = null) => {
      if (w < 0.55 || d < 0.55) return;
      lots.push({ x, z, w, d, rotation, role });
    };
    const rowDepth = Math.min(clamp(Math.min(1.45, ud * 0.46), 0.95, 1.45), ud - 0.14);
    const rowGap = 0.08;
    const target =
      block.district === "oldtown" || block.district === "creative"
        ? 1.08
        : block.district === "residential"
          ? 1.38
          : 1.68;
    const addRow = (side, frontageTarget, depth, role = null) => {
      const span = uw;
      const count = Math.max(1, Math.round(span / frontageTarget));
      const frontage = (span - rowGap * (count - 1)) / count;
      if (frontage < 0.62) return;
      for (let index = 0; index < count; index += 1) {
        const x = -span / 2 + frontage / 2 + index * (frontage + rowGap);
        const z = side === "s" ? ud / 2 - depth / 2 : -ud / 2 + depth / 2;
        add(x, z, frontage, depth, side === "s" ? 0 : Math.PI, role);
      }
    };

    const specialSizes = {
      clocktower: { w: 1.15, d: 1.15 },
      market: { w: 2.1, d: 1.85 },
      department: { w: 2.0, d: 1.85 },
      school: { w: 2.3, d: 1.9 },
      energy: { w: 2.3, d: 2.1 },
      warehouse: { w: 2.3, d: 2.0 },
      "harbor-office": { w: 1.9, d: 1.7 },
    };
    const specialRole = block.role && specialSizes[block.role] ? block.role : null;
    const special = specialRole ? specialSizes[specialRole] : null;

    if (block.morph === "tower") {
      const towerW = Math.min(uw, 3.3);
      const towerD = Math.min(ud, 3.0);
      const role =
        block.role === "skyscraper" || block.role === "landmark" ? block.role : null;
      add(0, 0, towerW, towerD, 0, role);
      if (block.role !== "landmark" && uw > 2.4 && ud > 2.4) {
        const podium = Math.min(1.35, uw * 0.34);
        add(-uw / 2 + podium / 2, ud / 2 - podium / 2, podium, podium, 0, "podium");
      }
      return lots;
    }

    if (block.morph === "campus") {
      const bw = Math.min(uw * 0.62, 2.4);
      const bd = Math.min(ud * 0.5, 2.0);
      add(-uw * 0.2, -ud * 0.24, bw, bd, 0, specialRole);
      add(uw * 0.2, ud * 0.2, Math.min(uw * 0.5, 2.0), Math.min(ud * 0.36, 1.7), Math.PI, null);
      add(uw * 0.26, -ud * 0.22, Math.min(uw * 0.34, 1.4), Math.min(ud * 0.3, 1.2), Math.PI / 2, null);
      return lots;
    }

    if (block.morph === "warehouse") {
      if (special) {
        if (specialRole === "energy" || specialRole === "harbor-office") {
          add(0, 0, Math.min(special.w, uw), Math.min(special.d, ud), 0, specialRole);
          return lots;
        }
        const count = Math.max(1, Math.round(uw / 2.7));
        const gap = 0.16;
        const width = (uw - gap * (count - 1)) / count;
        for (let index = 0; index < count; index += 1) {
          const x = -uw / 2 + width / 2 + index * (width + gap);
          add(x, 0, width, Math.min(special.d, ud), 0, specialRole);
        }
        return lots;
      }
      const count = Math.max(1, Math.round(uw / 2.8));
      const gap = 0.18;
      const width = (uw - gap * (count - 1)) / count;
      for (let index = 0; index < count; index += 1) {
        const x = -uw / 2 + width / 2 + index * (width + gap);
        add(x, 0, width, Math.min(2.0, ud), 0, null);
      }
      return lots;
    }

    if (block.morph === "row" || block.morph === "cottage") {
      if (special) {
        add(0, 0, Math.min(special.w, uw), Math.min(special.d, ud), 0, specialRole);
        return lots;
      }
      const cottage = block.morph === "cottage";
      const depth = Math.min(
        ud - 0.12,
        Math.max(0.95, Math.min(cottage ? 1.3 : 1.2, ud * 0.62))
      );
      const frontage = cottage ? 2.3 : target;
      addRow("s", frontage, depth);
      if (ud > depth * 2 + 0.14) addRow("n", frontage, depth);
      return lots;
    }

    if (special) {
      const specialWidth = Math.min(special.w, uw);
      const specialDepth = Math.min(special.d, ud);
      add(0, 0, specialWidth, specialDepth, 0, specialRole);
      const sideSpace = uw - specialWidth;
      if (sideSpace > 1.6) {
        const sideWidth = (sideSpace - 0.18) / 2;
        add(-specialWidth / 2 - 0.09 - sideWidth / 2, 0, sideWidth, specialDepth, 0, null);
        add(specialWidth / 2 + 0.09 + sideWidth / 2, 0, sideWidth, specialDepth, 0, null);
      }
      return lots;
    }

    addRow("s", target, rowDepth);
    if (ud > rowDepth * 2 + 0.12) addRow("n", target, rowDepth);
    if (uw > 2.4 && ud > 2.2 && rng() < 0.5) {
      const sideLot = Math.min(1.45, rowDepth);
      const side = rng() < 0.5 ? -1 : 1;
      add(
        side * (uw / 2 - sideLot / 2),
        rand(rng, -ud * 0.12, ud * 0.12),
        sideLot,
        sideLot,
        side > 0 ? Math.PI / 2 : -Math.PI / 2,
        null
      );
    }
    return lots;
  }

  function fillPlanBlock(blockGroup, block, district) {
    const lots = planBlockLots(block);
    for (const lot of lots) {
      const def = pickBuildingDef(district, lot, lot.role);
      if (!def) continue;
      addCatalogBuilding({
        blockGroup,
        blockX: block.x,
        blockZ: block.z,
        localX: lot.x,
        localZ: lot.z,
        lot,
        def,
        label: block.label,
        district,
        role: lot.role,
        density: block.density,
        rotation: lot.rotation,
        blockAngle: block.angle ?? 0,
      });
    }
  }

  function addCivicQuarter(blockGroup, block, district) {
    const label = block.label;
    const place = (id, x, z, w, d, role = "civic") => {
      const def = BUILDINGS_BY_ID.get(id);
      if (!def) return;
      addCatalogBuilding({
        blockGroup,
        blockX: block.x,
        blockZ: block.z,
        localX: x,
        localZ: z,
        lot: { w, d },
        def,
        label,
        district,
        role,
        density: 1.1,
        blockAngle: block.angle ?? 0,
      });
    };
    const halfW = block.w / 2 - 0.7;
    const halfD = block.d / 2 - 0.7;
    place("b-cityhall", 0, -halfD * 0.62, Math.min(4.4, halfW * 1.8), 1.9, "civic");
    place("b-museum", -halfW * 0.5, -halfD * 0.02, 2.1, 1.9, "civic");
    place("b-library", halfW * 0.52, -halfD * 0.02, 2.0, 1.85, "civic");

    addBox(blockGroup, block.w - 1.2, 0.03, 3.1, stoneMat, 0, BLOCK_TOP + 0.015, halfD * 0.66, {
      cast: false,
    });
    addParkFountain(blockGroup, 0, halfD * 0.72, BLOCK_TOP + 0.02);
    addStatue(blockGroup, -halfW * 0.68, halfD * 0.6, Math.PI * 0.15, BLOCK_TOP);
    addBench(blockGroup, halfW * 0.6, halfD * 0.44, Math.PI, BLOCK_TOP);
    addBench(blockGroup, -halfW * 0.6, halfD * 0.42, Math.PI, BLOCK_TOP);
    for (const [x, z, scale] of [
      [-halfW * 0.9, halfD * 0.92, 0.62],
      [halfW * 0.92, halfD * 0.9, 0.58],
      [-halfW * 0.95, -halfD * 0.86, 0.54],
      [halfW * 0.95, -halfD * 0.84, 0.5],
    ]) {
      addTree(blockGroup, x, z, scale, BLOCK_TOP, "cherry");
    }
    addFlowers(blockGroup, halfW * 0.2, halfD * 0.42, BLOCK_TOP);
  }

  function addGreenPlanBlock(blockGroup, block, district, parkIndex) {
    const label = block.label;
    const parkKind = block.parkKind ?? "pocket";
    const halfW = block.w / 2 - 0.55;
    const halfD = block.d / 2 - 0.55;
    const feature = new THREE.Group();
    blockGroup.add(feature);
    const baseY = BLOCK_TOP;

    const pathWidth = 0.5;
    addBox(feature, pathWidth, 0.03, halfD * 2, pathMat, 0, baseY + 0.012, 0, { cast: false });
    addBox(feature, halfW * 2, 0.03, pathWidth, pathMat, 0, baseY + 0.013, 0, { cast: false });

    if (parkKind === "pond") {
      addPond(feature, 0, -halfD * 0.45, baseY);
      addGazebo(feature, halfW * 0.45, halfD * 0.55, baseY);
      addBox(feature, 0.34, 0.05, halfD * 0.8, standard("#8b6547"), -halfW * 0.55, baseY + 0.02, 0, {
        cast: false,
      });
    } else if (parkKind === "cherry") {
      for (const [x, z, scale] of [
        [-halfW * 0.68, -halfD * 0.55, 0.78],
        [halfW * 0.64, -halfD * 0.3, 0.68],
        [-halfW * 0.6, halfD * 0.45, 0.6],
        [halfW * 0.6, halfD * 0.68, 0.66],
      ]) {
        addTree(feature, x, z, scale, baseY, "cherry");
      }
      addBench(feature, 0.8, -halfD * 0.1, -Math.PI / 2, baseY);
      addBench(feature, -0.8, halfD * 0.2, Math.PI / 2, baseY);
      addFlowers(feature, halfW * 0.2, halfD * 0.5, baseY);
    } else if (parkKind === "sports") {
      addSportsCourt(feature, 0, 0, Math.PI / 2, baseY);
      addBench(feature, halfW * 0.7, -halfD * 0.4, Math.PI, baseY);
      addTree(feature, -halfW * 0.78, -halfD * 0.72, 0.58, baseY, "conifer");
      addTree(feature, halfW * 0.78, halfD * 0.72, 0.55, baseY, "broadleaf");
    } else if (parkKind === "playground") {
      addPlayground(feature, 0, 0, baseY);
      addBench(feature, -halfW * 0.7, halfD * 0.5, 0, baseY);
      addBench(feature, halfW * 0.72, -halfD * 0.5, Math.PI, baseY);
      addTree(feature, -halfW * 0.8, -halfD * 0.72, 0.56, baseY, "broadleaf");
    } else if (parkKind === "waterfront") {
      addBox(feature, halfW * 2, 0.02, 0.9, stoneMat, 0, baseY + 0.015, halfD * 0.72, {
        cast: false,
      });
      for (const [x, z, rotation] of [
        [-halfW * 0.5, halfD * 0.52, Math.PI],
        [halfW * 0.45, halfD * 0.52, Math.PI],
      ]) {
        addBench(feature, x, z, rotation, baseY);
      }
      addTree(feature, -halfW * 0.65, -halfD * 0.6, 0.72, baseY, "palm");
      addTree(feature, halfW * 0.55, -halfD * 0.45, 0.6, baseY, "palm");
      addGazebo(feature, 0, -halfD * 0.25, baseY);
      addFlowers(feature, halfW * 0.2, halfD * 0.25, baseY);
    } else {
      addParkFountain(feature, 0, 0, baseY);
      addTree(feature, -halfW * 0.7, -halfD * 0.6, 0.62, baseY, "broadleaf");
      addTree(feature, halfW * 0.7, -halfD * 0.55, 0.58, baseY, "cherry");
      addBench(feature, 0.95, 0.65, -Math.PI / 2, baseY);
      addBench(feature, -0.95, -0.65, Math.PI / 2, baseY);
      addFlowers(feature, halfW * 0.55, halfD * 0.45, baseY);
    }

    for (const [x, z] of [
      [-halfW * 0.88, halfD * 0.9],
      [halfW * 0.88, -halfD * 0.9],
    ]) {
      addTree(feature, x, z, 0.46, baseY, parkKind === "waterfront" ? "palm" : "broadleaf");
    }
    addStreetLamp(block.x + halfW, block.z + halfD, baseY, 0.66);
    addStreetLamp(block.x - halfW, block.z - halfD, baseY, 0.66);

    const parkAsset = PARKS[parkIndex % PARKS.length] ?? PARKS[0];
    const record = {
      id: `${label}-park`,
      name: parkAsset?.name ?? "街角公园",
      kind: "park",
      family: "park",
      label,
      floors: 0,
      detailLabel: "公园类型",
      detailValue: parkAsset?.en ?? "PARK",
      height: Math.round((baseY + 1.1) * 3.2 * 10) / 10,
      population: 0,
      jobs: Math.round(rand(rng, 10, 24)),
      occupancy: Math.round(rand(rng, 0.72, 0.98) * 100),
      year: 2034 + Math.floor(rng() * 14),
      color: "#7c9d59",
      note: parkAsset?.description ?? "附近居民常来散步的小公园。",
      address: `BLOCK ${label} · ${district.name}`,
      root: feature,
      typeId: parkAsset?.id,
      typeLabel: parkAsset ? `${parkAsset.en} / ${parkAsset.name}` : "PARK / 公园",
      description: parkAsset?.description,
      districtId: district.id,
      districtName: district.name,
    };
    addBuildingInfo(feature, record);
    return record;
  }

  function addStationBlock(blockGroup, block, district) {
    const platformMat = standard("#9e9788");
    const roofMat = standard("#c9c2b0");
    const halfW = block.w / 2 - 0.6;
    const halfD = block.d / 2 - 0.6;
    addBox(blockGroup, halfW * 2, 0.08, 1.0, platformMat, 0, BLOCK_TOP + 0.04, -halfD * 0.62, {
      cast: false,
    });
    addBox(blockGroup, halfW * 2, 0.06, 0.9, steelDarkMat, 0, BLOCK_TOP + 0.03, halfD * 0.66, {
      cast: false,
    });
    const stationW = Math.min(3.2, halfW * 1.6);
    addBox(blockGroup, stationW, 0.8, 1.5, roofMat, 0, BLOCK_TOP + 0.4, -halfD * 0.05);
    addBox(blockGroup, stationW * 0.86, 0.55, 0.05, glassMat, 0, BLOCK_TOP + 0.42, -halfD * 0.05 + 0.78, {
      cast: false,
    });
    addBox(blockGroup, stationW + 0.4, 0.08, 1.1, roofMat, 0, BLOCK_TOP + 0.86, halfD * 0.25);
    for (const side of [-1, 1]) {
      addBox(blockGroup, 0.06, 0.8, 0.06, steelDarkMat, side * stationW * 0.38, BLOCK_TOP + 0.45, halfD * 0.25);
    }
    addSignPanel(blockGroup, "#e7c36a", 1.2, 0.26, 0, BLOCK_TOP + 0.98, halfD * 0.25);
    addBench(blockGroup, -1.2, halfD * 0.25, 0, BLOCK_TOP + 0.02);
    addBench(blockGroup, 1.2, halfD * 0.25, 0, BLOCK_TOP + 0.02);

    const record = {
      id: `${block.label}-station`,
      name: "像素湾站",
      kind: "civic",
      family: "civic",
      label: block.label,
      floors: 1,
      height: Math.round(4.2 * 3.2 * 10) / 10,
      population: 0,
      jobs: 38,
      occupancy: 92,
      year: 2039,
      color: "#c9c2b0",
      note: "北岸铁路在这里拐进城市，月台上总有赶早班车的人。",
      address: `BLOCK ${block.label} · ${district.name}`,
      root: blockGroup,
      typeLabel: "RAIL STATION / 火车站",
      districtId: district.id,
      districtName: district.name,
    };
    addBuildingInfo(blockGroup, record);
  }

  function addBlockDetails(blockGroup, block, district) {
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
    if (district.id === "green" || district.id === "amusement") return;
    const species = speciesByDistrict[district.id] ?? "broadleaf";
    const halfW = block.w / 2;
    const halfD = block.d / 2;
    if (["perimeter", "row", "cottage", "adaptive"].includes(block.morph)) {
      const gardenW = block.w - 2.0;
      const gardenD = block.d - (block.morph === "row" ? 1.85 : 2.35);
      if (gardenW > 0.7 && gardenD > 0.5) {
        addBox(blockGroup, gardenW, 0.02, gardenD, grassDarkMat, 0, BLOCK_TOP + 0.016, 0, {
          cast: false,
        });
        addTree(
          blockGroup,
          rand(rng, -gardenW * 0.22, gardenW * 0.22),
          rand(rng, -gardenD * 0.18, gardenD * 0.18),
          0.38,
          BLOCK_TOP + 0.02,
          species
        );
        addBench(blockGroup, gardenW * 0.25, 0, Math.PI / 2, BLOCK_TOP + 0.02);
      }
    }
    if (block.w > 2.2 && block.d > 2.2) {
      addTree(blockGroup, -halfW + 0.32, -halfD + 0.32, rand(rng, 0.38, 0.55), BLOCK_TOP, species);
      if (rng() < 0.6) {
        addTree(blockGroup, halfW - 0.3, halfD - 0.3, rand(rng, 0.34, 0.5), BLOCK_TOP, species);
      }
    }
    if (district.id === "residential" || district.id === "academic") {
      if (rng() < 0.48) addBusShelter(blockGroup, -halfW + 0.5, halfD - 0.25, -Math.PI / 2, BLOCK_TOP);
      else addBikeRack(blockGroup, -halfW + 0.4, halfD - 0.3, 0, BLOCK_TOP);
      addBench(blockGroup, halfW - 0.55, halfD - 0.3, Math.PI, BLOCK_TOP);
    } else if (district.id === "oldtown") {
      addPostbox(blockGroup, halfW - 0.35, -halfD + 0.45, 0, BLOCK_TOP);
      if (rng() < 0.55) addNewsKiosk(blockGroup, -halfW + 0.45, halfD - 0.5, 0, BLOCK_TOP);
      addFlowers(blockGroup, halfW - 0.5, halfD - 0.4, BLOCK_TOP);
    } else if (district.id === "commercial" || district.id === "creative") {
      if (rng() < 0.5) addBillboard(blockGroup, -halfW + 0.7, -halfD + 0.5, 0, BLOCK_TOP);
      else addNewsKiosk(blockGroup, -halfW + 0.45, halfD - 0.5, 0, BLOCK_TOP);
      addPlanter(blockGroup, halfW - 0.55, halfD - 0.35, 0, BLOCK_TOP);
      addBikeRack(blockGroup, halfW - 0.5, -halfD + 0.4, 0, BLOCK_TOP);
    } else if (district.id === "civic") {
      addPlanter(blockGroup, -halfW + 0.55, -halfD + 0.5, 0, BLOCK_TOP);
      addBench(blockGroup, halfW * 0.65, -halfD + 0.45, Math.PI, BLOCK_TOP);
    } else if (district.id === "industrial" || district.id === "harbor") {
      addCrateStack(blockGroup, -halfW + 0.55, halfD - 0.55, 0, BLOCK_TOP);
      addCrateStack(blockGroup, halfW - 0.6, -halfD + 0.6, 0.4, BLOCK_TOP);
      if (rng() < 0.5) addTrashBin(blockGroup, halfW - 0.4, halfD - 0.4, 0, BLOCK_TOP);
    } else if (district.id === "downtown") {
      addPlanter(blockGroup, -halfW + 0.5, halfD - 0.4, 0, BLOCK_TOP);
      addBench(blockGroup, halfW - 0.5, halfD - 0.35, Math.PI, BLOCK_TOP);
      addAwning(
        blockGroup,
        Math.min(1.5, block.w * 0.42),
        0,
        BLOCK_TOP + 0.52,
        halfD - 0.22,
        district.model?.accent ?? "#ffd166"
      );
      addBench(blockGroup, -halfW + 0.55, halfD - 0.3, 0, BLOCK_TOP);
    }
  }

  function addPlanAmusement(blockGroup, block) {
    const record = addAmusementBlock(blockGroup, block.x, block.z, block.label);
    const feature = blockGroup.children[blockGroup.children.length - 1];
    if (feature) feature.scale.setScalar(Math.min(block.w, block.d) / 6);
    record.districtId = "amusement";
    record.districtName = AMUSEMENT_DISTRICT.name;
    return record;
  }

  function addPlanConstruction(blockGroup, block, district) {
    const record = addConstructionBlock(blockGroup, block.x, block.z, block.label, district);
    const feature = blockGroup.children[blockGroup.children.length - 1];
    if (feature) {
      const scale = Math.min(block.w, block.d) / 5.9;
      feature.scale.set(scale, 1, scale);
    }
    return record;
  }

  function addBlocks() {
    let parkIndex = 0;
    for (const block of plan.blocks) {
      const district = districtFor(block);
      const blockGroup = new THREE.Group();
      blockGroup.position.set(block.x, 0, block.z);
      blockGroup.rotation.y = block.angle ?? 0;
      group.add(blockGroup);

      addBlockGround(blockGroup, block, district);

      if (block.morph === "green") {
        addGreenPlanBlock(blockGroup, block, district, parkIndex);
        parkIndex += 1;
      } else if (block.morph === "amusement") {
        addPlanAmusement(blockGroup, block);
      } else if (block.morph === "construction") {
        addPlanConstruction(blockGroup, block, district);
      } else if (block.morph === "civic") {
        addCivicQuarter(blockGroup, block, district);
      } else if (block.morph === "station") {
        addStationBlock(blockGroup, block, district);
      } else {
        fillPlanBlock(blockGroup, block, district);
        addBlockDetails(blockGroup, block, district);
      }

      blocks.push({
        i: blocks.length,
        j: 0,
        blockX: block.x,
        blockZ: block.z,
        width: block.w,
        depth: block.d,
        type: district.id,
        label: block.label,
        group: blockGroup,
        district,
        districtName: district.name,
      });
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

    const carBlocks = plan.blocks.filter(
      (block) => block.morph !== "green" && block.morph !== "amusement"
    );

    let carIndex = 0;
    for (const block of carBlocks) {
      if (rng() < 0.36) continue;
      const halfX = block.w / 2 + 0.48;
      const halfZ = block.d / 2 + 0.48;
      const radius = Math.min(0.55, Math.min(halfX, halfZ) * 0.36);
      const curve = makeLoopCurve(
        block.x,
        block.z,
        halfX,
        radius,
        ROAD_TOP + 0.018,
        halfZ,
        block.angle ?? 0
      );
      const count = rng() < 0.3 ? 2 : 1;
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

  function addBoat(
    def,
    half,
    t,
    direction,
    speed,
    phase,
    centerX = 0,
    centerZ = 0,
    radius = 4.2,
    halfZ = half
  ) {
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
    const curve = makeLoopCurve(centerX, centerZ, half, radius, WATER_LEVEL, halfZ);
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

    const ferry = types.find((def) => def.model.vessel === "ferry");
    const dinghy = types.find((def) => def.model.vessel === "dinghy");
    if (ferry) {
      const loop = plan.bayLoop;
      addBoat(ferry, loop.half, rng(), 1, 0.42, rng() * TAU, loop.x, loop.z, 1.8, loop.half);
    }
    if (dinghy) {
      const loop = plan.bayLoop;
      addBoat(
        dinghy,
        loop.half * 0.62,
        rng(),
        -1,
        0.36,
        rng() * TAU,
        loop.x + 1.2,
        loop.z - 1.0,
        0.9,
        loop.half * 0.62
      );
    }

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
    const promenadeZ = plan.quayRoads.north - 0.55;
    const promenadeX = plan.quayRoads.west - 0.55;

    addNewsKiosk(group, 8.2, promenadeZ, 0, 0.03);
    addBusShelter(group, 13.2, promenadeZ, 0, 0.03);
    addPostbox(group, 18.0, promenadeZ, 0, 0.03);
    addTrashBin(group, 10.6, promenadeZ, 0, 0.03);
    addBikeRack(group, 20.4, promenadeZ, 0, 0.03);
    addPlanter(group, 6.8, promenadeZ, 0, 0.03);
    addStatue(group, promenadeX, 12.2, Math.PI / 2, 0.03);
    addBillboard(group, promenadeX, 18.4, Math.PI / 2, 0.03);
    addNewsKiosk(group, promenadeX, 8.0, Math.PI / 2, 0.03);
    addBench(group, promenadeX, 15.6, Math.PI / 2, 0.03);
    addCrateStack(group, 16.4, 9.4, 0, -0.36);
    addCrateStack(group, 19.0, 12.4, 0.4, -0.36);

    // A small monument square marks where the diagonal boulevard meets the bay.
    const plazaX = 4.4;
    const plazaZ = 4.2;
    addRoundCylinder(group, 1.15, 0.04, stoneMat, plazaX, 0.065, plazaZ);
    addRoundCylinder(group, 0.75, 0.03, plazaMat, plazaX, 0.085, plazaZ);
    addBox(group, 0.62, 0.16, 0.62, trimMat, plazaX, 0.17, plazaZ);
    addBox(group, 0.26, 1.5, 0.26, standard("#cfc4ab"), plazaX, 1.0, plazaZ);
    addBox(group, 0.12, 0.32, 0.12, standard("#d7b768"), plazaX, 1.9, plazaZ);
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * TAU;
      addRoundCylinder(
        group,
        0.05,
        0.18,
        steelDarkMat,
        plazaX + Math.cos(angle) * 1.0,
        0.14,
        plazaZ + Math.sin(angle) * 1.0
      );
    }
    addBench(group, plazaX - 1.35, plazaZ + 0.4, Math.PI / 2, 0.03);
    addBench(group, plazaX + 1.35, plazaZ - 0.4, -Math.PI / 2, 0.03);

    const lightX = 20.4;
    const lightZ = 8.9;
    const lightBase = -0.4;
    addRoundCylinder(group, 0.44, 0.26, stoneMat, lightX, lightBase + 0.13, lightZ);
    addRoundCylinder(group, 0.31, 1.25, whiteMat, lightX, lightBase + 0.82, lightZ);
    addRoundCylinder(group, 0.33, 0.2, standard("#d76a5a"), lightX, lightBase + 1.08, lightZ);
    addRoundCylinder(group, 0.23, 0.28, glassMat, lightX, lightBase + 1.52, lightZ);
    addPyramid(group, 0.4, 0.32, 0.4, standard("#d76a5a"), lightX, lightBase + 1.66, lightZ, Math.PI / 4);
    const lighthouseLamp = addBox(group, 0.1, 0.1, 0.1, lampHeadMat, lightX, lightBase + 1.62, lightZ, {
      cast: false,
      receive: false,
    });
    beacons.push({ mesh: lighthouseLamp, phase: rng() * TAU });
    addGlowPlane(group, lightX, lightBase + 1.66, lightZ, 1.2);
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

    for (const train of trains) {
      train.x += simDt * train.speed;
      if (train.x > train.max) train.x = train.min;
      train.group.position.x = train.x;
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
    towerWindowMaterial.emissiveIntensity = 0.03 + lights * 1.7;
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
      if (typeof material.dispose === "function") material.dispose();
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
