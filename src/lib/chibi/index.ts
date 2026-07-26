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
  BackLoadout,
  BodyDetailStyle,
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
  detailStyle?: BodyDetailStyle,
  detailColor?: string,
): Pick<CharacterSpec, "torso"> {
  return { torso: { style, color, trim, detailStyle, detailColor } };
}

/** Soft skirt / loincloth / cape / back gear extras. */
export function generateAccessories(opts: {
  hem?: HemStyle;
  hemColor?: string;
  cape?: boolean;
  capeColor?: string;
  pouches?: boolean;
  pouchColor?: string;
  backLoadout?: BackLoadout;
  backLoadoutColor?: string;
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
  OFFHAND_VARIANT_IDS,
  setOffhandVariant,
  getOffhandVariant,
} from "./assemble";
export type { AssembleOptions, PartVisibility } from "./assemble";
export { DEFAULT_PART_VISIBILITY } from "./assemble";
export { applySpriteFaceCheat } from "./faceCheat";
export {
  stickyHeadYaw,
  CAMERA_YAW,
  HEAD_STICKY_FRONT,
  HEAD_STICKY_MAX,
} from "./headStick";
export {
  HELMET_CATALOG,
  helmetModeFor,
  isHeadReplacement,
} from "./helmetMode";
export type { HelmetMount, HelmetMode } from "./helmetMode";
export {
  randomCharacter,
  randomBodyScale,
  randomCoupledProportions,
  rerollPart,
  rerollField,
  rerollPartColors,
  rerollEyes,
  PART_IDS,
  EMPTY_LOCKS,
  EMPTY_FIELD_LOCKS,
  FIELD_LOCK_PART,
  isFieldLocked,
  setFaction,
  rerollFaction,
} from "./random";
export type {
  PartId,
  PartLocks,
  FieldLockId,
  FieldLocks,
  RandomOptions,
  HeadProportions,
} from "./random";
export {
  FACTION_THEMES,
  factionTheme,
  factionPromptBit,
} from "./factions";
export {
  loadCharacterPersist,
  saveCharacterPersist,
  sanitizeCharacterSpec,
} from "./characterPersist";
export type { PersistedCharacter } from "./characterPersist";
export { ARM_POSES, COMBAT_ARM_POSES, armJointsForPose } from "./armPoses";
export { LEG_POSES, COMBAT_LEG_POSES, legJointsForPose } from "./legPoses";
export {
  DEFAULT_LEAD,
  TORSO_YAW,
  LEGS_YAW_FRAC,
  leadSign,
  resolveLeadSide,
  oppositeLeadSide,
  torsoYawForLead,
  legsYawForLead,
} from "./stance";
export type { LeadSide } from "./stance";
export type {
  CharacterSpec,
  PresetId,
  ArmPose,
  LegPose,
  HemStyle,
  BackLoadout,
  HeadShape,
} from "./types";
export {
  PRESET_IDS,
  PRESET_LABELS,
  HEAD_SHAPES,
  EYE_STYLES,
  BROW_STYLES,
  HAIR_STYLES,
  HELMET_STYLES,
  TORSO_STYLES,
  BODY_DETAIL_STYLES,
  HEM_STYLES,
  WEAPON_TYPES,
  OFFHAND_TYPES,
  TWO_HANDED_TYPES,
  BACK_LOADOUTS,
  FACTION_IDS,
  FACTION_LABELS,
} from "./types";
export type {
  EyeStyle,
  BrowStyle,
  HairStyle,
  HelmetStyle,
  TorsoStyle,
  BodyDetailStyle,
  WeaponType,
  FactionId,
} from "./types";
export {
  setHeadShape,
  setEyeStyle,
  setBrowStyle,
  setHairStyle,
  setHelmetStyle,
  setTorsoStyle,
  setBodyDetailStyle,
  setHemStyle,
  setCape,
  setPouches,
  setBackLoadout,
  setArmPose,
  setWeaponType,
  setOffhandType,
  setLegPose,
} from "./random";
export {
  applyBodyScale,
  applyBodyProfile,
  BODY_SCALE_MIN,
  BODY_SCALE_MAX,
  BODY_SCALE_DEFAULT,
  BODY_PROFILE_IDS,
  BODY_PROFILES,
  loadBodyScale,
  saveBodyScale,
  loadBodyProfile,
  saveBodyProfile,
  clampBodyScale,
  type BodyProfileId,
} from "./units";
