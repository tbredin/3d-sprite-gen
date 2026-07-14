# Spike: Bayer ordered dither before Endesga lock

**Branch:** `explore/bayer-dither` (worktree off `main`)
**Goal:** soften palette banding on the bake by applying a **4×4 Bayer**
threshold bias **immediately before** nearest-colour quantization.

## Why

Straight Endesga-64 lock maps every midtone to one swatch, so smooth toon
lighting collapses into flat bands. Competitors (PixlyBakery, PixelSprite FX,
GodotPixelRenderer) expose Bayer dither as a standard bake knob for this
reason. Ordered dither keeps a stable, animation-friendly grain (unlike
error-diffusion / Floyd–Steinberg).

## Pipeline order

In `BakeCapture` (`src/components/BakeCanvas.tsx`):

1. Colour render → CPU `ImageData`
2. **`quantizeImageData(…, bayerDither)`** — optional Bayer bias, then Endesga nearest
3. Edge / part / silhouette outlines (unchanged)

Dither must run **before** the lock; after quantization there is nothing left
to dither between.

## Knobs

- Toggle **Bayer dither** (default **off**)
- **Strength** 0–1 (default 0.35 when enabled) — scales peak ±RGB bias
  (`BAYER_BIAS_SCALE` in `src/lib/palette.ts`)

UI: micro row under Outlines in the bake panel.
