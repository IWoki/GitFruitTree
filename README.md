# 🌳 GitFruitTree

**English | [Русский](README.ru.md)**

> **Turn your commit history into a living tree.**

Every commit becomes part of a tree that grows along with your GitHub activity.

Unlike a regular contribution graph, here **every day permanently gets its own spot in the canopy**. Leaves don't move around, history doesn't get redrawn - the tree just keeps filling in and becomes a unique reflection of your activity.

![preview](output/preview.svg)

---

## ✨ How it works

Every date maps to its own point in the canopy.

If there were no commits that day, the spot stays empty.

The stage depends not on the raw commit count but on `contributionLevel` - the same value GitHub uses to shade a square on the calendar itself (relative to your own activity). It's the same signal the contribution-eating snake bot uses for "how green" a day is.

| contributionLevel | Stage |
|---:|:-------|
| NONE | — |
| FIRST_QUARTILE | 🌱 Bud |
| SECOND_QUARTILE | 🍃 Leaf |
| THIRD_QUARTILE | 🌸 Flower |
| FOURTH_QUARTILE | 🍑 Peach |

> The mapping is fully configurable (`LEVEL_TO_STAGE` in `src/config.js`).

---

## 🍃 Seasons

The tree's color depends **not on the commit date**, but on the **current time of year**.

That means the whole tree changes color at once.

- 🌸 Spring
- 🌿 Summer
- 🍂 Autumn
- ❄️ Winter

That's what makes the tree feel alive!

---

## 🌿 How the canopy looks

- **Overlaps.** Every grown element has a known real radius (accounting for its random size), and before drawing, the layout runs a few "relaxation" passes - large peaches and leaves nudge apart a bit if they overlap, small buds barely move. A little overlap is left on purpose - it should still read as a full canopy, not a set of evenly spaced dots.
- **Attachment point.** Each element's rotation, scale, and mirroring pivot on its attachment point (`STAGE_ATTACH` in `src/config.js`), not the icon's center - that's the point that actually sits on the branch.
- **Sway.** Only the leaf sways - rotating around its attachment point. Flowers and peaches are intentionally still. This is a SMIL animation - won't show up in a static PNG or most file previewers, open `output/preview.svg` directly in a browser.
- **Falling petals.** Some flowers (~30%, deterministic per date) occasionally shed a petal that drifts sideways and shrinks as it falls, instead of just disappearing.
- **Bark.** A light texture over the trunk via an SVG filter, unrelated to the data. If your SVG viewer doesn't support filters/blend-mode, you just won't see the effect - that's not a bug.
- **Background and grass - your own files.** `assets/fone-leafs.svg` (if you add it) is drawn BEHIND the trunk. `assets/ground.svg` (if you add it) is drawn ON TOP of the trunk and canopy. Both are optional - no file, nothing gets drawn, no errors. Author them in the same coordinate space as `trunk.svg` (viewBox `0 0 720 736`) - they're dropped in as-is. Use the same `{{COLOR}}`/`{{PETAL}}`/`{{POLLEN}}` placeholders as `assets/leaf.svg` and they'll pick up the season color too.
- **Stats row.** A live line showing how many days are at each stage (🌱 bud / 🍃 leaf / 🌸 flower / 🍑 peach) - recalculated on every generation, not stored separately.

---

## 🌱 Key difference

In most similar projects, elements keep "riding along" with GitHub's rolling window of recent weeks.

**Contribution Tree works differently.**

Every day gets a permanent position in the canopy (`src/positions.js`) that never changes.

History is kept in `src/index.json`, so the tree only ever grows with each run.

New days appear on the canopy, old ones stay put forever.

---

## Check it locally, no token, no git needed

There's a ready-made script, `scripts/preview.mjs` - it fakes a commit
history (in the exact `{count, level}` shape that really comes from the
GitHub API) and writes `output/preview.svg` right away, without touching
the network or `src/index.json`:

```
node scripts/preview.mjs
```

Then open `output/preview.svg`.

To test seasonality (including on your own SVGs, without touching any
code) - pass a season or a date as an argument:

```
node scripts/preview.mjs winter
node scripts/preview.mjs 2026-12-25
```

Handy after changing `assets/leaf.svg`/`flower.svg` or adding a
`ground.svg` with placeholders - you immediately see how each season
colors your specific files, no code changes needed.

---

## Set up your own

1. Fork the repo (or use "Use this template" if you enable it in the repo settings).
2. In Settings -> Secrets and variables -> Actions: add secret **TREE_PAT** - a Personal Access Token (classic, no extra scopes needed for public contributions, it just needs to authenticate) or a fine-grained token with read access to your account; add variable **GH_USERNAME** - your GitHub login.
3. Run the workflow manually (Actions -> Generate contribution tree -> Run workflow) or wait for the daily cron.
4. The script commits `output/tree.svg` and the updated `src/index.json` back to the repo.

**Done!**

The workflow automatically:

- fetches your commit history;
- updates the accumulated history (`src/index.json`);
- generates a new SVG;
- commits the changes back to the repo.

---

# 📌 Add it to your GitHub profile

Via raw GitHub:

```md
![Contribution Tree](https://raw.githubusercontent.com/<username>/<repo>/main/output/tree.svg)
```

or via jsDelivr:

```md
![Contribution Tree](https://cdn.jsdelivr.net/gh/<username>/<repo>/output/tree.svg)
```

> jsDelivr caches, so updates may show up with a short delay.

---

# ⚙️ Configuration

Pretty much everything can be customized.

## 🌱 Growth stages

`src/config.js`

```js
LEVEL_TO_STAGE
```

Maps `contributionLevel` (NONE/FIRST_QUARTILE/.../FOURTH_QUARTILE) to:

- 🌱 Bud
- 🍃 Leaf
- 🌸 Flower
- 🍑 Peach

Each stage's size on the canopy (before random jitter) - `STAGE_SIZE`
in the same file. The branch attachment point (not the icon's center) -
`STAGE_ATTACH`.

---

## 🎨 Season colors

Same file:

```js
SEASON_COLORS
```

Feel free to replace the whole palette. Applies to the trunk/leaf
(`{{COLOR}}`) and to the background/grass if you use the same
placeholders there. The flower is a deliberate exception: its color is
fixed (`FLOWER_COLOR`, same file) and doesn't depend on the season,
same for the falling petals' color.

---

## 🌳 Tree shape

Growth positions (`src/anchors.json`) are tied to the specific artwork
in `assets/trunk.svg` - a set of points that actually sit on thin
branches (not on the trunk itself), so leaves don't float in empty
space, don't grow on bare trunk, and the canopy doesn't get "cut off".
If you swap in new trunk artwork (say, a fresh Illustrator export - see
below), the points need recalculating:

```
pip install cairosvg numpy pillow scipy
python3 scripts/setup-trunk.py
```

One command does everything: strips hidden layers (Illustrator and
similar tools save every layer into the SVG, just marking hidden ones
`display:none` - without cleanup, the canopy ends up with stuff that
was supposed to be hidden mixed in), adds the marker comments the
canopy/background/grass/stats get inserted at, extends the canvas to
leave room for the stats row at the bottom, and recalculates growth
points via a distance transform (tells thin branches apart from the
thick trunk, including where branches fork off it rather than just its
lower section, plus hard-cuts anything below the canopy - surface roots
are just as thin as branches).

Safe to re-run - if the markers are already there, it just recalculates
the points, nothing gets broken. Settings - `TRUNK_CORE_RADIUS`,
`EXTRA_MARGIN`, `Y_MAX_FRACTION` in `scripts/extract-anchors.py`.

Same idea for `assets/ground.svg`/`assets/fone-leafs.svg` if you're
exporting them from the same multi-layer file - they don't have their
own markers, so a single cleanup is enough:

```
python3 scripts/clean_layers.py raw-export.svg assets/ground.svg
```

---

## 🌍 Southern hemisphere

By default, seasons are calculated for the northern hemisphere.

To swap them, just edit the function:

```js
seasonForDate()
```

---

# 📁 Project structure

```text
.
├── assets/
│   ├── trunk.svg                # Trunk and branches
│   ├── bud.svg                  # Stage 1 - bud
│   ├── leaf.svg                 # Stage 2 - leaf ({{COLOR}})
│   ├── flower.svg               # Stage 3 - flower ({{PETAL}}/{{POLLEN}})
│   ├── peach.svg                # Stage 4 - peach
│   ├── fone-leafs.svg           # (optional) background BEHIND the trunk
│   └── ground.svg               # (optional) grass/dirt ON TOP of the trunk
│
├── output/
│   └── tree.svg                 # Generated tree
│
├── scripts/
│   ├── setup-trunk.py           # One command: clean + markers + growth points
│   ├── extract-anchors.py       # (called from setup-trunk.py) recompute points
│   ├── clean_layers.py          # Strips hidden layers from an Illustrator export
│   └── preview.mjs              # Local render, no token, no network
│
├── src/
│   ├── config.js                # Stages, sizes, attachment points, season colors
│   ├── positions.js             # Permanent day positions
│   ├── anchors.json             # Points on branches where growth can land
│   ├── decor.js                 # Optional background/grass + bark texture
│   ├── fetchContributions.js    # GraphQL query to GitHub
│   ├── generateSvg.js           # SVG generation
│   ├── index.js                 # Main pipeline
│   └── index.json               # Accumulated history
│
└── .github/
    └── workflows/
        └── generate.yml         # Daily generation
```

---

# 🧠 How it works internally

Every run does four simple steps:

```text
GitHub GraphQL API
        |
        V
Fetch new commits
        |
        V
Update index.json
        |
        V
Determine growth stage
        |
        V
Generate tree.svg
```
---

# 🤝 Contributions welcome

This is an open pet project, and I'm happy to take help of any kind -
ideas, bug reports, and especially new assets (your own trunk art,
growth-stage art, background, grass). PRs and issues welcome.
