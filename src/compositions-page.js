// 组合层画廊页：展示 8 类组合原型，每类由种子生成 roguelike 变体。
// 组合内部只调用图鉴里的静态物体，不出现任何载具。

import {
  COMPOSITIONS,
  COMPOSITION_LAYERS,
  compositionStats,
  generateComposition,
  hashSeed,
  normalizeSeed,
  randomSeed,
  seedToHex,
} from "./composition-catalog.js";
import { createCompositionStudio } from "./composition-studio.js";

const THUMB_SIZE = { width: 480, height: 360 };
const DETAIL_SIZE = { width: 760, height: 570 };

const params = new URLSearchParams(window.location.search);
const baseSeedParam = normalizeSeed(params.get("seed"));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const dom = {
  statusCount: document.getElementById("statusCount"),
  runSeed: document.getElementById("runSeed"),
  layerList: document.getElementById("layerList"),
  statCompositions: document.getElementById("statCompositions"),
  statElements: document.getElementById("statElements"),
  statUnique: document.getElementById("statUnique"),
  grid: document.getElementById("compGrid"),
  renderStatus: document.getElementById("renderStatus"),
  rerollAllBtn: document.getElementById("rerollAllBtn"),
  shareBtn: document.getElementById("shareBtn"),
  modal: document.getElementById("compModal"),
  modalPanel: document.getElementById("modalPanel"),
  modalClose: document.getElementById("modalClose"),
  modalImage: document.getElementById("modalImage"),
  modalStageCode: document.getElementById("modalStageCode"),
  modalSeed: document.getElementById("modalSeed"),
  modalKicker: document.getElementById("modalKicker"),
  modalTitle: document.getElementById("modalTitle"),
  modalEn: document.getElementById("modalEn"),
  modalDesc: document.getElementById("modalDesc"),
  modalRule: document.getElementById("modalRule"),
  modalMeta: document.getElementById("modalMeta"),
  modalCount: document.getElementById("modalCount"),
  modalManifest: document.getElementById("modalManifest"),
  modalReroll: document.getElementById("modalReroll"),
  toast: document.getElementById("toast"),
};

const state = {
  baseSeed: baseSeedParam ?? randomSeed(),
  rollSeeds: new Map(),
  plans: new Map(),
  cards: new Map(),
  studio: null,
  fallback: false,
  modalId: null,
  lastFocus: null,
  busy: false,
  toastTimer: 0,
};

const pad = (value, width = 2) => String(value).padStart(width, "0");
const nextFrame = () => new Promise((resolve) => window.requestAnimationFrame(() => resolve()));

function defaultSeedFor(id) {
  return hashSeed(`${state.baseSeed}:${id}`);
}

function initSeeds() {
  for (const definition of COMPOSITIONS) {
    state.rollSeeds.set(definition.id, defaultSeedFor(definition.id));
  }
  const rolls = params.get("rolls");
  if (!rolls) return;
  for (const entry of rolls.split(",")) {
    const [id, hex] = entry.split(".");
    const seed = normalizeSeed(hex);
    if (seed == null) continue;
    if (COMPOSITIONS.some((definition) => definition.id === id)) {
      state.rollSeeds.set(id, seed);
    }
  }
}

function updateUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("seed", seedToHex(state.baseSeed));
  const overrides = COMPOSITIONS.filter(
    (definition) => state.rollSeeds.get(definition.id) !== defaultSeedFor(definition.id)
  ).map((definition) => `${definition.id}.${seedToHex(state.rollSeeds.get(definition.id))}`);
  if (overrides.length) {
    url.searchParams.set("rolls", overrides.join(","));
  } else {
    url.searchParams.delete("rolls");
  }
  try {
    window.history.replaceState(null, "", url);
  } catch {
    // Embedded views may forbid history updates; the page still works without a shareable URL.
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => dom.toast.classList.remove("is-visible"), 2400);
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
  document.body.append(helper);
  helper.select();
  try {
    document.execCommand("copy");
    showToast(message);
  } catch {
    showToast("复制失败，请手动复制地址栏链接");
  }
  helper.remove();
}

// ---------- 静态结构 ----------

function buildLayerList() {
  dom.layerList.replaceChildren();
  COMPOSITION_LAYERS.forEach((layer) => {
    const item = element("li", layer.id === "composition" ? "is-current" : "");
    item.append(element("b", "", layer.name), element("span", "", layer.note));
    dom.layerList.append(item);
  });
}

function updateHeroStatic() {
  dom.statCompositions.textContent = pad(COMPOSITIONS.length);
  dom.runSeed.textContent = `SEED ${seedToHex(state.baseSeed)}`;
  updateUrl();
}

function updateStats() {
  const stats = compositionStats([...state.plans.values()]);
  dom.statElements.textContent = String(stats.elements);
  dom.statUnique.textContent = String(stats.uniqueAssets);
  dom.statusCount.textContent = `${pad(state.plans.size, 3)} / ${pad(COMPOSITIONS.length, 3)}`;
}

function updateRenderStatus(done, finished = false) {
  if (finished) {
    dom.renderStatus.textContent = "READY · ALL COMPOSITIONS GENERATED";
  } else {
    dom.renderStatus.textContent = `GENERATING ${pad(done)} / ${pad(COMPOSITIONS.length)}`;
  }
}

// ---------- 卡片 ----------

function createCard(definition, index) {
  const card = element("article", "comp-card");
  card.dataset.id = definition.id;
  card.style.setProperty("--accent", definition.accent);

  const thumb = element("div", "comp-thumb is-loading");
  const image = document.createElement("img");
  image.className = "comp-image";
  image.width = THUMB_SIZE.width;
  image.height = THUMB_SIZE.height;
  image.alt = `${definition.name} 组合预览`;
  image.decoding = "async";
  thumb.append(image);
  thumb.append(element("span", "comp-index", `C-${pad(index + 1)}`));
  const variant = element("span", "comp-variant", definition.variants[0]);
  thumb.append(variant);

  const body = element("div", "comp-body");
  body.append(
    element("p", "comp-en", definition.en),
    element("h2", "comp-name", definition.name),
    element("p", "comp-desc", definition.description)
  );

  const statsRow = element("div", "comp-stats");
  const tagsRow = element("div", "comp-tags");
  body.append(statsRow, tagsRow);

  const foot = element("div", "comp-foot");
  const seedLabel = element("span", "comp-seed", "SEED --------");
  const actions = element("div", "comp-actions");
  const rerollBtn = element("button", "wh-btn ghost", "重掷");
  rerollBtn.type = "button";
  rerollBtn.setAttribute("aria-label", `重掷组合 ${definition.name}`);
  const openBtn = element("button", "wh-btn", "查看");
  openBtn.type = "button";
  openBtn.setAttribute("aria-label", `查看组合详情 ${definition.name}`);
  actions.append(rerollBtn, openBtn);
  foot.append(seedLabel, actions);
  body.append(foot);

  card.append(thumb, body);
  card.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("button, a")) return;
    openDetail(definition);
  });
  rerollBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    rerollComposition(definition, rerollBtn);
  });
  openBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    openDetail(definition);
  });

  state.cards.set(definition.id, {
    card,
    thumb,
    image,
    variant,
    statsRow,
    tagsRow,
    seedLabel,
    rerollBtn,
  });
  return card;
}

function updateCardMeta(definition, plan) {
  const entry = state.cards.get(definition.id);
  if (!entry) return;
  entry.variant.textContent = plan.variant;
  entry.seedLabel.textContent = `SEED ${plan.seedHex}`;
  entry.statsRow.replaceChildren(
    ...[
      ["建筑", plan.buildingCount],
      ["道具", plan.propCount],
      ["绿化", plan.greenCount],
      ["密度", `${plan.density}/5`],
    ].map(([label, value]) => {
      const node = element("span");
      node.append(element("b", "", pad(value)), document.createTextNode(label));
      return node;
    })
  );
  entry.tagsRow.replaceChildren();
  for (const tag of definition.tags.slice(0, 2)) {
    entry.tagsRow.append(element("span", "comp-tag", `# ${tag}`));
  }
  for (const modifier of plan.modifiers
    .filter((item) => !definition.tags.includes(item.label))
    .slice(0, 3)) {
    entry.tagsRow.append(element("span", `comp-tag tone-${modifier.tone}`, modifier.label));
  }
}

async function drawCard(definition) {
  const entry = state.cards.get(definition.id);
  if (!entry) return;
  const plan = state.plans.get(definition.id);
  if (!plan) return;
  entry.thumb.classList.add("is-loading");
  entry.rerollBtn.disabled = true;
  updateCardMeta(definition, plan);
  await nextFrame();

  let url = "";
  if (state.fallback || !state.studio) {
    url = fallbackArt(plan, COMPOSITIONS.indexOf(definition));
  } else {
    try {
      url = state.studio.render(plan, THUMB_SIZE).url;
    } catch (error) {
      console.warn(`[compositions] render failed for ${definition.id}`, error);
      state.fallback = true;
      url = fallbackArt(plan, COMPOSITIONS.indexOf(definition));
    }
  }

  await new Promise((resolve) => {
    entry.image.onload = () => {
      entry.thumb.classList.remove("is-loading");
      entry.thumb.classList.add("has-thumb");
      resolve();
    };
    entry.image.onerror = () => {
      entry.thumb.classList.remove("is-loading");
      resolve();
    };
    entry.image.src = url;
  });
  entry.rerollBtn.disabled = false;
}

// ---------- 生成与重掷 ----------

function planFor(definition) {
  const seed = state.rollSeeds.get(definition.id) ?? defaultSeedFor(definition.id);
  const plan = generateComposition(definition, seed);
  state.plans.set(definition.id, plan);
  return plan;
}

async function renderAll({ resetSeeds = false } = {}) {
  if (state.busy) return;
  state.busy = true;
  dom.rerollAllBtn.disabled = true;
  if (resetSeeds) {
    state.baseSeed = randomSeed();
    dom.runSeed.textContent = `SEED ${seedToHex(state.baseSeed)}`;
    for (const definition of COMPOSITIONS) {
      state.rollSeeds.set(definition.id, defaultSeedFor(definition.id));
    }
    updateUrl();
  }
  updateRenderStatus(0);
  for (let index = 0; index < COMPOSITIONS.length; index += 1) {
    const definition = COMPOSITIONS[index];
    planFor(definition);
    await drawCard(definition);
    updateStats();
    updateRenderStatus(index + 1);
    await nextFrame();
  }
  state.busy = false;
  dom.rerollAllBtn.disabled = false;
  updateRenderStatus(COMPOSITIONS.length, true);
  if (state.fallback) showToast("WebGL 渲染不可用，已切换为备用像素图");
}

async function rerollComposition(definition, button) {
  if (state.busy) return;
  state.busy = true;
  button.disabled = true;
  try {
    state.rollSeeds.set(definition.id, randomSeed());
    updateUrl();
    planFor(definition);
    await drawCard(definition);
    updateStats();
    if (state.modalId === definition.id) {
      await renderDetail(definition);
    }
    showToast(`${definition.name} 已重掷 · SEED ${seedToHex(state.rollSeeds.get(definition.id))}`);
  } finally {
    state.busy = false;
    button.disabled = false;
  }
}

// ---------- 详情弹窗 ----------

function renderDetail(definition) {
  const plan = state.plans.get(definition.id);
  if (!plan) return Promise.resolve();
  const index = COMPOSITIONS.indexOf(definition);
  dom.modalStageCode.textContent = `C-${pad(index + 1)}`;
  dom.modalSeed.textContent = `SEED ${plan.seedHex}`;
  dom.modalKicker.textContent = `COMPOSITION / ${definition.en}`;
  dom.modalTitle.textContent = `${definition.name} · ${plan.variant}`;
  dom.modalEn.textContent = `${definition.en} / ${definition.variants.join(" · ")}`;
  dom.modalDesc.textContent = definition.description;
  dom.modalRule.textContent = definition.rule;
  dom.modalCount.textContent = `${pad(plan.manifest.length)} ITEMS / ${pad(plan.elementCount)} ELEMENTS`;

  dom.modalMeta.replaceChildren();
  const metaEntries = [
    ["建筑", plan.buildingCount],
    ["道具", plan.propCount],
    ["绿化", plan.greenCount],
    ["密度", `${plan.density}/5`],
  ];
  for (const [label, value] of metaEntries) {
    const node = element("span");
    node.append(document.createTextNode(`${label} `), element("b", "", String(value)));
    dom.modalMeta.append(node);
  }
  for (const modifier of plan.modifiers) {
    dom.modalMeta.append(element("span", "", modifier.label));
  }

  dom.modalManifest.replaceChildren();
  for (const entry of plan.manifest) {
    const item = element("li");
    const link = element("a");
    link.href = `/catalog.html?asset=${encodeURIComponent(entry.id)}`;
    link.title = `在物体图鉴中查看 ${entry.name}`;
    link.append(
      document.createTextNode(entry.name),
      element("b", "", `×${entry.count}`),
      element("i", `rarity-${entry.rarity}`, entry.rarityLabel)
    );
    item.append(link);
    dom.modalManifest.append(item);
  }

  const fallbackUrl = fallbackArt(plan, index, DETAIL_SIZE.width, DETAIL_SIZE.height);
  if (state.fallback || !state.studio) {
    dom.modalImage.src = fallbackUrl;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    try {
      const result = state.studio.render(plan, DETAIL_SIZE);
      dom.modalImage.onload = () => resolve();
      dom.modalImage.onerror = () => {
        dom.modalImage.src = fallbackUrl;
        resolve();
      };
      dom.modalImage.src = result.url;
    } catch (error) {
      console.warn(`[compositions] detail render failed for ${definition.id}`, error);
      dom.modalImage.src = fallbackUrl;
      resolve();
    }
  });
}

async function openDetail(definition) {
  state.modalId = definition.id;
  state.lastFocus = document.activeElement;
  dom.modal.hidden = false;
  dom.modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.requestAnimationFrame(() => dom.modal.classList.add("is-open"));
  dom.modalPanel.scrollTop = 0;
  await renderDetail(definition);
  document.addEventListener("keydown", onModalKeydown);
  window.setTimeout(() => dom.modalClose.focus({ preventScroll: true }), 30);
}

function closeDetail() {
  if (dom.modal.hidden) return;
  dom.modal.classList.remove("is-open");
  dom.modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  document.removeEventListener("keydown", onModalKeydown);
  window.setTimeout(() => {
    if (!dom.modal.classList.contains("is-open")) dom.modal.hidden = true;
  }, reducedMotion ? 0 : 200);
  state.modalId = null;
  if (state.lastFocus && typeof state.lastFocus.focus === "function") {
    state.lastFocus.focus({ preventScroll: true });
  }
}

function onModalKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeDetail();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = dom.modalPanel.querySelectorAll(
    'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// ---------- 备用像素图 ----------

function fallbackArt(plan, index, width = THUMB_SIZE.width, height = THUMB_SIZE.height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const accent = plan.accent;

  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#111c2e");
  background.addColorStop(1, "#0a1220");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(150, 175, 205, 0.1)";
  context.lineWidth = 1;
  for (let x = 24; x < width; x += 24) {
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, height);
    context.stroke();
  }
  for (let y = 20; y < height; y += 20) {
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(width, y + 0.5);
    context.stroke();
  }

  const groundY = height * 0.72;
  context.fillStyle = "rgba(4, 8, 16, 0.55)";
  context.beginPath();
  context.ellipse(width / 2, groundY + 10, width * 0.34, height * 0.1, 0, 0, Math.PI * 2);
  context.fill();

  const count = Math.min(8, 3 + (plan.buildingCount || 3));
  for (let block = 0; block < count; block += 1) {
    const seed = hashSeed(`${plan.seedHex}:${block}`);
    const blockWidth = 18 + (seed % 30);
    const blockHeight = 26 + ((seed >> 4) % Math.round(height * 0.32));
    const x = width * 0.2 + ((seed >> 8) % Math.round(width * 0.58));
    const y = groundY - blockHeight;
    context.globalAlpha = 0.24 + ((seed >> 12) % 50) / 100;
    context.fillStyle = block % 3 === 0 ? accent : "#d8cbb0";
    context.fillRect(x, y, blockWidth, blockHeight);
    context.globalAlpha = 0.9;
    context.fillStyle = "rgba(9, 15, 27, 0.45)";
    for (let windowY = y + 6; windowY < groundY - 4; windowY += 8) {
      for (let windowX = x + 4; windowX < x + blockWidth - 3; windowX += 7) {
        context.fillRect(windowX, windowY, 2, 2);
      }
    }
    context.globalAlpha = 1;
  }

  context.fillStyle = accent;
  context.font = "700 11px Cascadia Mono, Consolas, monospace";
  context.fillText(`C-${pad(index + 1)} ${plan.variant}`, 14, 24);
  context.fillStyle = "rgba(245, 233, 211, 0.45)";
  context.font = "7px Cascadia Mono, Consolas, monospace";
  context.fillText("FALLBACK / NO WEBGL", 14, 38);
  return canvas.toDataURL("image/png");
}

// ---------- 启动 ----------

function buildGrid() {
  dom.grid.replaceChildren();
  COMPOSITIONS.forEach((definition, index) => {
    dom.grid.append(createCard(definition, index));
  });
}

function ensureStudio() {
  if (state.studio || state.fallback) return Boolean(state.studio);
  try {
    state.studio = createCompositionStudio({ ...THUMB_SIZE });
    return true;
  } catch (error) {
    console.warn("[compositions] WebGL unavailable, using fallback art", error);
    state.fallback = true;
    return false;
  }
}

function wireActions() {
  dom.rerollAllBtn.addEventListener("click", () => renderAll({ resetSeeds: true }));
  dom.shareBtn.addEventListener("click", () => {
    updateUrl();
    copyText(window.location.href, "本次组合层链接已复制");
  });
  dom.modalClose.addEventListener("click", closeDetail);
  dom.modal.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("[data-close]")) closeDetail();
  });
  dom.modalReroll.addEventListener("click", () => {
    const definition = COMPOSITIONS.find((item) => item.id === state.modalId);
    if (definition) rerollComposition(definition, dom.modalReroll);
  });
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;
    state.studio?.dispose();
    state.studio = null;
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) ensureStudio();
  });
}

async function bootstrap() {
  initSeeds();
  updateHeroStatic();
  buildLayerList();
  buildGrid();
  wireActions();
  ensureStudio();

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => renderAll());
  });
}

bootstrap();
