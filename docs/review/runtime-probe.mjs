// 运行时探针：网格构成、拾取(raycast)开销、dispose 完整性与重建内存（只读，不修改源码）。
// 用法: node --expose-gc docs/review/runtime-probe.mjs

const ctx2d = {
  fillStyle: null,
  createRadialGradient() {
    return { addColorStop() {} };
  },
  fillRect() {},
};
const canvasStub = {
  width: 64,
  height: 64,
  style: {},
  getContext() {
    return ctx2d;
  },
};
globalThis.document = {
  createElement(tag) {
    if (tag === "canvas") return canvasStub;
    throw new Error(`unexpected document.createElement(${tag})`);
  },
};

const THREE = await import("three");
const { createCity } = await import("../../src/city.js");
const { sampleEnvironment } = await import("../../src/environment.js");

const SEED = 0xa1b2c3d4;

// ---------- 1. 网格构成（按几何类型） ----------
{
  const city = createCity({ seed: SEED });
  const byGeometry = new Map();
  let total = 0;
  let cast = 0;
  city.group.traverse((object) => {
    if (!object.isMesh) return;
    total += 1;
    if (object.castShadow) cast += 1;
    const type = object.geometry?.type ?? "unknown";
    const entry = byGeometry.get(type) ?? { count: 0, castShadow: 0 };
    entry.count += 1;
    if (object.castShadow) entry.castShadow += 1;
    byGeometry.set(type, entry);
  });
  const rows = [...byGeometry.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([type, entry]) => ({ geometryType: type, meshes: entry.count, castShadow: entry.castShadow }));
  console.log(`\n[1] 网格构成 (seed A1B2C3D4, 共 ${total} 个 Mesh, ${cast} 个投影)`);
  console.table(rows);
  city.dispose();
}

// ---------- 2. raycast 拾取开销（main.js 在每次 pointermove 上调用） ----------
{
  const city = createCity({ seed: SEED });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hits = 0;
  const samples = 300;
  // 预热
  for (let index = 0; index < 30; index += 1) {
    pointer.set((index % 10) / 5 - 1, Math.floor(index / 10) / 2.5 - 1);
    raycaster.setFromCamera(pointer, new THREE.PerspectiveCamera());
    if (raycaster.intersectObjects(city.selectables, false).length > 0) hits += 1;
  }
  const camera = new THREE.PerspectiveCamera(30, 1.6, 0.5, 1200);
  camera.position.set(55, 62, 55);
  camera.lookAt(0, 1.2, 0);
  camera.updateMatrixWorld(true);

  const startedAt = performance.now();
  for (let index = 0; index < samples; index += 1) {
    pointer.set((index % 20) / 10 - 1, Math.floor(index / 20) / 7.5 - 1);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.intersectObjects(city.selectables, false).length > 0) hits += 1;
  }
  const elapsed = performance.now() - startedAt;
  console.log(
    `\n[2] raycast: ${city.selectables.length} 个可选对象, ${samples} 次命中 ${hits} 次, ` +
      `平均 ${(elapsed / samples).toFixed(2)} ms/次（每次 pointermove 都会执行）`
  );
  city.dispose();
}

// ---------- 3. dispose 完整性：遍历到的资源 vs 实际 dispose 的资源 ----------
{
  const city = createCity({ seed: SEED });
  const meshes = new Set();
  const lines = new Set();
  const geometries = new Set();
  const materials = new Set();
  city.group.traverse((object) => {
    if (object.isMesh) meshes.add(object);
    if (object.isLineSegments || object.isLine) lines.add(object);
    if (object.geometry) geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) if (material) materials.add(material);
  });

  let geometryDisposals = 0;
  let materialDisposals = 0;
  const originalGeometryDispose = THREE.BufferGeometry.prototype.dispose;
  const originalMaterialDispose = THREE.Material.prototype.dispose;
  THREE.BufferGeometry.prototype.dispose = function patched() {
    geometryDisposals += 1;
    return originalGeometryDispose.call(this);
  };
  THREE.Material.prototype.dispose = function patched() {
    materialDisposals += 1;
    return originalMaterialDispose.call(this);
  };

  city.dispose();

  THREE.BufferGeometry.prototype.dispose = originalGeometryDispose;
  THREE.Material.prototype.dispose = originalMaterialDispose;

  console.log(
    `\n[3] dispose 完整性: 场景资源 geometry=${geometries.size}, material=${materials.size}; ` +
      `dispose 计数 geometry=${geometryDisposals}, material=${materialDisposals}; ` +
      `LineSegments=${lines.size}（dispose() 的 traverse 只处理 isMesh，线条资源被跳过）`
  );
  console.log(`    dispose 后 group.children=${city.group.children.length}`);
}

// ---------- 4. 重建内存：连续建城 + dispose，观察 GC 后堆增长 ----------
if (typeof globalThis.gc === "function") {
  const measure = () => {
    globalThis.gc();
    return process.memoryUsage().heapUsed;
  };
  // 预热
  for (let index = 0; index < 3; index += 1) {
    const warm = createCity({ seed: index });
    warm.dispose();
  }
  const before = measure();
  const rounds = 30;
  const startedAt = performance.now();
  for (let index = 0; index < rounds; index += 1) {
    const city = createCity({ seed: 0x1000 + index });
    city.dispose();
  }
  const elapsed = performance.now() - startedAt;
  const after = measure();
  console.log(
    `\n[4] 重建 ${rounds} 次并 dispose: 总耗时 ${elapsed.toFixed(0)} ms（平均 ${(elapsed / rounds).toFixed(1)} ms/次，Node 构建部分）, ` +
      `GC 后堆增长 ${((after - before) / 1048576).toFixed(2)} MB（${(((after - before) / rounds) / 1024).toFixed(1)} KB/次）`
  );
} else {
  console.log("\n[4] 跳过：需要 --expose-gc");
}

// ---------- 5. 每帧环境采样分配 ----------
{
  const startedAt = performance.now();
  const rounds = 20000;
  let env;
  for (let index = 0; index < rounds; index += 1) env = sampleEnvironment((index % 2400) / 100);
  const elapsed = performance.now() - startedAt;
  const city = createCity({ seed: SEED });
  const updateStartedAt = performance.now();
  for (let index = 0; index < rounds; index += 1) city.updateEnvironment(env);
  const updateElapsed = performance.now() - updateStartedAt;
  console.log(
    `\n[5] 每帧环境: sampleEnvironment ${((elapsed / rounds) * 1000).toFixed(2)} µs/次（每次 9 个 Color 分配）; ` +
      `city.updateEnvironment ${((updateElapsed / rounds) * 1000).toFixed(2)} µs/次`
  );
  city.dispose();
}
