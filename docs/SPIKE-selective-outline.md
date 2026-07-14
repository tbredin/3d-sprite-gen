# Spike: selective / tinted outline (sel-out)

**Branch:** `explore/selective-outline` (worktree off `main`)
**Goal:** soften the harsh fixed indigo silhouette rim at 42–48px without
losing Endesga lock or contour readability.

## Problem

Post-quantize `applyPartOutline` paints every outer rim (and part seam)
with one Endesga swatch — usually deep indigo `#1a1932`. At small sprite
sizes that reads as a hard comic ink line that fights the toon banding and
makes jaggies louder instead of quieter.

## Algorithm

Classic selective outline (sel-out), adapted for the bake:

1. **Detect** the same silhouette / part-seam pixels as the fixed outline
   pass.
2. **Darker-of-adjacent:** for each rim pixel, take the darkest cardinal
   neighbour body colour (by luma), crush it toward black by `darken`, then
   lerp with the fixed swatch by `tintStrength`.
3. **Lit-side thinning:** compare the rim's outward normal (body → empty)
   to a light angle (`lightAngleDeg`, default 135° = top-left). Facing the
   light lightens the tint; high `litThin` drops strongly lit silhouette
   pixels entirely. Seams never drop (tint only).
4. **Endesga lock:** every painted result is snapped with
   `nearestPaletteColor` so the rim stays on-palette.

Default knobs stay moderate (`litThin ≈ 0.45`) so 42–48px sprites still
keep a readable shadow-side contour.

## UI

**Outlines → Selective outline** toggle, plus:

| Control | Role |
|---------|------|
| Tint | Fixed swatch ↔ adjacent tint blend |
| Darken | How hard to crush the adjacent tone |
| Lit thin | Lighten / drop lit-side silhouette |
| Light° | Thinning light direction |
| Seams | Also tint part-seam pixels |

Persisted under `3d-sprite-gen:selective-outline-v1`.

## How to try

```bash
npm install
npm run dev   # http://127.0.0.1:5184
```

1. Enable **Silhouette** (and optionally **Part seams**).
2. Toggle **Selective outline** on and compare vs off at **42** / **48**.
3. Raise **Lit thin** until the lit rim softens; back off if the contour
   dissolves against transparent BG.
4. Confirm every outline pixel still lands on an Endesga swatch (no exotic
   RGB outside the lock).

## Files

- `src/lib/selectiveOutline.ts` — settings, colour resolve, paint pass
- `src/components/BakeCanvas.tsx` — wires selective pass after quantize
- `src/App.tsx` — Outlines UI + persistence
- `vite.config.ts` — port `5184`
