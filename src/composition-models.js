// 组合层建模：把 composition-catalog.js 生成的纯数据 plan 变成 Three.js 场景。
//
// 两条硬规则：
// 1. 建筑正放：所有模型 rotation.y = 0，不做任何整栋旋转；
// 2. 建筑不缩小：建筑/塔楼/工地保持图鉴模型原始大小，只有街道设施和植被按
//    真实比例缩小（否则长椅会和公寓一样宽）。
// 布局按每栋模型的实际包围盒计算，地块尺寸贴合内容，避免大片空白。

import * as THREE from "three";
import { ASSET_BY_ID } from "./object-catalog.js";
import { ShowcaseKit, createShowcaseModel } from "./showcase-models.js";

const GAP = 0.3;
const BASE_PAD = 0.3;
const BASE_TOP = 0.15;
const PROP_SCALE = 0.44;
const MODEL_Y = BASE_TOP + 0.02;

function scaleFor(asset) {
  if (asset.group === "street" || asset.group === "nature") return PROP_SCALE;
  return 1;
}

function groundModel(model) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  if (Number.isFinite(box.min.y) && Math.abs(box.min.y) > 1e-6) {
    model.position.y -= box.min.y;
    model.updateMatrixWorld(true);
  }
  return box;
}

function measureModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  return {
    width: Math.max(size.x, 0.2),
    depth: Math.max(size.z, 0.2),
    height: Math.max(size.y, 0.2),
  };
}

function rowWidth(entries, gap = GAP) {
  return entries.reduce((sum, entry) => sum + entry.width, 0) + gap * Math.max(0, entries.length - 1);
}

function columnDepth(entries, gap = GAP) {
  return entries.reduce((sum, entry) => sum + entry.depth, 0) + gap * Math.max(0, entries.length - 1);
}

function placeRowX(entries, z = 0, gap = GAP) {
  const total = rowWidth(entries, gap);
  let cursor = -total / 2;
  return entries.map((entry) => {
    const x = cursor + entry.width / 2;
    cursor += entry.width + gap;
    return { entry, x, z };
  });
}

function placeColumnZ(entries, x = 0, gap = GAP) {
  const total = columnDepth(entries, gap);
  let cursor = -total / 2;
  return entries.map((entry) => {
    const z = cursor + entry.depth / 2;
    cursor += entry.depth + gap;
    return { entry, x, z };
  });
}

function placeGrid(entries, columns = 2, gap = GAP) {
  const rows = Math.ceil(entries.length / columns);
  const columnWidths = Array.from({ length: columns }, () => 0);
  const rowDepths = Array.from({ length: rows }, () => 0);
  entries.forEach((entry, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    columnWidths[column] = Math.max(columnWidths[column], entry.width);
    rowDepths[row] = Math.max(rowDepths[row], entry.depth);
  });
  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0) + gap * (columns - 1);
  const totalDepth = rowDepths.reduce((sum, depth) => sum + depth, 0) + gap * (rows - 1);
  const placements = [];
  let zCursor = -totalDepth / 2;
  for (let row = 0; row < rows; row += 1) {
    let xCursor = -totalWidth / 2;
    for (let column = 0; column < columns; column += 1) {
      const entry = entries[row * columns + column];
      if (entry) {
        placements.push({
          entry,
          x: xCursor + columnWidths[column] / 2,
          z: zCursor + rowDepths[row] / 2,
        });
      }
      xCursor += columnWidths[column] + gap;
    }
    zCursor += rowDepths[row] + gap;
  }
  return { placements, totalWidth, totalDepth };
}

function placePropsFront(placements, props, options) {
  const { frontZ, halfWidth, gap = 0.22 } = options;
  props.forEach((entry, index) => {
    const t = props.length > 1 ? (index + 0.5) / props.length : 0.5;
    placements.push({
      entry,
      x: THREE.MathUtils.lerp(-halfWidth, halfWidth, t),
      z: frontZ + gap + entry.depth / 2,
    });
  });
}

// 三面围合 + 朝向观察者的入口：适合庭院、学院、居民区。
function arrangeRing(entries) {
  const main = entries.filter((entry) => entry.role === "building");
  const centers = entries.filter((entry) => entry.role === "center");
  const props = entries.filter((entry) => entry.role === "prop");
  const placements = [];

  const centerPlacements = centers.length ? placeRowX(centers, 0, 0.26) : [];
  placements.push(...centerPlacements);
  const centerW = centers.length ? rowWidth(centers, 0.26) : 0;
  const centerD = centers.length ? Math.max(...centers.map((entry) => entry.depth)) : 0;

  const count = main.length;
  const backCount = count <= 3 ? 1 : Math.min(count - 2, Math.max(2, Math.round(count * 0.38)));
  const back = main.slice(0, backCount);
  const rest = main.slice(backCount);
  const left = [];
  const right = [];
  rest.forEach((entry, index) => (index % 2 === 0 ? left : right).push(entry));

  const backWidth = back.length ? rowWidth(back) : 0;
  const innerHalfW = Math.max(centerW, backWidth, 0.9) / 2 + GAP * 1.6;
  const innerHalfD =
    Math.max(centerD, columnDepth(left), columnDepth(right), 0.9) / 2 + GAP * 1.6;

  for (const placed of placeRowX(back, 0)) {
    placements.push({
      entry: placed.entry,
      x: placed.x,
      z: -(innerHalfD + GAP + placed.entry.depth / 2),
    });
  }
  for (const placed of placeColumnZ(left, 0)) {
    placements.push({
      entry: placed.entry,
      x: -(innerHalfW + GAP + placed.entry.width / 2),
      z: placed.z,
    });
  }
  for (const placed of placeColumnZ(right, 0)) {
    placements.push({
      entry: placed.entry,
      x: innerHalfW + GAP + placed.entry.width / 2,
      z: placed.z,
    });
  }

  props.forEach((entry, index) => {
    if (index % 2 === 0) {
      const slot = index / 2;
      const slots = Math.ceil(props.length / 2);
      const t = slots > 1 ? (slot + 0.5) / slots : 0.5;
      placements.push({
        entry,
        x: THREE.MathUtils.lerp(-innerHalfW * 0.8, innerHalfW * 0.8, t),
        z: innerHalfD + GAP + entry.depth / 2,
      });
    } else {
      const side = index % 4 === 1 ? -1 : 1;
      placements.push({
        entry,
        x: side * (centerW / 2 + GAP + entry.width / 2),
        z: (index / Math.max(1, props.length) - 0.5) * centerD * 1.1,
      });
    }
  });

  return placements;
}

// 两排街墙夹一条步行街，街道沿观察方向展开。
function arrangeStreet(entries) {
  const main = entries.filter((entry) => entry.role === "building");
  const props = entries.filter((entry) => entry.role === "prop");
  const placements = [];
  const lane = 0.95;
  const columns = [[], []];
  main.forEach((entry, index) => columns[index % 2].push(entry));

  columns.forEach((column, index) => {
    const side = index === 0 ? 1 : -1;
    for (const placed of placeColumnZ(column, 0)) {
      placements.push({
        entry: placed.entry,
        x: side * (lane / 2 + placed.entry.width / 2),
        z: placed.z,
      });
    }
  });

  props.forEach((entry, index) => {
    const t = props.length > 1 ? (index + 0.5) / props.length : 0.5;
    placements.push({
      entry,
      x: (index % 2 === 0 ? -1 : 1) * (lane / 2 - 0.05),
      z: THREE.MathUtils.lerp(-1.4, 1.4, t),
    });
  });
  return placements;
}

// 市场大厅 + 两侧店铺 + 前方小巷。
function arrangeLane(entries) {
  const main = entries.filter((entry) => entry.role === "building");
  const props = entries.filter((entry) => entry.role === "prop");
  const placements = [];
  const [market, ...shops] = main;
  if (!market) return placements;

  placements.push({ entry: market, x: 0, z: 0 });
  const shopsLeft = [];
  const shopsRight = [];
  shops.forEach((entry, index) => (index % 2 === 0 ? shopsLeft : shopsRight).push(entry));

  const laneHalf = market.width / 2 + 0.32;
  for (const [side, column] of [
    [-1, shopsLeft],
    [1, shopsRight],
  ]) {
    for (const placed of placeColumnZ(column, 0)) {
      placements.push({
        entry: placed.entry,
        x: side * (laneHalf + placed.entry.width / 2),
        z: placed.z,
      });
    }
  }

  const frontZ = Math.max(market.depth / 2, ...shops.map((entry) => entry.depth / 2));
  placePropsFront(placements, props, { frontZ, halfWidth: laneHalf * 1.1 });
  return placements;
}

// 塔楼成排 + 前方广场。
function arrangePlaza(entries) {
  const main = entries.filter((entry) => entry.role === "building");
  const centers = entries.filter((entry) => entry.role === "center");
  const props = entries.filter((entry) => entry.role === "prop");
  const placements = [];
  const row = placeRowX(main, 0);
  for (const placed of row) placements.push(placed);
  const frontZ = main.length ? Math.max(...main.map((entry) => entry.depth / 2)) : 0;
  if (centers.length) {
    for (const placed of placeRowX(centers, frontZ + 0.35 + Math.max(...centers.map((entry) => entry.depth)) / 2, 0.26)) {
      placements.push(placed);
    }
  }
  placePropsFront(placements, props, {
    frontZ: frontZ + 0.75,
    halfWidth: Math.max(rowWidth(main) / 2, 1.0),
  });
  return placements;
}

function arrangeGridLayout(entries, columns) {
  const main = entries.filter((entry) => entry.role === "building");
  const props = entries.filter((entry) => entry.role === "prop");
  const { placements, totalWidth, totalDepth } = placeGrid(main, columns);
  placePropsFront(placements, props, {
    frontZ: totalDepth / 2,
    halfWidth: totalWidth / 2,
  });
  return placements;
}

// 公园/绿地：中央公园 + 四周道具；没有建筑。
function arrangeGreen(entries) {
  const centers = entries.filter((entry) => entry.role === "center");
  const props = entries.filter((entry) => entry.role === "prop");
  const placements = [];
  const centerPlacements = centers.length ? placeRowX(centers, 0, 0.3) : [];
  placements.push(...centerPlacements);
  const centerW = centers.length ? rowWidth(centers, 0.3) : 0.8;
  const centerD = centers.length ? Math.max(...centers.map((entry) => entry.depth)) : 0.8;
  const frontHalf = Math.ceil(props.length / 2);
  placePropsFront(placements, props.slice(0, frontHalf), {
    frontZ: centerD / 2,
    halfWidth: Math.max(centerW / 2, 0.8),
  });
  props.slice(frontHalf).forEach((entry, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    placements.push({
      entry,
      x: side * (centerW / 2 + GAP + entry.width / 2),
      z: (index / Math.max(1, props.length - frontHalf) - 0.5) * centerD,
    });
  });
  return placements;
}

// 四边全封闭围合：居民区专用，楼四面围合里院，没有入口缺口。
function arrangeRingClosed(entries) {
  const main = entries.filter((entry) => entry.role === "building");
  const centers = entries.filter((entry) => entry.role === "center");
  const props = entries.filter((entry) => entry.role === "prop");
  const placements = [];

  const centerPlacements = centers.length ? placeRowX(centers, 0, 0.26) : [];
  placements.push(...centerPlacements);
  const centerW = centers.length ? rowWidth(centers, 0.26) : 0.9;
  const centerD = centers.length ? Math.max(...centers.map((entry) => entry.depth)) : 0.9;

  const count = main.length;
  const backCount = Math.max(1, Math.round(count * 0.25));
  const frontCount = Math.max(1, Math.round(count * 0.25));
  const remaining = Math.max(0, count - backCount - frontCount);
  const leftCount = Math.ceil(remaining / 2);
  const back = main.slice(0, backCount);
  const front = main.slice(backCount, backCount + frontCount);
  const left = main.slice(backCount + frontCount, backCount + frontCount + leftCount);
  const right = main.slice(backCount + frontCount + leftCount);

  const innerHalfW =
    Math.max(centerW, rowWidth(back), rowWidth(front), 0.9) / 2 + GAP * 1.6;
  const innerHalfD =
    Math.max(centerD, columnDepth(left), columnDepth(right), 0.9) / 2 + GAP * 1.6;

  for (const placed of placeRowX(back, 0)) {
    placements.push({
      entry: placed.entry,
      x: placed.x,
      z: -(innerHalfD + GAP + placed.entry.depth / 2),
    });
  }
  for (const placed of placeRowX(front, 0)) {
    placements.push({
      entry: placed.entry,
      x: placed.x,
      z: innerHalfD + GAP + placed.entry.depth / 2,
    });
  }
  for (const placed of placeColumnZ(left, 0)) {
    placements.push({
      entry: placed.entry,
      x: -(innerHalfW + GAP + placed.entry.width / 2),
      z: placed.z,
    });
  }
  for (const placed of placeColumnZ(right, 0)) {
    placements.push({
      entry: placed.entry,
      x: innerHalfW + GAP + placed.entry.width / 2,
      z: placed.z,
    });
  }

  props.forEach((entry, index) => {
    const side = index % 4;
    const t = ((index % 8) + 0.5) / 8;
    if (side === 0) {
      placements.push({
        entry,
        x: THREE.MathUtils.lerp(-centerW * 0.42, centerW * 0.42, t),
        z: -(centerD / 2 + GAP * 0.7 + entry.depth / 2),
      });
    } else if (side === 1) {
      placements.push({
        entry,
        x: THREE.MathUtils.lerp(-centerW * 0.42, centerW * 0.42, t),
        z: centerD / 2 + GAP * 0.7 + entry.depth / 2,
      });
    } else if (side === 2) {
      placements.push({
        entry,
        x: -(centerW / 2 + GAP * 0.7 + entry.width / 2),
        z: THREE.MathUtils.lerp(-centerD * 0.42, centerD * 0.42, t),
      });
    } else {
      placements.push({
        entry,
        x: centerW / 2 + GAP * 0.7 + entry.width / 2,
        z: THREE.MathUtils.lerp(-centerD * 0.42, centerD * 0.42, t),
      });
    }
  });

  return placements;
}

const ARRANGERS = {
  ring: arrangeRing,
  "ring-closed": arrangeRingClosed,
  street: arrangeStreet,
  lane: arrangeLane,
  plaza: arrangePlaza,
  yard: (entries) => arrangeGridLayout(entries, 2),
  fair: (entries) => arrangeGridLayout(entries, 2),
  green: arrangeGreen,
};

function contentBounds(placements) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const { entry, x, z } of placements) {
    minX = Math.min(minX, x - entry.width / 2);
    maxX = Math.max(maxX, x + entry.width / 2);
    minZ = Math.min(minZ, z - entry.depth / 2);
    maxZ = Math.max(maxZ, z + entry.depth / 2);
  }
  if (!Number.isFinite(minX)) return { minX: 0, maxX: 0, minZ: 0, maxZ: 0, width: 0, depth: 0 };
  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ };
}

function buildBase(plan, kit, content) {
  const base = new THREE.Group();
  base.name = "composition-base";
  const width = content.width + BASE_PAD * 2;
  const depth = content.depth + BASE_PAD * 2;
  const groundMat = kit.material(plan.ground, { roughness: 1 });
  const innerMat = kit.material(plan.inner, { roughness: 1 });
  const pathMat = kit.material("#b8a17a", { roughness: 1 });
  const stoneMat = kit.material("#c7bda6", { roughness: 0.95 });
  const lawnMat = kit.material("#7c9d59", { roughness: 1 });
  const dirtMat = kit.material("#9a8a72", { roughness: 1 });

  kit.box(base, width, BASE_TOP, depth, groundMat, 0, BASE_TOP / 2, 0, { outline: true });
  kit.box(base, width - 0.24, 0.02, depth - 0.24, innerMat, 0, BASE_TOP + 0.01, 0);

  const surfaceY = BASE_TOP + 0.025;
  switch (plan.layout) {
    case "ring": {
      kit.box(base, width - 0.34, 0.014, 0.22, pathMat, 0, surfaceY, 0);
      kit.box(base, 0.22, 0.014, depth - 0.34, pathMat, 0, surfaceY, 0);
      kit.box(base, 0.6, 0.014, content.depth / 2 + BASE_PAD - 0.2, pathMat, 0, surfaceY, (content.depth / 2 + BASE_PAD) / 2 - 0.05);
      break;
    }
    case "ring-closed": {
      kit.box(base, width - 0.34, 0.014, 0.22, pathMat, 0, surfaceY, 0);
      kit.box(base, 0.22, 0.014, depth - 0.34, pathMat, 0, surfaceY, 0);
      break;
    }
    case "street": {
      kit.box(base, 0.92, 0.016, depth - 0.3, pathMat, 0, surfaceY, 0);
      kit.box(base, 0.06, 0.018, depth - 0.3, stoneMat, -0.49, surfaceY + 0.004, 0);
      kit.box(base, 0.06, 0.018, depth - 0.3, stoneMat, 0.49, surfaceY + 0.004, 0);
      break;
    }
    case "lane": {
      kit.box(base, 0.82, 0.016, depth - 0.3, pathMat, 0, surfaceY, 0);
      kit.box(base, 0.05, 0.018, depth - 0.3, stoneMat, -0.44, surfaceY + 0.004, 0);
      kit.box(base, 0.05, 0.018, depth - 0.3, stoneMat, 0.44, surfaceY + 0.004, 0);
      break;
    }
    case "plaza": {
      for (let line = -2; line <= 2; line += 1) {
        kit.box(base, width - 0.32, 0.012, 0.016, stoneMat, 0, surfaceY, line * Math.max(0.4, content.depth / 6));
        kit.box(base, 0.016, 0.012, depth - 0.32, stoneMat, line * Math.max(0.4, content.width / 6), surfaceY, 0);
      }
      break;
    }
    case "yard": {
      kit.box(base, Math.max(0.8, content.width * 0.7), 0.02, Math.max(0.8, content.depth * 0.55), dirtMat, 0, surfaceY, 0);
      break;
    }
    case "green": {
      kit.box(base, width - 0.26, 0.02, depth - 0.26, lawnMat, 0, surfaceY, 0);
      kit.box(base, width - 0.4, 0.012, 0.16, pathMat, 0, surfaceY + 0.02, 0);
      kit.box(base, 0.16, 0.012, depth - 0.4, pathMat, 0, surfaceY + 0.02, 0);
      break;
    }
    case "fair": {
      kit.box(base, Math.max(0.9, content.width * 0.55), 0.014, Math.max(0.9, content.depth * 0.5), stoneMat, 0, surfaceY, 0);
      for (const side of [-1, 1]) {
        kit.box(base, 0.9, 0.014, 0.9, lawnMat, side * (width / 2 - 0.65), surfaceY, depth / 2 - 0.65);
      }
      break;
    }
    default:
      break;
  }

  kit.box(
    base,
    0.55,
    0.016,
    0.06,
    kit.material(plan.accent, { emissive: plan.accent, emissiveIntensity: 0.08, roughness: 0.8 }),
    width / 2 - 0.48,
    surfaceY + 0.006,
    depth / 2 - 0.2
  );
  return base;
}

export function createComposition(plan, options = {}) {
  const kit = options.kit ?? new ShowcaseKit();
  const entries = [];
  plan.items.forEach((item, index) => {
    const asset = ASSET_BY_ID.get(item.assetId);
    if (!asset) return;
    const model = createShowcaseModel(asset, {
      kit,
      seed: `${plan.seedHex}:${plan.id}:${item.assetId}:${index}`,
    });
    model.scale.setScalar(scaleFor(asset));
    model.rotation.y = 0;
    groundModel(model);
    const size = measureModel(model);
    entries.push({ asset, model, role: item.role, ...size });
  });

  const placements = (ARRANGERS[plan.layout] ?? arrangeRing)(entries);
  const content = contentBounds(placements);
  const centerX = (content.minX + content.maxX) / 2;
  const centerZ = (content.minZ + content.maxZ) / 2;

  const root = new THREE.Group();
  root.name = `composition-${plan.id}`;
  const base = buildBase(plan, kit, content);
  base.position.set(0, 0, 0);
  root.add(base);

  const models = new THREE.Group();
  models.name = "composition-models";
  for (const placed of placements) {
    const { entry } = placed;
    entry.model.position.set(placed.x - centerX, MODEL_Y, placed.z - centerZ);
    models.add(entry.model);
  }
  root.add(models);
  root.userData.plan = plan;
  root.userData.content = content;
  root.userData.layout = placements.map(({ entry, x, z }) => ({
    assetId: entry.asset.id,
    role: entry.role,
    x,
    z,
    width: entry.width,
    depth: entry.depth,
  }));
  return root;
}

export function disposeComposition(root) {
  if (!root) return;
  root.traverse((object) => {
    if (object.isInstancedMesh && typeof object.dispose === "function") object.dispose();
  });
  root.removeFromParent();
  root.clear();
}
