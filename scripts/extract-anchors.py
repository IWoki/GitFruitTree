"""
Regenerates src/anchors.json from assets/trunk.svg.

Rasterizes the trunk art, finds every opaque (branch) pixel above the
Y_CUTOFF row (so the bare single trunk column at the bottom is excluded -
growth only happens on branches), then greedily samples points that are
at least MIN_DIST apart so leaves don't overlap. This is a one-off dev
step: run it again only when you replace assets/trunk.svg with new art.

    pip install cairosvg numpy pillow
    python3 scripts/extract-anchors.py
"""
import json
import random

import cairosvg
import numpy as np
from PIL import Image

TRUNK_SVG = "assets/trunk.svg"
OUT_PATH = "src/anchors.json"

# Raster at the same size as the SVG's viewBox so pixel coords map 1:1
# onto SVG user units. Update these if you change assets/trunk.svg's viewBox.
WIDTH, HEIGHT = 720, 736

# Rows below this are treated as bare trunk, not crown - tune by eye
# (print out row widths like below if your art has a different shape).
Y_CUTOFF = 495

MIN_DIST = 13


def main():
    cairosvg.svg2png(url=TRUNK_SVG, write_to="/tmp/_trunk_raster.png", output_width=WIDTH, output_height=HEIGHT)
    arr = np.array(Image.open("/tmp/_trunk_raster.png").convert("RGBA"))
    mask = arr[:, :, 3] > 100

    ys, xs = np.where(mask)
    keep = ys < Y_CUTOFF
    xs, ys = xs[keep], ys[keep]
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
