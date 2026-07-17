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
  | "anime";

export type HelmetStyle =
  | "none"
  | "knight"
  | "knightGreat"
  | "knightWinged"
  | "knightSallet"
  | "cap"
  | "sciFi"
  | "hood"
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

export type WeaponType = "none" | "sword" | "staff" | "rifle" | "shield";

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
    eyeColor?: string;
    /**
     * Optional multiplier for eye layout (default 1).
     * Independent of `head.scale` so hair can stay fixed (scientist).
     */
    scale?: number;
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
    type: "none" | "shield";
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
