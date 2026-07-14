# Spike: face + weapon readability at 32–64px

**Branch:** `explore/feature-readability` (worktree off `main` @ `fb9b87e`)
**Goal:** make faces and weapons register clearly after the iso bake + Endesga-64
palette lock + NN downscale, without breaking chibi proportions (~2.1 heads) or
the planted "ready" leg stance.

## Problem

At 32–48px the baked sprites read as mushy colored primitives:

- Eyes were small spheres (0.07 white / 0.042 iris) sitting almost flush with
  the skull surface. Under palette quantization + toon banding they'd often
  crush into 1–2 pixels that blend into the skin/hair color instead of
  standing out as a distinct high-contrast mark.
- Weapons (sword blade, staff shaft, rifle barrel, shield disc) were thin
  (0.035–0.05 radius) and colored the same as the held prop's single "weapon
  color", giving low silhouette contrast against the hand/sleeve.

## Changes

Changes: `parts.ts` (face + weapons), `faceCheat.ts` + `ChibiCharacter` /
`BakeCanvas` (camera-facing yaw), plus a UI note. No changes to leg/arm poses
or proportions in `units.ts`.

### Face (`generateFace` + `applySpriteFaceCheat`)

Steering: SNES FF4–6 eyes are **flat painted discs** on the face — large
iris in a tall sclera, soft upper lid, catchlight — not protruding spheres.
Overworld “south” shows both eyes; diagonals keep a readable ¾; “north” is
mostly hair/hat.

- Separate `eye-left` / `eye-right` groups with `FACE_READABILITY` knobs
  (`eyeWhiteR`, `irisR`, `forwardPush` ≈ 0.055 flush-proud, `discScale` Z
  squash ≈ 0.32, soft upper lid mesh).
- `applySpriteFaceCheat` only toggles per-eye visibility (and a light turn) —
  **no** forward profile boost / heavy yaw (those made eyes stick out).

Tuning knobs: `FACE_READABILITY` in `parts.ts`; visibility thresholds in
`faceCheat.ts`.

### Weapons (`generateWeapon`)

- **Sword:** flat crossguard box (bright `#eef2f5`, wider than the grip) +
  a **fat hex-profile blade** (`CylinderGeometry(radius, radius*0.85, len, 6)`,
  radius `0.035 → 0.075`) instead of a thin round rod. A cone caps the tip.
- **Staff:** orb enlarged `0.12 → 0.17` and recolored to a fixed pale
  "crystal" (`#f5f8ff`) so it contrasts with any shaft color; added two claw
  prongs cradling the orb so the head reads as more than a stick + ball.
- **Rifle:** barrel radius `0.05 → 0.075`; added a chunky receiver block, a
  stock that extends back past the mitt, a front sight, and a magazine —
  breaks the "gun-colored blob" silhouette into recognizable gun parts.
- **Shield:** face disc `0.3 → 0.36`, boss `0.07 → 0.1`, plus a dark rim band
  behind the face disc for a two-tone read.
- All accent/detail parts use `toonDetail` for crisp near-black/near-white
  values instead of the body `toon()` lift.

**Important robustness fix found during verification:** the first pass used a
thin flat *box* for the sword blade (for a hard straight edge). Because the
box's thin axis (~0.05 world units, sub-pixel at 48px) can rotate to face the
camera under some arm-pose/wrist rotations, the blade could disappear
entirely at certain angles — the exact "weapon barely registers" bug this
spike is meant to fix. Swapped to a radially-symmetric hex-profile cylinder,
which always presents a wide silhouette regardless of hand rotation. Lesson
generalized in the code comment on `WEAPON_READABILITY.swordBladeR`: **prefer
radially-symmetric primitives (cylinder/cone/sphere) for anything that must
stay visible across arbitrary held-prop rotations; reserve flat boxes for
accents where disappearing at some angles is an acceptable trade-off** (e.g.
crossguard, rifle sight/magazine).

Tuning knobs: `WEAPON_READABILITY` at the top of `parts.ts`.

### UI note

`App.tsx` now shows a small note under the header ("Feature boost: FF4–6
near-profile faces…") so the spike is self-documenting.
Mesh changes are the primary deliverable; this is just a label.

## How to verify visually

```bash
npm install
npm run dev   # http://localhost:5174 (or whatever port Vite picks)
```

In the UI:

1. **Eyes:** cycle all four iso facings. Toward-* should show a clear dual-eye
   (or soft ¾) face facing the camera — not a side-on strip. Away-* should
   mostly show hair/helmet with little/no face. Prefer `rogue` / `ranger`
   (no helmet).
2. **Weapons:** `knight` (sword, *extended* pose), `ranger` (sword, *reach*),
   `soldier` (rifle, *extended*), `mage`/`cleric` (staff, *cast*), `pirate`
   (sword, *guard*). The default **Away · top-right** facing (back
   three-quarter) is the app default and already shows the sword clearly
   past the shoulder for `knight`. Rotate through a few facings/drag angles
   per preset — the weapon should stay visible as a distinct bright/dark
   shape past the mitt from most angles (this is what the box→cylinder blade
   fix guarantees).
3. Toggle **Sprite size** between 32 / 48 / 64 to confirm the eyes and
   weapon silhouette survive the harsher downscale at 32px.
4. Compare against `main` (`git worktree` back to `fb9b87e` or stash this
   branch's `parts.ts` changes) for a quick before/after on the same preset
   + facing + size.

## Follow-ups (not done in this spike)

- `generateFace` doesn't account for `head.scale` (per-preset head shrink),
  so eyes can float slightly forward of a scaled-down head. Pre-existing
  minor quirk, more visible now that eyes are bigger; worth fixing by
  threading `scale` into `generateFace` if this graduates past spike stage.
- Hair styles with heavy forward fringe (`bowl`, dense `fringe`) can still
  partially cover the eyes from steep top-down camera angles even with the
  new forward push, because the iso camera looks down onto the *top* of the
  bangs geometry, not just its front face. A full fix would need per-hairstyle
  "face window" carve-outs, which is a bigger change than this spike scope.
