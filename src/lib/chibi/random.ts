import { ARM_POSES } from "./armPoses";
import { LEG_POSES } from "./legPoses";
import type {
  ArmPose,
  CharacterSpec,
  HairStyle,
  HelmetStyle,
  LegPose,
  TorsoStyle,
  WeaponType,
} from "./types";

// Bald is rare on purpose — SNES / Sea of Stars heads read as hair silhouettes.
const HAIR: HairStyle[] = [
  "bowl",
  "bowl",
  "bob",
  "bob",
  "spiky",
  "spiky",
  "spiky",
  "mohawk",
  "ponytail",
  "long",
  "long",
  "afro",
  "bun",
  "braid",
  "undercut",
  "curls",
  "topknot",
  "fringe",
  "fringe",
  "twinTails",
  "bald",
];
const HELMET: HelmetStyle[] = ["none", "none", "none", "knight", "cap", "sciFi", "hood"];
const TORSO: TorsoStyle[] = [
  "plain",
  "robe",
  "hoodedRobe",
  "chestplate",
  "fullPlate",
  "jacket",
  "tank",
];
const POSE: ArmPose[] = ARM_POSES;
const LEG_POSE: LegPose[] = LEG_POSES;
const WEAPON: WeaponType[] = ["none", "none", "sword", "staff", "rifle", "shield"];

const SKINS = [
  "#e4a672",
  "#f0c8a0",
  "#c98a6a",
  "#d4a574",
  "#8d5524",
  "#ffe0bd",
  "#c68642",
];

const HAIR_COLORS = [
  "#1a1c2c",
  "#433455",
  "#2a2035",
  "#8b5a2b",
  "#e83b3b",
  "#c7cfcc",
  "#f5e07a",
  "#f0d48a",
  "#3a9bb5",
  "#5b3d8a",
  "#3d6e70",
  "#e8a04a",
];

const CLOTH = [
  "#3d6e70",
  "#322947",
  "#2a2540",
  "#5ad4a0",
  "#9aa4b0",
  "#7a8090",
  "#c7cfcc",
  "#e83b3b",
  "#433455",
  "#1a1c2c",
  "#8b5a2b",
  "#5a6a7a",
];

const EYES = ["#1a1c2c", "#3d6e70", "#e83b3b", "#433455", "#5ad4a0"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function maybe<T>(arr: readonly T[], chance = 0.5): T | undefined {
  return Math.random() < chance ? pick(arr) : undefined;
}

/** Build a random CharacterSpec for quick variety. */
export function randomCharacter(): CharacterSpec {
  const skin = pick(SKINS);
  const hairStyle = pick(HAIR);
  const helmetStyle = pick(HELMET);
  const torsoStyle = pick(TORSO);
  const cloth = pick(CLOTH);
  const trim = maybe(CLOTH, 0.65);
  const hairColor = pick(HAIR_COLORS);
  const weaponType = pick(WEAPON);

  // Prefer hood without hair collision; bald under full helmets looks cleaner.
  const hair =
    helmetStyle === "knight" || helmetStyle === "sciFi"
      ? { style: "bald" as const, color: hairColor, complexity: 1 }
      : {
          style: hairStyle,
          color: hairColor,
          complexity: 2 + Math.floor(Math.random() * 6),
        };

  return {
    skin,
    head: { scale: 0.95 + Math.random() * 0.15 },
    hair,
    face: {
      eyeColor: pick(EYES),
      nose: Math.random() < 0.55,
    },
    helmet: {
      style: helmetStyle,
      color: pick(CLOTH),
      visor: helmetStyle === "sciFi" || helmetStyle === "knight" ? pick(CLOTH) : undefined,
    },
    torso: {
      style: torsoStyle,
      color: cloth,
      trim,
    },
    arms: {
      pose: pick(POSE),
      sleeveColor: cloth,
      sleeveLength: 0.45 + Math.random() * 0.5,
      handColor: skin,
    },
    legs: {
      pose: pick(LEG_POSE),
      pantColor: pick(CLOTH),
      bootColor: pick(["#1a1c2c", "#322947", "#433455", "#2a2540", "#8b5a2b"]),
    },
    weapon: {
      type: weaponType,
      hand: Math.random() < 0.5 ? "left" : "right",
      color: pick(CLOTH),
    },
  };
}
