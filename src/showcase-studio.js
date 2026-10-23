import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ShowcaseKit, createShowcaseModel, disposeShowcaseModel } from "./showcase-models.js";

const VIEW_DIR = new THREE.Vector3(0.88, 0.92, 1.24).normalize();
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const THUMB_WIDTH = 192;
const THUMB_HEIGHT = 144;

function boxForFit(holder, shadowMesh) {
  const box = new THREE.Box3();
  for (const child of holder.children) {
    if (child === shadowMesh) continue;
    box.union(new THREE.Box3().setFromObject(child));
  }
  return box;
}

function createShadowPlane() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, "rgba(2, 6, 14, 0.72)");
  gradient.addColorStop(0.55, "rgba(2, 6, 14, 0.34)");
  gradient.addColorStop(1, "rgba(2, 6, 14, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0.9,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return {
    mesh,
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}

function configureRenderer(renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = false;
}

function addLights(scene) {
  const hemisphere = new THREE.HemisphereLight("#d9eef0", "#5b5140", 1.1);
  const ambient = new THREE.AmbientLight("#8e9caf", 0.4);
  const key = new THREE.DirectionalLight("#fff0ce", 2.5);
  key.position.set(-3.2, 5.8, 4.2);
  const fill = new THREE.DirectionalLight("#8fd4df", 0.95);
  fill.position.set(4.5, 2.4, 2.2);
  const rim = new THREE.DirectionalLight("#ffce9b", 0.7);
  rim.position.set(0.5, 3.4, -4.6);
  scene.add(hemisphere, ambient, key, fill, rim);
  scene.userData.lights = [hemisphere, ambient, key, fill, rim];
}

function disposeLights(scene) {
  for (const light of scene.userData.lights ?? []) light.dispose?.();
  scene.userData.lights = [];
}

function createPlatform(kit, radius, accent) {
  const group = new THREE.Group();
  const rim = kit.material(accent, {
    roughness: 0.6,
    emissive: accent,
    emissiveIntensity: 0.18,
  });
  kit.cyl(group, radius * 1.012, 0.022, rim, 0, -0.046, 0, { segments: 8 });
  kit.cyl(group, radius, 0.06, kit.material("#131d2e"), 0, -0.03, 0, { segments: 8 });
  kit.cyl(group, radius * 0.93, 0.01, kit.material("#1d2b40"), 0, 0, 0, { segments: 8 });
  kit.cyl(group, radius * 0.62, 0.006, kit.material("#22334b"), 0, 0.001, 0, { segments: 8 });
  return group;
}

function groundModel(model) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  if (Number.isFinite(box.min.y) && box.min.y < 0) {
    model.position.y -= box.min.y;
    model.updateMatrixWorld(true);
  }
  return box;
}

function frameOrthographic(camera, box, aspect, padding = 1.06) {
  const center = box.getCenter(new THREE.Vector3());
  const right = new THREE.Vector3().crossVectors(VIEW_DIR, WORLD_UP);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const up = new THREE.Vector3().crossVectors(right, VIEW_DIR).normalize();

  let halfWidth = 0;
  let halfHeight = 0;
  const corner = new THREE.Vector3();
  const offset = new THREE.Vector3();
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        corner.set(x, y, z);
        offset.subVectors(corner, center);
        halfWidth = Math.max(halfWidth, Math.abs(offset.dot(right)));
        halfHeight = Math.max(halfHeight, Math.abs(offset.dot(up)));
      }
    }
  }

  const fitHeight = Math.max(halfHeight, halfWidth / aspect, 0.24) * padding;
  camera.left = -fitHeight * aspect;
  camera.right = fitHeight * aspect;
  camera.top = fitHeight;
  camera.bottom = -fitHeight;
  camera.near = 0.05;
  camera.far = 100;
  camera.updateProjectionMatrix();
  camera.position.copy(center).addScaledVector(VIEW_DIR, 18);
  camera.lookAt(center);
  return { center: center.clone(), radius: fitHeight };
}

function largestSide(box) {
  const size = box.getSize(new THREE.Vector3());
  return Math.max(size.x, size.z, 0.2);
}

export function createThumbnailStudio(options = {}) {
  const width = options.width ?? THUMB_WIDTH;
  const height = options.height ?? THUMB_HEIGHT;
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: "low-power",
  });
  configureRenderer(renderer);
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  addLights(scene);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.updateProjectionMatrix();
  const kit = new ShowcaseKit();
  const holder = new THREE.Group();
  scene.add(holder);
  const shadow = createShadowPlane();
  let platform = null;
  let model = null;

  function clear() {
    if (model) {
      disposeShowcaseModel(model);
      model = null;
    }
    if (platform) {
      holder.remove(platform);
      platform = null;
    }
  }

  function renderAsset(asset, seed = "catalog") {
    clear();
    try {
      model = createShowcaseModel(asset, { kit, seed });
      const box = groundModel(model);
      const footprint = largestSide(box);
      holder.add(model);

      const platformRadius = footprint * 0.56 + 0.12;
      platform = createPlatform(kit, platformRadius, asset.model.accent || "#ffd166");
      holder.add(platform);

      shadow.mesh.position.set(0, 0.007, 0);
      const shadowSize = platformRadius * 1.7;
      shadow.mesh.scale.set(shadowSize, shadowSize, 1);
      holder.add(shadow.mesh);

      const framed = boxForFit(holder, shadow.mesh);
      frameOrthographic(camera, framed, width / height, 1.07);

      renderer.render(scene, camera);
      return renderer.domElement.toDataURL("image/png");
    } catch (error) {
      clear();
      holder.remove(shadow.mesh);
      throw error;
    }
  }

  function dispose() {
    clear();
    holder.remove(shadow.mesh);
    shadow.dispose();
    disposeLights(scene);
    kit.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
  }

  return { renderAsset, dispose, width, height };
}

export function createInspectorStage(container, canvas) {
  let renderer = null;
  let scene = null;
  let camera = null;
  let controls = null;
  let kit = null;
  let holder = null;
  let platform = null;
  let model = null;
  let shadow = null;
  let raf = 0;
  let resizeObserver = null;
  let currentAspect = 4 / 3;
  let fitRadius = 1;
  let fitCenter = new THREE.Vector3();
  let initialized = false;
  let disposed = false;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  function initialize() {
    if (initialized) return;
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    });
    configureRenderer(renderer);
    renderer.setPixelRatio(1);
    renderer.setSize(420, 315, false);

    scene = new THREE.Scene();
    addLights(scene);
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    kit = new ShowcaseKit();
    holder = new THREE.Group();
    scene.add(holder);
    shadow = createShadowPlane();

    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.minZoom = 0.6;
    controls.maxZoom = 3;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = 1.46;
    controls.autoRotate = !motionQuery.matches;
    controls.autoRotateSpeed = 0.72;
    controls.target.set(0, 0.5, 0);
    controls.update();

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    motionQuery.addEventListener("change", handleMotionChange);
    initialized = true;
    resize();
  }

  function handleMotionChange(event) {
    if (controls) controls.autoRotate = !event.matches;
  }

  function applyFrustum() {
    if (!camera) return;
    const halfHeight = fitRadius;
    camera.left = -halfHeight * currentAspect;
    camera.right = halfHeight * currentAspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }

  function resize() {
    if (!renderer || !camera) return;
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    currentAspect = 4 / 3;
    const internalWidth = Math.max(280, Math.min(520, Math.round(rect.width * 0.58)));
    const internalHeight = Math.round(internalWidth / currentAspect);
    renderer.setSize(internalWidth, internalHeight, false);
    applyFrustum();
  }

  function frameModel() {
    if (!holder || !camera) return;
    const box = boxForFit(holder, shadow.mesh);
    const framed = frameOrthographic(camera, box, currentAspect, 1.12);
    fitCenter = framed.center;
    fitRadius = framed.radius;
    applyFrustum();
    camera.position.copy(fitCenter).addScaledVector(VIEW_DIR, Math.max(8, fitRadius * 8 + 4));
    controls.target.copy(fitCenter);
    controls.update();
  }

  function clearModel() {
    if (model) {
      disposeShowcaseModel(model);
      model = null;
    }
    if (platform) {
      holder.remove(platform);
      platform = null;
    }
    if (shadow) holder.remove(shadow.mesh);
  }

  function startLoop() {
    if (raf) return;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();
  }

  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function show(asset, seed = "catalog") {
    if (disposed) return;
    initialize();
    stopLoop();
    clearModel();

    model = createShowcaseModel(asset, { kit, seed });
    const box = groundModel(model);
    holder.add(model);

    camera.zoom = 1;
    camera.updateProjectionMatrix();
    const platformRadius = largestSide(box) * 0.56 + 0.12;
    platform = createPlatform(kit, platformRadius, asset.model.accent || "#ffd166");
    holder.add(platform);

    shadow.mesh.position.set(0, 0.007, 0);
    const shadowSize = platformRadius * 1.7;
    shadow.mesh.scale.set(shadowSize, shadowSize, 1);
    holder.add(shadow.mesh);

    currentAspect = 4 / 3;
    frameModel();
    resize();
    startLoop();
  }

  function hide() {
    stopLoop();
    clearModel();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    hide();
    resizeObserver?.disconnect();
    motionQuery.removeEventListener("change", handleMotionChange);
    controls?.dispose();
    shadow?.dispose();
    if (scene) disposeLights(scene);
    kit?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss?.();
  }

  return { show, hide, dispose, resize, setReducedMotion: (value) => {
    if (controls) controls.autoRotate = !value;
  } };
}
