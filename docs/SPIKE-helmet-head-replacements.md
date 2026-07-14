# Spike: helmet head replacements

**Branch:** `explore/helmet-head-replacements`  
**Worktree:** `/Users/tom/Sites/3d-sprite-gen-explore-helmet-head-replacements`  
**Base:** `main` @ feature-readability merge (taller heads + FF eyes)

## Problem

After feature-readability, heads are taller egg volumes. Existing helmet meshes
were **additive shells** fitted around the old skull. Closed helms (knight,
sci-fi) and deep cowls clipped awkwardly, fought the face/eyes, or read as a
double-head blob at 32–64px. Retuned shells that still used `r × 1.12–1.35`
plus stacked brow/jaw/flap spheres looked like **balloon / lumpy mega-heads**.

Some full-head items should **be** the head silhouette — not wrap it.

## Sizing rules (egg hug)

Shared helpers live above `generateHelmet` in `parts.ts`:

| Token | Value | Intent |
| --- | --- | --- |
| `SKULL_EGG` | `{ x: 0.92, y: 1.05, z: 0.86 }` | Match `generateHead` squash (× `HEAD_TALL` 1.1 on Y) |
| `HELMET_SHELL` | `0.98` | Shell radius = `skullR × 0.98` (~6% under prior 1.04) |
| Closed axes | `SKULL_EGG × {0.98, 0.94×tall, 0.98}` | Slightly tighter / flatter than skin egg |
| `REPLACE_HEAD_BOOST` | `1.3` | **sciFi + goat only** — undoes compound shrink (see below); knight stays unboosted |
| Cap overlay | crown `≈ 0.85 × skullR`, brim `≈ 1.12 × skullR` | Sit on crown; do not expand skull silhouette much |
| Crest / antenna | short stubs only | Punctuate iso silhouette without inflating AABB |

Prefer: thinner shells, tight jaw/bevor, flat brow strips (not second spheres),
slim cheek flaps. Do **not** stack oversized sphere blobs.

### Why we keep regenerating tiny replacement heads

Not a single bug — **stacked intentional shrinks** after replace-mount hides the skin skull:

1. Preset / random `head.scale` (~0.9–0.92) feeds `r = skullR × scale` into `generateHelmet`
2. `shellR = r × HELMET_SHELL (0.98)`
3. Dome axes use `shellEgg` (already tighter than skin `SKULL_EGG`)
4. Style meshes squash further (sciFi dome ×0.96/0.9; goat ×0.95/0.92)
5. Skin heads also have layered crown / cheeks / face pad — a lone shell has less mass

Raising `HELMET_SHELL` globally re-balloons **knight**. Use `REPLACE_HEAD_BOOST` (1.3) on sciFi/goat instead. Goat horns get an extra geometry bump (thicker/taller cones) so they read at 42–48px.

## Model

| Mount | Behavior | Styles |
| --- | --- | --- |
| `overlay` | Keep skull + face + hair; add prop on crown | `cap`, `crown`, `wizard`, `bandana` |
| `replace` + `showFace: false` | Hide skull, face, hair; gear *is* the head | `knight`, `sciFi`, `goat` |
| `replace` + `showFace: true` | Hide skull + hair; keep face in opening | `hood` |
| `none` | Bare head | `none` |

Catalog + helpers: `src/lib/chibi/helmetMode.ts` (`HELMET_CATALOG`,
`helmetModeFor`, `isHeadReplacement`).

Assembly (`assembleCharacter`) reads the mode before emitting head/face/hair.
Replacement meshes take `head.scale` so they match character proportions.
Random picks force `bald` hair under any replacement style (hair is skipped
anyway, but the spec stays honest). Random also avoids `helmet: hood` +
`torso: hoodedRobe` (double cowl volume).

## Catalog (current `HelmetStyle`)

| Style | Mount | Notes |
| --- | --- | --- |
| `none` | — | Skull + face + hair |
| `cap` | overlay | Shallow brim + crown dome (ranger / pirate) |
| `crown` | overlay | Circlet + short spikes + gem |
| `wizard` | overlay | Moderate conical hat + brim |
| `bandana` | overlay | Kerchief wrap + rear knot |
| `knight` | replace (closed) | DS **Elite Knight** flat-top kettle + dual slits + T-nasal |
| `sciFi` | replace (closed) | Practical **soldier** infantry helm — flat lid, brow plate, cheek cups, thin visor |
| `hood` | replace (open) | Head-sized aft cowl; face window open |
| `goat` | replace (closed) | Animal head — horns, snout, ears; hides human skull/face |

### Knight rebuild (Elite Knight)

The prior knight used a thin sphere shell plus an undersized `r×0.48` bevor and
read as a **tiny wrong head** at iso. Replaced entirely with a flat-top kettle
silhouette inspired by Dark Souls **Elite Knight** (Cathedral Knight kettle lids
as secondary reference): flattened crown disc, broad brow band, dual horizontal
visor slits + vertical nasal bar, fuller bevor. Still `mount: replace`.

### Soldier / `sciFi` rebuild

Soldier preset uses `helmet: sciFi`. Earlier sealed-egg + chunky jaw still read as
a **bulbous sphere**. Rebuilt as a practical closed infantry helm: tighter /
flatter cranial shell, bucket lid, angular brow plate, slim cheek cups, nape
collar, thin glowing visor + dark slit inset. Not a glass dome.

Egg-hug + `head.scale` 0.9 made the sealed head look tiny vs body; `REPLACE_HEAD_BOOST`
`×1.3` on sciFi radius (was `×1.2`, still undersized). Same boost on **goat**.

### Goat / horns

Goat uses the same `×1.3` radius boost. Horns: thicker/taller two-cone stack
(`r×0.2 / r×0.65` base + `r×0.12 / r×0.55` tip, tips higher) so forks read at
42–48px.

### Related (not a helmet style)

- **`torso.style === "hoodedRobe"`** — soft cowl in `generateTorso` now uses the
  same `skullR × HELMET_SHELL` egg (was a hard-coded `0.52` balloon). Still not
  wired to `helmetMode`; random avoids pairing it with `helmet: hood`.

## Hair catalog additions

New `HairStyle` values (wired in `generateHair` + random weights):

`pixie`, `messy`, `dreads`, `mullet`, `pompadour`, `sidePart`, `wavy`

## Changes in this spike

- `helmetMode.ts` — catalog + mount tags (incl. overlays + goat)
- `assemble.ts` — skip head / face / hair for replacements; soldier bald under sciFi
- `parts.ts` `generateHelmet` — egg-hug shell @ 0.98; Elite Knight; practical sciFi;
  new crown / wizard / bandana / goat; retuned hood / cap; hoodedRobe cowl matched
- `parts.ts` `generateHair` — seven new hair styles
- `random.ts` — bald under replacements; new hair/helm weights; goat fur / horn colors
- `index.ts` — re-exports catalog helpers

## How to verify

1. `npm run build` in this worktree
2. Load **knight** — flat-top kettle + clear dual slits at ~skull size (no tiny stub)
3. Load **soldier** — angular infantry helm (flat lid + cheek cups), not a sphere blob
4. Load **ranger** / **pirate** — cap sits on hair/skull
5. Reroll head until `hood` / `crown` / `wizard` / `bandana` / `goat`
6. Reroll bare heads for new hair styles
7. Load **mage** / **cleric** — robe cowl hugs the taller egg
8. Part-ID outline pass: helmet group still tags as `HEAD`

## What’s left

- Optionally skip torso cowl mesh when `helmetMode.mount === "replace"`
- Optional explicit `helmet.mount` override on `CharacterSpec` for LLM /
  hand-authored exceptions
- Visor slits at 32px may need a brighter / thicker accent after palette lock
