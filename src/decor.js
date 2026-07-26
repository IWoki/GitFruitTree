import { existsSync, readFileSync } from "node:fs";

const PLACEHOLDER_RE = /\{\{(COLOR|PETAL|POLLEN)\}\}/;

// Optional user-supplied layers. Neither is required - if the file isn't
// there, that layer is just skipped (empty string), no error. Both are
// expected to be authored directly in trunk.svg's own coordinate space
// (viewBox 0 0 720 736) - dropped in as-is, no scaling or repositioning.
//
// If the file uses {{COLOR}}/{{PETAL}}/{{POLLEN}} (same tokens as
// assets/leaf.svg etc, see generateSvg.js) it gets recolored by season too
// - same mechanism, so e.g. grass can shift with the seasons if you want
// that. No tokens = drawn as authored, season has no effect on it.
function loadOptional(relPath, colors) {
  const url = new URL(`../assets/${relPath}`, import.meta.url);
  if (!existsSync(url)) return "";
  const raw = readFileSync(url, "utf8");
  const innerMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  const inner = innerMatch ? innerMatch[1] : raw;
  if (!colors || !PLACEHOLDER_RE.test(raw)) return inner;
  return inner
    .replaceAll("{{COLOR}}", colors.leaf)
    .replaceAll("{{PETAL}}", colors.petal)
    .replaceAll("{{POLLEN}}", colors.pollen);
}

// Behind the trunk (drawn first). Add assets/fone-leafs.svg for a "leaves
// visible through the gaps" backdrop - purely decorative, your art, your
// call on what it looks like.
export function generateBackgroundLayer(colors) {
  return loadOptional("fone-leafs.svg", colors);
}

// On top of the trunk (drawn last, after the canopy). Add assets/ground.svg
// for grass/dirt at the base.
export function generateGroundLayer(colors) {
  return loadOptional("ground.svg", colors);
}

// A textured copy of the trunk silhouette, composited to only show inside
// the trunk's own shape and blended on top - bark grain without a mask
// image. Independent of the two layers above.
export function generateBarkLayer() {
  return `<g style="mix-blend-mode:overlay" opacity="0.55"><use href="#trunk-shape" filter="url(#bark-tex)"/></g>`;
}

export function sharedDefs() {
  return `<defs>
<filter id="bark-tex" x="-20%" y="-20%" width="140%" height="140%">
<feTurbulence type="fractalNoise" baseFrequency="0.85 0.05" numOctaves="2" seed="7" result="noise"/>
<feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0" result="whiteNoise"/>
<feComposite in="whiteNoise" in2="SourceGraphic" operator="in"/>
</filter>
</defs>`;
}
