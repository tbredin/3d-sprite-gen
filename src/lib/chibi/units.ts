/** Chibi proportion units — one “head” is the world unit. */
export const HEAD = 1;

/**
 * Super-deformed chibi for isometric bake.
 * Head budget is modest — face readability comes from construction, not
 * extreme vertical stretch (that overcorrected into “long head”).
 */
const TORSO = 0.34 * HEAD;
const LEGS = 0.4 * HEAD;
const HEAD_TALL = 1.05 * HEAD;

export const CHIBI = {
  head: HEAD,
  headTall: HEAD_TALL,
  torso: TORSO,
  legs: LEGS,
  totalHeight: HEAD_TALL + TORSO + LEGS,
  hipWidth: 0.56 * HEAD,
  shoulderWidth: 0.7 * HEAD,
  torsoDepth: 0.4 * HEAD,
  armLength: 0.38 * HEAD,
  armThick: 0.2 * HEAD,
  legThick: 0.22 * HEAD,
  handSize: 0.2 * HEAD,
  footLength: 0.32 * HEAD,
  footWidth: 0.24 * HEAD,
  skullR: 0.4 * HEAD,
} as const;

export const LAYOUT = {
  footY: 0,
  hipY: CHIBI.legs,
  shoulderY: CHIBI.legs + CHIBI.torso,
  headCenterY: CHIBI.legs + CHIBI.torso + CHIBI.headTall * 0.48,
  headTopY: CHIBI.totalHeight,
} as const;

export const CHARACTER_PIVOT_Y = CHIBI.totalHeight * 0.5;

export function capsuleCylinderLength(radius: number, targetHeight: number) {
  return Math.max(0.02, targetHeight - 2 * radius);
}
