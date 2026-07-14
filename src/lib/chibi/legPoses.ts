import type { LegPose } from "./types";

/** Per-side hip Euler + knee bend (local X). */
export type LegSideJoints = {
  /** Optional vertical hip drop (crouch / kneel). */
  hipY?: number;
  hip: { x: number; y: number; z: number };
  /** Knee flexion; 0 straight, larger positive = more bend. */
  knee: number;
  foot?: { x?: number; y?: number; z?: number };
};

/**
 * Stance / step poses for two-bone legs. `side` is +1 (right) or -1 (left).
 */
export function legJointsForPose(pose: LegPose, side: 1 | -1): LegSideJoints {
  switch (pose) {
    case "wide":
      return {
        hip: { x: 0.06, y: 0, z: side * 0.38 },
        knee: 0.22,
        foot: { x: -0.05 },
      };
    case "walk":
      // Opposite phase: left forward, right back.
      if (side < 0) {
        return {
          hip: { x: -0.42, y: 0, z: side * 0.08 },
          knee: 0.38,
          foot: { x: 0.1 },
        };
      }
      return {
        hip: { x: 0.38, y: 0, z: side * 0.08 },
        knee: 0.55,
        foot: { x: -0.05 },
      };
    case "stride":
      if (side < 0) {
        return {
          hip: { x: -0.65, y: 0, z: side * 0.1 },
          knee: 0.3,
          foot: { x: 0.15 },
        };
      }
      return {
        hip: { x: 0.55, y: 0, z: side * 0.1 },
        knee: 0.85,
        foot: { x: -0.1 },
      };
    case "crouch":
      return {
        hipY: -0.14,
        hip: { x: -0.5, y: 0, z: side * 0.18 },
        knee: 1.35,
        foot: { x: 0.25 },
      };
    case "lunge":
      // Left leads, right trails.
      if (side < 0) {
        return {
          hip: { x: -0.75, y: 0, z: side * 0.12 },
          knee: 0.28,
          foot: { x: 0.12 },
        };
      }
      return {
        hip: { x: 0.55, y: 0, z: side * 0.12 },
        knee: 1.05,
        foot: { x: -0.05 },
      };
    case "kneel":
      // Right knee down, left more upright.
      if (side > 0) {
        return {
          hipY: -0.1,
          hip: { x: 0.95, y: 0, z: side * 0.12 },
          knee: 1.7,
          foot: { x: -0.35 },
        };
      }
      return {
        hipY: -0.1,
        hip: { x: -0.25, y: 0, z: side * 0.1 },
        knee: 0.45,
        foot: { x: 0.15 },
      };
    case "stand":
    default:
      return {
        hip: { x: 0.04, y: 0, z: side * 0.07 },
        knee: 0.12,
        foot: { x: 0.02 },
      };
  }
}

export const LEG_POSES: LegPose[] = [
  "stand",
  "wide",
  "walk",
  "stride",
  "crouch",
  "lunge",
  "kneel",
];
