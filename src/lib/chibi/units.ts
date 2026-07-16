/** Chibi proportion units — one “head” is the world unit. */
export const HEAD = 1;

/**
 * Super-deformed chibi (~1.75 heads): oversized head, tiny body.
 *
 * At 32–64px the head must own most of the sprite so eyes / mouth / chin
 * stay legible. Arms, torso, and legs stay short; mittens and boots keep
 * their absolute size so extremities still read as chunky chibi props.
 */
const TORSO = 0.34 * HEAD;
const LEGS = 0.4 * HEAD;

export const CHIBI = {
  head: HEAD,
  torso: TORSO,
  legs: LEGS,
  totalHeight: HEAD + TORSO + LEGS, // ~1.74
  /** Narrower with the short torso so shoulders don't swallow the skull. */
  hipWidth: 0.56 * HEAD,
  shoulderWidth: 0.7 * HEAD,
  torsoDepth: 0.4 * HEAD,
  /** Stubby arms — mittens do the reading, not forearm length. */
  armLength: 0.38 * HEAD,
  armThick: 0.2 * HEAD,
  legThick: 0.22 * HEAD,
  /** Kept absolute — chibi mitt / boot mass at small bake sizes. */
  handSize: 0.2 * HEAD,
  footLength: 0.32 * HEAD,
  footWidth: 0.24 * HEAD,
  /**
   * Base skull radius before head.scale. Slightly larger than the old 0.36
   * so the face pad has more vertical room for eyes → mouth → chin.
   */
  skullR: 0.4 * HEAD,
} as const;

/** Feet on y=0; head top at totalHeight. */
export const LAYOUT = {
  footY: 0,
  hipY: CHIBI.legs,
  shoulderY: CHIBI.legs + CHIBI.torso,
  /** Sit the face a touch lower in the head unit so chin clears the collar. */
  headCenterY: CHIBI.legs + CHIBI.torso + CHIBI.head * 0.5,
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
