import type { LegPose } from "./types";
import { DEFAULT_LEAD, leadSign, type LeadSide } from "./stance";

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
 * Planted combat stances — both feet flat on the ground, ipsilateral with arm lead.
 *
 * No running / jumping silhouettes: locomotion aliases collapse to ready, and
 * every named pose keeps soles countered so heels don't lift. Soft crouch /
 * duel-step variants stay inside a ready A-frame (width > depth).
 *
 * Convention: side +1 = character right. Positive hip.x swings the thigh
 * forward (toward +Z); mirrored hip.z opens the A-frame. Lead foot matches
 * the forward hand; trail sits clearly back + wider.
 */
export function legJointsForPose(
  pose: LegPose,
  side: 1 | -1,
  lead: LeadSide = DEFAULT_LEAD,
): LegSideJoints {
  const isLead = side === leadSign(lead);
  /** Trail opens a touch wider than lead so the tucked foot clears the torso. */
  const aFrame = (leadZ: number, trailZ: number) =>
    side * (isLead ? leadZ : trailZ);

  switch (pose) {
    case "stand":
      // Tall plant — soft lead/trail, both soles flat.
      return {
        hip: {
          x: isLead ? 0.16 : -0.12,
          y: side * 0.04,
          z: aFrame(0.22, 0.3),
        },
        knee: isLead ? 0.14 : 0.12,
        foot: { x: isLead ? -0.1 : -0.06, y: side * 0.05 },
      };

    case "wide":
      // Broad guard base — still planted, shy of a split.
      return {
        hipY: -0.02,
        hip: {
          x: isLead ? 0.24 : -0.1,
          y: side * 0.05,
          z: aFrame(0.38, 0.46),
        },
        knee: isLead ? 0.32 : 0.28,
        foot: { x: isLead ? -0.18 : -0.12, y: side * 0.1 },
      };

    case "crouch":
      // Low ready — knees bent but both feet stay planted (no hop / jump).
      return {
        hipY: -0.08,
        hip: {
          x: isLead ? 0.28 : -0.06,
          y: side * 0.04,
          z: aFrame(0.3, 0.38),
        },
        knee: isLead ? 0.7 : 0.62,
        foot: { x: isLead ? -0.42 : -0.36, y: side * 0.06 },
      };

    case "guard":
      // Compact braced plant with clear lead foot + slightly wider trail.
      return {
        hipY: -0.04,
        hip: {
          x: isLead ? 0.26 : -0.04,
          y: isLead ? side * 0.06 : side * 0.04,
          z: aFrame(0.26, 0.34),
        },
        knee: isLead ? 0.48 : 0.4,
        foot: { x: isLead ? -0.28 : -0.22, y: side * 0.06 },
      };

    case "lunge":
      // Short duel step — lead edged forward, trail still planted (not airborne).
      return {
        hipY: -0.03,
        hip: {
          x: isLead ? 0.34 : -0.18,
          y: isLead ? side * 0.1 : -side * 0.08,
          z: aFrame(0.24, 0.34),
        },
        knee: isLead ? 0.42 : 0.36,
        foot: {
          x: isLead ? -0.28 : -0.2,
          y: side * 0.05,
        },
      };

    case "kneel":
      // Asymmetric kneel: trail deep, lead still planted (no float).
      return {
        hipY: isLead ? -0.04 : -0.12,
        hip: {
          x: isLead ? 0.28 : 0.4,
          y: isLead ? side * 0.08 : -side * 0.06,
          z: aFrame(0.24, 0.32),
        },
        knee: isLead ? 0.4 : 1.15,
        foot: {
          x: isLead ? -0.28 : -0.7,
          y: side * 0.05,
        },
      };

    case "walk":
    case "stride":
      // Locomotion aliases → combat ready (sprites stay planted, never mid-stride).
      return legJointsForPose("ready", side, lead);

    case "ready":
    default:
      // Fighting ready: soft crouch, width > depth, one foot forward, both planted.
      return {
        hipY: -0.02,
        hip: {
          x: isLead ? 0.26 : -0.16,
          y: isLead ? side * 0.1 : -side * 0.08,
          z: aFrame(0.28, 0.36),
        },
        knee: isLead ? 0.38 : 0.32,
        foot: {
          x: isLead ? -0.24 : -0.16,
          y: side * 0.06,
        },
      };
  }
}

/** Planted combat stances used by random / presets — no hop / mid-stride looks. */
export const COMBAT_LEG_POSES: LegPose[] = [
  "ready",
  "wide",
  "guard",
  "stand",
  "lunge",
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
  "guard",
];
