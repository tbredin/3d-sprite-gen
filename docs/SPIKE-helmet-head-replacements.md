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
| Cap overlay | crown `≈ 0.85 × skullR`, brim `≈ 1.12 × skullR` | Sit on crown; do not expand skull silhouette much |
| Crest / antenna | short stubs only | Punctuate iso silhouette without inflating AABB |

Prefer: thinner shells, tight jaw/bevor, flat brow strips (not second spheres),
slim cheek flaps. Do **not** stack oversized sphere blobs.

## Model

| Mount | Behavior | Styles |
| --- | --- | --- |
| `overlay` | Keep skull + face + hair; add prop on crown | `cap` |
| `replace` + `showFace: false` | Hide skull, face, hair; gear *is* the head | `knight`, `sciFi` |
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
| `knight` | replace (closed) | DS **Elite Knight** flat-top kettle + dual slits + T-nasal |
| `sciFi` | replace (closed) | Tight egg + thin glowing visor band |
| `hood` | replace (open) | Head-sized aft cowl; face window open |

### Knight rebuild (Elite Knight)

The prior knight used a thin sphere shell plus an undersized `r×0.48` bevor and
read as a **tiny wrong head** at iso. Replaced entirely with a flat-top kettle
silhouette inspired by Dark Souls **Elite Knight** (Cathedral Knight kettle lids
as secondary reference): flattened crown disc, broad brow band, dual horizontal
visor slits + vertical nasal bar, fuller bevor. Still `mount: replace`.

### Related (not a helmet style)

- **`torso.style === "hoodedRobe"`** — soft cowl in `generateTorso` now uses the
  same `skullR × HELMET_SHELL` egg (was a hard-coded `0.52` balloon). Still not
  wired to `helmetMode`; random avoids pairing it with `helmet: hood`.

## Changes in this spike

- `helmetMode.ts` — catalog + mount tags
- `assemble.ts` — skip head / face / hair for replacements
- `parts.ts` `generateHelmet` — egg-hug shell @ 0.98; Elite Knight kettle rebuild;
  retuned sciFi / hood / cap; hoodedRobe torso cowl matched to skullR
- `random.ts` — bald under replacements; no hood+hoodedRobe stack; cap weighted
- `index.ts` — re-exports catalog helpers

## How to verify

1. `npm run build` in this worktree
2. Load **knight** — flat-top kettle + clear dual slits at ~skull size (no tiny stub)
3. Load **soldier** — sciFi sealed egg, slightly under prior balloon
4. Load **ranger** / **pirate** — cap sits on hair/skull
5. Reroll head until `hood` — face/eyes visible inside a tight cowl
6. Load **mage** / **cleric** — robe cowl hugs the taller egg
7. Part-ID outline pass: helmet group still tags as `HEAD`

## What’s left

- Optionally skip torso cowl mesh when `helmetMode.mount === "replace"`
- Optional explicit `helmet.mount` override on `CharacterSpec` for LLM /
  hand-authored exceptions
- More styles if needed: crown, wizard hat, ceramic mask, open barbute
- Visor slits at 32px may need a brighter / thicker accent after palette lock
