import { ASSETS, GROUPS, BUILDING_FAMILIES } from "./object-catalog.js";
import { createThumbnailStudio, createInspectorStage } from "./showcase-studio.js";

const FAMILY_TINTS = {
  residential: "#9fd06d",
  commercial: "#ffd166",
  office: "#72cec0",
  civic: "#d8b66a",
  industrial: "#e4b34f",
  leisure: "#ef816c",
  landmark: "#ffcf6b",
};

const groupById = new Map(GROUPS.map((group) => [group.id, group]));
const familyById = new Map(BUILDING_FAMILIES.map((family) => [family.id, family]));
const assetIndex = new Map(ASSETS.map((asset, index) => [asset.id, index + 1]));
const total = ASSETS.length;
const groupAssets = new Map(
  GROUPS.map((group) => [group.id, ASSETS.filter((asset) => asset.group === group.id)])
);
const groupCounts = new Map(GROUPS.map((group) => [group.id, groupAssets.get(group.id).length]));

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const prefersReducedMotion = () => motionQuery.matches;
const pad = (value, width = 3) => String(value).padStart(width, "0");
const seedFor = (asset) => `catalog:${asset.id}:v1`;

function isReadableAccent(color) {
  if (typeof color !== "string") return false;
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return true;
  const value = Number.parseInt(match[1], 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
  return luminance >= 0.36;
}

function accentFor(asset) {
  const accent = asset.model?.accent;
  if (isReadableAccent(accent)) return accent;
  return groupById.get(asset.group)?.accent || "#ffd166";
}

const statusCount = document.getElementById("statusCount");
const heroCount = document.getElementById("heroCount");
const heroCategories = document.getElementById("heroCategories");
const filterRail = document.querySelector(".filter-rail");
const filterResult = document.getElementById("filterResult");
const sectionsRoot = document.getElementById("catalogSections");
const archiveNotice = document.getElementById("archiveNotice");
const loader = document.getElementById("loader");
const loaderFill = document.getElementById("loaderFill");
const loaderCount = document.getElementById("loaderCount");
const loaderPercent = document.getElementById("loaderPercent");
const loaderCurrent = document.getElementById("loaderCurrent");
const loaderProgress = document.getElementById("loaderProgress");
const loaderGroups = document.getElementById("loaderGroups");
const loaderCopy = document.getElementById("loaderCopy");
const inspector = document.getElementById("inspector");
const inspectorPanel = document.getElementById("inspectorPanel");
const inspectorInfo = document.getElementById("inspectorInfo");
const inspectorSwatch = document.getElementById("inspectorSwatch");
const inspectorNumber = document.getElementById("inspectorNumber");
const inspectorTitle = document.getElementById("inspectorTitle");
const inspectorEn = document.getElementById("inspectorEn");
const inspectorDesc = document.getElementById("inspectorDesc");
const inspectorGroup = document.getElementById("inspectorGroup");
const inspectorFamily = document.getElementById("inspectorFamily");
const inspectorFacts = document.getElementById("inspectorFacts");
const inspectorTags = document.getElementById("inspectorTags");
const stageCode = document.getElementById("stageCode");
const stageHint = document.getElementById("stageHint");
const stageNote = document.getElementById("stageNote");
const stageFallback = document.getElementById("stageFallback");
const inspectorCanvas = document.getElementById("inspectorCanvas");
const inspectorStageElement = document.getElementById("inspectorStage");
const closeButton = inspector.querySelector(".inspector-close");

const thumbNodes = new Map();
const cardNodes = new Map();
const loaderGroupNodes = new Map();
const groupSpan = new Map();
let activeGroup = "all";
let inspectorStage = null;
let inspectorUnavailable = false;
let lastFocus = null;
let closeTimer = 0;
let focusTimer = 0;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function flagAction(show) {
  document.body.classList.toggle("is-ready", show);
}

function updateStaticCounts() {
  loaderProgress.setAttribute("aria-valuemax", String(total));
  document.querySelectorAll("[data-total-count]").forEach((node) => {
    node.textContent = String(total);
  });
  document.querySelectorAll("[data-category-count]").forEach((node) => {
    node.textContent = pad(GROUPS.length, 2);
  });
  document.querySelectorAll("[data-building-count]").forEach((node) => {
    node.textContent = String(groupCounts.get("buildings") ?? 0);
  });
  document.querySelectorAll("[data-district-count]").forEach((node) => {
    node.textContent = String(groupCounts.get("districts") ?? 0);
  });
  const catalogueCode = document.querySelector("#catalogueCode");
  if (catalogueCode) catalogueCode.textContent = `PB–${pad(total, 3)}`;
  heroCount.textContent = String(total);
  statusCount.textContent = `${pad(0)} / ${pad(total)}`;
}

function buildHeroCategories() {
  for (const group of GROUPS) {
    const item = element("div", "hero-cat");
    item.style.setProperty("--chip-accent", group.accent);
    const dot = element("i");
    dot.setAttribute("aria-hidden", "true");
    item.append(dot, element("span", "", group.name), element("b", "", String(groupCounts.get(group.id))));
    heroCategories.append(item);
  }
}

function buildLoaderGroups() {
  GROUPS.forEach((group, index) => {
    const first = ASSETS.findIndex((asset) => asset.group === group.id);
    const last = first + groupCounts.get(group.id) - 1;
    groupSpan.set(group.id, { first, last });
    const item = element("li");
    item.style.setProperty("--chip-accent", group.accent);
    const dot = element("i");
    dot.style.background = group.accent;
    dot.setAttribute("aria-hidden", "true");
    const name = element("span", "", group.name);
    const count = element("b", "", pad(groupCounts.get(group.id), 2));
    item.append(dot, name, count);
    item.title = group.en;
    loaderGroups.append(item);
    loaderGroupNodes.set(group.id, item);
    if (index === 0) item.classList.add("is-active");
  });
}

function buildFilterChips() {
  const result = filterResult;
  const allButton = document.querySelector('.filter-chip[data-group="all"]');
  allButton.style.setProperty("--chip-accent", "#f5e9d3");
  allButton.querySelector("b").textContent = String(total);
  allButton.addEventListener("click", () => applyFilter("all"));
  for (const group of GROUPS) {
    const button = element("button", "filter-chip");
    button.type = "button";
    button.dataset.group = group.id;
    button.style.setProperty("--chip-accent", group.accent);
    button.setAttribute("aria-pressed", "false");
    const dot = element("i");
    dot.setAttribute("aria-hidden", "true");
    button.append(dot, element("span", "", group.name), element("b", "", String(groupCounts.get(group.id))));
    button.addEventListener("click", () => applyFilter(group.id, { scroll: true }));
    result.before(button);
  }
}

function applyFilter(groupId, options = {}) {
  activeGroup = groupId;
  document.querySelectorAll(".filter-chip").forEach((button) => {
    const active = button.dataset.group === groupId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  let visible = 0;
  document.querySelectorAll(".group-section").forEach((section) => {
    const hidden = groupId !== "all" && section.dataset.group !== groupId;
    section.hidden = hidden;
    if (!hidden) visible += Number(section.dataset.count) || 0;
  });
  filterResult.textContent = `显示 ${visible} / ${total}`;
  if (options.scroll) {
    const targetY = Math.max(0, filterRail.offsetTop + filterRail.offsetHeight - 12);
    if (window.scrollY > targetY) {
      window.scrollTo({
        top: targetY,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    }
  }
}

function createFamilyLegend() {
  const legend = element("div", "family-legend");
  legend.append(element("span", "family-legend-label", "FAMILY"));
  for (const family of BUILDING_FAMILIES) {
    const count = groupAssets
      .get("buildings")
      .filter((asset) => asset.family === family.id).length;
    const chip = element("span", "family-chip");
    chip.style.setProperty("--family-color", FAMILY_TINTS[family.id] || "#d8b66a");
    const dot = element("i");
    dot.setAttribute("aria-hidden", "true");
    chip.append(dot, document.createTextNode(family.name), element("b", "", String(count)));
    chip.title = `${family.name} / ${family.en}`;
    legend.append(chip);
  }
  return legend;
}

function createCard(asset) {
  const group = groupById.get(asset.group);
  const family = familyById.get(asset.family);
  const accent = accentFor(asset);
  const index = assetIndex.get(asset.id);

  const card = element("button", "asset-card");
  card.type = "button";
  card.dataset.asset = asset.id;
  card.dataset.group = asset.group;
  card.style.setProperty("--accent", accent);
  card.style.setProperty("--i", String(index % 12));
  card.setAttribute("aria-haspopup", "dialog");
  card.setAttribute("aria-label", `${asset.name}，${asset.en}，${group.name}，查看物体详情`);

  const thumb = element("span", "card-thumb");
  const image = document.createElement("img");
  image.className = "thumb-image";
  image.width = 192;
  image.height = 144;
  image.alt = "";
  image.decoding = "async";
  image.loading = "eager";
  thumb.append(image);

  const indexLabel = element("span", "card-index", pad(index));
  indexLabel.setAttribute("aria-hidden", "true");
  const badge = element("span", "card-badge", family ? family.name : group.name);
  badge.title = family ? `${family.name} / ${family.en}` : `${group.name} / ${group.en}`;
  thumb.append(indexLabel, badge);

  const body = element("span", "card-body");
  body.append(
    element("span", "card-en", asset.en),
    element("span", "card-name", asset.name)
  );

  const facts = element("span", "card-facts");
  asset.facts.slice(0, 2).forEach((fact) => {
    const item = element("span", "card-fact");
    item.append(element("i", "", fact.label), element("b", "", fact.value));
    facts.append(item);
  });
  body.append(facts);

  const foot = element("span", "card-foot");
  const tag = element("span", "card-tag", `# ${asset.tags[0] ?? group.name}`);
  const open = element("span", "card-open");
  open.append(document.createTextNode("INSPECT "), element("i", "", "+"));
  foot.append(tag, open);

  card.append(thumb, body, foot);
  card.addEventListener("click", () => openInspector(asset, card));

  thumbNodes.set(asset.id, image);
  cardNodes.set(asset.id, card);
  return card;
}

function buildSections() {
  GROUPS.forEach((group, index) => {
    const assets = groupAssets.get(group.id);
    const section = element("section", "group-section");
    section.id = `group-${group.id}`;
    section.dataset.group = group.id;
    section.dataset.count = String(assets.length);
    section.style.setProperty("--accent", group.accent);

    const header = element("header", "group-head");
    const no = element("span", "group-no", pad(index + 1, 2));
    const titleBlock = element("div", "group-title");
    const kicker = element("p", "group-kicker", `${group.en} / ${pad(assets.length, 2)} OBJECTS`);
    const title = element("h2");
    title.append(document.createTextNode(group.name), element("em", "", group.en));
    const description = element("p", "group-desc", group.description);
    titleBlock.append(kicker, title, description);

    const count = element("span", "group-count");
    count.append(
      document.createTextNode(String(assets.length)),
      element("small", "", "OBJECTS")
    );

    header.append(no, titleBlock, count);

    if (group.id === "buildings") {
      titleBlock.append(createFamilyLegend());
    }

    const grid = element("div", "asset-grid");
    assets.forEach((asset) => grid.append(createCard(asset)));

    section.append(header, grid);
    sectionsRoot.append(section);
  });
}

function updateLoader(done, asset) {
  const ratio = done / total;
  const percent = Math.round(ratio * 100);
  loaderFill.style.width = `${ratio * 100}%`;
  loaderCount.textContent = `${pad(done)} / ${pad(total)}`;
  loaderPercent.textContent = `${percent}%`;
  loaderProgress.setAttribute("aria-valuenow", String(done));
  statusCount.textContent = `${pad(done)} / ${pad(total)}`;
  if (asset) loaderCurrent.textContent = `${asset.name} / ${asset.en}`;

  for (const group of GROUPS) {
    const span = groupSpan.get(group.id);
    const node = loaderGroupNodes.get(group.id);
    if (!span || !node) continue;
    node.classList.toggle("is-done", done > span.last);
    node.classList.toggle("is-active", done >= span.first && done <= span.last);
  }
}

function fallbackThumb(asset) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 144;
  const context = canvas.getContext("2d");
  const index = assetIndex.get(asset.id);
  const accent = accentFor(asset);

  const background = context.createLinearGradient(0, 0, 0, 144);
  background.addColorStop(0, "#111c2e");
  background.addColorStop(1, "#0a1220");
  context.fillStyle = background;
  context.fillRect(0, 0, 192, 144);

  context.strokeStyle = "rgba(150, 175, 205, 0.12)";
  context.lineWidth = 1;
  for (let x = 16; x < 192; x += 16) {
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, 144);
    context.stroke();
  }
  for (let y = 12; y < 144; y += 16) {
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(192, y + 0.5);
    context.stroke();
  }

  context.fillStyle = "rgba(4, 8, 16, 0.55)";
  context.beginPath();
  context.ellipse(96, 116, 54, 16, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = accent;
  context.globalAlpha = 0.55;
  context.stroke();
  context.globalAlpha = 1;

  const blocks = [
    { x: 72, y: 112, w: 34, h: 42, d: 10, alpha: 0.35 },
    { x: 102, y: 112, w: 26, h: 64, d: 8, alpha: 0.55 },
    { x: 126, y: 112, w: 22, h: 30, d: 7, alpha: 0.75 },
  ];
  blocks.forEach((block) => {
    const topY = block.y - block.h;
    context.globalAlpha = block.alpha;
    context.fillStyle = accent;
    context.beginPath();
    context.moveTo(block.x, topY - block.d);
    context.lineTo(block.x + block.w, topY);
    context.lineTo(block.x, topY + block.d);
    context.lineTo(block.x - block.w, topY);
    context.closePath();
    context.fill();
    context.globalAlpha = block.alpha * 0.7;
    context.fillRect(block.x - block.w, topY, block.w * 2, block.h);
    context.globalAlpha = block.alpha * 0.35;
    context.fillRect(block.x - block.w * 0.55, topY + 10, 6, 6);
    context.fillRect(block.x + block.w * 0.1, topY + 22, 6, 6);
    context.globalAlpha = 1;
  });

  context.fillStyle = accent;
  context.font = "700 10px Cascadia Mono, Consolas, monospace";
  context.fillText(pad(index), 12, 134);
  context.fillStyle = "rgba(245, 233, 211, 0.5)";
  context.font = "7px Cascadia Mono, Consolas, monospace";
  context.fillText("NO SIGNAL / FALLBACK", 12, 26);
  context.fillStyle = accent;
  context.fillRect(12, 32, 28, 2);
  context.save();
  context.translate(160, 122);
  context.rotate(-Math.PI / 4);
  context.fillStyle = "rgba(245, 233, 211, 0.18)";
  context.fillRect(0, 0, 34, 1);
  context.restore();
  return canvas.toDataURL("image/png");
}

function installThumb(assetId, url) {
  const image = thumbNodes.get(assetId);
  if (!image) return;
  image.addEventListener(
    "load",
    () => {
      image.classList.add("is-loaded");
      cardNodes.get(assetId)?.classList.add("has-thumb");
    },
    { once: true }
  );
  image.src = url;
}

function showNotice(message) {
  archiveNotice.hidden = false;
  archiveNotice.textContent = message;
}

function finishArchive(failures, fatalMessage = "") {
  updateLoader(total, null);
  loaderProgress.setAttribute("aria-valuenow", String(total));
  if (fatalMessage) {
    showNotice(fatalMessage);
  } else if (failures > 0) {
    showNotice(
      `${failures} 件物体的实时缩略图不可用，已使用备用像素图。其余 ${total - failures} 件由共享渲染器生成。`
    );
  }
  flagAction(true);
  window.requestAnimationFrame(() => {
    loader.classList.add("is-done");
    window.setTimeout(() => {
      loader.hidden = true;
    }, 620);
  });
}

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

async function generateThumbnails() {
  let studio = null;
  let failures = 0;
  try {
    studio = createThumbnailStudio();
  } catch (error) {
    console.warn("[catalog] thumbnail renderer unavailable", error);
    for (let index = 0; index < ASSETS.length; index += 1) {
      const asset = ASSETS[index];
      installThumb(asset.id, fallbackThumb(asset));
      updateLoader(index + 1, asset);
      if (index % 8 === 7) await nextFrame();
    }
    finishArchive(
      total,
      "WebGL 缩略图渲染器不可用，图鉴已切换到备用像素图；卡片与详情仍可浏览。"
    );
    return;
  }

  for (let index = 0; index < ASSETS.length; index += 1) {
    const asset = ASSETS[index];
    let url = "";
    try {
      url = studio.renderAsset(asset, seedFor(asset));
    } catch (error) {
      failures += 1;
      console.warn(`[catalog] failed to render ${asset.id}`, error);
      url = fallbackThumb(asset);
    }
    installThumb(asset.id, url);
    updateLoader(index + 1, asset);
    if (index % 2 === 1) await nextFrame();
  }

  studio.dispose();
  finishArchive(failures);
}

function populateInspector(asset) {
  const group = groupById.get(asset.group);
  const family = familyById.get(asset.family);
  const accent = accentFor(asset);
  const index = assetIndex.get(asset.id);

  inspectorPanel.style.setProperty("--accent", accent);
  inspectorSwatch.style.background = accent;
  inspectorSwatch.style.boxShadow = `0 0 12px ${accent}`;
  inspectorGroup.textContent = `${group.en} / ${group.name}`;
  inspectorNumber.textContent = `NO. ${pad(index)} / ${pad(total)} · ${asset.group.toUpperCase()}`;
  inspectorTitle.textContent = asset.name;
  inspectorEn.textContent = asset.en;
  inspectorDesc.textContent = asset.description;
  stageCode.textContent = `NO. ${pad(index)}`;

  if (family) {
    inspectorFamily.hidden = false;
    inspectorFamily.textContent = `${family.name} / ${family.en} — ${family.description}`;
  } else {
    inspectorFamily.hidden = true;
    inspectorFamily.textContent = "";
  }

  inspectorFacts.replaceChildren();
  for (const fact of asset.facts) {
    const item = element("div");
    item.append(element("dt", "", fact.label), element("dd", "", fact.value));
    inspectorFacts.append(item);
  }

  inspectorTags.replaceChildren();
  for (const tag of asset.tags) {
    inspectorTags.append(element("span", "", `# ${tag}`));
  }

  const thumb = thumbNodes.get(asset.id);
  if (thumb?.src) {
    stageFallback.src = thumb.src;
    stageFallback.alt = `${asset.name} 静态缩略图`;
  }

  stageHint.textContent = prefersReducedMotion()
    ? "拖动旋转 · 滚轮缩放 · 自动环绕已关闭"
    : "拖动旋转 · 滚轮缩放 · 自动环绕";
}

function showStageFallback(asset) {
  inspectorCanvas.hidden = true;
  stageFallback.hidden = false;
  stageHint.hidden = true;
  stageNote.hidden = false;
  if (!stageFallback.src) stageFallback.src = fallbackThumb(asset);
}

function openInspector(asset, trigger) {
  if (!asset) return;
  lastFocus = trigger ?? document.activeElement;
  populateInspector(asset);
  inspector.hidden = false;
  inspector.setAttribute("aria-hidden", "false");
  inspectorPanel.scrollTop = 0;
  inspectorInfo.scrollTop = 0;
  document.body.classList.add("inspector-open");
  window.requestAnimationFrame(() => inspector.classList.add("is-open"));

  if (!inspectorUnavailable) {
    if (!inspectorStage) {
      try {
        inspectorStage = createInspectorStage(inspectorStageElement, inspectorCanvas);
      } catch (error) {
        inspectorUnavailable = true;
        console.warn("[catalog] inspector renderer unavailable", error);
      }
    }
    if (inspectorStage) {
      try {
        inspectorStage.show(asset, seedFor(asset));
        inspectorCanvas.hidden = false;
        stageFallback.hidden = true;
        stageHint.hidden = false;
        stageNote.hidden = true;
      } catch (error) {
        console.warn(`[catalog] inspector failed for ${asset.id}`, error);
        showStageFallback(asset);
      }
    } else {
      showStageFallback(asset);
    }
  } else {
    showStageFallback(asset);
  }

  document.addEventListener("keydown", handleModalKeydown);
  window.clearTimeout(focusTimer);
  focusTimer = window.setTimeout(() => closeButton.focus({ preventScroll: true }), 30);
}

function closeInspector() {
  if (inspector.hidden) return;
  inspector.classList.remove("is-open");
  inspector.setAttribute("aria-hidden", "true");
  document.body.classList.remove("inspector-open");
  document.removeEventListener("keydown", handleModalKeydown);
  inspectorStage?.hide();
  window.clearTimeout(focusTimer);
  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    if (!inspector.classList.contains("is-open")) inspector.hidden = true;
  }, prefersReducedMotion() ? 0 : 240);
  if (lastFocus && typeof lastFocus.focus === "function") {
    lastFocus.focus({ preventScroll: true });
  }
}

function handleModalKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeInspector();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = inspectorPanel.querySelectorAll(
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

function wireInspector() {
  inspector.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("[data-close]")) {
      closeInspector();
    }
  });
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) inspectorStage?.dispose();
  });
}

function bootstrap() {
  updateStaticCounts();
  buildHeroCategories();
  buildLoaderGroups();
  buildFilterChips();
  buildSections();
  applyFilter("all");
  wireInspector();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(generateThumbnails);
  });
}

bootstrap();
