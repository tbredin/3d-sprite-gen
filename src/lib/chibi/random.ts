import { COMBAT_ARM_POSES } from "./armPoses";
import { isHeadReplacement } from "./helmetMode";
import { COMBAT_LEG_POSES } from "./legPoses";
import type { LeadSide } from "./stance";
import { DEFAULT_LEAD } from "./stance";
import type {
  ArmPose,
  BackLoadout,
  CharacterSpec,
  HairStyle,
  HeadShape,
  HelmetStyle,
  HemStyle,
  LegPose,
  TorsoStyle,
  WeaponType,
} from "./types";
import { HEAD_SHAPES } from "./types";

export type PartId = "head" | "torso" | "arms" | "legs";

export const PART_IDS: PartId[] = ["head", "torso", "arms", "legs"];

/** Per-part locks; `eyes` is independent of `head` so face can stay pinned. */
export type PartLocks = Record<PartId, boolean> & { eyes: boolean };

export const EMPTY_LOCKS: PartLocks = {
  head: false,
  torso: false,
  arms: false,
  legs: false,
  eyes: false,
};

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

const WEAPON: WeaponType[] = [
  "sword",
  "sword",
  "sword",
  "axe",
  "axe",
  "staff",
  "staff",
  "spear",
  "spear",
  "maul",
  "rifle",
  "shield",
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

const EYES = ["#1a1c2c", "#3d6e70", "#2a6ebd", "#433455", "#5a2a7a"];

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
  if (weapon === "staff") {
    return {
      arm: pick(["cast", "raise", "ready"] as ArmPose[]),
      leg: pick(["ready", "stand", "guard"] as LegPose[]),
    };
  }
  if (weapon === "rifle") {
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
  if (weapon === "sword" || weapon === "axe") {
    return {
      arm: pick(["ready", "extended", "reach"] as ArmPose[]),
      leg: pick(["ready", "lunge", "wide", "guard"] as LegPose[]),
    };
  }
  if (weapon === "spear" || weapon === "maul") {
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

function randomFace(): NonNullable<CharacterSpec["face"]> {
  return {
    eyeColor: pick(EYES),
    // Match Dist / Size / Y slider ranges in App.
    spacing: snap05(0.55 + Math.random() * 1.0),
    scale: snap05(0.55 + Math.random() * 1.1),
    y: snap05(-0.25 + Math.random() * 0.5),
  };
}

function randomHead(skinHint?: string, allowHelmets = true): HeadBits {
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
      yScale: snap05(0.75 + Math.random() * 0.75),
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
  // Sword + shield is the classic combat silhouette — give it often. Failing
  // that, a blade sometimes gets a second low-held blade in the off hand.
  let offhand: { type: WeaponType; color: string } | undefined;
  if (weaponType === "sword" && Math.random() < 0.55) {
    offhand = { type: "shield", color: pick(CLOTH) };
  } else if (weaponType === "sword" && Math.random() < 0.35) {
    offhand = { type: "sword", color: pick(CLOTH) };
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
 * Build a random CharacterSpec biased toward combat-ready JRPG sprites.
 * Keeps the silhouette fighting stance (torso ¾, ipsilateral lead) — pose
 * names only vary exaggeration inside that language.
 *
 * `eyes` lock is independent of `head`: locked eyes keep colour / spacing /
 * scale / y through full-character rolls (Play random).
 *
 * `allowHelmets` (default true) is a session preference, not a lock: when
 * false, closed / face-covering helms are skipped but overlay hats remain.
 */
export type RandomOptions = {
  /** Include closed/replacement helms. Default true. */
  allowHelmets?: boolean;
};

export function randomCharacter(
  locks?: PartLocks,
  base?: CharacterSpec,
  opts?: RandomOptions,
): CharacterSpec {
  const keep = locks ?? EMPTY_LOCKS;
  const prev = base;
  const allowHelmets = opts?.allowHelmets ?? true;

  const head = keep.head && prev ? {
    skin: prev.skin,
    head: prev.head,
    hair: prev.hair,
    face: prev.face,
    helmet: prev.helmet,
  } : randomHead(keep.head ? prev?.skin : undefined, allowHelmets);

  // Eyes lock overrides face whether or not the head was kept.
  if (keep.eyes && prev?.face) {
    head.face = prev.face;
  } else if (keep.head && !keep.eyes) {
    // Head pinned but eyes free — reshuffle face on the same skull.
    head.face = randomFace();
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

  return {
    ...head,
    ...torso,
    leadSide: arms.leadSide,
    arms: arms.arms,
    weapon: arms.weapon,
    offhand: arms.offhand,
    ...legs,
  };
}

/** Reroll one part (style + colors), keeping the rest of the spec. */
export function rerollPart(
  spec: CharacterSpec,
  part: PartId,
  locks?: PartLocks,
  opts?: RandomOptions,
): CharacterSpec {
  if (part === "head") {
    const head = randomHead(spec.skin, opts?.allowHelmets ?? true);
    // Eyes lock keeps face even when the head dice is pressed.
    if (locks?.eyes && spec.face) {
      head.face = spec.face;
    }
    return { ...spec, ...head };
  }
  if (part === "torso") {
    const torso = randomTorso(spec.helmet?.style);
    return {
      ...spec,
      ...torso,
      arms: {
        ...spec.arms,
        sleeveColor: torso.torso.color,
      },
    };
  }
  if (part === "arms") {
    // Keep leadSide so ipsilateral feet stay matched when only arms reroll.
    const next = randomArms(spec.skin, spec.torso.color, spec.leadSide ?? DEFAULT_LEAD);
    return {
      ...spec,
      leadSide: next.leadSide,
      arms: next.arms,
      weapon: next.weapon,
      offhand: next.offhand,
      legs: { ...spec.legs, pose: next.legPose },
    };
  }
  // Legs-only: keep leadSide, pick a stance variant that still reads.
  return {
    ...spec,
    ...randomLegs(pick(COMBAT_LEG_POSES)),
  };
}

/** Keep geometry/styles; only shuffle colors owned by that part. */
export function rerollPartColors(
  spec: CharacterSpec,
  part: PartId,
  locks?: PartLocks,
): CharacterSpec {
  const next = structuredClone(spec);
  if (part === "head") {
    // Hands belong to arms — pin their tint before skin changes.
    if (next.arms.handColor == null) {
      next.arms = { ...next.arms, handColor: next.skin };
    }
    next.skin = pick(SKINS);
    if (next.hair) next.hair.color = pick(HAIR_COLORS);
    // Eye colour lives on the eyes row — only shuffle when eyes are unlocked.
    if (!locks?.eyes) {
      next.face = { ...next.face, eyeColor: pick(EYES) };
    }
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

/** Shuffle only eye colour (eyes-row 🎲). */
export function rerollEyeColor(spec: CharacterSpec): CharacterSpec {
  return {
    ...spec,
    face: { ...spec.face, eyeColor: pick(EYES) },
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
