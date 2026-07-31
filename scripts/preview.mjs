// Local, no-token preview: fakes a year of contribution history in the
// exact shape fetchContributions.js/index.js actually use ({count, level}),
// and writes output/preview.svg. Doesn't touch src/index.json or the network.
//
// Usage:
//   node scripts/preview.mjs                force a random cache, use today's real season
//   node scripts/preview.mjs winter          force a random cache, pretend it's winter
//   node scripts/preview.mjs 2026-12-25      force a random cache, use this exact date
import { readFileSync, writeFileSync } from "node:fs";
import { generateSvg } from "../src/generateSvg.js";

const LEVELS = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];

const SEASON_SAMPLE_DATES = {
  spring: "2026-04-15",
  summer: "2026-07-15",
  autumn: "2026-10-15",
  winter: "2026-01-15",
};

function resolveNow(arg) {
  if (!arg) return new Date();
  if (SEASON_SAMPLE_DATES[arg]) return new Date(SEASON_SAMPLE_DATES[arg]);
  const asDate = new Date(arg);
  if (!isNaN(asDate)) return asDate;
  console.error(`Didn't recognize "${arg}" - use spring/summer/autumn/winter or a YYYY-MM-DD date. Falling back to today.`);
  return new Date();
}

function fakeLevel() {
  const roll = Math.random();
  if (roll < 0.35) return "NONE";
  if (roll < 0.6) return "FIRST_QUARTILE";
  if (roll < 0.8) return "SECOND_QUARTILE";
  if (roll < 0.93) return "THIRD_QUARTILE";
  return "FOURTH_QUARTILE";
}

const now = resolveNow(process.argv[2]);

const cache = {};
const start = new Date(now.getTime() - 400 * 86400000);
for (let i = 0; i < 400; i++) {
  const date = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
  const level = fakeLevel();
  cache[date] = { count: LEVELS.indexOf(level) * 3, level };
}

const trunkSvg = readFileSync(new URL("../assets/trunk.svg", import.meta.url), "utf8");
const svg = generateSvg({ trunkSvg, cache, now });
writeFileSync(new URL("../output/preview.svg", import.meta.url), svg);

console.log(`wrote output/preview.svg (season: as of ${now.toISOString().slice(0, 10)}) from ${Object.keys(cache).length} fake days`);
