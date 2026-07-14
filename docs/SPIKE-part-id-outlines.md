# Spike: per-part outline compositing (`explore/part-id-outlines`)

Working prototype that outlines seams *between* body parts (head/hair/helmet,
torso, arms, legs, weapon, accessories) — not just the sprite's outer
silhouette — for the iso pixel bake.

## Approach

1. **Stable part-group IDs** — `src/lib/chibi/partGroups.ts` defines a small
   integer enum (`PartGroupId`: `HEAD`/`TORSO`/`ARMS`/`LEGS`/`WEAPON`/
   `ACCESSORY`). IDs are assigned once, explicitly, in
   `assembleCharacter` (`src/lib/chibi/assemble.ts`) via `tagPartGroup(group,
   id)` right after each part group is built — they never depend on spec
   content, so they stay stable across rerolls/presets. Hair, helmet, and the
   un-outlined face mesh are folded into `HEAD`; hem/cape accessories are
   folded into `ACCESSORY`; the weapon is tagged *after* being parented under
   a hand mesh so it doesn't inherit `ARMS`.

2. **ID render pass** — `src/lib/chibi/idPass.ts` (`renderPartGroupBuffer`)
   renders the same scene/camera a second time into the bake's existing
   `WebGLRenderTarget`, after the color pass has already been read out:
   - Every tagged mesh gets its material swapped for a cached, unlit,
     untextured `MeshBasicMaterial` (`getPartGroupMaterial`) whose color
     channels are pure `0`/`1` per part group. Pure 0/1 channels round-trip
     losslessly through sRGB/linear encoding, so the ID buffer only needs
     byte-level equality checks, no color-space math.
   - The existing 3D hull-outline shells (`addHullOutlines` in
     `outlines.ts`, tagged `userData.isOutline`) and any untagged mesh are
     hidden for this pass so they can't contaminate the ID buffer.
   - Materials/visibility are restored immediately after reading pixels
     back, so the next color-pass frame is unaffected.
   - `BakeCanvas.tsx` calls this right after the normal color capture,
     reusing the render target, then flips both buffers into top-down row
     order the same way the existing color buffer is flipped.

3. **Combined outline pass** — `applyPartOutline` (`src/lib/palette.ts`)
   replaces the old whole-sprite `applyPixelOutline` call in `BakeCanvas`.
   It runs *after* palette quantize, same as before, and does two things in
   one pass over the quantized buffer:
   - **Silhouette**: any transparent pixel touching an opaque pixel becomes
     outline (unchanged behavior — grows a 1px ring outside the sprite).
   - **Seams**: any opaque pixel touching an opaque pixel from a *different*
     part group becomes outline. Only the lower-`PartGroupId` side of each
     boundary is repainted, so a seam stays a single pixel wide instead of
     drawing a 2px double line.
   - `applyPartOutline` degrades gracefully to silhouette-only behavior when
     called without an ID buffer (its 3rd/4th args are optional), so nothing
     breaks if the ID pass is unavailable for some reason.

The existing Endesga outline color picker (`OutlineSwatchSelect` /
`outlineHex` state in `App.tsx`) is untouched and still feeds the same hex
into `applyPartOutline`.

## Files changed

- `src/lib/chibi/partGroups.ts` — new: part-group IDs, id→color encoding,
  `tagPartGroup`, `getPartGroupMaterial`, `decodePartGroupPixel`.
- `src/lib/chibi/idPass.ts` — new: `renderPartGroupBuffer` render helper.
- `src/lib/chibi/assemble.ts` — tag each part group right after it's built.
- `src/lib/palette.ts` — new `applyPartOutline` (silhouette + seams);
  old `applyPixelOutline` left in place, unused, for reference/fallback.
- `src/components/BakeCanvas.tsx` — run the ID pass after the color pass,
  flip both buffers, call `applyPartOutline` instead of
  `applyPixelOutline`.

## How to try it

```bash
npm install
npm run dev
```

Open the app, pick any preset (e.g. `knight` or `pirate` show it clearly —
plate torso vs. sleeves vs. cape), and look at the baked PNG panel. Seams
between the torso and arms, the legs and hem/cape, and the weapon and hand
should now carry a 1px outline in the selected Endesga color, in addition to
the outer silhouette. Rotate/drag the preview — the seam outlines re-bake
live along with everything else. Switching the outline swatch recolors both
the silhouette and the seams together, since both come from one hex.

To sanity-check just the pixel algorithm (no WebGL required), the seam vs.
silhouette logic in `applyPartOutline` was verified with a small synthetic
`ImageData` fixture (a two-part-group strip) via `tsx`, confirming:
outer edges outline on both sides, the shared internal boundary outlines
exactly 1px wide on the lower-ID side, and non-boundary interior pixels are
left alone.

## Limitations / follow-ups

- **Double render cost.** This spike renders the full scene twice per bake
  (color + ID). Fine for a live preview at 32–64px, but a real
  implementation should consider a single MRT (multiple render targets)
  pass, or only re-run the ID pass when geometry/pose changes (not on
  color-only changes like outline-hex or lighting).
- **Coarse part groups.** Six groups is enough to prove the seam-detection
  approach, but within a group (e.g. torso vs. its trim, or a helmet vs. its
  visor) there's no seam — those still rely on the existing 3D hull-outline
  shells. Finer-grained IDs (per-material, or per-generated-sub-mesh) would
  need either more distinct flat colors or an actual integer encoding
  (e.g. render ID as `gl_FragColor = vec4(id / 255.0, 0, 0, 1)` and decode
  with reduced precision tolerance) instead of the 0/1-channel combinatorial
  trick used here, which tops out at a small handful of unambiguous IDs.
- **Occlusion ties.** The "lower ID wins the outline pixel" rule is simple
  and deterministic, but it means a part with a numerically smaller ID
  always cedes its edge pixel to the seam regardless of which part is
  visually in front/behind at that pixel. Looks fine in testing but could
  read oddly for some poses/silhouettes; a depth-aware tiebreak (front part
  keeps its pixel) would be a nicer follow-up.
- **No dedicated automated test suite in this repo.** The seam/silhouette
  pixel logic was verified with an ad hoc `tsx` script during this spike
  (not checked in); a real implementation should add this as a proper unit
  test under whatever test runner the project adopts.
- **Not visually verified with a live render in this session** — in-IDE
  browser automation wasn't available in this sandbox, so the bake was
  validated via `tsc -b`, `vite build`, and the standalone pixel-logic test
  above, but not an actual screenshot of the baked sprite. Worth a manual
  look (`npm run dev`) before promoting this out of spike status.
