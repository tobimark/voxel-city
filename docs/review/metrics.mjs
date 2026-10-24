// 运行时指标测量脚本（只读，不修改源码）。
// 用法: node docs/review/metrics.mjs
// 说明: city.js 仅在 makeGlowTexture 中使用 DOM，因此在 Node 中 stub 一个 2D canvas 即可构建整座城市并统网格/绘制调用。

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

const { createCity } = await import("../../src/city.js");
const { sampleEnvironment } = await import("../../src/environment.js");

function triangleCount(geometry) {
  if (!geometry) return 0;
  if (geometry.index) return geometry.index.count / 3;
  const position = geometry.attributes?.position;
  return position ? position.count / 3 : 0;
}

function measureCity(seed) {
  const startedAt = performance.now();
  const city = createCity({ seed });
  const buildMs = performance.now() - startedAt;

  let meshes = 0;
  let instancedMeshes = 0;
  let instancedInstances = 0;
  let lineSegments = 0;
  let groups = 0;
  let castShadowMeshes = 0;
  let receiveShadowMeshes = 0;
  let triangles = 0;
  const geometries = new Set();
  const materials = new Set();
  const materialUsage = new Map();

  city.group.traverse((object) => {
    if (object.isInstancedMesh) {
      instancedMeshes += 1;
      instancedInstances += object.count;
      geometries.add(object.geometry);
      materials.add(object.material);
      triangles += triangleCount(object.geometry) * object.count;
      return;
    }
    if (object.isLineSegments || object.isLine) {
      lineSegments += 1;
      geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
      return;
    }
    if (object.isMesh) {
      meshes += 1;
      if (object.castShadow) castShadowMeshes += 1;
      if (object.receiveShadow) receiveShadowMeshes += 1;
      geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of list) {
        materials.add(material);
        materialUsage.set(material.uuid, (materialUsage.get(material.uuid) ?? 0) + 1);
      }
      triangles += triangleCount(object.geometry);
      return;
    }
    if (object.isGroup) groups += 1;
  });

  // 静态绘制调用估算：1 mesh = 1 draw call；InstancedMesh 计 1 次；LineSegments 计 1 次。
  const drawCalls = meshes + instancedMeshes + lineSegments;
  const sortedUsage = [...materialUsage.values()].sort((a, b) => b - a);

  return {
    seed: seed.toString(16).toUpperCase().padStart(8, "0"),
    buildMs: Number(buildMs.toFixed(1)),
    buildings: city.stats.buildings,
    districts: city.stats.districts,
    meshes,
    instancedMeshes,
    instancedInstances,
    lineSegments,
    groups,
    drawCalls,
    castShadowMeshes,
    shadowPassDrawCalls: castShadowMeshes,
    receiveShadowMeshes,
    triangles: Math.round(triangles),
    uniqueGeometries: geometries.size,
    uniqueMaterials: materials.size,
    largestMaterialReuse: sortedUsage[0] ?? 0,
    selectables: city.selectables.length,
  };
}

const seeds = [0xa1b2c3d4, 0x00000001, 0x00000002, 0xdeadbeef, 42];
const rows = seeds.map(measureCity);
console.table(rows);

const first = measureCity(0xa1b2c3d4);
const second = measureCity(0xa1b2c3d4);
const comparable = (row) => {
  const { seed, buildMs, ...rest } = row;
  return JSON.stringify(rest);
};
console.log("determinism (same seed => same counts):", comparable(first) === comparable(second));

const frameCount = 20000;
let envSample;
let startedAt = performance.now();
for (let index = 0; index < frameCount; index += 1) {
  envSample = sampleEnvironment((index % 2400) / 100);
}
const sampleMs = performance.now() - startedAt;
console.log(
  `sampleEnvironment: ${((sampleMs / frameCount) * 1000).toFixed(2)} µs/call ` +
    `(${(frameCount / (sampleMs / 1000)).toFixed(0)} calls/s), 每次分配 ${Object.keys(envSample).length} 个字段 + 9 个 THREE.Color`
);

// 逐帧环境更新开销（main.js 每帧调用一次 city.updateEnvironment）
const benchmarkCity = createCity({ seed: 0xa1b2c3d4 });
startedAt = performance.now();
for (let index = 0; index < frameCount; index += 1) {
  benchmarkCity.updateEnvironment(envSample);
}
const updateMs = performance.now() - startedAt;
console.log(
  `city.updateEnvironment: ${((updateMs / frameCount) * 1000).toFixed(2)} µs/call`
);
console.log(`heapUsed: ${(process.memoryUsage().heapUsed / 1048576).toFixed(1)} MB (Node 进程，5+2 次建城后)`);
