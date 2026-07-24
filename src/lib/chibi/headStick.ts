/**
 * Dynamic "sticky" head yaw for the fixed iso camera.
 *
 * The head keeps looking a little more toward the camera than the body does,
 * keyed purely to body yaw so it applies no matter how the sprite is rotated
 * (facing preset, drag, or turntable).
 *
 * Body forward is +Z; dead-front toward the camera is yaw = π/4 ("down"), and
 * fully away is yaw = 5π/4 ("up"). Let β be the signed body yaw measured from
 * dead-front, wrapped to (−π, π]. The extra head yaw δ (added on top of the
 * body yaw) is odd in β — the head always leans toward the camera azimuth:
 *
 *   β = 0        (down, dead-front)         → δ = 0        (head in sync)
 *   |β| = π/4    (toward-bl / toward-br)     → δ ≈ ±FRONT   (very slight lean)
 *   |β| = 3π/4   (away-tl / away-tr, ¾ back) → δ ≈ ±MAX     (look over shoulder)
 *   |β| = π      (up, fully away)            → δ = 0        (face perfectly north)
 *
 * The magnitude curve is built from half-cosine easings so δ (and its slope)
 * is continuous everywhere — no visible kink while dragging or spinning.
 */

/** Body yaw that points dead-front at the iso camera ("down" preset). */
export const CAMERA_YAW = Math.PI / 4;

/** Very slight lean toward camera at the toward-bl / toward-br facings (~16°). */
export const HEAD_STICKY_FRONT = 0.28;

/**
 * Peak over-the-shoulder lean at the away three-quarter facings (~60°).
 * Tuned so a single eye stays just barely visible at away-tl / away-tr — the
 * near-eye plane is close to edge-on there, so this last couple of degrees is
 * what keeps it on-screen.
 */
export const HEAD_STICKY_MAX = 1.05;

const QUARTER = Math.PI / 4; // |β| at the toward three-quarters
const THREE_QUARTER = (3 * Math.PI) / 4; // |β| at the away three-quarters
const HALF = Math.PI; // |β| when fully away

/** Half-cosine ease on [0,1] — zero value and zero slope at both ends. */
function ease(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return 0.5 * (1 - Math.cos(Math.PI * c));
}

/** Wrap an angle (radians) to (−π, π]. */
function wrapPi(a: number): number {
  const x = ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  return x - Math.PI;
}

/**
 * Turn magnitude for a given |β|:
 *   0 → 0, π/4 → FRONT, 3π/4 → MAX, π → 0.
 * Slope is zero at every control point, so the joined curve is C¹.
 */
function turnMagnitude(absBeta: number): number {
  if (absBeta <= QUARTER) {
    return HEAD_STICKY_FRONT * ease(absBeta / QUARTER);
  }
  if (absBeta <= THREE_QUARTER) {
    return (
      HEAD_STICKY_FRONT +
      (HEAD_STICKY_MAX - HEAD_STICKY_FRONT) *
        ease((absBeta - QUARTER) / (THREE_QUARTER - QUARTER))
    );
  }
  return HEAD_STICKY_MAX * (1 - ease((absBeta - THREE_QUARTER) / (HALF - THREE_QUARTER)));
}

/**
 * Extra head yaw (radians) to add on top of the body yaw so the head stays
 * "sticky" toward the camera. Positive turns the head toward +X.
 */
export function stickyHeadYaw(bodyYaw: number): number {
  const beta = wrapPi(bodyYaw - CAMERA_YAW);
  const mag = turnMagnitude(Math.abs(beta));
  // Right of dead-front (β > 0): turn toward camera is negative yaw, and vice
  // versa. Math.sign(0) === 0 keeps the head perfectly in sync at dead-front.
  return -Math.sign(beta) * mag;
}
