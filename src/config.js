// Anchor date used to turn a calendar date into a permanent slot number.
// Never change this once you've started growing a tree - it would reshuffle
// every existing leaf position.
export const ANCHOR_DATE = "2020-01-01T00:00:00Z";

// contributionCount -> growth stage (0 nothing, 1 bud, 2 leaf, 3 flower, 4 peach)
export function stageForCount(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

// Displayed size (in trunk.svg's user units) of each stage's asset, which
// is authored at a native 20x20 viewBox in assets/*.svg.
export const STAGE_SIZE = { 1: 10, 2: 15, 3: 17, 4: 20 };

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
