/** Chibi proportion units — one “head” is the world unit. */
export const HEAD = 1;

/**
 * Super-deformed chibi for a *high isometric* camera.
 *
 * Iso foreshortening crushes vertical face detail, so the head unit is tall
 * (~1.2) while torso/arms/legs stay tiny. Mittens and boots keep absolute
 * size so extremities still read at 32–64px.
 */
const TORSO = 0.32 * HEAD;
const LEGS = 0.38 * HEAD;
/** Extra head height — skulls stretch into this for iso face readability. */
const HEAD_TALL = 1.2 * HEAD;

export const CHIBI = {
  head: HEAD,
  /** Vertical head budget (taller than `head` for iso foreshortening). */
  headTall: HEAD_TALL,
  torso: TORSO,
  legs: LEGS,
  totalHeight: HEAD_TALL + TORSO + LEGS, // ~1.9
  hipWidth: 0.54 * HEAD,
  shoulderWidth: 0.68 * HEAD,
  torsoDepth: 0.38 * HEAD,
  armLength: 0.36 * HEAD,
  armThick: 0.19 * HEAD,
  legThick: 0.21 * HEAD,
  /** Kept absolute — chibi mitt / boot mass at small bake sizes. */
  handSize: 0.2 * HEAD,
  footLength: 0.32 * HEAD,
  footWidth: 0.24 * HEAD,
  /** Base skull radius before head.scale. */
  skullR: 0.38 * HEAD,
} as const;

/** Feet on y=0; crown near headTopY. */
export const LAYOUT = {
  footY: 0,
  hipY: CHIBI.legs,
  shoulderY: CHIBI.legs + CHIBI.torso,
  /** Face center — lower in the tall head so chin has room under iso crush. */
  headCenterY: CHIBI.legs + CHIBI.torso + CHIBI.headTall * 0.42,
  headTopY: CHIBI.totalHeight,
} as const;

/** Mid-body Y for orbit/rotate pivot (and rim mid height). Feet stay at y=0. */
export const CHARACTER_PIVOT_Y = CHIBI.totalHeight * 0.5;

/**
 * Three.js CapsuleGeometry `length` is the cylinder only (excludes caps).
 * Returns length so overall height ≈ targetHeight.
 */
export function capsuleCylinderLength(radius: number, targetHeight: number) {
  return Math.max(0.02, targetHeight - 2 * radius);
}
