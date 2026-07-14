import { COMBAT_ARM_POSES } from "./armPoses";
import { isHeadReplacement } from "./helmetMode";
import { COMBAT_LEG_POSES } from "./legPoses";
import type { LeadSide } from "./stance";
import { DEFAULT_LEAD } from "./stance";
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

export type PartId = "head" | "torso" | "arms" | "legs";

export const PART_IDS: PartId[] = ["head", "torso", "arms", "legs"];

export type PartLocks = Record<PartId, boolean>;

export const EMPTY_LOCKS: PartLocks = {
  head: false,
  torso: false,
  arms: false,
  legs: false,
};

/** Weighted toward readable silhouette styles — bald only under helmets. */
const HAIR: HairStyle[] = [
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
];

const HELMET: HelmetStyle[] = [
  "none",
  "none",
  "none",
  "none",
  "none",
  "cap",
  "hood",
  "knight",
  "sciFi",
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
  "staff",
  "rifle",
  "shield",
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
  if (weapon === "staff") {
    return {
      arm: pick(["cast", "raise", "ready"] as ArmPose[]),
      leg: pick(["ready", "stand", "guard"] as LegPose[]),
    };
  }
  if (weapon === "rifle") {
    return {
      arm: pick(["extended", "reach", "ready"] as ArmPose[]),
      leg: pick(["ready", "wide", "lunge"] as LegPose[]),
    };
  }
  if (weapon === "shield") {
    return {
      arm: pick(["guard", "ready"] as ArmPose[]),
      leg: pick(["guard", "wide", "crouch"] as LegPose[]),
    };
  }
  if (weapon === "sword") {
    return {
      arm: pick(["ready", "extended", "reach", "raise"] as ArmPose[]),
      leg: pick(["ready", "lunge", "wide", "guard"] as LegPose[]),
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
type ArmsBits = Pick<CharacterSpec, "arms" | "weapon" | "leadSide"> & {
  /** Coupled leg pose so random doesn't break ipsilateral stance. */
  legPose: LegPose;
};
type LegsBits = Pick<CharacterSpec, "legs">;

function randomHead(skinHint?: string): HeadBits {
  const skin = skinHint ?? pick(SKINS);
  const helmetStyle = pick(HELMET);
  const hairColor = pick(HAIR_COLORS);
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
    head: { scale: 0.9 + Math.random() * 0.08 },
    hair,
    face: {
      eyeColor: pick(EYES),
      nose: Math.random() < 0.6,
    },
    helmet: {
      style: helmetStyle,
      color: helmetStyle === "none" ? pick(CLOTH) : pick(CLOTH),
      visor:
        helmetStyle === "sciFi" || helmetStyle === "knight"
          ? pick(CLOTH)
          : undefined,
    },
  };
}

function randomTorso(helmetStyle?: HelmetStyle): TorsoBits {
  const torsoStyle =
    helmetStyle === "hood"
      ? pick(["hoodedRobe", "robe", "jacket"] as TorsoStyle[])
      : pick(TORSO);
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

  return {
    torso: { style: torsoStyle, color: cloth, trim },
    accessories: {
      hem,
      hemColor,
      cape,
      capeColor,
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
 */
export function randomCharacter(locks?: PartLocks, base?: CharacterSpec): CharacterSpec {
  const keep = locks ?? EMPTY_LOCKS;
  const prev = base;

  const head = keep.head && prev ? {
    skin: prev.skin,
    head: prev.head,
    hair: prev.hair,
    face: prev.face,
    helmet: prev.helmet,
  } : randomHead(keep.head ? prev?.skin : undefined);

  const torso = keep.torso && prev
    ? { torso: prev.torso, accessories: prev.accessories }
    : randomTorso(head.helmet?.style);

  const arms = keep.arms && prev
    ? {
        leadSide: prev.leadSide ?? DEFAULT_LEAD,
        arms: prev.arms,
        weapon: prev.weapon,
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
    ...legs,
  };
}

/** Reroll one part (style + colors), keeping the rest of the spec. */
export function rerollPart(spec: CharacterSpec, part: PartId): CharacterSpec {
  if (part === "head") {
    const head = randomHead(spec.skin);
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
export function rerollPartColors(spec: CharacterSpec, part: PartId): CharacterSpec {
  const next = structuredClone(spec);
  if (part === "head") {
    // Hands belong to arms — pin their tint before skin changes.
    if (next.arms.handColor == null) {
      next.arms = { ...next.arms, handColor: next.skin };
    }
    next.skin = pick(SKINS);
    if (next.hair) next.hair.color = pick(HAIR_COLORS);
    if (next.face) next.face.eyeColor = pick(EYES);
    if (next.helmet && next.helmet.style !== "none") {
      next.helmet.color = pick(CLOTH);
      if (next.helmet.visor) next.helmet.visor = pick(CLOTH);
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
    return next;
  }
  next.legs = {
    ...next.legs,
    pantColor: pick(CLOTH),
    bootColor: pick(BOOT),
  };
  return next;
}
