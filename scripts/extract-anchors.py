"""
Regenerates src/anchors.json from assets/trunk.svg.

Rasterizes the trunk art, then uses a distance transform to tell thin
branches apart from the thick trunk: any pixel more than TRUNK_CORE_RADIUS
away from the nearest background pixel is "deep inside" something thick
(the trunk, or where branches fork right off it). That whole region is
grown by EXTRA_MARGIN (so a rotated, max-size icon anchored just outside
the trunk still can't clip it with a corner) and excluded. Y_MAX drops
anything below the canopy entirely - thin surface roots at the base of a
tree are "thin" too, so the thickness check alone won't catch them.
What's left is greedily sampled so points are at least MIN_DIST apart.

This is a one-off dev step: run it again only when you replace
assets/trunk.svg with new art.

    pip install cairosvg numpy pillow scipy
    python3 scripts/extract-anchors.py
"""
import json
import random

import cairosvg
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt

TRUNK_SVG = "assets/trunk.svg"
OUT_PATH = "src/anchors.json"

# Raster at the same size as the SVG's viewBox so pixel coords map 1:1
# onto SVG user units. Update these if you change assets/trunk.svg's viewBox.
WIDTH, HEIGHT = 720, 736

# How thick (in px) a region needs to be, at minimum, to count as "trunk"
# rather than "branch". Raise it if real branch pixels are getting excluded;
# lower it if trunk pixels are still getting anchors.
TRUNK_CORE_RADIUS = 11

# Extra buffer around the trunk zone so a rotated icon at max size jitter
# (see STAGE_SIZE / sizeJitter in generateSvg.js) can't clip it with a
# corner even when anchored right at the edge.
EXTRA_MARGIN = 19

# Rows below this are excluded outright - surface roots at the base are
# thin lines too, so TRUNK_CORE_RADIUS alone won't catch them. Print row
# widths (see the loop at the bottom, uncomment to use) if your art has a
# differently-shaped base and this needs adjusting.
Y_MAX = 680

MIN_DIST = 13


def main():
    cairosvg.svg2png(url=TRUNK_SVG, write_to="/tmp/_trunk_raster.png", output_width=WIDTH, output_height=HEIGHT)
    arr = np.array(Image.open("/tmp/_trunk_raster.png").convert("RGBA"))
    mask = arr[:, :, 3] > 100

    dist = distance_transform_edt(mask)
    trunk_core = dist > TRUNK_CORE_RADIUS
    trunk_zone = distance_transform_edt(~trunk_core) <= (TRUNK_CORE_RADIUS + EXTRA_MARGIN)

    candidates = mask & ~trunk_zone
    candidates[Y_MAX:, :] = False

    ys, xs = np.where(candidates)
    points = list(zip(xs.tolist(), ys.tolist()))
    random.Random(42).shuffle(points)

    grid = {}

    def gkey(x, y):
        return (x // MIN_DIST, y // MIN_DIST)

    accepted = []
    for x, y in points:
        gx, gy = gkey(x, y)
        ok = True
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for ax, ay in grid.get((gx + dx, gy + dy), []):
                    if (ax - x) ** 2 + (ay - y) ** 2 < MIN_DIST ** 2:
                        ok = False
                        break
                if not ok:
                    break
            if not ok:
                break
        if ok:
            accepted.append((x, y))
            grid.setdefault((gx, gy), []).append((x, y))

    json.dump([{"x": x, "y": y} for x, y in accepted], open(OUT_PATH, "w"), indent=2)
    print(f"wrote {len(accepted)} anchors to {OUT_PATH}")


if __name__ == "__main__":
    main()
