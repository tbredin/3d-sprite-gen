# Spike: depth + normal discontinuity outline pass

Branch: `explore/depth-normal-edges`

Prototype of a **depth + normal discontinuity** outline pass for the bake
pipeline, as a complement to the existing silhouette-only
`applyPixelOutline`. Inspired by the GodotPixelRenderer / "Drawing the Line
on 3D Pixel Art" family of techniques and the Spectre Pixelator Sobel
outline, adapted to run per-pixel at native sprite resolution (32–64px)
instead of as a screen-space post shader.

## Problem

`applyPixelOutline` (`src/lib/palette.ts`) only looks at the alpha channel:
any transparent pixel next to an opaque one becomes outline colour. That's a
perfect silhouette rim, but it is blind to **internal** creases — e.g. an
arm resting in front of the torso, a collar seam, a helmet visor line, a
backpack strap — anywhere two surfaces overlap in screen space at the same
alpha but sit at different depths or face different directions. Those
details currently only read from lighting/shading, which gets muddy at
32–48px.

## Approach

At bake time (`BakeCapture` in `src/components/BakeCanvas.tsx`), after the
normal color render + palette quantize step, and only when the feature is
enabled:

1. **Hide the 3D hull-outline shells** (`mesh.userData.isOutline`, added by
   `addHullOutlines` in `src/lib/chibi/outlines.ts`) for the extra passes —
   they're expanded backface shells meant only for the color pass and would
   corrupt depth/normal readback.
2. **Depth pass**: set `scene.overrideMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking })`,
   render the same iso `bakeCam` into the same offscreen `WebGLRenderTarget`
   used for the color capture, and read back RGBA. RGBA packing gives ~24
   bits of depth precision regardless of the camera's near/far span (0.1 /
   40), so there's no need to fit a tight frustum per character.
3. **Normal pass**: set `scene.overrideMaterial = new MeshNormalMaterial()`,
   render again, read back RGBA. `MeshNormalMaterial` encodes the
   **view-space** normal as `normal * 0.5 + 0.5` — exactly what we want
   since the iso camera is locked, so view-space normals are stable across
   the whole bake.
4. Restore `scene.overrideMaterial` and hull-shell visibility.
5. Decode both buffers on the CPU (`src/lib/edgeOutline.ts`):
   - `decodeDepthBuffer` mirrors three.js's `unpackRGBAToDepth` (the same
     math `packing.glsl` uses for shadow maps).
   - `depthToWorldUnits` converts the packed `[0,1]` depth to view-axis
     world units. For an `OrthographicCamera` the depth buffer is *linear*
     in view-space z, so this is a plain `near + d * (far - near)` lerp —
     no perspective divide needed.
   - `decodeNormalBuffer` unpacks RGB back to a `[-1, 1]` normal.
6. **Edge detection** (`detectDepthNormalEdges`): for every opaque pixel,
   compare against its 4 cardinal neighbours. If the depth delta exceeds
   `depthThreshold` (world units) or the angle between normals exceeds
   `normalThresholdDeg`, mark the pixel as an edge.
7. **Erosion** (`erodeMask`): edge *candidates* are restricted to pixels
   whose 4 cardinal neighbours are all opaque too (i.e. not on the outer
   silhouette ring). This turned out to be essential — see "Why erosion?"
   below.
8. Composite the edge mask as solid 1px `outlineHex` colour
   (`applyEdgeMask`), then run the existing `applyPixelOutline` as before.
   Order matters: internal edges are drawn first, so the silhouette
   dilation pass (which re-derives "opaque" from the current alpha channel)
   still runs last and is unaffected by the new pass.

The result is the silhouette-outline pass and the new internal-crease pass
both contributing to the same bitmap — "blend" in the sense the task asked
for, rather than a hard toggle between two outline strategies.

## Why erosion? (the main pitfall)

The first pass at this (no erosion, `depthThreshold=0.08`,
`normalThresholdDeg=35`) looked broken: enabling the pass didn't just add a
few internal lines, it visibly ate large parts of the character into a
darker blob. Root cause: **pixels one step inside the true silhouette are
heavily foreshortened** — their surface normal is nearly perpendicular to
the view axis, and the visible depth changes rapidly there even for a
perfectly smooth capsule limb. At 48px, that foreshortening alone routinely
exceeds a 35° normal delta or a 0.08-unit depth delta between adjacent
pixels, so the "internal edge" pass ended up re-drawing almost the entire
outer rim from the inside, on every rounded surface.

Fix: compute an eroded "core" mask (opaque pixels whose 4 cardinal
neighbours are also opaque) and only allow *edge candidates* — the pixel
being tested, not its neighbours — to come from that core. This excludes
the naturally-steep foreshortened ring right next to the silhouette while
still comparing against real neighbour data, so genuine interior creases
(actual overlapping geometry) still fire correctly. After that fix,
defaults moved up too (`depthThreshold=0.08→0.15`,
`normalThresholdDeg=35°→60°`) to keep the effect focused on real seams
rather than gentle curvature.

## Defaults / tunables

Constants live in `src/lib/edgeOutline.ts`:

```ts
export const DEFAULT_EDGE_OPTIONS: EdgeDetectOptions = {
  depthThreshold: 0.15,      // world units (view axis), chibi is ~2.1 units tall
  normalThresholdDeg: 60,    // degrees between cardinal-neighbour view-space normals
};
```

Both are also exposed live in the UI under **Edge detection (spike)**
(collapsed by default, below the Lighting section):

- A checkbox to enable/disable the whole pass (**off by default** — this is
  a spike, not meant to change the default look).
- **Depth** slider, 0.01–0.30 world units.
- **Normal°** slider, 5–90 degrees.

Lower either value to catch more/subtler creases; raise them if the
internal lines look noisy on a particular pose/preset. Good starting point
for a strong "hard-surface" toon look: `soldier` preset, "Toward ·
bottom-right" facing, 64px, zoom ~1.6 — the collar seam, backpack/shoulder
overlap and visor line all pick up clean 1px internal lines at the
defaults.

## Files changed

- `src/lib/edgeOutline.ts` (new) — depth/normal decode, erosion, edge
  detection, compositing. Pure functions, no React/Three imports beyond
  types, easy to unit test.
- `src/components/BakeCanvas.tsx` — two extra override-material render
  passes + readback in `BakeCapture`, gated behind `edgeOutline.enabled`;
  exports `EdgeOutlineSettings` / `DEFAULT_EDGE_OUTLINE_SETTINGS`.
- `src/App.tsx` — `edgeOutline` state + "Edge detection (spike)"
  `CollapseSection` with the enable checkbox and two threshold sliders.
- `docs/SPIKE-depth-normal-edges.md` — this file.

## How to test

```bash
npm install
npm run dev
```

1. Open the app, pick a preset with some overlap (e.g. `soldier` or
   `knight`), and a "Toward" facing so the pose reads front-on.
2. Open **Edge detection (spike)** and check the enable box.
3. Compare the baked PNG panel with the checkbox on/off. Look for clean 1px
   internal lines at panel seams / limb-over-torso overlaps rather than a
   darkened silhouette.
4. Drag the **Depth** / **Normal°** sliders — lower them to see more lines
   appear (and, if pushed too low, the foreshortening-noise problem described
   above starts to reappear even with erosion, since it only removes the
   *first* ring of foreshortening); raise them to prune down to only the
   strongest creases.
5. `Reset` restores the tuned defaults above.

## Known limitations / follow-ups

- Cardinal-neighbour-only (no diagonals), matching `applyPixelOutline`'s
  existing style — cheap, but diagonal creases can appear slightly
  stair-stepped.
- Both firing pixels of a crease get marked (not just the "far" side), so
  interior lines are ~1-2px thick. A future pass could mark only the
  farther-depth pixel for a crisper 1px line.
- Costs two extra full-scene renders + CPU decode per bake, only when
  enabled; fine for the current debounced live-preview bake, but would want
  batching if this ran per-frame at higher resolution.

## Drive-by fix

While instrumenting the depth/normal render passes, the console lit up with
shader compile errors from the (pre-existing, unrelated) 3D hull-outline
shell material in `src/lib/chibi/outlines.ts`: its `onBeforeCompile` hook
referenced `objectNormal`, a local that `MeshBasicMaterial`'s vertex shader
only declares when `USE_ENVMAP`/`USE_SKINNING` is set. It's fixed to use the
raw `normal` attribute instead (always present), which also means that hull
shell now actually renders instead of silently failing to link.
