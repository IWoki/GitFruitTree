import { readFileSync } from "node:fs";
import { stageForLevel, levelRank, seasonForDate, SEASON_COLORS, SEASON_FILTERS, STAGE_SIZE } from "./config.js";
import { slotForDate, positionForSlot } from "./positions.js";

const ASSET_NAMES = { 1: "bud", 2: "leaf", 3: "flower", 4: "peach" };
const PLACEHOLDER_RE = /\{\{(COLOR|PETAL|POLLEN)\}\}/;

function loadAsset(name) {
  const raw = readFileSync(new URL(`../assets/${name}.svg`, import.meta.url), "utf8");

  const openTagMatch = raw.match(/<svg\b[^>]*>/);
  const innerMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!openTagMatch || !innerMatch) throw new Error(`${name}.svg: couldn't find an <svg>...</svg> body`);

  const viewBoxMatch = raw.match(/viewBox="[\s]*[\d.\-]+[\s,]+[\d.\-]+[\s,]+([\d.\-]+)[\s,]+([\d.\-]+)/);
  if (!viewBoxMatch) throw new Error(`${name}.svg: missing viewBox attribute`);

  // Some icons (e.g. single-color ones exported from svgrepo.com) only
  // declare fill/stroke on the root <svg> tag, not on individual paths.
  // We discard that root tag when extracting the inner markup, so without
  // this the color is lost entirely and paths fall back to SVG's default
  // black. Re-apply whatever the root tag declared as a wrapping <g>.
  const openTag = openTagMatch[0];
  const fillMatch = openTag.match(/\bfill="([^"]*)"/);
  const strokeMatch = openTag.match(/\bstroke="([^"]*)"/);
  const rootAttrs = [
    fillMatch && `fill="${fillMatch[1]}"`,
    strokeMatch && `stroke="${strokeMatch[1]}"`,
  ].filter(Boolean).join(" ");

  const inner = rootAttrs ? `<g ${rootAttrs}>${innerMatch[1]}</g>` : innerMatch[1];

  return {
    inner,
    nativeWidth: parseFloat(viewBoxMatch[1]),
    nativeHeight: parseFloat(viewBoxMatch[2]),
    hasPlaceholder: PLACEHOLDER_RE.test(raw),
  };
}

// Assets don't change at runtime, load them once.
const assets = Object.fromEntries(
  Object.values(ASSET_NAMES).map((name) => [name, loadAsset(name)])
);

// Deterministic PRNG seeded by slot number, so a given day's rotation /
// mirror / size jitter is stable across every regeneration - it looks
// random across the canopy but never "flickers" between runs.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawSpot(slot, x, y, stage, colors, seasonFilter) {
  if (stage === 0) return "";
  const name = ASSET_NAMES[stage];
  const asset = assets[name];
  const rand = mulberry32(slot * 4001 + stage); // stage folded in so bud/leaf/etc at the same slot don't share one look across a day that changed stage over time

  // Small tilt, not a full spin - a flipped-upside-down peach reads as
  // broken rather than "natural variation", so keep rotation modest.
  const angle = -28 + rand() * 56;
  const mirror = rand() < 0.5 ? -1 : 1;
  const sizeJitter = 0.82 + rand() * 0.4; // 0.82x - 1.22x

  const size = STAGE_SIZE[stage] * sizeJitter;
  const scale = size / Math.max(asset.nativeWidth, asset.nativeHeight);

  let inner;
  if (asset.hasPlaceholder) {
    // Exact recolor - the asset was authored with our tokens.
    inner = asset.inner
      .replaceAll("{{COLOR}}", colors.leaf)
      .replaceAll("{{PETAL}}", colors.petal)
      .replaceAll("{{POLLEN}}", colors.pollen);
  } else if (seasonFilter && (stage === 2 || stage === 3)) {
    // No tokens to recolor (e.g. a multi-color icon downloaded as-is) -
    // approximate the season with a CSS filter over the whole icon instead.
    // Only leaves/flowers shift with the season by design; buds and peaches
    // stay as authored, same as the token path.
    inner = `<g style="filter:${seasonFilter}">${asset.inner}</g>`;
  } else {
    inner = asset.inner;
  }

  const transform = [
    `translate(${x.toFixed(1)},${y.toFixed(1)})`,
    `rotate(${angle.toFixed(1)})`,
    `scale(${mirror},1)`,
    `scale(${scale.toFixed(4)})`,
    `translate(${(-asset.nativeWidth / 2).toFixed(1)},${(-asset.nativeHeight / 2).toFixed(1)})`,
  ].join(" ");

  return `<g transform="${transform}">${inner}</g>`;
}

// cache: { [date]: { count, level } } accumulated across runs (see index.js)
export function generateSvg({ trunkSvg, cache, now = new Date() }) {
  const season = seasonForDate(now);
  const colors = SEASON_COLORS[season];
  const seasonFilter = SEASON_FILTERS[season];

  // Collapse same-slot dates (dates exactly anchors.length apart) by keeping
  // the greenest level seen for that slot, so repeat years reinforce a spot
  // instead of overwriting it with a lower value.
  const bySlot = new Map();
  for (const [date, entry] of Object.entries(cache)) {
    const slot = slotForDate(date);
    const prev = bySlot.get(slot);
    if (!prev || levelRank(entry.level) > levelRank(prev.level)) bySlot.set(slot, entry);
  }

  let canopyMarkup = "";
  for (const [slot, entry] of bySlot.entries()) {
    const { x, y } = positionForSlot(slot);
    canopyMarkup += drawSpot(slot, x, y, stageForLevel(entry.level), colors, seasonFilter);
  }

  return trunkSvg.replace("<!--CANOPY-->", canopyMarkup);
}
