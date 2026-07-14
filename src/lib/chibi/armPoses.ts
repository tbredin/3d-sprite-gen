import type { ArmPose } from "./types";

/** Per-side shoulder Euler (radians) + elbow bend around local X (negative = flex). */
export type ArmSideJoints = {
  shoulder: { x: number; y: number; z: number };
  /** Elbow flexion; ~0 straight, ~-1.4 bent. */
  elbow: number;
  /** Optional wrist twist for held props. */
  wrist?: { x?: number; y?: number; z?: number };
};

/**
 * Combat-ready JRPG poses for two-bone arms.
 * `side` is +1 (right) or -1 (left) so flares mirror.
 */
export function armJointsForPose(pose: ArmPose, side: 1 | -1): ArmSideJoints {
  switch (pose) {
    case "ready":
      // Asymmetric duel stance: weapon-side forward, offhand raised.
      return {
        shoulder: {
          x: side > 0 ? -0.55 : -0.35,
          y: side * (side > 0 ? 0.35 : -0.45),
          z: side * (side > 0 ? 0.7 : 0.95),
        },
        elbow: side > 0 ? -0.75 : -1.35,
        wrist: {
          x: side > 0 ? -0.2 : -0.1,
          y: side * 0.25,
          z: side * (side > 0 ? -0.15 : 0.2),
        },
      };
    case "hang":
      return {
        shoulder: { x: 0.05, y: 0, z: side * 0.22 },
        elbow: -0.25,
      };
    case "walk":
      return {
        shoulder: { x: side > 0 ? 0.4 : -0.2, y: 0, z: side * 0.3 },
        elbow: -0.6,
      };
    case "extended":
      return {
        shoulder: { x: -0.5, y: side * 0.22, z: side * 0.95 },
        elbow: -0.5,
        wrist: { x: -0.25, z: side * -0.15 },
      };
    case "reach":
      return {
        shoulder: { x: -0.9, y: side * 0.12, z: side * 0.5 },
        elbow: -0.7,
        wrist: { x: -0.3 },
      };
    case "akimbo":
      return {
        shoulder: { x: 0.3, y: -side * 0.4, z: side * 0.8 },
        elbow: -1.5,
        wrist: { y: side * 0.3 },
      };
    case "raise":
      return {
        shoulder: { x: -1.3, y: side * 0.1, z: side * 0.35 },
        elbow: -0.6,
        wrist: { x: -0.2 },
      };
    case "salute":
      return {
        shoulder: { x: -1.05, y: -side * 0.25, z: side * 0.15 },
        elbow: -1.65,
        wrist: { z: side * 0.2 },
      };
    case "cast":
      return {
        shoulder: { x: -1.0, y: side * 0.5, z: side * 0.45 },
        elbow: -0.8,
        wrist: { x: -0.4, y: side * 0.25 },
      };
    case "guard":
      return {
        shoulder: { x: -0.25, y: -side * 0.55, z: side * 0.9 },
        elbow: -1.55,
        wrist: { y: side * 0.4, z: side * -0.2 },
      };
    case "idle":
    default:
      // Idle = combat ready (default for sprites).
      return armJointsForPose("ready", side);
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
