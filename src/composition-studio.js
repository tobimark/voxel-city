// 组合层截图工作台：单个离屏 WebGLRenderer，顺序渲染各组合缩略图。
// 与展示图鉴共用 ShowcaseKit 的材质/几何缓存，但组合层有自己的一套构图逻辑。

import * as THREE from "three";
import { ShowcaseKit } from "./showcase-models.js";
import { createComposition, disposeComposition } from "./composition-models.js";

const VIEW_DIR = new THREE.Vector3(0.62, 1.02, 1.38).normalize();
const WORLD_UP = new THREE.Vector3(0, 1, 0);

function createShadowPlane() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, "rgba(2, 6, 14, 0.7)");
  gradient.addColorStop(0.55, "rgba(2, 6, 14, 0.32)");
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
    opacity: 0.92,
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

function addLights(scene) {
  const hemisphere = new THREE.HemisphereLight("#d9eef0", "#5b5140", 1.15);
  const ambient = new THREE.AmbientLight("#8e9caf", 0.42);
  const key = new THREE.DirectionalLight("#fff0ce", 2.5);
  key.position.set(-3.2, 5.8, 4.2);
  const fill = new THREE.DirectionalLight("#8fd4df", 1.0);
  fill.position.set(4.5, 2.4, 2.2);
  const rim = new THREE.DirectionalLight("#ffce9b", 0.7);
  rim.position.set(0.5, 3.4, -4.6);
  scene.add(hemisphere, ambient, key, fill, rim);
  scene.userData.lights = [hemisphere, ambient, key, fill, rim];
}

function frameOrthographic(camera, box, aspect, padding = 1.08, viewDir = VIEW_DIR) {
  const center = box.getCenter(new THREE.Vector3());
  const right = new THREE.Vector3().crossVectors(viewDir, WORLD_UP);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const up = new THREE.Vector3().crossVectors(right, viewDir).normalize();

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
  const fitHeight = Math.max(halfHeight, halfWidth / aspect, 0.5) * padding;
  camera.left = -fitHeight * aspect;
  camera.right = fitHeight * aspect;
  camera.top = fitHeight;
  camera.bottom = -fitHeight;
  camera.near = 0.05;
  camera.far = 160;
  camera.updateProjectionMatrix();
  camera.position.copy(center).addScaledVector(viewDir, 26);
  camera.lookAt(center);
  return { center: center.clone(), radius: fitHeight };
}

export function createCompositionStudio(options = {}) {
  let width = options.width ?? 384;
  let height = options.height ?? 288;
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: "low-power",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = false;
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  addLights(scene);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 160);
  camera.updateProjectionMatrix();
  const kit = new ShowcaseKit();
  const holder = new THREE.Group();
  scene.add(holder);
  const shadow = createShadowPlane();
  let current = null;
  let currentSize = { width, height };

  function clear() {
    if (current) {
      disposeComposition(current);
      current = null;
    }
    holder.remove(shadow.mesh);
  }

  function render(plan, size = {}) {
    const nextWidth = size.width ?? currentSize.width;
    const nextHeight = size.height ?? currentSize.height;
    if (nextWidth !== currentSize.width || nextHeight !== currentSize.height) {
      currentSize = { width: nextWidth, height: nextHeight };
      renderer.setSize(nextWidth, nextHeight, false);
    }
    clear();

    current = createComposition(plan, { kit });
    holder.add(current);
    const box = new THREE.Box3().setFromObject(current);
    const viewDir = Array.isArray(plan.camera)
      ? new THREE.Vector3(...plan.camera).normalize()
      : VIEW_DIR;
    const framed = frameOrthographic(camera, box, currentSize.width / currentSize.height, 1.06, viewDir);

    const footprint = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 1.6);
    shadow.mesh.position.set(framed.center.x, 0.004, framed.center.z);
    shadow.mesh.scale.set(footprint * 1.35, footprint * 1.55, 1);
    holder.add(shadow.mesh);

    renderer.render(scene, camera);
    return {
      url: renderer.domElement.toDataURL("image/png"),
      width: currentSize.width,
      height: currentSize.height,
      boundingBox: box,
    };
  }

  function dispose() {
    clear();
    shadow.dispose();
    for (const light of scene.userData.lights ?? []) light.dispose?.();
    kit.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
  }

  return { render, dispose };
}
