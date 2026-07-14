/** Chibi proportion units — one “head” is the world unit. */
export const HEAD = 1;

/**
 * Squash chibi (~2.1 heads): big head, short chubby torso, stubby limbs.
 * SNES / Sea of Stars overworld read — not lanky anime dolls.
 */
const TORSO = 0.5 * HEAD;
const LEGS = 0.6 * HEAD;

export const CHIBI = {
  head: HEAD,
  torso: TORSO,
  legs: LEGS,
  totalHeight: HEAD + TORSO + LEGS, // ~2.1
  hipWidth: 0.72 * HEAD,
  shoulderWidth: 0.88 * HEAD,
  torsoDepth: 0.5 * HEAD,
  /** Short stubby arms — large mittens do the reading. */
  armLength: 0.55 * HEAD,
  armThick: 0.26 * HEAD,
  legThick: 0.28 * HEAD,
  handSize: 0.2 * HEAD,
  footLength: 0.28 * HEAD,
  footWidth: 0.2 * HEAD,
  /** Base skull radius before head.scale. */
  skullR: 0.36 * HEAD,
} as const;

/** Feet on y=0; head top at totalHeight. */
export const LAYOUT = {
  footY: 0,
  hipY: CHIBI.legs,
  shoulderY: CHIBI.legs + CHIBI.torso,
  headCenterY: CHIBI.legs + CHIBI.torso + CHIBI.head * 0.48,
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
