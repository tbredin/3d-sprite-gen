# Spike: helmet head replacements

**Branch:** `explore/helmet-head-replacements`  
**Worktree:** `/Users/tom/Sites/3d-sprite-gen-explore-helmet-head-replacements`  
**Base:** `main` @ feature-readability merge (taller heads + FF eyes)

## Problem

After feature-readability, heads are taller egg volumes. Existing helmet meshes
were **additive shells** fitted around the old skull. Closed helms (knight,
sci-fi) and deep cowls now clip awkwardly, fight the face/eyes, or read as a
double-head blob at 32–64px.

Some full-head items should **be** the head silhouette — not wrap it.

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
anyway, but the spec stays honest).

## Catalog (current `HelmetStyle`)

| Style | Mount | Notes |
| --- | --- | --- |
| `none` | — | Skull + face + hair |
| `cap` | overlay | Brim + soft dome on crown (ranger / pirate) |
| `knight` | replace (closed) | Plate egg + bevor + visor slits (knight preset) |
| `sciFi` | replace (closed) | Sealed dome + glowing visor band (soldier preset) |
| `hood` | replace (open) | Cowl around head center; face window open |

### Related (not a helmet style)

- **`torso.style === "hoodedRobe"`** — still builds a soft cowl *around* the
  head inside `generateTorso` (mage / cleric). That path is **not** wired to
  `helmetMode` yet; it can double-up with `helmet: hood` or fight taller
  skulls. Follow-up: either tag torso cowls as soft overlays, or move robe
  hoods onto the helmet mount path.

## Changes in this spike

- `helmetMode.ts` — catalog + mount tags
- `assemble.ts` — skip head / face / hair for replacements
- `parts.ts` `generateHelmet` — retuned `knight` / `sciFi` / `hood` as
  head-sized volumes; `cap` kept as overlay (scaled to `skullR`)
- `random.ts` — bald under any replacement style
- `index.ts` — re-exports catalog helpers

## How to verify

1. `npm run build` in this worktree
2. Load **knight** + **soldier** presets — head should read as one closed
   helm silhouette (no skin chin poking out; no FF eyes under the visor)
3. Load **ranger** / **pirate** — cap sits on hair/skull; face still visible
4. Reroll head until `hood` — face/eyes visible inside cowl, no bald bulb under
5. Part-ID outline pass: helmet group still tags as `HEAD`

## What’s left

- Untangle `hoodedRobe` torso cowl vs `helmet: hood`
- Optional explicit `helmet.mount` override on `CharacterSpec` for LLM /
  hand-authored exceptions (crown that hides hair, open barbute that keeps
  eyes, etc.)
- More styles if needed: crown, wizard hat, ceramic mask, full enclosed
  great-helm variants
- Visor slits at 32px may need a brighter / thicker accent after palette lock
- UI note (optional) labeling which presets use replacements
