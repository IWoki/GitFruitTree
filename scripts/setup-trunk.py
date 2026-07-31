"""
Run this whenever you drop a fresh trunk export into assets/trunk.svg.

Handles everything the pipeline needs that a raw design-tool export won't
have on its own:

  1. Strips hidden layers (see clean_layers.py) - safe to run on an
     already-clean file, it's a no-op then.
  2. Wraps the surviving visible content in <g id="trunk-shape"> (used by
     the bark texture's <use> reference).
  3. Inserts the <!--BACKGROUND-->/<!--BARK-->/<!--CANOPY-->/<!--GROUND-->/
     <!--STATS--> markers generateSvg.js fills in - skipped if they're
     already there, so this is safe to re-run.
  4. Extends the canvas height a bit so the stats row has room below the
     art, instead of overlapping it.
  5. Regenerates src/anchors.json for the new shape (calls
     extract-anchors.py's logic directly - no need to run it separately).

Usage:
    pip install cairosvg numpy pillow scipy
    python3 scripts/setup-trunk.py
"""
import re
import runpy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from clean_layers import clean_content  # noqa: E402

TRUNK_SVG = Path("assets/trunk.svg")
STATS_MARGIN_FRACTION = 0.06  # extra canvas height reserved for the stats row


def has_markers(content):
    return "<!--CANOPY-->" in content and 'id="trunk-shape"' in content


def inject_markers(content):
    vb = re.search(r'viewBox="[\s]*[\d.\-]+[\s,]+[\d.\-]+[\s,]+([\d.\-]+)[\s,]+([\d.\-]+)"?', content)
    if not vb:
        raise ValueError("trunk.svg: couldn't find a viewBox to read the canvas size from")
    width, height = float(vb.group(1)), float(vb.group(2))
    new_height = height * (1 + STATS_MARGIN_FRACTION)

    content = re.sub(
        r'viewBox="[\s]*[\d.\-]+[\s,]+[\d.\-]+[\s,]+[\d.\-]+[\s,]+[\d.\-]+"?',
        f'viewBox="0 0 {width:g} {new_height:g}"',
        content,
        count=1,
    )
    # also nudge width/height attributes if present (cosmetic, doesn't affect rendering)
    content = re.sub(r'height="[\d.]+(pt)?"', f'height="{new_height:g}"', content, count=1)

    # the first top-level <g id="..."> is assumed to be the (now single,
    # post-cleaning) visible layer - that's the trunk shape itself
    first_group = re.search(r'<g id="[^"]*"[^>]*>', content)
    if not first_group:
        raise ValueError("trunk.svg: no <g id=\"...\"> layer group found to mark as the trunk shape")

    content = (
        content[: first_group.start()]
        + "<!--BACKGROUND-->\n<g id=\"trunk-shape\">"
        + content[first_group.end():]
    )
    content = content.replace(
        "</svg>",
        "<!--BARK-->\n<g id=\"canopy\"><!--CANOPY--></g>\n<!--GROUND-->\n<!--STATS-->\n</svg>",
    )
    return content


def main():
    if not TRUNK_SVG.exists():
        print(f"{TRUNK_SVG} doesn't exist - nothing to set up")
        sys.exit(1)

    content = TRUNK_SVG.read_text(encoding="utf-8")

    if has_markers(content):
        print("trunk.svg already has the pipeline markers - skipping cleanup/injection, just re-extracting anchors")
    else:
        content = clean_content(content)
        content = inject_markers(content)
        TRUNK_SVG.write_text(content, encoding="utf-8")
        print("cleaned layers, added trunk-shape id, inserted markers, extended canvas")

    runpy.run_path(str(Path(__file__).parent / "extract-anchors.py"), run_name="__main__")


if __name__ == "__main__":
    main()
