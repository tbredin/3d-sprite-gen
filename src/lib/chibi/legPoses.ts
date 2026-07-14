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
 * Planted combat stances — both feet on the ground, ipsilateral with arm lead.
 *
 * Convention: side +1 = character right. Positive hip.x swings the thigh
 * forward (toward +Z); mirrored hip.z opens the A-frame. Lead foot matches
 * the forward hand; trail sits clearly back so the 42px silhouette isn't a
 * glued pillar.
 */
export function legJointsForPose(
  pose: LegPose,
  side: 1 | -1,
  lead: LeadSide = DEFAULT_LEAD,
): LegSideJoints {
  const isLead = side === leadSign(lead);

  switch (pose) {
    case "stand":
      // Tall plant — still a soft lead/trail so stance reads.
      return {
        hip: {
          x: isLead ? 0.22 : -0.06,
          y: side * 0.04,
          z: side * 0.2,
        },
        knee: isLead ? 0.18 : 0.14,
        foot: { x: isLead ? -0.12 : -0.06, y: side * 0.03 },
      };

    case "wide":
      // Broad guard base — exaggerated A-frame + lead step.
      return {
        hipY: -0.02,
        hip: {
          x: isLead ? 0.32 : -0.05,
          y: side * 0.06,
          z: side * 0.48,
        },
        knee: isLead ? 0.42 : 0.36,
        foot: { x: isLead ? -0.2 : -0.12, y: side * 0.1 },
      };

    case "crouch":
      // Low ready — deep knees, lead still edged forward.
      return {
        hipY: -0.14,
        hip: {
          x: isLead ? 0.5 : 0.18,
          y: side * 0.05,
          z: side * 0.34,
        },
        knee: isLead ? 1.05 : 0.95,
        foot: { x: isLead ? -0.65 : -0.55, y: side * 0.05 },
      };

    case "guard":
      // Compact braced crouch with clear lead foot.
      return {
        hipY: -0.08,
        hip: {
          x: isLead ? 0.38 : 0.08,
          y: isLead ? side * 0.08 : side * 0.04,
          z: side * 0.3,
        },
        knee: isLead ? 0.7 : 0.58,
        foot: { x: isLead ? -0.42 : -0.32, y: side * 0.05 },
      };

    case "lunge":
      // Long planted duel step — lead deep forward, trail planted back.
      return {
        hipY: -0.05,
        hip: {
          x: isLead ? 0.58 : -0.18,
          y: isLead ? side * 0.14 : -side * 0.1,
          z: side * 0.24,
        },
        knee: isLead ? 0.62 : 0.55,
        foot: {
          x: isLead ? -0.42 : -0.3,
          y: side * 0.04,
        },
      };

    case "kneel":
      // Asymmetric kneel: trail deep, lead still planted (no float).
      return {
        hipY: isLead ? -0.06 : -0.16,
        hip: {
          x: isLead ? 0.4 : 0.55,
          y: isLead ? side * 0.1 : -side * 0.08,
          z: side * 0.24,
        },
        knee: isLead ? 0.55 : 1.35,
        foot: {
          x: isLead ? -0.35 : -0.85,
          y: side * 0.04,
        },
      };

    case "walk":
    case "stride":
      // Locomotion aliases → combat ready (sprites stay planted).
      return legJointsForPose("ready", side, lead);

    case "ready":
    default:
      // Fighting ready: soft crouch, lead foot edged forward for iso read.
      return {
        hipY: -0.03,
        hip: {
          x: isLead ? 0.4 : -0.08,
          y: isLead ? side * 0.12 : -side * 0.08,
          z: side * 0.28,
        },
        knee: isLead ? 0.52 : 0.42,
        foot: {
          x: isLead ? -0.34 : -0.22,
          y: side * 0.05,
        },
      };
  }
}

/** Planted combat stances used by random / presets. */
export const COMBAT_LEG_POSES: LegPose[] = [
  "ready",
  "wide",
  "guard",
  "crouch",
  "lunge",
  "stand",
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
