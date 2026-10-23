import * as THREE from "three";

const KEYS = [
  {
    hour: 0,
    sky: "#0a1122",
    fog: "#0b1526",
    waterDeep: "#061522",
    waterShallow: "#0d2a38",
    waterFoam: "#265263",
    sun: "#8ea8d8",
    hemiSky: "#223553",
    hemiGround: "#0b111d",
    ambient: "#1e2d47",
    sunIntensity: 0.34,
    hemiIntensity: 0.52,
    ambientIntensity: 0.34,
    lights: 1,
    sunX: -24,
    sunY: 30,
    sunZ: -20,
  },
  {
    hour: 5.1,
    sky: "#24314b",
    fog: "#2c374c",
    waterDeep: "#0b2537",
    waterShallow: "#1d4554",
    waterFoam: "#4c7380",
    sun: "#b5b0c8",
    hemiSky: "#4b5b78",
    hemiGround: "#1b2330",
    ambient: "#2b354a",
    sunIntensity: 0.52,
    hemiIntensity: 0.66,
    ambientIntensity: 0.36,
    lights: 0.88,
    sunX: 31,
    sunY: 10,
    sunZ: -18,
  },
  {
    hour: 6.5,
    sky: "#d58b77",
    fog: "#c68f80",
    waterDeep: "#2b4b5e",
    waterShallow: "#6c6570",
    waterFoam: "#e4b49c",
    sun: "#ffb27e",
    hemiSky: "#e0a189",
    hemiGround: "#4e4137",
    ambient: "#8b665a",
    sunIntensity: 1.35,
    hemiIntensity: 0.72,
    ambientIntensity: 0.37,
    lights: 0.62,
    sunX: 30,
    sunY: 12,
    sunZ: -20,
  },
  {
    hour: 8.1,
    sky: "#94c5d3",
    fog: "#a5c9d0",
    waterDeep: "#1e586c",
    waterShallow: "#4e9299",
    waterFoam: "#c5e3de",
    sun: "#ffe5b2",
    hemiSky: "#cbe6e7",
    hemiGround: "#696c54",
    ambient: "#7e8a78",
    sunIntensity: 2.35,
    hemiIntensity: 0.96,
    ambientIntensity: 0.31,
    lights: 0.1,
    sunX: 24,
    sunY: 28,
    sunZ: -19,
  },
  {
    hour: 12,
    sky: "#9dd7e1",
    fog: "#acd4d9",
    waterDeep: "#1d6173",
    waterShallow: "#5ea8ae",
    waterFoam: "#d2eee8",
    sun: "#fff4d1",
    hemiSky: "#d4f0ef",
    hemiGround: "#747a58",
    ambient: "#8b987f",
    sunIntensity: 2.7,
    hemiIntensity: 1,
    ambientIntensity: 0.28,
    lights: 0,
    sunX: 4,
    sunY: 38,
    sunZ: -17,
  },
  {
    hour: 16.4,
    sky: "#a6cfd0",
    fog: "#b2c8c1",
    waterDeep: "#225968",
    waterShallow: "#62a09d",
    waterFoam: "#d1e4d2",
    sun: "#ffe3ac",
    hemiSky: "#d8e7db",
    hemiGround: "#72755d",
    ambient: "#8b8b70",
    sunIntensity: 2.42,
    hemiIntensity: 0.96,
    ambientIntensity: 0.3,
    lights: 0.08,
    sunX: -22,
    sunY: 27,
    sunZ: -18,
  },
  {
    hour: 17.9,
    sky: "#e4a173",
    fog: "#d9a17c",
    waterDeep: "#335761",
    waterShallow: "#9a7c70",
    waterFoam: "#f2d2ae",
    sun: "#ffb56b",
    hemiSky: "#eeb68f",
    hemiGround: "#69533f",
    ambient: "#967462",
    sunIntensity: 1.95,
    hemiIntensity: 0.78,
    ambientIntensity: 0.32,
    lights: 0.46,
    sunX: -30,
    sunY: 14,
    sunZ: -20,
  },
  {
    hour: 19.05,
    sky: "#a96768",
    fog: "#98696a",
    waterDeep: "#263e50",
    waterShallow: "#705f69",
    waterFoam: "#c38b7f",
    sun: "#ff9468",
    hemiSky: "#bb7f81",
    hemiGround: "#3d3740",
    ambient: "#735c66",
    sunIntensity: 1.0,
    hemiIntensity: 0.56,
    ambientIntensity: 0.34,
    lights: 0.82,
    sunX: -28,
    sunY: 7,
    sunZ: -22,
  },
  {
    hour: 20.35,
    sky: "#111b34",
    fog: "#142035",
    waterDeep: "#081b2b",
    waterShallow: "#123547",
    waterFoam: "#315a6b",
    sun: "#7f9bce",
    hemiSky: "#293b5f",
    hemiGround: "#101623",
    ambient: "#263758",
    sunIntensity: 0.4,
    hemiIntensity: 0.5,
    ambientIntensity: 0.34,
    lights: 1,
    sunX: 18,
    sunY: 26,
    sunZ: -21,
  },
  {
    hour: 24,
    sky: "#0a1122",
    fog: "#0b1526",
    waterDeep: "#061522",
    waterShallow: "#0d2a38",
    waterFoam: "#265263",
    sun: "#8ea8d8",
    hemiSky: "#223553",
    hemiGround: "#0b111d",
    ambient: "#1e2d47",
    sunIntensity: 0.34,
    hemiIntensity: 0.52,
    ambientIntensity: 0.34,
    lights: 1,
    sunX: -24,
    sunY: 30,
    sunZ: -20,
  },
].map((key) => ({
  ...key,
  sky: new THREE.Color(key.sky),
  fog: new THREE.Color(key.fog),
  waterDeep: new THREE.Color(key.waterDeep),
  waterShallow: new THREE.Color(key.waterShallow),
  waterFoam: new THREE.Color(key.waterFoam),
  sun: new THREE.Color(key.sun),
  hemiSky: new THREE.Color(key.hemiSky),
  hemiGround: new THREE.Color(key.hemiGround),
  ambient: new THREE.Color(key.ambient),
}));

const colorKeys = [
  "sky",
  "fog",
  "waterDeep",
  "waterShallow",
  "waterFoam",
  "sun",
  "hemiSky",
  "hemiGround",
  "ambient",
];

const numberKeys = [
  "sunIntensity",
  "hemiIntensity",
  "ambientIntensity",
  "lights",
  "sunX",
  "sunY",
  "sunZ",
];

export function sampleEnvironment(hours) {
  const time = ((hours % 24) + 24) % 24;
  let index = 0;
  while (index < KEYS.length - 2 && KEYS[index + 1].hour <= time) {
    index += 1;
  }
  const a = KEYS[index];
  const b = KEYS[index + 1];
  let t = (time - a.hour) / (b.hour - a.hour);
  t = Math.min(1, Math.max(0, t));
  t = t * t * (3 - 2 * t);

  const result = {};
  for (const key of colorKeys) {
    result[key] = new THREE.Color().lerpColors(a[key], b[key], t);
  }
  for (const key of numberKeys) {
    result[key] = a[key] + (b[key] - a[key]) * t;
  }

  const sunAngle = ((time - 6) / 12) * Math.PI;
  const sunHeight = Math.sin(sunAngle);
  result.daylight = THREE.MathUtils.smoothstep(sunHeight, -0.16, 0.3);
  result.night = 1 - THREE.MathUtils.smoothstep(sunHeight, -0.22, 0.2);
  result.fogNear = 48 + result.daylight * 16;
  result.fogFar = 118 + result.daylight * 32;
  return result;
}

export function getPhase(hours) {
  const time = ((hours % 24) + 24) % 24;
  if (time < 5) return { cn: "深夜", en: "LATE NIGHT", night: true };
  if (time < 6.6) return { cn: "黎明", en: "DAWN", night: false };
  if (time < 10.5) return { cn: "早晨", en: "MORNING", night: false };
  if (time < 14) return { cn: "正午", en: "MIDDAY", night: false };
  if (time < 16.8) return { cn: "午后", en: "AFTERNOON", night: false };
  if (time < 19.2) return { cn: "黄昏", en: "DUSK", night: false };
  if (time < 21.5) return { cn: "入夜", en: "EVENING", night: true };
  return { cn: "深夜", en: "LATE NIGHT", night: true };
}
