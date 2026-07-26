import { readFileSync } from "node:fs";
import { stageForLevel, levelRank, seasonForDate, SEASON_COLORS, FLOWER_COLOR, SEASON_FILTERS, STAGE_SIZE, STAGE_ATTACH } from "./config.js";
import { slotForDate, positionForSlot } from "./positions.js";
import { generateBackgroundLayer, generateGroundLayer, generateBarkLayer, sharedDefs } from "./decor.js";

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
// mirror / size / animation timing is stable across every regeneration -
// it looks random across the canopy but never "flickers" between runs.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Only the leaf sways - flowers and peaches stay still, per request.
const SWAY_DEGREES = { 2: 9 };

function recolor(asset, stage, colors) {
  if (!asset.hasPlaceholder) return asset.inner;
  // Flowers don't shift with the season - always FLOWER_COLOR, regardless
  // of what colors (this render's season palette) says.
  const petalSource = stage === 3 ? FLOWER_COLOR : colors;
  return asset.inner
    .replaceAll("{{COLOR}}", colors.leaf)
    .replaceAll("{{PETAL}}", petalSource.petal)
    .replaceAll("{{POLLEN}}", petalSource.pollen);
}

function fallingPetal(x, y, petalColor, rand) {
  const dur = (4.5 + rand() * 3).toFixed(2);
  const begin = (rand() * 6).toFixed(2);
  const driftX = (rand() * 16 - 4).toFixed(1);
  const dropY = (70 + rand() * 40).toFixed(0);
  const path = `M0,0 q${(driftX * 0.4).toFixed(1)},${(dropY * 0.5)} ${driftX},${dropY}`;
  return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
<g>
<animateMotion path="${path}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
<animate attributeName="opacity" values="1;1;0" keyTimes="0;0.6;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
<g>
<animateTransform attributeName="transform" type="rotate" from="0" to="180" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
<g>
<animateTransform attributeName="transform" type="scale" values="1;0.3" keyTimes="0;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
<ellipse rx="2.4" ry="3.4" fill="${petalColor}"/>
</g>
</g>
</g>
</g>`;
}

function buildSpots(cache) {
  const bySlot = new Map();
  for (const [date, entry] of Object.entries(cache)) {
    const slot = slotForDate(date);
    const prev = bySlot.get(slot);
    if (!prev || levelRank(entry.level) > levelRank(prev.level)) bySlot.set(slot, entry);
  }

  const spots = [];
  for (const [slot, entry] of bySlot.entries()) {
    const stage = stageForLevel(entry.level);
    if (stage === 0) continue;
    const anchor = positionForSlot(slot);
    const rand = mulberry32(slot * 4001 + stage);

    const angle = -28 + rand() * 56;
    const mirror = rand() < 0.5 ? -1 : 1;
    const sizeJitter = 0.82 + rand() * 0.4;
    const size = STAGE_SIZE[stage] * sizeJitter;

    // Small organic jitter only - the attachment point (see drawSpot)
    // already does the work of making this look attached to the branch,
    // so this is just a couple of px of natural variation, not a "hang".
    const jitterX = (rand() - 0.5) * 3;
    const jitterY = (rand() - 0.5) * 3;

    // x/y is the branch attachment point, not the icon's visual center -
    // relax() needs to know where the icon's mass actually sits (offset
    // by attach point, then mirrored and rotated the same as drawSpot
    // does) or it collides on the wrong point entirely.
    const attach = STAGE_ATTACH[stage];
    const dx0 = size * (0.5 - attach.x);
    const dy0 = size * (0.5 - attach.y);
    const mx = mirror * dx0;
    const rad = (angle * Math.PI) / 180;
    const centerDX = mx * Math.cos(rad) - dy0 * Math.sin(rad);
    const centerDY = mx * Math.sin(rad) + dy0 * Math.cos(rad);

    spots.push({
      slot,
      stage,
      x: anchor.x + jitterX,
      y: anchor.y + jitterY,
      centerDX,
      centerDY,
      radius: size / 2,
      angle,
      mirror,
      size,
      rand, // keep drawing from the same stream for animation timing below
    });
  }
  return spots;
}

// Nudges apart the worst overlaps based on each spot's *actual* rendered
// footprint (its visual center, not the branch attach point - see
// centerDX/centerDY above) and radius, so it's the big peaches/leaves
// that get spread out - small buds barely move. Deliberately not fully
// overlap-free: a little overlap still reads as "a full canopy" rather
// than evenly-spaced dots.
function relax(spots) {
  for (let iter = 0; iter < 3; iter++) {
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        const a = spots[i], b = spots[j];
        const ax = a.x + a.centerDX, ay = a.y + a.centerDY;
        const bx = b.x + b.centerDX, by = b.y + b.centerDY;
        const dx = bx - ax, dy = by - ay;
        const dist = Math.hypot(dx, dy) || 0.01;
        const minDist = (a.radius + b.radius) * 0.82;
        if (dist < minDist) {
          const push = (minDist - dist) / 2;
          const ux = dx / dist, uy = dy / dist;
          // Push the anchor point by the same delta as the visual center -
          // it's a rigid translation, so the offset between them is unaffected.
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
        }
      }
    }
  }
}

function drawSpot(spot, colors, seasonFilter) {
  const { stage, x, y, angle, mirror, size, rand } = spot;
  const name = ASSET_NAMES[stage];
  const asset = assets[name];
  const scale = size / Math.max(asset.nativeWidth, asset.nativeHeight);
  const attach = STAGE_ATTACH[stage];

  let inner = recolor(asset, stage, colors);
  // Fallback CSS filter for icons without placeholders only applies to
  // leaves - flowers stay their authored/fixed color regardless of season.
  if (!asset.hasPlaceholder && seasonFilter && seasonFilter !== "none" && stage === 2) {
    inner = `<g style="filter:${seasonFilter}">${inner}</g>`;
  }

  // Rotate/scale/mirror pivot on the attachment point, not the icon's
  // center - translate the icon so that point sits at the local origin
  // *before* anything else happens to it.
  const innerTransform = [
    `rotate(${angle.toFixed(1)})`,
    `scale(${mirror},1)`,
    `scale(${scale.toFixed(4)})`,
    `translate(${(-asset.nativeWidth * attach.x).toFixed(1)},${(-asset.nativeHeight * attach.y).toFixed(1)})`,
  ].join(" ");

  const swayDeg = SWAY_DEGREES[stage];
  let sway = "";
  if (swayDeg) {
    const swayDur = (2.2 + rand() * 1.4).toFixed(2);
    const swayBegin = (rand() * 2).toFixed(2);
    sway = `<animateTransform attributeName="transform" type="rotate" values="${-swayDeg} ${x.toFixed(1)} ${y.toFixed(1)};${swayDeg} ${x.toFixed(1)} ${y.toFixed(1)};${-swayDeg} ${x.toFixed(1)} ${y.toFixed(1)}" dur="${swayDur}s" begin="${swayBegin}s" repeatCount="indefinite"/>`;
  }

  let markup = `<g>${sway}<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) ${innerTransform}">${inner}</g></g>`;

  // Occasionally shed a petal from flowers - drifts down, rotates, and
  // shrinks instead of just vanishing.
  if (stage === 3 && rand() < 0.3) {
    markup += fallingPetal(x, y + size * 0.3, FLOWER_COLOR.petal, rand);
  }

  return markup;
}

// cache: { [date]: { count, level } } accumulated across runs (see index.js)
export function generateSvg({ trunkSvg, cache, now = new Date() }) {
  const season = seasonForDate(now);
  const colors = SEASON_COLORS[season];
  const seasonFilter = SEASON_FILTERS[season];

  const spots = buildSpots(cache);
  relax(spots);

  const canopyMarkup = spots.map((spot) => drawSpot(spot, colors, seasonFilter)).join("");

  return trunkSvg
    .replace("<!--BACKGROUND-->", sharedDefs() + generateBackgroundLayer(colors))
    .replace("<!--BARK-->", generateBarkLayer())
    .replace("<!--CANOPY-->", canopyMarkup)
    .replace("<!--GROUND-->", generateGroundLayer(colors));
}
