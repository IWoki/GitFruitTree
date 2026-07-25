import { existsSync, readFileSync } from "node:fs";

// Optional user-supplied layers. Neither is required - if the file isn't
// there, that layer is just skipped (empty string), no error. Both are
// expected to be authored directly in trunk.svg's own coordinate space
// (viewBox 0 0 720 736) - dropped in as-is, no scaling or repositioning.
function loadOptional(relPath) {
  const url = new URL(`../assets/${relPath}`, import.meta.url);
  if (!existsSync(url)) return "";
  const raw = readFileSync(url, "utf8");
  const innerMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  return innerMatch ? innerMatch[1] : raw;
}

// Behind the trunk (drawn first). Add assets/fone-leafs.svg for a "leaves
// visible through the gaps" backdrop - purely decorative, your art, your
// call on what it looks like.
export function generateBackgroundLayer() {
  return loadOptional("fone-leafs.svg");
}

// On top of the trunk (drawn last, after the canopy). Add assets/ground.svg
// for grass/dirt at the base.
export function generateGroundLayer() {
  return loadOptional("ground.svg");
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
