import { readFileSync, writeFileSync } from "node:fs";
import { fetchContributions } from "./fetchContributions.js";
import { generateSvg } from "./generateSvg.js";
import { loadSymbols } from "./symbols.js";

const LOGIN = process.env.GH_USERNAME;
const TOKEN = process.env.GH_TOKEN;

if (!LOGIN || !TOKEN) {
  console.error("Missing GH_USERNAME or GH_TOKEN env vars");
  process.exit(1);
}

const CACHE_PATH = new URL("./index.json", import.meta.url);
const TRUNK_PATH = new URL("../assets/trunk.svg", import.meta.url);
const ASSETS_DIR = new URL("../assets/", import.meta.url);
const OUTPUT_PATH = new URL("../output/tree.svg", import.meta.url);

async function main() {
  const cache = JSON.parse(readFileSync(CACHE_PATH, "utf8"));

  const days = await fetchContributions({ login: LOGIN, token: TOKEN });
  for (const { date, count } of days) {
    // Only move forward - never let a re-fetch lower a count we already
    // recorded (defensive; GitHub shouldn't send lower numbers, but the
    // whole point of this tree is that it never shrinks).
    if (!(date in cache) || count > cache[date]) cache[date] = count;
  }
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n");

  const trunkSvg = readFileSync(TRUNK_PATH, "utf8");
  const symbols = loadSymbols(ASSETS_DIR);
  const svg = generateSvg({ trunkSvg, cache, now: new Date(), symbols });
  writeFileSync(OUTPUT_PATH, svg);

  console.log(`Wrote ${OUTPUT_PATH.pathname} from ${Object.keys(cache).length} cached days`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
