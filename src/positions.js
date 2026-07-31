import { readFileSync } from "node:fs";
import { ANCHOR_DATE } from "./config.js";

const anchors = JSON.parse(
  readFileSync(new URL("./anchors.json", import.meta.url), "utf8")
);

const anchor = new Date(ANCHOR_DATE);

// Same date always returns the same slot, forever - this is what makes a
// leaf "stay where it grew" instead of drifting as time passes. Slot count
// is however many anchor points extract-anchors.py found on the branches,
// so this automatically adapts if you regenerate anchors.json for new art.
export function slotForDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const days = Math.round((d - anchor) / 86400000);
  return ((days % anchors.length) + anchors.length) % anchors.length;
}

export function positionForSlot(slot) {
  return anchors[slot];
}
