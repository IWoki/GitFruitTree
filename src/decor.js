import { existsSync, readFileSync } from "node:fs";
import { stripHiddenLayersAndInlineClasses } from "./svgClean.js";

const PLACEHOLDER_RE = /\{\{(COLOR|PETAL|POLLEN)\}\}/;

// Optional user-supplied layers. Neither is required - if the file isn't
// there, that layer is just skipped (empty string), no error. Both are
// expected to be authored directly in trunk.svg's own coordinate space -
// dropped in as-is, no scaling or repositioning.
//
// Colors: if the file uses {{COLOR}}/{{PETAL}}/{{POLLEN}} (same tokens as
// assets/leaf.svg etc) it gets recolored exactly, same mechanism as the
// growth stages. If it doesn't (e.g. a raw multi-color Illustrator export,
// fixed hex colors baked in), the same CSS-filter fallback the leaf uses
// applies instead - approximate, but works without editing the file.
function loadOptional(relPath, colors, seasonFilter) {
  const url = new URL(`../assets/${relPath}`, import.meta.url);
  if (!existsSync(url)) return "";
  const raw = stripHiddenLayersAndInlineClasses(readFileSync(url, "utf8"));
  const innerMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  const inner = innerMatch ? innerMatch[1] : raw;

  if (colors && PLACEHOLDER_RE.test(raw)) {
    return inner
      .replaceAll("{{COLOR}}", colors.leaf)
      .replaceAll("{{PETAL}}", colors.petal)
      .replaceAll("{{POLLEN}}", colors.pollen);
  }
  if (seasonFilter && seasonFilter !== "none") {
    return `<g style="filter:${seasonFilter}">${inner}</g>`;
  }
  return inner;
}

// Wraps a layer in a slow, gentle sway - "blowing in the wind" - rotating
// around a fixed pivot. Not tied to any data, just a bit of life.
function sway(inner, pivotX, pivotY, degrees, duration) {
  return `<g><animateTransform attributeName="transform" type="rotate" values="${-degrees} ${pivotX} ${pivotY};${degrees} ${pivotX} ${pivotY};${-degrees} ${pivotX} ${pivotY}" dur="${duration}s" repeatCount="indefinite"/>${inner}</g>`;
}

// Like sway(), but shears instead of rotating - everything at y=baseY
// stays exactly put, only points further above it drift sideways. A
// single rotation pivot makes a wide shape's base visibly slide sideways
// as it arcs, which looks wrong for something that's supposed to be
// rooted in the ground; a shear keeps the base line still no matter how
// wide the shape is.
function windSkew(inner, baseY, degrees, duration) {
  return `<g transform="translate(0,${baseY})"><animateTransform attributeName="transform" type="skewX" values="${-degrees};${degrees};${-degrees}" dur="${duration}s" repeatCount="indefinite" additive="sum"/><g transform="translate(0,${-baseY})">${inner}</g></g>`;
}

// Behind the trunk (drawn first). Add assets/fone-leafs.svg for a "leaves
// visible through the gaps" backdrop - purely decorative, your art, your
// call on what it looks like. Sways gently around the canvas center.
export function generateBackgroundLayer(colors, seasonFilter, viewBox) {
  const inner = loadOptional("fone-leafs.svg", colors, seasonFilter);
  if (!inner) return "";
  return sway(inner, viewBox.width / 2, viewBox.height / 2, 1, 6);
}

// On top of the trunk (drawn last, after the canopy). Add assets/ground.svg
// for grass/dirt at the base. Shears around its own base line, like real
// grass rooted in the ground - the bottom edge never moves, only the
// blades above it lean side to side.
export function generateGroundLayer(colors, seasonFilter, viewBox) {
  const inner = loadOptional("ground.svg", colors, seasonFilter);
  if (!inner) return "";
  return windSkew(inner, viewBox.height, 3, 3.2);
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
