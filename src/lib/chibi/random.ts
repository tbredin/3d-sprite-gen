import { COMBAT_ARM_POSES } from "./armPoses";
import { isHeadReplacement } from "./helmetMode";
import { COMBAT_LEG_POSES } from "./legPoses";
import type { LeadSide } from "./stance";
import { DEFAULT_LEAD } from "./stance";
import {
  BODY_SCALE_MAX,
  BODY_SCALE_MIN,
} from "./units";
import type {
  ArmPose,
  BackLoadout,
  BrowStyle,
  CharacterSpec,
  EyeStyle,
  HairStyle,
  HeadShape,
  HelmetStyle,
  HemStyle,
  LegPose,
  TorsoStyle,
  WeaponType,
} from "./types";
import {
  BACK_LOADOUTS,
  BROW_STYLES,
  EYE_STYLES,
  HAIR_STYLES,
  HEAD_SHAPES,
  HELMET_STYLES,
  HEM_STYLES,
  OFFHAND_TYPES,
  TORSO_STYLES,
  TWO_HANDED_TYPES,
  WEAPON_TYPES,
} from "./types";

export type PartId = "head" | "torso" | "arms" | "legs";

export const PART_IDS: PartId[] = ["head", "torso", "arms", "legs"];

/**
 * Per-part locks; `eyes`, `eyeLayout` and `headSize` are independent of `head`
 * so the face, eye layout and head proportions can stay pinned while the skull
 * itself rerolls. `eyeLayout` covers the Dist / Size / Y sliders only.
 */
export type PartLocks = Record<PartId, boolean> & {
  eyes: boolean;
  eyeLayout: boolean;
  headSize: boolean;
};

export const EMPTY_LOCKS: PartLocks = {
  head: false,
  torso: false,
  arms: false,
  legs: false,
  eyes: false,
  eyeLayout: false,
  headSize: false,
};

/** Eye layout fields pinned by the slider-row lock. */
function keepEyeLayout(
  face: NonNullable<CharacterSpec["face"]>,
  prev: CharacterSpec["face"],
): NonNullable<CharacterSpec["face"]> {
  if (!prev) return face;
  return {
    ...face,
    spacing: prev.spacing,
    scale: prev.scale,
    y: prev.y,
  };
}

/**
 * Fine-grained locks — one per dropdown on the part rows. A field survives a
 * roll when its own lock is set or when its parent part is locked.
 *
 * `offhandAngle` is UI-only: the variant lives in module state on `assemble`,
 * not in the spec, so no roll can move it. The lock exists so the dropdown
 * reads the same as its neighbours.
 */
export type FieldLockId =
  | "headShape"
  | "hairStyle"
  | "helmetStyle"
  | "eyeStyle"
  | "browStyle"
  | "torsoStyle"
  | "hem"
  | "cape"
  | "backLoadout"
  | "armPose"
  | "weapon"
  | "offhand"
  | "offhandAngle"
  | "legPose";

/** Parent section lock that also pins this field. */
export type FieldLockPart = PartId | "eyes";

export const FIELD_LOCK_PART: Record<FieldLockId, FieldLockPart> = {
  headShape: "head",
  hairStyle: "head",
  helmetStyle: "head",
  eyeStyle: "eyes",
  browStyle: "eyes",
  torsoStyle: "torso",
  hem: "torso",
  cape: "torso",
  backLoadout: "torso",
  armPose: "arms",
  weapon: "arms",
  offhand: "arms",
  offhandAngle: "arms",
  legPose: "legs",
};

export type FieldLocks = Record<FieldLockId, boolean>;

export const EMPTY_FIELD_LOCKS: FieldLocks = {
  headShape: false,
  hairStyle: false,
  helmetStyle: false,
  eyeStyle: false,
  browStyle: false,
  torsoStyle: false,
  hem: false,
  cape: false,
  backLoadout: false,
  armPose: false,
  weapon: false,
  offhand: false,
  offhandAngle: false,
  legPose: false,
};

/** A field is pinned by its own lock or by the lock on its parent part. */
export function isFieldLocked(
  field: FieldLockId,
  locks?: PartLocks,
  fieldLocks?: FieldLocks,
): boolean {
  return Boolean(fieldLocks?.[field] || locks?.[FIELD_LOCK_PART[field]]);
}

/** Weighted toward readable silhouette styles — bald only under helmets. */
const HAIR: HairStyle[] = [
  "anime",
  "anime",
  "bowl",
  "bowl",
  "bob",
  "bob",
  "spiky",
  "spiky",
  "spiky",
  "ponytail",
  "ponytail",
  "long",
  "long",
  "braid",
  "fringe",
  "fringe",
  "twinTails",
  "undercut",
  "curls",
  "bun",
  "topknot",
  "afro",
  "mohawk",
  "pixie",
  "pixie",
  "messy",
  "messy",
  "dreads",
  "mullet",
  "pompadour",
  "sidePart",
  "wavy",
  "wavy",
  // Feminine / girl-leaning silhouettes
  "hime",
  "hime",
  "odango",
  "odango",
  "halfUp",
  "layered",
  "layered",
  "curtain",
  "curtain",
  "lob",
  "lob",
  "spaceBuns",
  "sidePonytail",
  "pigtails",
  "pigtails",
  "bubblePonytail",
  "crownBraid",
  "softWaves",
  "softWaves",
  "bluntBangs",
  "bluntBangs",
  "wolfCut",
  "highPony",
  "lowBun",
  "ribbonTails",
  "ribbonTails",
  "asymmetrical",
  "ringlets",
  "goddess",
  "goddess",
];
/** Head-hugging shells + overlays — no mega-domes. */
const HELMET: HelmetStyle[] = [
  "none",
  "none",
  "none",
  "none",
  "none",
  "cap",
  "cap",
  "bandana",
  "crown",
  "king",
  "princess",
  "wizard",
  "knight",
  "knightGreat",
  "knightWinged",
  "knightSallet",
  "knightBarbute",
  "knightBascinet",
  "sciFi",
  "visor",
  "goggles",
  "astronautBubble",
  "astronautFlat",
  "astronautVintage",
  "scouter",
  "pilot",
  "samurai",
  "viking",
  "pharaoh",
  "ninja",
  "goat",
];

const TORSO: TorsoStyle[] = [
  "jacket",
  "jacket",
  "chestplate",
  "fullPlate",
  "tank",
  "robe",
  "hoodedRobe",
  "plain",
];

const HEM: HemStyle[] = [
  "skirt",
  "skirt",
  "skirt",
  "loincloth",
  "loincloth",
  "loincloth",
  "loincloth",
  "none",
];

/**
 * Weapon families. Pose language and off-hand pairing follow the family, so a
 * new variant only has to be listed here to behave like its siblings.
 */
const CASTER_TYPES = new Set<WeaponType>(["staff", "wand", "wandCrystal"]);
const BLADE_TYPES = new Set<WeaponType>([
  "sword",
  "swordBroad",
  "swordCurved",
  "swordRapier",
  "swordClaymore",
  "dagger",
  "daggerCurved",
  "claw",
  "clawTwin",
]);
/** One-handed choppers / bludgeons — same swing stance as `axe`. */
const CHOP_TYPES = new Set<WeaponType>([
  "axe",
  "axeBearded",
  "axeHand",
  "hammer",
  "hammerWar",
  "hammerClub",
]);
const PISTOL_TYPES = new Set<WeaponType>(["pistol", "pistolFlint", "pistolHeavy"]);
const GUN_TYPES = new Set<WeaponType>([
  ...PISTOL_TYPES,
  "rifle",
  "rifleLong",
  "rifleCarbine",
]);
/** Shafted two-handers — braced stance, trail hand IK'd onto the haft. */
const TWO_HAND_MELEE = new Set<WeaponType>(
  TWO_HANDED_TYPES.filter((w) => !GUN_TYPES.has(w)),
);
/** Props that leave the trail hand free for a shield or a twin. */
const ONE_HAND_MELEE = new Set<WeaponType>([...BLADE_TYPES, ...CHOP_TYPES]);

/**
 * Roll pool. The originals keep the heaviest weights so the variants add
 * variety without swamping the classic silhouettes.
 */
const WEAPON: WeaponType[] = [
  "sword",
  "sword",
  "sword",
  "sword",
  "axe",
  "axe",
  "axe",
  "staff",
  "staff",
  "staff",
  "spear",
  "spear",
  "maul",
  "maul",
  "rifle",
  "rifle",
  "shield",
  "shield",
  "shield",
  "swordBroad",
  "swordCurved",
  "swordRapier",
  "swordClaymore",
  "dagger",
  "daggerCurved",
  "claw",
  "clawTwin",
  "wand",
  "wandCrystal",
  "axeBearded",
  "axeHand",
  "greataxe",
  "greataxeDouble",
  "maulSpiked",
  "hammer",
  "hammerWar",
  "hammerClub",
  "spearBarbed",
  "halberd",
  "pistol",
  "pistolFlint",
  "pistolHeavy",
  "rifleLong",
  "rifleCarbine",
];

const BACK_LOADOUT: BackLoadout[] = [
  "scabbard",
  "scabbard",
  "greatsword",
  "quiver",
  "pack",
  "pack",
  "axe",
  "none",
];

const SKINS = [
  "#e4a672",
  "#f0c8a0",
  "#c98a6a",
  "#d4a574",
  "#ffe0bd",
  "#c68642",
  "#e8b888",
];

/** Surface hair — avoid near-black so bake stays colorful. */
const HAIR_COLORS = [
  "#433455",
  "#5a4030",
  "#8b5a2b",
  "#e83b3b",
  "#c7cfcc",
  "#f5e07a",
  "#f0d48a",
  "#3a9bb5",
  "#5b3d8a",
  "#3d6e70",
  "#e8a04a",
  "#7a8090",
  "#d4648a",
];

/** Large-surface cloth — mid/bright Endesga-friendly, no near-black. */
const CLOTH = [
  "#3d6e70",
  "#5a4a7a",
  "#5ad4a0",
  "#9aa4b0",
  "#7a8090",
  "#c7cfcc",
  "#e83b3b",
  "#433455",
  "#8b5a2b",
  "#5a6a7a",
  "#3d5c40",
  "#c7b446",
  "#d4648a",
  "#6a90c0",
];

const BOOT = ["#5a4030", "#6a7484", "#8b5a2b", "#433455", "#7a8090", "#5a6a7a"];

/** Surface eye colours — keep distinct after Endesga lock so the eyes 🎲 reads. */
const EYES = [
  "#1a1c2c",
  "#2a6ebd",
  "#3d6e70",
  "#e83b3b",
  "#5ad4a0",
  "#f5e07a",
  "#5b3d8a",
  "#e8a04a",
  "#c7cfcc",
  "#d4648a",
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function maybe<T>(arr: readonly T[], chance = 0.5): T | undefined {
  return Math.random() < chance ? pick(arr) : undefined;
}

function pickTrim(cloth: string): string | undefined {
  for (let i = 0; i < 6; i++) {
    const t = pick(CLOTH);
    if (t !== cloth) return t;
  }
  return maybe(CLOTH, 0.5);
}

function poseForWeapon(weapon: WeaponType): { arm: ArmPose; leg: LegPose } {
  // Variants stay inside the silhouette stance language (lead fwd / trail back).
  // Legs stay planted — no crouch hop / mid-stride.
  if (CASTER_TYPES.has(weapon)) {
    return {
      arm: pick(["cast", "raise", "ready"] as ArmPose[]),
      leg: pick(["ready", "stand", "guard"] as LegPose[]),
    };
  }
  if (GUN_TYPES.has(weapon)) {
    return {
      arm: pick(["extended", "reach", "ready"] as ArmPose[]),
      leg: pick(["ready", "wide", "stand"] as LegPose[]),
    };
  }
  if (weapon === "shield") {
    return {
      arm: pick(["guard", "ready"] as ArmPose[]),
      leg: pick(["guard", "wide", "ready"] as LegPose[]),
    };
  }
  if (ONE_HAND_MELEE.has(weapon)) {
    return {
      arm: pick(["ready", "extended", "reach"] as ArmPose[]),
      leg: pick(["ready", "lunge", "wide", "guard"] as LegPose[]),
    };
  }
  if (TWO_HAND_MELEE.has(weapon)) {
    // Two-handers: lead forward so the shaft cuts a diagonal; trail is IK'd on.
    return {
      arm: pick(["ready", "extended", "guard"] as ArmPose[]),
      leg: pick(["ready", "wide", "guard"] as LegPose[]),
    };
  }
  return {
    arm: pick(COMBAT_ARM_POSES),
    leg: pick(COMBAT_LEG_POSES),
  };
}

/** Weapon hand for an ipsilateral lead — shield nests on the trail side. */
function handForWeapon(
  weapon: WeaponType,
  lead: LeadSide,
): "left" | "right" {
  if (weapon === "shield") {
    return lead === "right" ? "left" : "right";
  }
  return lead;
}

function pickLeadSide(): LeadSide {
  // Mostly right-lead; occasional mirrored left-lead (same silhouette intent).
  return Math.random() < 0.18 ? "left" : DEFAULT_LEAD;
}

type HeadBits = Pick<CharacterSpec, "skin" | "head" | "hair" | "face" | "helmet">;
type TorsoBits = Pick<CharacterSpec, "torso" | "accessories">;
type ArmsBits = Pick<CharacterSpec, "arms" | "weapon" | "offhand" | "leadSide"> & {
  /** Coupled leg pose so random doesn't break ipsilateral stance. */
  legPose: LegPose;
};
type LegsBits = Pick<CharacterSpec, "legs">;

/** Snap slider-ish values to 0.05 steps (matches the eye UI ranges). */
function snap05(n: number): number {
  return Math.round(n / 0.05) * 0.05;
}

/** Snap head/body size values to 0.01 steps. */
function snap01(n: number): number {
  return Math.round(n / 0.01) * 0.01;
}

function randomFace(): NonNullable<CharacterSpec["face"]> {
  return {
    style: pick(EYE_STYLES),
    browStyle: pick(BROW_STYLES),
    eyeColor: pick(EYES),
    // Match Dist / Size / Y slider ranges in App.
    spacing: snap05(0.6 + Math.random() * 0.85),
    scale: snap05(0.68 + Math.random() * 0.72),
    y: snap05(-0.25 + Math.random() * 0.5),
  };
}

/** Match the Size / Height slider ranges in App. */
const HEAD_SIZE_MIN = 0.92;
const HEAD_SIZE_MAX = 1.3;
const HEAD_Y_MIN = 0.91;
const HEAD_Y_MAX = 1.21;

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function toUnit(v: number, min: number, max: number): number {
  return (v - min) / (max - min);
}

function fromUnit(t: number, min: number, max: number): number {
  return min + clamp01(t) * (max - min);
}

/**
 * Sample [0,1] pulled toward `toward`. `pull` 0 = uniform, ~1 = near toward.
 * Soft enough that extremes still happen, but opposite-end clashes are rare.
 */
function biasedUnit(toward: number, pull: number): number {
  const uniform = Math.random();
  if (pull <= 0) return uniform;
  // Irwin-Hall-ish blob around `toward`, then mix with uniform.
  const blob =
    toward +
    ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * (1.2 - pull);
  return clamp01(uniform * (1 - pull) + clamp01(blob) * pull);
}

export type HeadProportions = Pick<
  NonNullable<CharacterSpec["head"]>,
  "size" | "yScale"
>;

/** Head Size/Height, optionally biased toward the current body scale. */
function randomHeadProportions(bodyScale?: number): HeadProportions {
  const toward =
    bodyScale != null
      ? toUnit(bodyScale, BODY_SCALE_MIN, BODY_SCALE_MAX)
      : Math.random();
  const pull = bodyScale != null ? 0.6 : 0;
  return {
    size: snap01(
      fromUnit(biasedUnit(toward, pull), HEAD_SIZE_MIN, HEAD_SIZE_MAX),
    ),
    yScale: snap01(HEAD_Y_MIN + Math.random() * (HEAD_Y_MAX - HEAD_Y_MIN)),
  };
}

/** Body scale, optionally biased toward the current head size. */
export function randomBodyScale(headSize?: number): number {
  const toward =
    headSize != null
      ? toUnit(headSize, HEAD_SIZE_MIN, HEAD_SIZE_MAX)
      : Math.random();
  const pull = headSize != null ? 0.6 : 0;
  return snap01(
    fromUnit(biasedUnit(toward, pull), BODY_SCALE_MIN, BODY_SCALE_MAX),
  );
}

/**
 * Joint roll when head size and body scale are both free — share a size vibe
 * so a huge body rarely pairs with a tiny head (and vice versa).
 */
export function randomCoupledProportions(): HeadProportions & {
  bodyScale: number;
} {
  const vibe = biasedUnit(0.5, 0.2);
  return {
    bodyScale: snap01(
      fromUnit(biasedUnit(vibe, 0.55), BODY_SCALE_MIN, BODY_SCALE_MAX),
    ),
    size: snap01(
      fromUnit(biasedUnit(vibe, 0.55), HEAD_SIZE_MIN, HEAD_SIZE_MAX),
    ),
    yScale: snap01(HEAD_Y_MIN + Math.random() * (HEAD_Y_MAX - HEAD_Y_MIN)),
  };
}

function randomHead(
  skinHint?: string,
  allowHelmets = false,
  bodyScale?: number,
): HeadBits {
  const skin = skinHint ?? pick(SKINS);
  // When helmets are off, keep overlay hats (cap, crowns, wizard…) but skip
  // closed / face-covering replacements (knight, samurai, sciFi…).
  const helmetPool = allowHelmets
    ? HELMET
    : HELMET.filter((h) => h === "none" || !isHeadReplacement(h));
  const helmetStyle = pick(helmetPool);
  const hairColor = pick(HAIR_COLORS);
  // Overlay helmets (goggles, scouter, cap, crowns…) keep the hair; only
  // full head-replacement helms bald the skull.
  const hair =
    isHeadReplacement(helmetStyle)
      ? { style: "bald" as const, color: hairColor, complexity: 1 }
      : {
          style: pick(HAIR),
          color: hairColor,
          complexity: 4 + Math.floor(Math.random() * 4),
        };
  return {
    skin,
    head: {
      shape: pick(HEAD_SHAPES),
      scale: 0.94 + Math.random() * 0.08,
      ...randomHeadProportions(bodyScale),
    },
    hair,
    face: randomFace(),
    helmet: {
      style: helmetStyle,
      ...defaultHelmetColors(helmetStyle),
    },
  };
}

function randomTorso(_helmetStyle?: HelmetStyle): TorsoBits {
  const torsoStyle = pick(TORSO);
  const cloth = pick(CLOTH);
  const trim = pickTrim(cloth);

  let hem: HemStyle = pick(HEM);
  if (torsoStyle === "hoodedRobe" || torsoStyle === "robe") {
    hem = Math.random() < 0.7 ? "skirt" : pick(["skirt", "loincloth"] as HemStyle[]);
  } else if (torsoStyle === "tank" || torsoStyle === "fullPlate") {
    hem =
      Math.random() < 0.85
        ? pick(["loincloth", "loincloth", "skirt"] as HemStyle[])
        : "none";
  } else if (torsoStyle === "jacket" || torsoStyle === "chestplate") {
    hem = Math.random() < 0.8 ? pick(["loincloth", "skirt"] as HemStyle[]) : "none";
  }

  const cape =
    torsoStyle === "hoodedRobe"
      ? Math.random() < 0.25
      : Math.random() < (torsoStyle === "tank" ? 0.6 : 0.5);

  // Prefer loud trim contrast so clothing reads after Endesga lock.
  const hemColor = pickTrim(cloth) ?? pick(CLOTH);
  const capeColor = pickTrim(cloth) ?? pick(CLOTH);
  const pouches = Math.random() < 0.72;
  const backLoadout = pick(BACK_LOADOUT);

  return {
    torso: { style: torsoStyle, color: cloth, trim },
    accessories: {
      hem,
      hemColor,
      cape,
      capeColor,
      pouches,
      pouchColor: pickTrim(cloth) ?? pick(CLOTH),
      backLoadout,
      backLoadoutColor: pick(CLOTH),
    },
  };
}

function randomArms(
  skin: string,
  sleeveHint?: string,
  leadHint?: LeadSide,
): ArmsBits {
  const leadSide = leadHint ?? pickLeadSide();
  const weaponType = pick(WEAPON);
  const poses = poseForWeapon(weaponType);
  const cloth = sleeveHint ?? pick(CLOTH);
  const sleeveLength =
    Math.random() < 0.2
      ? 0.1 + Math.random() * 0.2
      : 0.5 + Math.random() * 0.4;
  // Blade + shield is the classic combat silhouette — give it often. Failing
  // that, a one-hander sometimes pairs with a twin carried low; sidearms dual
  // wield instead of taking a shield.
  let offhand: { type: WeaponType; color: string } | undefined;
  if (ONE_HAND_MELEE.has(weaponType)) {
    const roll = Math.random();
    if (roll < 0.5) {
      offhand = { type: "shield", color: pick(CLOTH) };
    } else if (roll < 0.78) {
      offhand = { type: weaponType, color: pick(CLOTH) };
    }
  } else if (PISTOL_TYPES.has(weaponType) && Math.random() < 0.4) {
    offhand = { type: weaponType, color: pick(CLOTH) };
  }
  return {
    leadSide,
    arms: {
      pose: poses.arm,
      sleeveColor: cloth,
      sleeveLength,
      handColor: skin,
    },
    weapon: {
      type: weaponType,
      hand: handForWeapon(weaponType, leadSide),
      color: pick(CLOTH),
    },
    offhand,
    legPose: poses.leg,
  };
}

function randomLegs(poseHint?: LegPose): LegsBits {
  const pantColor = pick(CLOTH);
  // Boots always contrast pants so footwear reads in the bake.
  let bootColor = pick(BOOT);
  for (let i = 0; i < 4 && bootColor === pantColor; i++) {
    bootColor = pick(BOOT);
  }
  return {
    legs: {
      pose: poseHint ?? pick(COMBAT_LEG_POSES),
      pantColor,
      bootColor,
    },
  };
}

/**
 * Put field-locked values back after a roll swapped whole part bundles.
 *
 * Runs last so soft coupling still shapes the *unlocked* fields, then the
 * pinned ones win. `rolled` reports which parts the caller actually re-rolled
 * — without it a torso reroll would happily "restore" arms that never moved.
 */
function applyFieldLocks(
  next: CharacterSpec,
  prev: CharacterSpec | undefined,
  pinned: (field: FieldLockId) => boolean,
  rolled: (part: PartId) => boolean,
): CharacterSpec {
  if (!prev) return next;

  if (rolled("head")) {
    if (pinned("headShape") && prev.head?.shape) {
      next.head = { ...next.head, shape: prev.head.shape };
    }
    if (pinned("helmetStyle")) {
      next.helmet = prev.helmet ? { ...prev.helmet } : undefined;
    }
    if (pinned("hairStyle") && prev.hair) {
      next.hair = { ...(next.hair ?? prev.hair), style: prev.hair.style };
    } else if (pinned("helmetStyle") && next.hair) {
      // A pinned helm can contradict the rolled hair: replacement helms bald
      // the skull, overlays need something under them.
      if (isHeadReplacement(next.helmet?.style ?? "none")) {
        next.hair = { ...next.hair, style: "bald" };
      } else if (next.hair.style === "bald") {
        next.hair = { ...next.hair, style: pick(HAIR) };
      }
    }
  }

  if (rolled("torso")) {
    if (pinned("torsoStyle")) {
      next.torso = { ...next.torso, style: prev.torso.style };
    }
    if (next.accessories) {
      if (pinned("hem")) {
        next.accessories = {
          ...next.accessories,
          hem: prev.accessories?.hem ?? "none",
        };
      }
      if (pinned("cape")) {
        next.accessories = {
          ...next.accessories,
          cape: prev.accessories?.cape ?? false,
        };
      }
      if (pinned("backLoadout")) {
        next.accessories = {
          ...next.accessories,
          backLoadout: prev.accessories?.backLoadout ?? "none",
        };
      }
    }
  }

  if (rolled("arms")) {
    if (pinned("weapon")) {
      const lead = next.leadSide ?? DEFAULT_LEAD;
      next.weapon = prev.weapon
        ? {
            ...prev.weapon,
            hand: handForWeapon(prev.weapon.type, lead),
          }
        : undefined;
      // The pose was drawn for the weapon we just threw away — redraw it from
      // the pinned one so the stance language still matches the prop.
      if (prev.weapon && !pinned("armPose")) {
        next.arms = { ...next.arms, pose: poseForWeapon(prev.weapon.type).arm };
      }
    }
    if (pinned("armPose")) {
      next.arms = { ...next.arms, pose: prev.arms.pose };
    }
    if (pinned("offhand")) {
      next.offhand = prev.offhand ? { ...prev.offhand } : undefined;
    }
  }

  // Arms drive the leg pose (ipsilateral stance), so an arms roll moves legs
  // too — a pinned leg pose has to survive both.
  if ((rolled("legs") || rolled("arms")) && pinned("legPose")) {
    next.legs = { ...next.legs, pose: prev.legs.pose };
  }

  // Eyes can reshuffle even when the head section is pinned — restore styles.
  if (pinned("eyeStyle") && prev.face?.style) {
    next.face = { ...next.face, style: prev.face.style };
  }
  if (pinned("browStyle") && prev.face) {
    next.face = {
      ...next.face,
      browStyle: prev.face.browStyle ?? "none",
    };
  }

  return next;
}

/**
 * Build a random CharacterSpec biased toward combat-ready JRPG sprites.
 * Keeps the silhouette fighting stance (torso ¾, ipsilateral lead) — pose
 * names only vary exaggeration inside that language.
 *
 * `eyes` lock is independent of `head`: locked eyes keep colour / spacing /
 * scale / y through full-character rolls (Play random).
 *
 * `allowHelmets` (default false) is a session preference, not a lock: when
 * false, closed / face-covering helms are skipped but overlay hats remain.
 */
export type RandomOptions = {
  /** Include closed/replacement helms. Default false. */
  allowHelmets?: boolean;
  /** Current body scale — biases head size away from opposite extremes. */
  bodyScale?: number;
  /**
   * Force head Size/Height (from a coupled roll with body scale). When set,
   * overrides the usual head-proportion sample whenever head size is unlocked.
   */
  headProportions?: HeadProportions;
};

export function randomCharacter(
  locks?: PartLocks,
  base?: CharacterSpec,
  opts?: RandomOptions,
  fieldLocks?: FieldLocks,
): CharacterSpec {
  const keep = locks ?? EMPTY_LOCKS;
  const prev = base;
  const allowHelmets = opts?.allowHelmets ?? false;
  const bodyScale = opts?.bodyScale;

  const head = keep.head && prev ? {
    skin: prev.skin,
    head: prev.head,
    hair: prev.hair,
    face: prev.face,
    helmet: prev.helmet,
  } : randomHead(keep.head ? prev?.skin : undefined, allowHelmets, bodyScale);

  // Eyes lock overrides face whether or not the head was kept.
  if (keep.eyes && prev?.face) {
    head.face = prev.face;
  } else if (keep.head && !keep.eyes) {
    // Head pinned but eyes free — reshuffle face on the same skull.
    head.face = randomFace();
  }

  // Slider-row lock keeps Dist / Size / Y through any roll that moved the face.
  if (keep.eyeLayout && !keep.eyes && head.face) {
    head.face = keepEyeLayout(head.face, prev?.face);
  }

  // Head-size lock overrides proportions whether or not the head was kept.
  if (keep.headSize && prev?.head) {
    head.head = {
      ...head.head,
      size: prev.head.size,
      yScale: prev.head.yScale,
    };
  } else if (opts?.headProportions) {
    head.head = { ...head.head, ...opts.headProportions };
  } else if (keep.head && !keep.headSize) {
    // Head pinned but proportions free — resize the same skull.
    head.head = { ...head.head, ...randomHeadProportions(bodyScale) };
  }

  const torso = keep.torso && prev
    ? { torso: prev.torso, accessories: prev.accessories }
    : randomTorso(head.helmet?.style);

  const arms = keep.arms && prev
    ? {
        leadSide: prev.leadSide ?? DEFAULT_LEAD,
        arms: prev.arms,
        weapon: prev.weapon,
        offhand: prev.offhand,
        legPose: prev.legs.pose,
      }
    : randomArms(
        head.skin,
        torso.torso.color,
        keep.legs && prev?.leadSide ? prev.leadSide : undefined,
      );

  // Soft coupling: sleeve often matches torso cloth when both unlock.
  if (!keep.arms && !keep.torso && arms.arms) {
    arms.arms.sleeveColor = torso.torso.color;
  }

  const legs = keep.legs && prev
    ? { legs: prev.legs }
    : randomLegs(!keep.arms ? arms.legPose : undefined);

  return applyFieldLocks(
    {
      ...head,
      ...torso,
      leadSide: arms.leadSide,
      arms: arms.arms,
      weapon: arms.weapon,
      offhand: arms.offhand,
      ...legs,
    },
    prev,
    (field) => isFieldLocked(field, keep, fieldLocks),
    (part) => !keep[part],
  );
}

/** Reroll one part (style + colors), keeping the rest of the spec. */
export function rerollPart(
  spec: CharacterSpec,
  part: PartId,
  locks?: PartLocks,
  opts?: RandomOptions,
  fieldLocks?: FieldLocks,
): CharacterSpec {
  const pinned = (field: FieldLockId) => isFieldLocked(field, locks, fieldLocks);
  const rolled = (p: PartId) => p === part;

  if (part === "head") {
    const head = randomHead(
      spec.skin,
      opts?.allowHelmets ?? false,
      opts?.bodyScale,
    );
    // Eyes are their own row — head 🎲 must never touch face / eye colour.
    head.face = spec.face;
    // Head-size lock keeps proportions even when the head dice is pressed.
    if (locks?.headSize) {
      head.head = {
        ...head.head,
        size: spec.head?.size,
        yScale: spec.head?.yScale,
      };
    } else if (opts?.headProportions) {
      head.head = { ...head.head, ...opts.headProportions };
    }
    return applyFieldLocks({ ...spec, ...head }, spec, pinned, rolled);
  }
  if (part === "torso") {
    const torso = randomTorso(spec.helmet?.style);
    return applyFieldLocks(
      {
        ...spec,
        ...torso,
        arms: {
          ...spec.arms,
          sleeveColor: torso.torso.color,
        },
      },
      spec,
      pinned,
      rolled,
    );
  }
  if (part === "arms") {
    // Keep leadSide so ipsilateral feet stay matched when only arms reroll.
    const next = randomArms(spec.skin, spec.torso.color, spec.leadSide ?? DEFAULT_LEAD);
    return applyFieldLocks(
      {
        ...spec,
        leadSide: next.leadSide,
        arms: next.arms,
        weapon: next.weapon,
        offhand: next.offhand,
        legs: { ...spec.legs, pose: next.legPose },
      },
      spec,
      pinned,
      rolled,
    );
  }
  // Legs-only: keep leadSide, pick a stance variant that still reads.
  return applyFieldLocks(
    {
      ...spec,
      ...randomLegs(pick(COMBAT_LEG_POSES)),
    },
    spec,
    pinned,
    rolled,
  );
}

/**
 * Reroll one dropdown field. Picks from the same option lists the UI exposes
 * (and respects `allowHelmets`). Prefer a different value when possible so the
 * dice always feels like it did something.
 */
export function rerollField(
  spec: CharacterSpec,
  field: FieldLockId,
  opts?: RandomOptions,
): CharacterSpec {
  switch (field) {
    case "headShape":
      return setHeadShape(
        spec,
        pickOther(HEAD_SHAPES, spec.head?.shape ?? "lozenge"),
      );
    case "hairStyle":
      return setHairStyle(
        spec,
        pickOther(HAIR_STYLES, spec.hair?.style ?? "bald"),
      );
    case "eyeStyle":
      return setEyeStyle(
        spec,
        pickOther(EYE_STYLES, spec.face?.style ?? "classic"),
      );
    case "browStyle":
      return setBrowStyle(
        spec,
        pickOther(BROW_STYLES, spec.face?.browStyle ?? "none"),
      );
    case "helmetStyle": {
      const allowHelmets = opts?.allowHelmets ?? false;
      const pool = allowHelmets
        ? HELMET_STYLES
        : HELMET_STYLES.filter((h) => h === "none" || !isHeadReplacement(h));
      return setHelmetStyle(
        spec,
        pickOther(pool, spec.helmet?.style ?? "none"),
      );
    }
    case "torsoStyle":
      return setTorsoStyle(spec, pickOther(TORSO_STYLES, spec.torso.style));
    case "hem":
      return setHemStyle(
        spec,
        pickOther(HEM_STYLES, spec.accessories?.hem ?? "none"),
      );
    case "cape":
      return setCape(spec, !(spec.accessories?.cape ?? false));
    case "backLoadout":
      return setBackLoadout(
        spec,
        pickOther(BACK_LOADOUTS, spec.accessories?.backLoadout ?? "none"),
      );
    case "armPose":
      return setArmPose(spec, pickOther(COMBAT_ARM_POSES, spec.arms.pose));
    case "weapon":
      return setWeaponType(
        spec,
        pickOther(WEAPON_TYPES, spec.weapon?.type ?? "none"),
      );
    case "offhand":
      return setOffhandType(
        spec,
        pickOther(OFFHAND_TYPES, spec.offhand?.type ?? "none"),
      );
    case "offhandAngle":
      // Variant lives in assemble module state — App handles the dice.
      return spec;
    case "legPose":
      return setLegPose(spec, pickOther(COMBAT_LEG_POSES, spec.legs.pose));
  }
}

/** Prefer a different option so a field dice click visibly changes. */
function pickOther<T>(arr: readonly T[], current: T): T {
  const others = arr.filter((x) => x !== current);
  return others.length > 0 ? pick(others) : pick(arr);
}

/** Keep geometry/styles; only shuffle colors owned by that part. */
export function rerollPartColors(
  spec: CharacterSpec,
  part: PartId,
  _locks?: PartLocks,
): CharacterSpec {
  const next = structuredClone(spec);
  if (part === "head") {
    // Hands belong to arms — pin their tint before skin changes.
    if (next.arms.handColor == null) {
      next.arms = { ...next.arms, handColor: next.skin };
    }
    next.skin = pick(SKINS);
    if (next.hair) next.hair.color = pick(HAIR_COLORS);
    // Eye colour is owned by the eyes row — never shuffle it from head colours.
    if (next.helmet && next.helmet.style !== "none") {
      const d = defaultHelmetColors(next.helmet.style);
      next.helmet.color = d.color;
      if (next.helmet.visor) next.helmet.visor = d.visor ?? pick(CLOTH);
    }
    return next;
  }
  if (part === "torso") {
    // Sleeves belong to arms — pin before torso cloth changes.
    if (next.arms.sleeveColor == null) {
      next.arms = { ...next.arms, sleeveColor: next.torso.color };
    }
    const cloth = pick(CLOTH);
    const trim = pickTrim(cloth);
    next.torso = { ...next.torso, color: cloth, trim };
    if (next.accessories) {
      next.accessories = {
        ...next.accessories,
        ...(next.accessories.hem && next.accessories.hem !== "none"
          ? { hemColor: trim ?? pick(CLOTH) }
          : {}),
        ...(next.accessories.cape ? { capeColor: pick(CLOTH) } : {}),
        ...(next.accessories.pouches ? { pouchColor: pick(CLOTH) } : {}),
        ...(next.accessories.backLoadout && next.accessories.backLoadout !== "none"
          ? { backLoadoutColor: pick(CLOTH) }
          : {}),
      };
    }
    return next;
  }
  if (part === "arms") {
    next.arms = {
      ...next.arms,
      sleeveColor: pick(CLOTH),
      handColor: pick(SKINS),
    };
    if (next.weapon && next.weapon.type !== "none") {
      next.weapon = { ...next.weapon, color: pick(CLOTH) };
    }
    if (next.offhand && next.offhand.type !== "none") {
      next.offhand = { ...next.offhand, color: pick(CLOTH) };
    }
    return next;
  }
  next.legs = {
    ...next.legs,
    pantColor: pick(CLOTH),
    bootColor: pick(BOOT),
  };
  return next;
}

/** Shuffle all eyes-row params (style, colour, spacing, size, y) — not Show. */
export function rerollEyes(
  spec: CharacterSpec,
  fieldLocks?: FieldLocks,
  locks?: PartLocks,
): CharacterSpec {
  const current = spec.face?.eyeColor;
  const currentStyle = spec.face?.style ?? "classic";
  let face = randomFace();
  for (
    let i = 0;
    i < 10 && face.eyeColor === current && face.style === currentStyle;
    i++
  ) {
    face = randomFace();
  }
  if (fieldLocks?.eyeStyle) {
    face.style = spec.face?.style ?? face.style;
  }
  if (fieldLocks?.browStyle) {
    face.browStyle = spec.face?.browStyle ?? face.browStyle;
  }
  return {
    ...spec,
    face: locks?.eyeLayout ? keepEyeLayout(face, spec.face) : face,
  };
}

/* -------------------------------------------------------------------------- */
/* Direct part setters — pick a specific named variant (debug dropdowns).      */
/* Keep existing colours; only fill sensible defaults when a slot is empty.    */
/* -------------------------------------------------------------------------- */

/** Bright lens tints so sci-fi visors read after Endesga lock. */
const VISOR_TINTS = ["#5ad4a0", "#2a6ebd", "#e83b3b", "#f5e07a", "#3a9bb5"];
/** Metal slit colours for closed helms. */
const SLIT_TINTS = ["#1a1c2c", "#2a2035", "#12141c"];
const CROWN_TINTS = ["#f5e07a", "#e83b3b", "#c7cfcc", "#5ad4a0", "#e8a0c8"];
/** Classic wizard-hat cloth — deep blacks and midnight blues. */
const WIZARD_TINTS = [
  "#14151f",
  "#1a1c2c",
  "#232a4d",
  "#2a3a6a",
  "#1e2a52",
  "#2b2f52",
];
/** Bright band / tip trims that pop against a dark wizard hat. */
const WIZARD_TRIMS = ["#f5e07a", "#c7cfcc", "#8fb8ff", "#5ad4a0"];

const VISOR_HELMETS: HelmetStyle[] = [
  "sciFi",
  "pilot",
  "visor",
  "goggles",
  "astronautBubble",
  "astronautFlat",
  "astronautVintage",
  "scouter",
];
const SLIT_HELMETS: HelmetStyle[] = [
  "knight",
  "knightGreat",
  "knightWinged",
  "knightSallet",
  "knightBarbute",
  "knightBascinet",
  "samurai",
  "viking",
  "ninja",
];
const CROWN_HELMETS: HelmetStyle[] = [
  "crown",
  "king",
  "princess",
  "wizard",
  "pharaoh",
];

function defaultHelmetColors(style: HelmetStyle): {
  color: string;
  visor?: string;
} {
  if (style === "none") return { color: "#000000" };
  if (style === "goat") {
    return {
      color: pick(["#5a4030", "#8b5a2b", "#433455", "#c98a6a", "#e8e4d8"]),
      visor: pick(["#e8e4d8", "#c7cfcc", "#f0d48a", "#ffe0bd"]),
    };
  }
  if (style === "wizard") {
    return { color: pick(WIZARD_TINTS), visor: pick(WIZARD_TRIMS) };
  }
  if (CROWN_HELMETS.includes(style)) {
    return { color: pick(CROWN_TINTS), visor: pick(CROWN_TINTS) };
  }
  if (VISOR_HELMETS.includes(style)) {
    return { color: pick(CLOTH), visor: pick(VISOR_TINTS) };
  }
  if (SLIT_HELMETS.includes(style)) {
    return { color: pick(CLOTH), visor: pick(SLIT_TINTS) };
  }
  return { color: pick(CLOTH) };
}

/** True when a style renders a visor/gem accent (keep a `visor` colour). */
function helmetUsesVisor(style: HelmetStyle): boolean {
  return (
    style === "goat" ||
    CROWN_HELMETS.includes(style) ||
    VISOR_HELMETS.includes(style) ||
    SLIT_HELMETS.includes(style)
  );
}

export function setHeadShape(spec: CharacterSpec, shape: HeadShape): CharacterSpec {
  const next = structuredClone(spec);
  next.head = { ...next.head, shape };
  return next;
}

export function setHairStyle(spec: CharacterSpec, style: HairStyle): CharacterSpec {
  const next = structuredClone(spec);
  next.hair = {
    style,
    color: next.hair?.color ?? pick(HAIR_COLORS),
    complexity: next.hair?.complexity ?? 5,
  };
  return next;
}

export function setEyeStyle(spec: CharacterSpec, style: EyeStyle): CharacterSpec {
  const next = structuredClone(spec);
  next.face = {
    ...next.face,
    style,
    eyeColor: next.face?.eyeColor ?? pick(EYES),
  };
  return next;
}

export function setBrowStyle(
  spec: CharacterSpec,
  browStyle: BrowStyle,
): CharacterSpec {
  const next = structuredClone(spec);
  next.face = {
    ...next.face,
    browStyle,
    eyeColor: next.face?.eyeColor ?? pick(EYES),
  };
  return next;
}

export function setHelmetStyle(
  spec: CharacterSpec,
  style: HelmetStyle,
): CharacterSpec {
  const next = structuredClone(spec);
  const prev = next.helmet;
  const defaults = defaultHelmetColors(style);
  const keepColor =
    prev?.color && prev.color !== "#000000" && prev.style !== "none"
      ? prev.color
      : defaults.color;
  next.helmet = {
    style,
    color: keepColor,
    visor: helmetUsesVisor(style)
      ? prev?.visor ?? defaults.visor
      : undefined,
  };
  return next;
}

export function setTorsoStyle(
  spec: CharacterSpec,
  style: TorsoStyle,
): CharacterSpec {
  const next = structuredClone(spec);
  next.torso = { ...next.torso, style };
  return next;
}

export function setHemStyle(spec: CharacterSpec, style: HemStyle): CharacterSpec {
  const next = structuredClone(spec);
  next.accessories = {
    ...next.accessories,
    hem: style,
    hemColor:
      next.accessories?.hemColor ?? next.torso.trim ?? pick(CLOTH),
  };
  return next;
}

export function setCape(spec: CharacterSpec, on: boolean): CharacterSpec {
  const next = structuredClone(spec);
  next.accessories = {
    ...next.accessories,
    cape: on,
    capeColor:
      next.accessories?.capeColor ?? next.torso.trim ?? pick(CLOTH),
  };
  return next;
}

export function setBackLoadout(
  spec: CharacterSpec,
  style: BackLoadout,
): CharacterSpec {
  const next = structuredClone(spec);
  next.accessories = {
    ...next.accessories,
    backLoadout: style,
    backLoadoutColor: next.accessories?.backLoadoutColor ?? pick(CLOTH),
  };
  return next;
}

export function setArmPose(spec: CharacterSpec, pose: ArmPose): CharacterSpec {
  const next = structuredClone(spec);
  next.arms = { ...next.arms, pose };
  return next;
}

export function setWeaponType(
  spec: CharacterSpec,
  type: WeaponType,
): CharacterSpec {
  const next = structuredClone(spec);
  const lead = next.leadSide ?? DEFAULT_LEAD;
  next.weapon = {
    type,
    hand: next.weapon?.hand ?? handForWeapon(type, lead),
    color: next.weapon?.color ?? pick(CLOTH),
  };
  return next;
}

export function setOffhandType(
  spec: CharacterSpec,
  type: WeaponType,
): CharacterSpec {
  const next = structuredClone(spec);
  next.offhand = { type, color: next.offhand?.color ?? pick(CLOTH) };
  return next;
}

export function setLegPose(spec: CharacterSpec, pose: LegPose): CharacterSpec {
  const next = structuredClone(spec);
  next.legs = { ...next.legs, pose };
  return next;
}
