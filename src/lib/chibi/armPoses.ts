import type { ArmPose } from "./types";
import { DEFAULT_LEAD, leadSign, type LeadSide } from "./stance";

/** Per-side shoulder Euler (radians) + elbow bend around local X (negative = flex). */
export type ArmSideJoints = {
  shoulder: { x: number; y: number; z: number };
  /** Elbow flexion; ~0 straight, ~-1.4 bent. */
  elbow: number;
  /** Optional wrist twist for held props. */
  wrist?: { x?: number; y?: number; z?: number };
};

/**
 * Combat-ready JRPG arms for two-bone limbs.
 *
 * Silhouette stance: lead arm forward (extends weapon mass); trail arm back and
 * lower (shield nests closer). `side` +1 = character right. All named poses
 * stay inside this language — they exaggerate lead/trail, not undo it.
 */
export function armJointsForPose(
  pose: ArmPose,
  side: 1 | -1,
  lead: LeadSide = DEFAULT_LEAD,
): ArmSideJoints {
  const isLead = side === leadSign(lead);

  switch (pose) {
    case "ready":
    case "idle":
      return isLead
        ? {
            // Forward punch-line — clear depth past the chest edge.
            shoulder: { x: -1.05, y: side * 0.55, z: side * 0.42 },
            elbow: -0.35,
            wrist: { x: -0.55, y: side * 0.25, z: side * -0.15 },
          }
        : {
            // Trail: back and lower, elbow tucked.
            shoulder: { x: 0.28, y: -side * 0.45, z: side * 0.88 },
            elbow: -1.15,
            wrist: { x: 0.1, y: side * 0.2, z: side * 0.3 },
          };

    case "hang":
      // Soft hang still keeps lead slightly ahead of trail.
      return isLead
        ? {
            shoulder: { x: -0.2, y: side * 0.12, z: side * 0.28 },
            elbow: -0.35,
          }
        : {
            shoulder: { x: 0.18, y: -side * 0.08, z: side * 0.32 },
            elbow: -0.45,
          };

    case "walk":
      return isLead
        ? {
            shoulder: { x: -0.75, y: side * 0.2, z: side * 0.4 },
            elbow: -0.55,
          }
        : {
            shoulder: { x: 0.35, y: -side * 0.15, z: side * 0.45 },
            elbow: -0.7,
          };

    case "extended":
      // Lead locked out toward +Z; trail counterweight low.
      return isLead
        ? {
            shoulder: { x: -1.25, y: side * 0.4, z: side * 0.35 },
            elbow: -0.15,
            wrist: { x: -0.5, z: side * -0.15 },
          }
        : {
            shoulder: { x: 0.4, y: -side * 0.5, z: side * 0.92 },
            elbow: -1.2,
            wrist: { x: 0.12, y: side * 0.22 },
          };

    case "reach":
      return isLead
        ? {
            shoulder: { x: -1.35, y: side * 0.32, z: side * 0.32 },
            elbow: -0.3,
            wrist: { x: -0.55 },
          }
        : {
            shoulder: { x: 0.15, y: -side * 0.4, z: side * 0.82 },
            elbow: -1.05,
            wrist: { x: 0.08 },
          };

    case "akimbo":
      // Fists near hips but still lead-forward / trail-back asymmetry.
      return isLead
        ? {
            shoulder: { x: -0.15, y: -side * 0.25, z: side * 0.7 },
            elbow: -1.45,
            wrist: { y: side * 0.25 },
          }
        : {
            shoulder: { x: 0.45, y: -side * 0.5, z: side * 0.95 },
            elbow: -1.55,
            wrist: { y: side * 0.35 },
          };

    case "raise":
      // Lead high-forward (axe / signal); trail anchors low-back.
      return isLead
        ? {
            shoulder: { x: -1.45, y: side * 0.2, z: side * 0.3 },
            elbow: -0.45,
            wrist: { x: -0.25 },
          }
        : {
            shoulder: { x: 0.3, y: -side * 0.4, z: side * 0.85 },
            elbow: -1.15,
            wrist: { x: 0.05 },
          };

    case "salute":
      return isLead
        ? {
            shoulder: { x: -1.15, y: -side * 0.15, z: side * 0.2 },
            elbow: -1.55,
            wrist: { z: side * 0.2 },
          }
        : {
            shoulder: { x: 0.2, y: -side * 0.3, z: side * 0.7 },
            elbow: -1.0,
          };

    case "cast":
      // Lead thrusts staff/orb forward-up; trail open low behind.
      return isLead
        ? {
            shoulder: { x: -1.2, y: side * 0.55, z: side * 0.38 },
            elbow: -0.55,
            wrist: { x: -0.45, y: side * 0.3 },
          }
        : {
            shoulder: { x: 0.18, y: -side * 0.45, z: side * 0.75 },
            elbow: -1.05,
            wrist: { x: 0.05, y: side * 0.15 },
          };

    case "guard":
      // Lead weapon still forward; trail (shield) lower + closer to ribs.
      return isLead
        ? {
            shoulder: { x: -0.75, y: side * 0.4, z: side * 0.5 },
            elbow: -0.65,
            wrist: { x: -0.25, y: side * 0.2 },
          }
        : {
            shoulder: { x: -0.05, y: -side * 0.6, z: side * 0.95 },
            elbow: -1.4,
            wrist: { y: side * 0.45, z: side * -0.15 },
          };

    default:
      return armJointsForPose("ready", side, lead);
  }
}

/** Poses biased for battle sprites — soft hang/idle left out of pick lists. */
export const COMBAT_ARM_POSES: ArmPose[] = [
  "ready",
  "extended",
  "reach",
  "akimbo",
  "raise",
  "cast",
  "guard",
];

export const ARM_POSES: ArmPose[] = [
  "idle",
  "ready",
  "hang",
  "walk",
  "extended",
  "reach",
  "akimbo",
  "raise",
  "salute",
  "cast",
  "guard",
];
