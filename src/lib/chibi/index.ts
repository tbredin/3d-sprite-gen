/**
 * Tool-style generators for an LLM to call.
 * Each returns a partial CharacterSpec merge — assembleCharacter composes the full mesh.
 *
 * Example agent plan:
 *   setSkin("#e4a672")
 *   generateHair({ style: "spiky", color: "#ff0000", complexity: 5 })
 *   generateHelmet({ style: "sciFi", color: "#333", visor: "#0f0" })
 *   generateTorso({ style: "chestplate", color: "#00ff00" })
 *   generateLeftArm…  (arms are paired via generateArms for symmetry)
 */

import type {
  ArmPose,
  CharacterSpec,
  HairStyle,
  HelmetStyle,
  HemStyle,
  LegPose,
  TorsoStyle,
  WeaponType,
} from "./types";

export function setSkin(color: string): Pick<CharacterSpec, "skin"> {
  return { skin: color };
}

export function generateHair(
  style: HairStyle,
  color: string,
  complexity = 4,
): Pick<CharacterSpec, "hair"> {
  return { hair: { style, color, complexity } };
}

export function generateHelmet(
  style: HelmetStyle,
  color: string,
  visor?: string,
): Pick<CharacterSpec, "helmet"> {
  return { helmet: { style, color, visor } };
}

export function generateTorso(
  style: TorsoStyle,
  color: string,
  trim?: string,
): Pick<CharacterSpec, "torso"> {
  return { torso: { style, color, trim } };
}

/** Soft skirt / loincloth / cape extras. */
export function generateAccessories(opts: {
  hem?: HemStyle;
  hemColor?: string;
  cape?: boolean;
  capeColor?: string;
}): Pick<CharacterSpec, "accessories"> {
  return { accessories: opts };
}

export function generateArms(opts: {
  pose: ArmPose;
  sleeveColor?: string;
  sleeveLength?: number;
  handColor?: string;
}): Pick<CharacterSpec, "arms"> {
  return { arms: opts };
}

export function generateLegs(
  pantColor: string,
  bootColor: string,
  pose: LegPose = "stand",
): Pick<CharacterSpec, "legs"> {
  return { legs: { pose, pantColor, bootColor } };
}

export function generateWeapon(
  type: WeaponType,
  color: string,
  hand: "left" | "right" = "right",
): Pick<CharacterSpec, "weapon"> {
  return { weapon: { type, color, hand } };
}

/** Merge tool outputs into one CharacterSpec (later defaults fill gaps). */
export function mergeSpec(
  base: CharacterSpec,
  ...parts: Partial<CharacterSpec>[]
): CharacterSpec {
  return Object.assign(structuredClone(base), ...parts);
}

export {
  assembleCharacter,
  getPreset,
  PRESETS,
} from "./assemble";
export { randomCharacter, rerollPart, rerollPartColors, PART_IDS, EMPTY_LOCKS } from "./random";
export type { PartId, PartLocks } from "./random";
export { ARM_POSES, COMBAT_ARM_POSES, armJointsForPose } from "./armPoses";
export { LEG_POSES, COMBAT_LEG_POSES, legJointsForPose } from "./legPoses";
export type {
  CharacterSpec,
  PresetId,
  ArmPose,
  LegPose,
  HemStyle,
} from "./types";
export { PRESET_IDS } from "./types";
