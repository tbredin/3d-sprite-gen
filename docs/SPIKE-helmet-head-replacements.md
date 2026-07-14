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
| `HELMET_SHELL` | `1.04` | Shell radius = `skullR × 1.04` — few % outside skin |
| Closed Y | `SKULL_EGG.y × 0.96 × tall` | Slightly flatter top than skin egg |
| Cap overlay | crown `≈ 0.9 × skullR`, brim `≈ 1.18 × skullR` | Sit on crown; do not expand skull silhouette much |
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
| `knight` | replace (closed) | Thin plate egg + bevor + visor slits |
| `sciFi` | replace (closed) | Same tight egg + thin glowing visor band |
| `hood` | replace (open) | Head-sized aft cowl; face window open |

### Removed / rejected mega shapes

No catalog styles deleted — the old absolute mega-domes (`SphereGeometry(0.52–0.62)`)
and the post-replacement `r×1.08–1.35` balloon shells were **retuned away**, not
kept as alternate picks. Random has no mega-style entries.

### Related (not a helmet style)

- **`torso.style === "hoodedRobe"`** — soft cowl in `generateTorso` now uses the
  same `skullR × HELMET_SHELL` egg (was a hard-coded `0.52` balloon). Still not
  wired to `helmetMode`; random avoids pairing it with `helmet: hood`.

## Changes in this spike

- `helmetMode.ts` — catalog + mount tags
- `assemble.ts` — skip head / face / hair for replacements
- `parts.ts` `generateHelmet` — egg-hug shell constants; retuned knight /
  sciFi / hood / cap; hoodedRobe torso cowl matched to skullR
- `random.ts` — bald under replacements; no hood+hoodedRobe stack; slightly
  more `cap` weight
- `index.ts` — re-exports catalog helpers

## How to verify

1. `npm run build` in this worktree
2. Load **knight** + **soldier** presets — head reads as one closed helm at
   roughly skull size (no balloon; short crest/antenna only)
3. Load **ranger** / **pirate** — cap sits on hair/skull without a second dome
4. Reroll head until `hood` — face/eyes visible inside a tight cowl
5. Load **mage** / **cleric** — robe cowl hugs the taller egg, not a mega sphere
6. Part-ID outline pass: helmet group still tags as `HEAD`

## What’s left

- Optionally skip torso cowl mesh when `helmetMode.mount === "replace"`
- Optional explicit `helmet.mount` override on `CharacterSpec` for LLM /
  hand-authored exceptions
- More styles if needed: crown, wizard hat, ceramic mask, open barbute
- Visor slits at 32px may need a brighter / thicker accent after palette lock
