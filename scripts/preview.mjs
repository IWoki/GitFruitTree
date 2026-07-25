// Local, no-token preview: fakes a year of contribution history in the
// exact shape fetchContributions.js/index.js actually use ({count, level}),
// and writes output/preview.svg. Doesn't touch src/index.json or the network.
import { readFileSync, writeFileSync } from "node:fs";
import { generateSvg } from "../src/generateSvg.js";

const LEVELS = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];

function fakeLevel() {
  const roll = Math.random();
  if (roll < 0.35) return "NONE";
  if (roll < 0.6) return "FIRST_QUARTILE";
  if (roll < 0.8) return "SECOND_QUARTILE";
  if (roll < 0.93) return "THIRD_QUARTILE";
  return "FOURTH_QUARTILE";
}

const cache = {};
const start = new Date(Date.now() - 400 * 86400000);
for (let i = 0; i < 400; i++) {
  const date = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
  const level = fakeLevel();
  cache[date] = { count: LEVELS.indexOf(level) * 3, level };
}

const trunkSvg = readFileSync(new URL("../assets/trunk.svg", import.meta.url), "utf8");
const svg = generateSvg({ trunkSvg, cache, now: new Date() });
writeFileSync(new URL("../output/preview.svg", import.meta.url), svg);

console.log(`wrote output/preview.svg from ${Object.keys(cache).length} fake days`);
