/** Chibi proportion units — one “head” is the world unit. */
export const HEAD = 1;

const TORSO = (2 / 3) * HEAD;
const LEGS = 0.5 * HEAD;

/**
 * Proportions: head 1, torso ~⅔, legs ½.
 * Slightly fuller widths so limbs read as one cohesive silhouette.
 */
export const CHIBI = {
  head: HEAD,
  torso: TORSO,
  legs: LEGS,
  totalHeight: HEAD + TORSO + LEGS,
  hipWidth: 0.62 * HEAD,
  torsoDepth: 0.42 * HEAD,
  armLength: 0.78 * HEAD,
  armThick: 0.185 * HEAD,
  legThick: 0.2 * HEAD,
} as const;

/** Feet on y=0; head top at totalHeight. */
export const LAYOUT = {
  footY: 0,
  hipY: CHIBI.legs,
  shoulderY: CHIBI.legs + CHIBI.torso,
  headCenterY: CHIBI.legs + CHIBI.torso + CHIBI.head * 0.5,
  headTopY: CHIBI.totalHeight,
} as const;

/**
 * Three.js CapsuleGeometry `length` is the cylinder only (excludes caps).
 * Returns length so overall height ≈ targetHeight.
 */
export function capsuleCylinderLength(radius: number, targetHeight: number) {
  return Math.max(0.02, targetHeight - 2 * radius);
}
