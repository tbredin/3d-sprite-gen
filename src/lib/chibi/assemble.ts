import { Group } from "three";
import type { CharacterSpec, PresetId } from "./types";
import {
  generateArms,
  generateFace,
  generateHair,
  generateHead,
  generateHelmet,
  generateLegs,
  generateTorso,
  generateWeapon,
} from "./parts";

/**
 * Assemble a full chibi from a declarative spec.
 * LLM path: emit CharacterSpec JSON → assembleCharacter(spec).
 */
export function assembleCharacter(spec: CharacterSpec): Group {
  const root = new Group();
  root.name = "chibi";

  root.add(
    generateHead({
      skin: spec.skin,
      scale: spec.head?.scale ?? 1,
    }),
  );
  root.add(
    generateFace({
      skin: spec.skin,
      eyeColor: spec.face?.eyeColor,
      nose: spec.face?.nose,
    }),
  );

  if (spec.hair) {
    root.add(
      generateHair({
        style: spec.hair.style,
        color: spec.hair.color,
        complexity: spec.hair.complexity,
      }),
    );
  }

  if (spec.helmet && spec.helmet.style !== "none") {
    root.add(
      generateHelmet({
        style: spec.helmet.style,
        color: spec.helmet.color,
        visor: spec.helmet.visor,
      }),
    );
  }

  root.add(
    generateTorso({
      style: spec.torso.style,
      color: spec.torso.color,
      trim: spec.torso.trim,
      skin: spec.skin,
    }),
  );

  const arms = generateArms({
    pose: spec.arms.pose,
    skin: spec.skin,
    sleeveColor: spec.arms.sleeveColor ?? spec.torso.color,
    sleeveLength: spec.arms.sleeveLength,
    handColor: spec.arms.handColor,
  });
  root.add(arms.root);

  root.add(
    generateLegs({
      pose: spec.legs.pose,
      pantColor: spec.legs.pantColor,
      bootColor: spec.legs.bootColor,
    }),
  );

  if (spec.weapon && spec.weapon.type !== "none") {
    const hand =
      spec.weapon.hand === "left" ? arms.leftHand : arms.rightHand;
    hand.add(
      generateWeapon({
        type: spec.weapon.type,
        color: spec.weapon.color,
      }),
    );
  }

  return root;
}

export const PRESETS: Record<PresetId, CharacterSpec> = {
  mage: {
    skin: "#e4a672",
    head: { scale: 1.02 },
    hair: { style: "long", color: "#5b3d8a", complexity: 5 },
    face: { eyeColor: "#2a1c4a", nose: true },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "hoodedRobe", color: "#3d6e70", trim: "#c7cfcc" },
    arms: { pose: "cast", sleeveColor: "#3d6e70", sleeveLength: 0.9 },
    legs: { pose: "stand", pantColor: "#2a4550", bootColor: "#322947" },
    weapon: { type: "staff", hand: "right", color: "#8b5a2b" },
  },
  knight: {
    skin: "#e4a672",
    head: { scale: 1 },
    hair: { style: "bald", color: "#433455" },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "knight", color: "#9aa4b0", visor: "#2a2e3a" },
    torso: { style: "fullPlate", color: "#b0b8c4", trim: "#6a7484" },
    arms: {
      pose: "extended",
      sleeveColor: "#9aa4b0",
      sleeveLength: 0.95,
      handColor: "#e4a672",
    },
    legs: { pose: "wide", pantColor: "#6a7484", bootColor: "#3a415c" },
    weapon: { type: "sword", hand: "right", color: "#dfe4ea" },
  },
  soldier: {
    skin: "#c98a6a",
    head: { scale: 1 },
    hair: { style: "undercut", color: "#2a2035", complexity: 5 },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "sciFi", color: "#3a3555", visor: "#5ad4a0" },
    torso: { style: "chestplate", color: "#5ad4a0", trim: "#2a2540" },
    arms: {
      pose: "extended",
      sleeveColor: "#2a2540",
      sleeveLength: 0.75,
      handColor: "#c98a6a",
    },
    legs: { pose: "stride", pantColor: "#2a2540", bootColor: "#1a1c2c" },
    weapon: { type: "rifle", hand: "right", color: "#1a1c2c" },
  },
  rogue: {
    skin: "#e4a672",
    head: { scale: 0.98 },
    hair: { style: "spiky", color: "#f0d48a", complexity: 7 },
    face: { eyeColor: "#2a6ebd" },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "jacket", color: "#322947", trim: "#e83b3b" },
    arms: { pose: "akimbo", sleeveColor: "#322947", sleeveLength: 0.55 },
    legs: { pose: "crouch", pantColor: "#1a1c2c", bootColor: "#433455" },
    weapon: { type: "none", color: "#000000" },
  },
  scientist: {
    skin: "#f0c8a0",
    head: { scale: 1.06 },
    hair: { style: "mohawk", color: "#e83b3b", complexity: 6 },
    face: { eyeColor: "#3d6e70", nose: true },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "jacket", color: "#c7cfcc", trim: "#3d6e70" },
    arms: {
      pose: "raise",
      sleeveColor: "#c7cfcc",
      sleeveLength: 0.7,
      handColor: "#f0c8a0",
    },
    legs: { pose: "walk", pantColor: "#5a6a7a", bootColor: "#1a1c2c" },
    weapon: { type: "none", color: "#000000" },
  },
  cleric: {
    skin: "#f0c8a0",
    head: { scale: 1 },
    hair: { style: "bob", color: "#e8e4d8", complexity: 4 },
    face: { eyeColor: "#3d6e70", nose: true },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "hoodedRobe", color: "#c7cfcc", trim: "#f5e07a" },
    arms: { pose: "cast", sleeveColor: "#c7cfcc", sleeveLength: 0.92 },
    legs: { pose: "stand", pantColor: "#9aa4b0", bootColor: "#5a6a7a" },
    weapon: { type: "staff", hand: "right", color: "#f5e07a" },
  },
  ranger: {
    skin: "#d4a574",
    head: { scale: 1 },
    hair: { style: "braid", color: "#6b3a1f", complexity: 5 },
    face: { eyeColor: "#2a4550", nose: true },
    helmet: { style: "cap", color: "#3d5c40" },
    torso: { style: "jacket", color: "#3d5c40", trim: "#8b5a2b" },
    arms: {
      pose: "reach",
      sleeveColor: "#3d5c40",
      sleeveLength: 0.65,
      handColor: "#d4a574",
    },
    legs: { pose: "lunge", pantColor: "#2a4030", bootColor: "#322947" },
    weapon: { type: "sword", hand: "right", color: "#8b5a2b" },
  },
  barbarian: {
    skin: "#c98a6a",
    head: { scale: 1.08 },
    hair: { style: "topknot", color: "#1a1c2c", complexity: 6 },
    face: { eyeColor: "#e83b3b", nose: true },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "tank", color: "#5a4030", trim: "#8b5a2b" },
    arms: {
      pose: "raise",
      sleeveColor: "#c98a6a",
      sleeveLength: 0.15,
      handColor: "#c98a6a",
    },
    legs: { pose: "wide", pantColor: "#433455", bootColor: "#1a1c2c" },
    weapon: { type: "sword", hand: "right", color: "#7a8090" },
  },
  acolyte: {
    skin: "#ffe0bd",
    head: { scale: 0.96 },
    hair: { style: "fringe", color: "#3a9bb5", complexity: 5 },
    face: { eyeColor: "#5a2a7a" },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "robe", color: "#5a4a7a", trim: "#c7cfcc" },
    arms: { pose: "idle", sleeveColor: "#5a4a7a", sleeveLength: 0.88 },
    legs: { pose: "stand", pantColor: "#433455", bootColor: "#2a2540" },
    weapon: { type: "none", color: "#000000" },
  },
  pirate: {
    skin: "#e4a672",
    head: { scale: 1 },
    hair: { style: "twinTails", color: "#1a1c2c", complexity: 6 },
    face: { eyeColor: "#1a1c2c", nose: true },
    helmet: { style: "cap", color: "#e83b3b" },
    torso: { style: "jacket", color: "#3d6e70", trim: "#e83b3b" },
    arms: {
      pose: "guard",
      sleeveColor: "#3d6e70",
      sleeveLength: 0.5,
      handColor: "#e4a672",
    },
    legs: { pose: "walk", pantColor: "#2a2540", bootColor: "#8b5a2b" },
    weapon: { type: "sword", hand: "left", color: "#c7cfcc" },
  },
};

export function getPreset(id: PresetId): CharacterSpec {
  return structuredClone(PRESETS[id]);
}
