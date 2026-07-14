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
 * Defaults lean combat-ready, not parade rest.
 */
export function legJointsForPose(pose: LegPose, side: 1 | -1): LegSideJoints {
  switch (pose) {
    case "ready":
      // Weight on back foot, front foot angled — JRPG battle idle.
      if (side < 0) {
        return {
          hip: { x: -0.35, y: 0, z: side * 0.22 },
          knee: 0.35,
          foot: { x: 0.08, y: side * 0.15 },
        };
      }
      return {
        hip: { x: 0.28, y: 0, z: side * 0.28 },
        knee: 0.55,
        foot: { x: -0.05, y: side * 0.1 },
      };
    case "wide":
      return {
        hip: { x: 0.08, y: 0, z: side * 0.42 },
        knee: 0.28,
        foot: { x: -0.05 },
      };
    case "walk":
      if (side < 0) {
        return {
          hip: { x: -0.48, y: 0, z: side * 0.1 },
          knee: 0.4,
          foot: { x: 0.12 },
        };
      }
      return {
        hip: { x: 0.42, y: 0, z: side * 0.1 },
        knee: 0.6,
        foot: { x: -0.06 },
      };
    case "stride":
      if (side < 0) {
        return {
          hip: { x: -0.7, y: 0, z: side * 0.12 },
          knee: 0.32,
          foot: { x: 0.15 },
        };
      }
      return {
        hip: { x: 0.58, y: 0, z: side * 0.12 },
        knee: 0.9,
        foot: { x: -0.1 },
      };
    case "crouch":
      return {
        hipY: -0.14,
        hip: { x: -0.55, y: 0, z: side * 0.22 },
        knee: 1.4,
        foot: { x: 0.28 },
      };
    case "lunge":
      if (side < 0) {
        return {
          hip: { x: -0.8, y: 0, z: side * 0.14 },
          knee: 0.3,
          foot: { x: 0.14 },
        };
      }
      return {
        hip: { x: 0.58, y: 0, z: side * 0.14 },
        knee: 1.1,
        foot: { x: -0.05 },
      };
    case "kneel":
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
      return legJointsForPose("ready", side);
  }
}

export const COMBAT_LEG_POSES: LegPose[] = [
  "ready",
  "wide",
  "stride",
  "crouch",
  "lunge",
  "walk",
];

export const LEG_POSES: LegPose[] = [
  "stand",
  "ready",
  "wide",
  "walk",
  "stride",
  "crouch",
  "lunge",
  "kneel",
];
