import { readFileSync } from "node:fs";
import { stageForCount, seasonForDate, SEASON_COLORS, STAGE_SIZE } from "./config.js";
import { slotForDate, positionForSlot } from "./positions.js";

const ASSET_NAMES = { 1: "bud", 2: "leaf", 3: "flower", 4: "peach" };

function loadAsset(name) {
  const raw = readFileSync(new URL(`../assets/${name}.svg`, import.meta.url), "utf8");
  const innerMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!innerMatch) throw new Error(`${name}.svg: couldn't find an <svg>...</svg> body`);

  // Read the asset's own viewBox instead of assuming a fixed size - source
  // icons (e.g. from svgrepo.com) are commonly 512x512 or similar, not the
  // 20x20 the built-in placeholder circles used.
  const viewBoxMatch = raw.match(/viewBox="[\s]*[\d.\-]+[\s,]+[\d.\-]+[\s,]+([\d.\-]+)[\s,]+([\d.\-]+)/);
  if (!viewBoxMatch) throw new Error(`${name}.svg: missing viewBox attribute`);

  return {
    inner: innerMatch[1],
    nativeWidth: parseFloat(viewBoxMatch[1]),
    nativeHeight: parseFloat(viewBoxMatch[2]),
  };
}

// Assets don't change at runtime, load them once.
const assets = Object.fromEntries(
  Object.values(ASSET_NAMES).map((name) => [name, loadAsset(name)])
);

function drawSpot(x, y, stage, colors) {
  if (stage === 0) return "";
  const name = ASSET_NAMES[stage];
  const asset = assets[name];
  const size = STAGE_SIZE[stage];
  // Scale from the asset's OWN native size, not a hardcoded assumption -
  // this is what was broken before.
  const scale = size / Math.max(asset.nativeWidth, asset.nativeHeight);
  const inner = asset.inner
    .replaceAll("{{COLOR}}", colors.leaf)
    .replaceAll("{{PETAL}}", colors.petal)
    .replaceAll("{{POLLEN}}", colors.pollen);
  const tx = x - (asset.nativeWidth * scale) / 2;
  const ty = y - (asset.nativeHeight * scale) / 2;
  return `<g transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${scale.toFixed(4)})">${inner}</g>`;
}

// cache: { [date]: count } accumulated across runs (see index.js)
export function generateSvg({ trunkSvg, cache, now = new Date() }) {
  const colors = SEASON_COLORS[seasonForDate(now)];

  // Collapse same-slot dates (dates exactly anchors.length apart) by keeping
  // the highest contribution count seen for that slot, so repeat years
  // reinforce a spot instead of overwriting it with a lower value.
  const bySlot = new Map();
  for (const [date, count] of Object.entries(cache)) {
    const slot = slotForDate(date);
    const prev = bySlot.get(slot);
    if (!prev || count > prev) bySlot.set(slot, count);
  }

  let canopyMarkup = "";
  for (const [slot, count] of bySlot.entries()) {
    const { x, y } = positionForSlot(slot);
    canopyMarkup += drawSpot(x, y, stageForCount(count), colors);
  }

  return trunkSvg.replace("<!--CANOPY-->", canopyMarkup);
}
