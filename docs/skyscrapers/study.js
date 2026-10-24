// Skyscraper study harness (read-only): renders catalog skyscraper models with
// the exact thumbnail studio used by the object archive, into a contact sheet.
import { SKYSCRAPERS } from "../../src/object-catalog.js";
import { createThumbnailStudio } from "../../src/showcase-studio.js";

const params = new URLSearchParams(location.search);
const only = (params.get("ids") || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const width = Math.max(180, Number(params.get("w")) || 360);
const height = Math.max(240, Number(params.get("h")) || 480);
const seed = params.get("seed") || "catalog";

const assets = only.length
  ? SKYSCRAPERS.filter((asset) => only.includes(asset.id))
  : SKYSCRAPERS;

const root = document.getElementById("sheet");
const status = document.getElementById("status");
root.style.setProperty("--thumb-w", `${width}px`);
root.style.setProperty("--thumb-h", `${height}px`);

let studio = null;
let done = 0;

function disposeStudio() {
  if (!studio) return;
  studio.dispose();
  studio = null;
}

function renderAll() {
  disposeStudio();
  studio = createThumbnailStudio({ width, height });
  for (const asset of assets) {
    const cell = document.createElement("figure");
    cell.className = "cell";
    cell.dataset.id = asset.id;
    cell.dataset.style = asset.model.style || "";

    const frame = document.createElement("div");
    frame.className = "frame";
    const image = document.createElement("img");
    image.width = width;
    image.height = height;
    image.alt = asset.name;
    frame.append(image);

    const caption = document.createElement("figcaption");
    const name = document.createElement("b");
    name.textContent = asset.name;
    const en = document.createElement("span");
    en.textContent = `${asset.en} · ${asset.id.replace(/^s-/, "")}`;
    const meta = document.createElement("small");
    const facts = asset.facts.map((fact) => `${fact.label} ${fact.value}`).join(" · ");
    meta.textContent = facts;
    caption.append(name, en, meta);
    cell.append(frame, caption);
    root.append(cell);

    try {
      image.src = studio.renderAsset(asset, seed);
      done += 1;
    } catch (error) {
      console.error(`render failed: ${asset.id}`, error);
      cell.classList.add("failed");
    }
  }
  status.textContent = `${done}/${assets.length} rendered · seed=${seed} · ${width}×${height}`;
  window.__STUDY_READY__ = true;
  document.body.dataset.ready = "1";
}

renderAll();
window.addEventListener("resize", () => {
  // Studio size is fixed; nothing to relayout.
});
