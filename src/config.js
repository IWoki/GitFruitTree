// Anchor date used to turn a calendar date into a permanent slot number.
// Never change this once you've started growing a tree - it would reshuffle
// every existing leaf position.
export const ANCHOR_DATE = "2020-01-01T00:00:00Z";

// GitHub's contributionLevel is how green a day's square is *relative to
// your own activity* (the same value the calendar itself uses to shade
// squares) - not an absolute commit count. This is what decides the stage,
// exactly like the contribution-eating snake does it.
const LEVEL_TO_STAGE = {
  NONE: 0,
  FIRST_QUARTILE: 1, // bud
  SECOND_QUARTILE: 2, // leaf
  THIRD_QUARTILE: 3, // flower
  FOURTH_QUARTILE: 4, // peach
};
const LEVEL_RANK = Object.keys(LEVEL_TO_STAGE); // index = rank, higher = greener

export function stageForLevel(level) {
  return LEVEL_TO_STAGE[level] ?? 0;
}

// Used to resolve same-slot collisions (see generateSvg.js) - higher rank wins.
export function levelRank(level) {
  const i = LEVEL_RANK.indexOf(level);
  return i === -1 ? 0 : i;
}

// Season is based on the CURRENT calendar date (when the SVG is generated),
// not on the date the commit was made. Northern hemisphere by default -
// swap the month ranges below for the southern hemisphere.
export function seasonForDate(date) {
  const m = date.getUTCMonth() + 1; // 1-12
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

export const SEASON_COLORS = {
  spring: { leaf: "#97C459", petal: "#F4C0D1", pollen: "#FAC775" },
  summer: { leaf: "#3B6D11", petal: "#F0997B", pollen: "#FAC775" },
  autumn: { leaf: "#EF9F27", petal: "#F0997B", pollen: "#BA7517" },
  winter: { leaf: "#B5D4F4", petal: "#F4C0D1", pollen: "#E6F1FB" },
};

// Fallback for icons that don't use the {{COLOR}}/{{PETAL}}/{{POLLEN}}
// tokens (e.g. a multi-color icon dropped in as-is) - approximates the
// season as a CSS filter over the whole icon instead of an exact recolor.
// Tuned assuming the icon's authored colors are natural spring/summer
// greens - adjust if yours lean toward a different baseline hue.
export const SEASON_FILTERS = {
  spring: "none",
  summer: "saturate(1.25) brightness(0.88)",
  autumn: "hue-rotate(-70deg) saturate(1.35)",
  winter: "saturate(0.3) brightness(1.3) hue-rotate(150deg)",
};

// Displayed size (in trunk.svg's user units) of each stage's asset before
// the random per-spot size jitter is applied (see generateSvg.js). Leaves
// and peaches read bigger than buds/flowers by design.
export const STAGE_SIZE = { 1: 9, 2: 18, 3: 14, 4: 21 };

// Where on the icon's own viewBox (0,0 = top-left, 1,1 = bottom-right) it
// "attaches" to the branch - rotation and the branch-point position both
// pivot around this, not the icon's center, so it reads as hanging off a
// twig instead of floating centered on the line. Tune per icon if yours
// has its stem somewhere else.
export const STAGE_ATTACH = {
  1: { x: 0, y: 1 }, // bud - bottom-left
  2: { x: 0, y: 1 }, // leaf - bottom-left
  3: { x: 0.5, y: 1 }, // flower - bottom-center
  4: { x: 0.5, y: 1 }, // peach - bottom-center
};
