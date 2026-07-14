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
 * Grounded combat-ready stance — both feet planted, soft A-frame.
 * Motion poses (walk/stride/lunge/crouch) alias here so sprites never float.
 */
export function legJointsForPose(pose: LegPose, side: 1 | -1): LegSideJoints {
  void pose;
  // Symmetric plant: identical knee bend, mirrored hip Z only.
  // Foot pitch counters thigh lean so soles sit on the ground plane.
  return {
    hip: { x: 0.08, y: 0, z: side * 0.2 },
    knee: 0.28,
    foot: { x: -0.1, y: side * 0.04 },
  };
}

/** Always ready — clothing carries variety, not locomotion poses. */
export const COMBAT_LEG_POSES: LegPose[] = ["ready"];

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
