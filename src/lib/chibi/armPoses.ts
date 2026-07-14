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
 * Common poses for two-bone arms. `side` is +1 (right) or -1 (left)
 * so z/y flares mirror correctly.
 */
export function armJointsForPose(pose: ArmPose, side: 1 | -1): ArmSideJoints {
  switch (pose) {
    case "hang":
      return {
        shoulder: { x: 0.08, y: 0, z: side * 0.18 },
        elbow: -0.12,
      };
    case "walk":
      // Opposite swing hint — both sides get a mild ready bend.
      return {
        shoulder: { x: side > 0 ? 0.35 : -0.15, y: 0, z: side * 0.25 },
        elbow: -0.55,
      };
    case "extended":
      // Reach out holding a weapon forward.
      return {
        shoulder: { x: -0.45, y: side * 0.2, z: side * 0.9 },
        elbow: -0.45,
        wrist: { x: -0.2, z: side * -0.15 },
      };
    case "reach":
      return {
        shoulder: { x: -0.85, y: side * 0.1, z: side * 0.45 },
        elbow: -0.65,
        wrist: { x: -0.25 },
      };
    case "akimbo":
      return {
        shoulder: { x: 0.35, y: -side * 0.35, z: side * 0.75 },
        elbow: -1.45,
        wrist: { y: side * 0.3 },
      };
    case "raise":
      return {
        shoulder: { x: -1.35, y: 0, z: side * 0.28 },
        elbow: -0.55,
        wrist: { x: -0.15 },
      };
    case "salute":
      return {
        shoulder: { x: -1.05, y: -side * 0.25, z: side * 0.15 },
        elbow: -1.65,
        wrist: { z: side * 0.2 },
      };
    case "cast":
      return {
        shoulder: { x: -0.95, y: side * 0.45, z: side * 0.4 },
        elbow: -0.75,
        wrist: { x: -0.35, y: side * 0.2 },
      };
    case "guard":
      // Crossed / protective bend in front of torso.
      return {
        shoulder: { x: -0.2, y: -side * 0.55, z: side * 0.85 },
        elbow: -1.55,
        wrist: { y: side * 0.4, z: side * -0.2 },
      };
    case "idle":
    default:
      return {
        shoulder: { x: 0.22, y: 0, z: side * 0.22 },
        elbow: -0.4,
      };
  }
}

export const ARM_POSES: ArmPose[] = [
  "idle",
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
