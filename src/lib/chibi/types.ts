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
  | "twinTails"
  | "pixie"
  | "messy"
  | "dreads"
  | "mullet"
  | "pompadour"
  | "sidePart"
  | "wavy"
  | "anime"
  | "hime"
  | "odango"
  | "halfUp"
  | "layered"
  | "curtain"
  | "lob"
  | "spaceBuns"
  | "sidePonytail"
  | "pigtails"
  | "bubblePonytail"
  | "crownBraid"
  | "softWaves"
  | "bluntBangs"
  | "wolfCut"
  | "highPony"
  | "lowBun"
  | "ribbonTails"
  | "asymmetrical"
  | "ringlets"
  | "goddess";

export type HelmetStyle =
  | "none"
  | "knight"
  | "knightGreat"
  | "knightWinged"
  | "knightSallet"
  | "knightBarbute"
  | "knightBascinet"
  | "cap"
  | "sciFi"
  | "visor"
  | "goggles"
  | "astronautBubble"
  | "astronautFlat"
  | "astronautVintage"
  | "scouter"
  | "crown"
  | "king"
  | "princess"
  | "wizard"
  | "bandana"
  | "goat"
  | "pilot"
  | "samurai"
  | "viking"
  | "pharaoh"
  | "ninja";

export type TorsoStyle =
  | "plain"
  | "robe"
  | "hoodedRobe"
  | "chestplate"
  | "fullPlate"
  | "jacket"
  | "tank";

/**
 * Cartoon eye plate designs. Subtle variants of the classic 2-column plate —
 * modest horizontal / vertical leans for ~4–6 bake pixels at 48px.
 */
export type EyeStyle =
  | "classic"
  | "square"
  | "flat"
  | "lean"
  | "spark"
  | "lid";

/**
 * Subtle brow strokes above the eyes. `"none"` hides brows.
 * Kept thin so they read as 1–2 bake pixels at 48px.
 */
export type BrowStyle =
  | "none"
  | "thin"
  | "soft"
  | "angled"
  | "short"
  | "thick"
  | "arched";

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
  | "kneel"
  | "guard";

export type WeaponType =
  | "none"
  | "sword"
  | "staff"
  | "rifle"
  | "shield"
  | "axe"
  | "maul"
  | "spear"
  // Swords — one-handed blades with distinct guards / blade profiles.
  | "swordBroad"
  | "swordCurved"
  | "swordRapier"
  | "swordClaymore"
  // Short blades.
  | "dagger"
  | "daggerCurved"
  // Fist weapons — blades rake off a knuckle grip.
  | "claw"
  | "clawTwin"
  // Casters shorter than `staff`.
  | "wand"
  | "wandCrystal"
  // One-handed axes.
  | "axeBearded"
  | "axeHand"
  // Two-handed axes.
  | "greataxe"
  | "greataxeDouble"
  // Blunt.
  | "maulSpiked"
  | "hammer"
  | "hammerWar"
  | "hammerClub"
  // Polearms.
  | "spearBarbed"
  | "halberd"
  // Sidearms.
  | "pistol"
  | "pistolFlint"
  | "pistolHeavy"
  // Long guns.
  | "rifleLong"
  | "rifleCarbine";

/**
 * Locked soft-diamond (`lozenge`) plus character-inspired rebuilds
 * (mage, knight, …) for A/B presets.
 */
export type HeadShape =
  | "lozenge"
  | "mage"
  | "knight"
  | "soldier"
  | "rogue"
  | "scientist"
  | "cleric"
  | "ranger"
  | "barbarian"
  | "acolyte"
  | "pirate"
  | "goatman";

export const HEAD_SHAPES: HeadShape[] = [
  "lozenge",
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
  "goatman",
];

/** Soft lower garment — fills the silhouette under a short torso. */
export type HemStyle = "none" | "skirt" | "loincloth";

/**
 * Gear strapped to the back — must read in the default away / back-¾ facing
 * (packs, scabbards, bows, greatswords).
 */
export type BackLoadout =
  | "none"
  | "scabbard"
  | "greatsword"
  | "quiver"
  | "pack"
  | "axe";

export type CharacterSpec = {
  skin: string;
  /**
   * Ipsilateral fighting lead (hand + foot). Default `"right"`.
   * Drives torso ~45° yaw, arm asymmetry, and which foot is forward.
   */
  leadSide?: "left" | "right";
  head?: {
    /**
     * Skull shape. Default `"lozenge"` (locked classic↔slim midpoint).
     * Character names reuse archetype rebuilds (`mage`, `knight`, …).
     */
    shape?: HeadShape;
    /** Overall head scale (hair stays world-sized). */
    scale?: number;
    /**
     * Uniform scale of the complete head assembly (default 1).
     * Includes skull, face, hair, hats, and helmets. Pivots from the neck.
     */
    size?: number;
    /**
     * Extra vertical stretch on top of `size` (default 1).
     * Also pivots from the neck.
     */
    yScale?: number;
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
    /**
     * Mount mode is derived from style via `helmetModeFor` — closed helms
     * replace the skull; `cap` overlays. See
     * docs/SPIKE-helmet-head-replacements.md.
     */
  };
  face?: {
    /** Pixel-art eye plate design (default `"classic"`). */
    style?: EyeStyle;
    /** Subtle brow stroke above each eye (default `"none"`). */
    browStyle?: BrowStyle;
    eyeColor?: string;
    /**
     * Optional multiplier for eye layout (default 1).
     * Independent of `head.scale` so hair can stay fixed (scientist).
     */
    scale?: number;
    /**
     * Horizontal spacing between eyes (default 1).
     * Multiplies the art-directed baseline separation; independent of `scale`.
     */
    spacing?: number;
    /**
     * Vertical offset in face-pad height fractions (default 0).
     * Positive raises the eye row; negative lowers it. Added to the
     * art-directed baseline (`EYE_V_FRAC`).
     */
    y?: number;
  };
  torso: {
    style: TorsoStyle;
    color: string;
    trim?: string;
  };
  /** Optional skirt / loincloth / cape / back gear — often present on JRPG chibis. */
  accessories?: {
    hem?: HemStyle;
    hemColor?: string;
    cape?: boolean;
    capeColor?: string;
    /** Belt pouches / hip bags — silhouette break on the back and sides. */
    pouches?: boolean;
    pouchColor?: string;
    /** Strapped back gear — always visible from away facings. */
    backLoadout?: BackLoadout;
    backLoadoutColor?: string;
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
  /**
   * Trail-hand prop while the lead hand holds `weapon` (usually a shield).
   * Lets sword+shield read without replacing the lead blade.
   */
  offhand?: {
    type: WeaponType;
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
  | "pirate"
  | "goatman"
  | "greatKnight"
  | "wingedKnight"
  | "salletKnight"
  | "princess"
  | "king"
  | "pilot"
  | "samurai"
  | "viking"
  | "pharaoh"
  | "ninja";

/** Human-readable labels for the preset picker. */
export const PRESET_LABELS: Record<PresetId, string> = {
  mage: "mage",
  knight: "knight",
  soldier: "soldier",
  rogue: "rogue",
  scientist: "scientist",
  cleric: "cleric",
  ranger: "ranger",
  barbarian: "barbarian",
  acolyte: "acolyte",
  pirate: "pirate",
  goatman: "goatman",
  greatKnight: "great knight",
  wingedKnight: "winged knight",
  salletKnight: "sallet knight",
  princess: "princess",
  king: "king",
  pilot: "pilot",
  samurai: "samurai",
  viking: "viking",
  pharaoh: "pharaoh",
  ninja: "ninja",
};

/**
 * Ordered option lists for the per-part debug dropdowns (App "Parts" panel).
 * These mirror the union members so the UI can offer every named variant
 * directly instead of a blind reroll.
 */
export const EYE_STYLES: EyeStyle[] = [
  "classic",
  "square",
  "flat",
  "lean",
  "spark",
  "lid",
];

export const BROW_STYLES: BrowStyle[] = [
  "none",
  "thin",
  "soft",
  "angled",
  "short",
  "thick",
  "arched",
];

export const HAIR_STYLES: HairStyle[] = [
  "bald",
  "bowl",
  "bob",
  "spiky",
  "mohawk",
  "ponytail",
  "long",
  "afro",
  "bun",
  "braid",
  "undercut",
  "curls",
  "topknot",
  "fringe",
  "twinTails",
  "pixie",
  "messy",
  "dreads",
  "mullet",
  "pompadour",
  "sidePart",
  "wavy",
  "anime",
  "hime",
  "odango",
  "halfUp",
  "layered",
  "curtain",
  "lob",
  "spaceBuns",
  "sidePonytail",
  "pigtails",
  "bubblePonytail",
  "crownBraid",
  "softWaves",
  "bluntBangs",
  "wolfCut",
  "highPony",
  "lowBun",
  "ribbonTails",
  "asymmetrical",
  "ringlets",
  "goddess",
];

export const HELMET_STYLES: HelmetStyle[] = [
  "none",
  "knight",
  "knightGreat",
  "knightWinged",
  "knightSallet",
  "knightBarbute",
  "knightBascinet",
  "cap",
  "sciFi",
  "visor",
  "goggles",
  "astronautBubble",
  "astronautFlat",
  "astronautVintage",
  "scouter",
  "crown",
  "king",
  "princess",
  "wizard",
  "bandana",
  "goat",
  "pilot",
  "samurai",
  "viking",
  "pharaoh",
  "ninja",
];

export const TORSO_STYLES: TorsoStyle[] = [
  "plain",
  "robe",
  "hoodedRobe",
  "chestplate",
  "fullPlate",
  "jacket",
  "tank",
];

export const HEM_STYLES: HemStyle[] = ["none", "skirt", "loincloth"];

/** Picker order — grouped by family so siblings sit next to each other. */
export const WEAPON_TYPES: WeaponType[] = [
  "none",
  "sword",
  "swordBroad",
  "swordCurved",
  "swordRapier",
  "swordClaymore",
  "dagger",
  "daggerCurved",
  "claw",
  "clawTwin",
  "axe",
  "axeBearded",
  "axeHand",
  "greataxe",
  "greataxeDouble",
  "hammer",
  "hammerWar",
  "hammerClub",
  "maul",
  "maulSpiked",
  "spear",
  "spearBarbed",
  "halberd",
  "staff",
  "wand",
  "wandCrystal",
  "pistol",
  "pistolFlint",
  "pistolHeavy",
  "rifle",
  "rifleLong",
  "rifleCarbine",
  "shield",
];

/**
 * Weapons that occupy both hands: the trail hand is IK'd onto the shaft (or
 * foregrip) and no off-hand prop is carried. Long guns count — a rifle needs a
 * supporting hand the same way a maul does.
 */
export const TWO_HANDED_TYPES: WeaponType[] = [
  "maul",
  "maulSpiked",
  "spear",
  "spearBarbed",
  "halberd",
  "greataxe",
  "greataxeDouble",
  "rifle",
  "rifleLong",
  "rifleCarbine",
];

/** One-handed props that can ride in the trail hand (no two-handers). */
export const OFFHAND_TYPES: WeaponType[] = [
  "none",
  "shield",
  "sword",
  "swordBroad",
  "swordCurved",
  "swordRapier",
  "swordClaymore",
  "dagger",
  "daggerCurved",
  "claw",
  "clawTwin",
  "axe",
  "axeBearded",
  "axeHand",
  "hammer",
  "hammerWar",
  "hammerClub",
  "staff",
  "wand",
  "wandCrystal",
  "pistol",
  "pistolFlint",
  "pistolHeavy",
];

export const BACK_LOADOUTS: BackLoadout[] = [
  "none",
  "scabbard",
  "greatsword",
  "quiver",
  "pack",
  "axe",
];

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
  "goatman",
  "greatKnight",
  "wingedKnight",
  "salletKnight",
  "princess",
  "king",
  "pilot",
  "samurai",
  "viking",
  "pharaoh",
  "ninja",
];
