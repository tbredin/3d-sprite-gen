/**
 * Declarative character spec — designed so an LLM can emit this JSON
 * (or a series of part-generator calls that assemble into it).
 */

export type HairStyle =
  | "bald"
  | "bowl"
  | "bob"
  | "spiky"
  | "mohawk"
  | "ponytail"
  | "long"
  | "afro"
  | "bun"
  | "braid"
  | "undercut"
  | "curls"
  | "topknot"
  | "fringe"
  | "twinTails";

export type HelmetStyle = "none" | "knight" | "cap" | "sciFi" | "hood";

export type TorsoStyle =
  | "plain"
  | "robe"
  | "hoodedRobe"
  | "chestplate"
  | "fullPlate"
  | "jacket"
  | "tank";

export type ArmPose =
  | "idle"
  | "ready"
  | "hang"
  | "walk"
  | "extended"
  | "reach"
  | "akimbo"
  | "raise"
  | "salute"
  | "cast"
  | "guard";

export type LegPose =
  | "stand"
  | "ready"
  | "wide"
  | "walk"
  | "stride"
  | "crouch"
  | "lunge"
  | "kneel";

export type WeaponType = "none" | "sword" | "staff" | "rifle" | "shield";

/** Soft lower garment — fills the silhouette under a short torso. */
export type HemStyle = "none" | "skirt" | "loincloth";

export type CharacterSpec = {
  skin: string;
  head?: {
    /** Egg-shaped JRPG head scale (slightly under hair shell). */
    scale?: number;
  };
  hair?: {
    style: HairStyle;
    color: string;
    /** Spike / volume density 1–8 — hair should dominate silhouette. */
    complexity?: number;
  };
  helmet?: {
    style: HelmetStyle;
    color: string;
    visor?: string;
  };
  face?: {
    eyeColor?: string;
    /** Soft sphere nose. */
    nose?: boolean;
  };
  torso: {
    style: TorsoStyle;
    color: string;
    trim?: string;
  };
  /** Optional skirt / loincloth / cape — often present on JRPG chibis. */
  accessories?: {
    hem?: HemStyle;
    hemColor?: string;
    cape?: boolean;
    capeColor?: string;
  };
  arms: {
    pose: ArmPose;
    sleeveColor?: string;
    /** Sleeve ends at fraction of arm: 0 shoulder, 1 wrist. */
    sleeveLength?: number;
    handColor?: string;
  };
  legs: {
    pose: LegPose;
    pantColor: string;
    bootColor: string;
  };
  weapon?: {
    type: WeaponType;
    hand?: "left" | "right";
    color: string;
  };
};

export type PresetId =
  | "mage"
  | "knight"
  | "soldier"
  | "rogue"
  | "scientist"
  | "cleric"
  | "ranger"
  | "barbarian"
  | "acolyte"
  | "pirate";

export const PRESET_IDS: PresetId[] = [
  "mage",
  "knight",
  "soldier",
  "rogue",
  "scientist",
  "cleric",
  "ranger",
  "barbarian",
  "acolyte",
  "pirate",
];
