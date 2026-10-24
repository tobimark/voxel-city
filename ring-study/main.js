import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createCity, randomCitySeed } from "./city.js";
import { sampleEnvironment, getPhase } from "../src/environment.js";

const canvas = document.querySelector("#scene");
const app = document.querySelector("#app");
const boot = document.querySelector("#boot");
const errorOverlay = document.querySelector("#errorOverlay");
const errorMessage = document.querySelector("#errorMessage");

const dom = {
  statusText: document.querySelector("#statusText"),
  weatherLabel: document.querySelector("#weatherLabel"),
  weatherTemp: document.querySelector("#weatherTemp"),
  seedLabel: document.querySelector("#seedLabel"),
  phaseLabel: document.querySelector("#phaseLabel"),
  dayLabel: document.querySelector("#dayLabel"),
  clockLabel: document.querySelector("#clockLabel"),
  dayMarker: document.querySelector("#dayMarker"),
  statPop: document.querySelector("#statPop"),
  statBuildings: document.querySelector("#statBuildings"),
  statCars: document.querySelector("#statCars"),
  statDistricts: document.querySelector("#statDistricts"),
  pauseBtn: document.querySelector("#pauseBtn"),
  pauseLabel: document.querySelector("#pauseLabel"),
  rebuildBtn: document.querySelector("#rebuildBtn"),
  resetViewBtn: document.querySelector("#resetViewBtn"),
  closeInfoBtn: document.querySelector("#closeInfoBtn"),
  infoPanel: document.querySelector("#infoPanel"),
  infoType: document.querySelector("#infoType"),
  infoName: document.querySelector("#infoName"),
  infoAddress: document.querySelector("#infoAddress"),
  infoHeight: document.querySelector("#infoHeight"),
  infoFloors: document.querySelector("#infoFloors"),
  infoPopLabel: document.querySelector("#infoPopLabel"),
  infoPop: document.querySelector("#infoPop"),
  infoYear: document.querySelector("#infoYear"),
  infoOccupancy: document.querySelector("#infoOccupancy"),
  infoMeter: document.querySelector("#infoMeter"),
  infoNote: document.querySelector("#infoNote"),
  infoSwatch: document.querySelector("#infoSwatch"),
  infoFloorsLabel: document.querySelector("#infoFloorsLabel"),
  seedBtn: document.querySelector("#seedBtn"),
  seedChip: document.querySelector("#seedChip"),
  seedPanel: document.querySelector("#seedPanel"),
  closeSeedBtn: document.querySelector("#closeSeedBtn"),
  seedForm: document.querySelector("#seedForm"),
  seedInput: document.querySelector("#seedInput"),
  seedStatus: document.querySelector("#seedStatus"),
  copySeedBtn: document.querySelector("#copySeedBtn"),
  copyLinkBtn: document.querySelector("#copyLinkBtn"),
  projectionBtn: document.querySelector("#projectionBtn"),
  projectionLabel: document.querySelector("#projectionLabel"),
  toast: document.querySelector("#toast"),
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SEED_STORAGE_KEY = "pixelbay.ringseed";
const PROJECTION_STORAGE_KEY = "pixelbay.ringprojection";

function seedToHex(seed) {
  return (seed >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function normalizeSeed(value) {
  if (value == null) return null;
  const text = String(value).trim().replace(/^0x/i, "");
  if (!/^[0-9a-f]{1,8}$/i.test(text)) return null;
  return Number.parseInt(text, 16) >>> 0;
}

function readSeedFromLocation() {
  return normalizeSeed(new URLSearchParams(window.location.search).get("seed"));
}

function readStoredSeed() {
  try {
    return normalizeSeed(window.localStorage.getItem(SEED_STORAGE_KEY));
  } catch {
    return null;
  }
}

const initialStateSeed = readSeedFromLocation() ?? readStoredSeed() ?? 0xA1B2C3D4;

function normalizeProjection(value) {
  if (value === "persp" || value === "ortho") return value;
  return null;
}

function readProjection() {
  const fromLocation = normalizeProjection(
    new URLSearchParams(window.location.search).get("projection")
  );
  if (fromLocation) return fromLocation;
  try {
    return normalizeProjection(window.localStorage.getItem(PROJECTION_STORAGE_KEY)) ?? "ortho";
  } catch {
    return "ortho";
  }
}

function readHourFromLocation() {
  const raw = new URLSearchParams(window.location.search).get("hour");
  if (raw == null) return 15.2;
  const hour = Number(raw);
  if (!Number.isFinite(hour)) return 15.2;
  return ((hour % 24) + 24) % 24;
}

const state = {
  hours: readHourFromLocation(),
  day: 42,
  speed: 1,
  paused: false,
  seed: initialStateSeed,
  projection: readProjection(),
  selected: null,
  planningView: "city",
  booted: false,
  bootStartedAt: performance.now(),
  lastInteraction: performance.now(),
};

const TYPE_LABELS = {
  residential: "RESIDENTIAL / 住宅",
  commercial: "COMMERCIAL / 商业",
  office: "OFFICE / 商务",
  downtown: "DOWNTOWN / 市中心",
  skyscraper: "SKYSCRAPER / 摩天大楼",
  construction: "CONSTRUCTION SITE / 建筑工地",
  civic: "CIVIC / 公共建筑",
  industrial: "INDUSTRIAL / 工业",
  leisure: "LEISURE / 休闲",
  landmark: "LANDMARK / 城市地标",
  amusement: "AMUSEMENT PARK / 游乐场",
  park: "CITY PARK / 城市公园",
};

let city = null;
let cameraTween = null;
let toastTimer = null;
let hintShown = false;

function showError(error) {
  const message = typeof error === "string" ? error : error?.message;
  if (!message) return;
  console.error(error);
  errorMessage.textContent = message;
  errorOverlay.hidden = false;
  if (boot) boot.classList.add("is-done");
}

window.addEventListener("error", (event) => showError(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => showError(event.reason));

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
} catch (error) {
  showError(error);
}

if (renderer) {
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor("#9dd7e1", 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#9dd7e1");
  scene.fog = new THREE.Fog("#acd4d9", 52, 150);

  const skyUniforms = {
    uZenith: { value: new THREE.Color("#9dd7e1") },
    uHorizon: { value: new THREE.Color("#acd4d9") },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        varying vec3 vWorld;
        void main() {
          float h = normalize(vWorld - cameraPosition).y;
          vec3 col = mix(uHorizon, uZenith, smoothstep(-0.04, 0.62, h));
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
    })
  );
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);

  const ORTHO_MIN_ZOOM = 0.68;
  const ORTHO_MAX_ZOOM = 2.6;
  const PERSPECTIVE_FOV = 30;
  let cameraViewHeight = 46;

  const orthoCamera = new THREE.OrthographicCamera(-35, 35, 20, -20, 0.1, 1200);
  const perspectiveCamera = new THREE.PerspectiveCamera(PERSPECTIVE_FOV, 1, 0.5, 1200);
  let camera = orthoCamera;
  const defaultTarget = new THREE.Vector3(0, 1.2, 0);

  const getDefaultDirection = () => {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    return aspect < 0.75
      ? new THREE.Vector3(28, 52.8, 28).normalize()
      : new THREE.Vector3(36, 40.8, 36).normalize();
  };

  const perspectiveDistanceFor = (viewHeight, zoom = 1) =>
    viewHeight / zoom / (2 * Math.tan(THREE.MathUtils.degToRad(PERSPECTIVE_FOV / 2)));

  const getDefaultCameraPosition = () => {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    if (camera.isPerspectiveCamera) {
      return defaultTarget
        .clone()
        .addScaledVector(getDefaultDirection(), perspectiveDistanceFor(cameraViewHeight, 1));
    }
    return aspect < 0.75
      ? new THREE.Vector3(28, 54, 28)
      : new THREE.Vector3(36, 42, 36);
  };
  camera.position.copy(getDefaultCameraPosition());

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(defaultTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.085;
  controls.rotateSpeed = 0.58;
  controls.panSpeed = 0.8;
  controls.zoomSpeed = 0.9;
  controls.minZoom = ORTHO_MIN_ZOOM;
  controls.maxZoom = ORTHO_MAX_ZOOM;
  controls.minPolarAngle = 0.52;
  controls.maxPolarAngle = 1.22;
  controls.zoomToCursor = true;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.32;
  controls.screenSpacePanning = true;
  controls.update();

  const hemisphere = new THREE.HemisphereLight("#d4f0ef", "#747a58", 1);
  scene.add(hemisphere);

  const ambient = new THREE.AmbientLight("#8b987f", 0.3);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight("#fff4d1", 2.7);
  sun.position.set(4, 38, -17);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 150;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.022;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  scene.add(sun.target);

  const fillLight = new THREE.DirectionalLight("#c9dfe8", 0.5);
  fillLight.position.set(-26, 22, -18);
  scene.add(fillLight);

  const cityGlow = new THREE.PointLight("#ffb76b", 0, 48, 2);
  cityGlow.position.set(0, 8, 0);
  scene.add(cityGlow);

  const selectionGroup = new THREE.Group();
  selectionGroup.renderOrder = 30;
  scene.add(selectionGroup);

  const selectionMaterial = new THREE.LineBasicMaterial({
    color: "#ffe08a",
    transparent: true,
    opacity: 0.96,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const selectionGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  const selectionOutline = new THREE.LineSegments(selectionGeometry, selectionMaterial);
  selectionOutline.visible = false;
  selectionOutline.renderOrder = 30;
  selectionGroup.add(selectionOutline);

  const markerMaterial = new THREE.MeshBasicMaterial({
    color: "#ffd166",
    toneMapped: false,
    depthTest: false,
    depthWrite: false,
  });
  const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), markerMaterial);
  marker.visible = false;
  marker.renderOrder = 31;
  selectionGroup.add(marker);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pointerDown = { x: 0, y: 0, time: 0, button: 0, moved: false, active: false };
  let lastUiUpdate = 0;
  let elapsed = 0;

  function clampCameraTarget() {
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -24.5, 24.5);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -24.5, 24.5);
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0.1, 4.4);
  }

  function setOrthoFrustum(targetCamera, aspect) {
    targetCamera.left = (-cameraViewHeight * aspect) / 2;
    targetCamera.right = (cameraViewHeight * aspect) / 2;
    targetCamera.top = cameraViewHeight / 2;
    targetCamera.bottom = -cameraViewHeight / 2;
    targetCamera.updateProjectionMatrix();
  }

  function syncPerspectiveLimits() {
    const base = perspectiveDistanceFor(cameraViewHeight, 1);
    controls.minDistance = base / ORTHO_MAX_ZOOM;
    controls.maxDistance = base / ORTHO_MIN_ZOOM;
  }

  function sizeRenderer() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const aspect = width / height;
    const previousViewHeight = cameraViewHeight;
    cameraViewHeight = Math.max(46, 78 / Math.max(aspect, 0.38));

    if (camera.isPerspectiveCamera) {
      const ratio = cameraViewHeight / previousViewHeight;
      if (Number.isFinite(ratio) && ratio > 0 && Math.abs(ratio - 1) > 0.001) {
        const offset = camera.position.clone().sub(controls.target).multiplyScalar(ratio);
        camera.position.copy(controls.target).add(offset);
      }
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      syncPerspectiveLimits();
    } else {
      setOrthoFrustum(camera, aspect);
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let renderWidth = Math.round(width * dpr);
    let renderHeight = Math.round(height * dpr);
    const maxPixels = 2400000;
    const scale = Math.min(1, Math.sqrt(maxPixels / (renderWidth * renderHeight)));
    renderWidth = Math.max(1, Math.round(renderWidth * scale));
    renderHeight = Math.max(1, Math.round(renderHeight * scale));
    renderer.setPixelRatio(1);
    renderer.setSize(renderWidth, renderHeight, false);
  }

  function setProjection(mode, { announce = false, persist = true } = {}) {
    const next = mode === "persp" ? "persp" : "ortho";
    const wantsPerspective = next === "persp";

    if (wantsPerspective === camera.isPerspectiveCamera) {
      state.projection = next;
      updateProjectionUI();
      if (persist) persistProjection();
      return;
    }

    cameraTween = null;
    controls.enabled = true;
    const target = controls.target.clone();
    const offset = camera.position.clone().sub(target);
    const distance = Math.max(0.001, offset.length());
    const direction = offset.normalize();
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const viewHeight = camera.isPerspectiveCamera
      ? (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / camera.zoom
      : cameraViewHeight / camera.zoom;

    if (wantsPerspective) {
      perspectiveCamera.fov = PERSPECTIVE_FOV;
      perspectiveCamera.aspect = aspect;
      perspectiveCamera.zoom = 1;
      perspectiveCamera.updateProjectionMatrix();
      const nextDistance = perspectiveDistanceFor(viewHeight, 1);
      perspectiveCamera.position.copy(target).addScaledVector(direction, nextDistance);
      perspectiveCamera.lookAt(target);
      camera = perspectiveCamera;
      controls.minZoom = ORTHO_MIN_ZOOM;
      controls.maxZoom = ORTHO_MAX_ZOOM;
      syncPerspectiveLimits();
    } else {
      setOrthoFrustum(orthoCamera, aspect);
      orthoCamera.zoom = THREE.MathUtils.clamp(
        cameraViewHeight / viewHeight,
        ORTHO_MIN_ZOOM,
        ORTHO_MAX_ZOOM
      );
      orthoCamera.updateProjectionMatrix();
      orthoCamera.position
        .copy(target)
        .addScaledVector(direction, THREE.MathUtils.clamp(distance, 30, 220));
      orthoCamera.lookAt(target);
      camera = orthoCamera;
      controls.minZoom = ORTHO_MIN_ZOOM;
      controls.maxZoom = ORTHO_MAX_ZOOM;
    }

    controls.object = camera;
    controls.target.copy(target);
    controls.update();
    state.projection = next;
    updateProjectionUI();
    if (persist) persistProjection();
    if (announce) {
      showToast(next === "persp" ? "投影：透视 / PERSPECTIVE" : "投影：等轴 / ORTHOGRAPHIC", 1800);
    }
    resetAutoRotate();
  }

  sizeRenderer();
  window.addEventListener("resize", () => {
    sizeRenderer();
    controls.update();
  });

  function applyEnvironment(env) {
    scene.background.copy(env.sky);
    scene.fog.color.copy(env.fog);
    const focusDistance = camera.isPerspectiveCamera
      ? camera.position.distanceTo(controls.target)
      : 66;
    const fogScale = THREE.MathUtils.clamp(focusDistance / 66, 1, 8);
    scene.fog.near = env.fogNear * fogScale;
    scene.fog.far = env.fogFar * fogScale;
    skyUniforms.uZenith.value.copy(env.sky);
    skyUniforms.uHorizon.value.copy(env.fog);

    const nightLift = env.night;
    hemisphere.color.copy(env.hemiSky);
    hemisphere.groundColor.copy(env.hemiGround);
    hemisphere.intensity = env.hemiIntensity * (1.32 + nightLift * 0.6);

    ambient.color.copy(env.ambient);
    ambient.intensity = env.ambientIntensity * (1.5 + nightLift * 1.3);

    sun.color.copy(env.sun);
    sun.intensity = env.sunIntensity * (1.08 + nightLift * 0.75);
    sun.position.set(env.sunX, env.sunY, env.sunZ);

    fillLight.intensity = 0.18 + env.daylight * 0.52 + nightLift * 0.3;
    fillLight.color.copy(env.hemiSky).lerp(env.sun, 0.22);

    cityGlow.intensity = env.lights * (30 + nightLift * 20);
    city?.updateEnvironment(env);
  }

  function updateStats() {
    if (!city) return;
    dom.statPop.textContent = Math.round(city.stats.population).toLocaleString("en-US");
    dom.statBuildings.textContent = String(city.stats.buildings);
    dom.statCars.textContent = String(city.stats.cars);
    dom.statDistricts.textContent = String(city.stats.districts);
  }

  function setSeedLabel(seed) {
    const hex = seedToHex(seed);
    dom.seedLabel.textContent = hex;
    dom.seedStatus.textContent = `当前 SEED · ${hex}`;
    if (dom.seedInput && document.activeElement !== dom.seedInput) dom.seedInput.value = hex;
  }

  function persistSeed(seed) {
    const hex = seedToHex(seed);
    try {
      window.localStorage.setItem(SEED_STORAGE_KEY, hex);
    } catch {
      // Storage can be unavailable in private modes; the URL still carries the seed.
    }
    const url = new URL(window.location.href);
    url.searchParams.set("seed", hex);
    url.searchParams.set("projection", state.projection);
    try {
      window.history.replaceState(null, "", url);
    } catch {
      // Some embedded/file origins disallow history updates; the seed still lives in storage.
    }
  }

  function persistProjection() {
    try {
      window.localStorage.setItem(PROJECTION_STORAGE_KEY, state.projection);
    } catch {
      // URL still carries the mode when storage is unavailable.
    }
    const url = new URL(window.location.href);
    url.searchParams.set("projection", state.projection);
    try {
      window.history.replaceState(null, "", url);
    } catch {
      // Ignore history restrictions for embedded views.
    }
  }

  function updateProjectionUI() {
    const isPerspective = state.projection === "persp";
    app.classList.toggle("is-perspective", isPerspective);
    if (dom.projectionLabel) dom.projectionLabel.textContent = isPerspective ? "透视" : "等轴";
    if (dom.projectionBtn) {
      dom.projectionBtn.setAttribute("aria-pressed", String(isPerspective));
      dom.projectionBtn.setAttribute(
        "aria-label",
        isPerspective ? "切换为等轴投影" : "切换为透视投影"
      );
      dom.projectionBtn.title = isPerspective ? "当前透视，点击切换等轴" : "当前等轴，点击切换透视";
    }
  }

  function shareUrl(seed) {
    const url = new URL(window.location.href);
    url.searchParams.set("seed", seedToHex(seed));
    url.searchParams.set("hour", state.hours.toFixed(2));
    url.searchParams.set("projection", state.projection);
    url.hash = "";
    return url.toString();
  }

  function setSeedPanel(open) {
    if (!dom.seedPanel || !dom.seedBtn) return;
    dom.seedPanel.classList.toggle("is-open", open);
    dom.seedPanel.setAttribute("aria-hidden", String(!open));
    dom.seedBtn.setAttribute("aria-expanded", String(open));
    if (open) {
      dom.seedInput.value = seedToHex(state.seed);
      dom.seedInput.focus({ preventScroll: true });
      dom.seedInput.select();
    }
  }

  function showToast(message, duration = 2400) {
    clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      dom.toast.classList.remove("is-visible");
    }, duration);
  }

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(message);
      return;
    } catch {
      // Clipboard API needs a secure context; fall back to a hidden selection.
    }
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    try {
      document.execCommand("copy");
      showToast(message);
    } catch {
      showToast("复制失败，请手动选择文本");
    }
    helper.remove();
  }

  function hideBoot() {
    if (boot && !boot.classList.contains("is-done")) {
      boot.classList.add("is-done");
      window.setTimeout(() => boot.remove(), 900);
    }
  }

  function spawnCity(seed, announce = false) {
    clearSelection();
    if (city) {
      city.dispose();
      city = null;
    }
    state.seed = seed >>> 0;
    setSeedLabel(state.seed);
    persistSeed(state.seed);
    city = createCity({ seed: state.seed });
    city.setView(state.planningView);
    document.documentElement.dataset.ready = "true";
    document.documentElement.dataset.roadComponents = String(city.diagnostics.components);
    scene.add(city.group);
    updateStats();
    applyEnvironment(sampleEnvironment(state.hours));
    if (announce) {
      showToast(`新城已生成 · SEED ${seedToHex(state.seed)}`, 2800);
    }
  }

  function findBuilding(object) {
    let current = object;
    while (current) {
      if (current.userData?.building) return current.userData.building;
      current = current.parent;
    }
    return null;
  }

  function updateInfoPanel(record) {
    const kind = record.kind;
    dom.infoType.textContent =
      record.typeLabel ??
      (record.landmark ? "LANDMARK / 城市地标" : TYPE_LABELS[kind] ?? TYPE_LABELS.residential);
    dom.infoName.textContent = record.name;
    dom.infoAddress.textContent = record.address;
    dom.infoHeight.textContent = `${record.height.toFixed(1)} m`;
    dom.infoFloorsLabel.textContent = record.detailLabel ?? "楼层";
    dom.infoFloors.textContent = record.detailValue ?? `${record.floors} F`;
    dom.infoPopLabel.textContent = record.population > 0 ? "容纳人口" : "提供岗位";
    dom.infoPop.textContent =
      record.population > 0
        ? `${record.population.toLocaleString("en-US")} 人`
        : `${record.jobs.toLocaleString("en-US")} 个`;
    dom.infoYear.textContent = String(record.year);
    dom.infoOccupancy.textContent = `${record.occupancy}%`;
    dom.infoMeter.style.width = `${record.occupancy}%`;
    dom.infoNote.textContent = record.note;
    dom.infoSwatch.style.background =
      record.landmark || record.family === "landmark" ? "#ffd166" : record.color;
  }

  function selectBuilding(record) {
    if (!record) {
      clearSelection();
      return;
    }
    state.selected = record;
    updateInfoPanel(record);

    if (record.bounds) {
      const center = record.bounds.getCenter(new THREE.Vector3());
      const size = record.bounds.getSize(new THREE.Vector3());
      selectionOutline.position.copy(center);
      selectionOutline.scale.set(
        Math.max(size.x * 1.08, 0.1),
        Math.max(size.y * 1.035, 0.1),
        Math.max(size.z * 1.08, 0.1)
      );
      selectionOutline.visible = true;

      marker.position.set(center.x, record.bounds.max.y + 0.52, center.z);
      marker.userData.baseY = marker.position.y;
      marker.visible = true;
    }

    dom.infoPanel.classList.add("is-open");
    dom.infoPanel.setAttribute("aria-hidden", "false");
    resetAutoRotate();
  }

  function clearSelection() {
    state.selected = null;
    selectionOutline.visible = false;
    marker.visible = false;
    dom.infoPanel.classList.remove("is-open");
    dom.infoPanel.setAttribute("aria-hidden", "true");
  }

  function resetAutoRotate() {
    state.lastInteraction = performance.now();
    controls.autoRotate = false;
  }

  function setPointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickAt(event) {
    if (!city) return null;
    setPointerFromEvent(event);
    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObjects(city.selectables, false);
    for (const hit of intersections) {
      const building = findBuilding(hit.object);
      if (building) return building;
    }
    return null;
  }

  function updateHover(event) {
    if (!city || pointerDown.active) return;
    const hit = pickAt(event);
    canvas.classList.toggle("is-hovering", Boolean(hit));
  }

  canvas.addEventListener("pointerdown", (event) => {
    pointerDown.active = true;
    pointerDown.x = event.clientX;
    pointerDown.y = event.clientY;
    pointerDown.time = performance.now();
    pointerDown.button = event.button;
    pointerDown.moved = false;
    resetAutoRotate();
    if (event.button === 0) canvas.classList.add("is-grabbing");
  });

  canvas.addEventListener("pointermove", (event) => {
    if (pointerDown.active) {
      const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
      if (distance > 5) pointerDown.moved = true;
    } else {
      updateHover(event);
    }
  });

  function endPointer(event) {
    const wasActive = pointerDown.active;
    const shouldSelect =
      wasActive &&
      pointerDown.button === 0 &&
      !pointerDown.moved &&
      performance.now() - pointerDown.time < 650;
    pointerDown.active = false;
    canvas.classList.remove("is-grabbing");
    if (shouldSelect) {
      const building = pickAt(event);
      if (building) selectBuilding(building);
      else clearSelection();
    }
  }

  window.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", () => {
    pointerDown.active = false;
    canvas.classList.remove("is-grabbing");
  });
  canvas.addEventListener("pointerleave", () => {
    canvas.classList.remove("is-hovering");
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  controls.addEventListener("start", resetAutoRotate);
  canvas.addEventListener("wheel", resetAutoRotate, { passive: true });

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function resetView() {
    const defaultPosition = getDefaultCameraPosition();
    if (reducedMotion) {
      camera.position.copy(defaultPosition);
      controls.target.copy(defaultTarget);
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      controls.update();
    } else {
      cameraTween = {
        start: performance.now(),
        duration: 780,
        fromPosition: camera.position.clone(),
        toPosition: defaultPosition,
        fromTarget: controls.target.clone(),
        toTarget: defaultTarget.clone(),
      };
      controls.enabled = false;
      controls.autoRotate = false;
      camera.zoom = 1;
      camera.updateProjectionMatrix();
    }
    resetAutoRotate();
  }

  function setPaused(paused) {
    state.paused = paused;
    dom.pauseBtn.classList.toggle("is-paused", paused);
    dom.pauseBtn.setAttribute("aria-label", paused ? "继续模拟" : "暂停模拟");
    dom.pauseBtn.setAttribute("aria-pressed", String(paused));
    dom.pauseLabel.textContent = paused ? "继续" : "暂停";
    dom.statusText.textContent = paused ? "SIMULATION PAUSED" : "SIMULATION LIVE";
    app.classList.toggle("is-paused", paused);
    if (!paused) resetAutoRotate();
  }

  function setSpeed(speed) {
    state.speed = speed;
    document.querySelectorAll("[data-speed]").forEach((button) => {
      const active = Number(button.dataset.speed) === speed;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    resetAutoRotate();
  }

  dom.pauseBtn.addEventListener("click", () => setPaused(!state.paused));

  document.querySelectorAll("[data-speed]").forEach((button) => {
    button.addEventListener("click", () => setSpeed(Number(button.dataset.speed)));
  });

  dom.rebuildBtn.addEventListener("click", () => spawnCity(randomCitySeed(), true));
  dom.resetViewBtn.addEventListener("click", () => {
    resetView();
    showToast("视角已复位", 1200);
  });
  dom.projectionBtn?.addEventListener("click", () => {
    setProjection(state.projection === "persp" ? "ortho" : "persp", { announce: true });
  });
  dom.closeInfoBtn.addEventListener("click", clearSelection);

  dom.seedBtn?.addEventListener("click", () => {
    setSeedPanel(!dom.seedPanel.classList.contains("is-open"));
  });
  const toggleSeedPanel = () => setSeedPanel(!dom.seedPanel.classList.contains("is-open"));
  dom.seedChip?.addEventListener("click", toggleSeedPanel);
  dom.seedChip?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleSeedPanel();
    }
  });
  dom.closeSeedBtn?.addEventListener("click", () => setSeedPanel(false));

  dom.seedForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const seed = normalizeSeed(dom.seedInput.value);
    if (seed == null) {
      showToast("种子需为 1–8 位十六进制，例如 A1B2C3D4");
      dom.seedInput.focus();
      return;
    }
    setSeedPanel(false);
    spawnCity(seed, true);
  });

  dom.copySeedBtn?.addEventListener("click", () => {
    copyText(seedToHex(state.seed), `种子已复制 · ${seedToHex(state.seed)}`);
  });

  dom.copyLinkBtn?.addEventListener("click", () => {
    copyText(shareUrl(state.seed), "分享链接已复制");
  });

  dom.seedInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      setSeedPanel(false);
    }
  });

  canvas.addEventListener("pointerdown", () => setSeedPanel(false));

  window.addEventListener("keydown", (event) => {
    const tag = event.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
    if (event.code === "Space") {
      event.preventDefault();
      setPaused(!state.paused);
    } else if (event.key === "Escape") {
      if (dom.seedPanel?.classList.contains("is-open")) setSeedPanel(false);
      else clearSelection();
    } else if (event.key.toLowerCase() === "r") {
      spawnCity(randomCitySeed(), true);
    } else if (event.key.toLowerCase() === "c") {
      resetView();
    } else if (event.key === "1") {
      setSpeed(1);
    } else if (event.key === "2") {
      setSpeed(2);
    } else if (event.key === "4") {
      setSpeed(4);
    }
  });

  function formatClock(hours) {
    const wrapped = ((hours % 24) + 24) % 24;
    const hour = Math.floor(wrapped);
    const minute = Math.floor((wrapped - hour) * 60);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function updateInterface(env) {
    const phase = getPhase(state.hours);
    dom.phaseLabel.textContent = `${phase.en} / ${phase.cn}`;
    dom.dayLabel.textContent = `DAY ${String(state.day).padStart(3, "0")}`;
    dom.clockLabel.textContent = formatClock(state.hours);
    dom.dayMarker.style.left = `${(state.hours / 24) * 100}%`;

    const nightMode = env.night > 0.62;
    app.classList.toggle("is-night", nightMode);
    dom.weatherLabel.textContent = nightMode ? "晴夜 / CLEAR" : "晴 / CLEAR";
    dom.weatherTemp.textContent = `${Math.round(16 + env.daylight * 8)}°C`;
    dom.statusText.textContent = state.paused ? "SIMULATION PAUSED" : "SIMULATION LIVE";
  }

  // Initialize the world and then run the animation loop.
  document.querySelectorAll('[data-plan-view]').forEach(button => {
    button.addEventListener('click', () => {
      state.planningView = button.dataset.planView;
      document.querySelectorAll('[data-plan-view]').forEach(item => {
        const active = item.dataset.planView === state.planningView;
        item.classList.toggle('plan-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      city?.setView(state.planningView);
      clearSelection();
      if (state.planningView === 'city') { controls.maxPolarAngle = 1.22; controls.minPolarAngle = .52; resetView(); }
      else {
        setProjection('ortho', {persist:false});
        cameraTween = null; controls.enabled = true; controls.minPolarAngle = 0; controls.maxPolarAngle = Math.PI / 2;
        controls.target.set(-.4, .4, -.2); camera.position.set(-.4, 85, -.19); camera.zoom = .68; camera.updateProjectionMatrix(); controls.update();
        showToast(state.planningView === 'network' ? '主干道与支路共享路口 · 全城连通' : '同色街区构成连续片区', 2400);
      }
    });
  });
  spawnCity(state.seed);
  setProjection(state.projection, { persist: false });
  applyEnvironment(sampleEnvironment(state.hours));
  updateInterface(sampleEnvironment(state.hours));

  const clock = new THREE.Clock();

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    if (!state.paused) {
      state.hours += dt * state.speed * 0.055;
      while (state.hours >= 24) {
        state.hours -= 24;
        state.day += 1;
      }
    }

    const env = sampleEnvironment(state.hours);
    applyEnvironment(env);
    if (city) city.update(dt * state.speed, dt, elapsed, state.paused);

    if (state.selected && marker.visible) {
      marker.rotation.y += dt * 1.6;
      marker.rotation.z = Math.sin(elapsed * 1.2) * 0.16;
      marker.position.y = marker.userData.baseY + Math.sin(elapsed * 2.8) * 0.085;
    }

    const idleFor = now - state.lastInteraction;
    controls.autoRotate = !state.paused && !state.selected && idleFor > 22000 && !reducedMotion;

    if (cameraTween) {
      const t = Math.min(1, (now - cameraTween.start) / cameraTween.duration);
      const eased = easeInOutCubic(t);
      camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
      controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
      camera.lookAt(controls.target);
      if (t >= 1) {
        cameraTween = null;
        controls.enabled = true;
        controls.update();
      }
    } else {
      clampCameraTarget();
      controls.update();
    }

    if (now - lastUiUpdate > 110) {
      updateInterface(env);
      lastUiUpdate = now;
    }

    sky.position.copy(camera.position);
    renderer.render(scene, camera);

    if (!state.booted) {
      state.booted = true;
      const bootDelay = Math.max(0, 640 - (performance.now() - state.bootStartedAt));
      window.setTimeout(() => {
        hideBoot();
        if (!hintShown) {
          hintShown = true;
          window.setTimeout(() => showToast("点击建筑，查看它的城市档案", 3000), 900);
        }
      }, bootDelay);
    }
  }

  requestAnimationFrame(tick);
}
