import { Group } from "three";
import type { CharacterSpec, PresetId } from "./types";
import { helmetModeFor } from "./helmetMode";
import { addHullOutlines } from "./outlines";
import { PartGroupId, tagPartGroup } from "./partGroups";
import {
  generateArms,
  generateCape,
  generateFace,
  generateHair,
  generateHead,
  generateHelmet,
  generateHem,
  generateLegs,
  generateTorso,
  generateWeapon,
} from "./parts";
import { resolveLeadSide, torsoYawForLead } from "./stance";

/**
 * Assemble a full chibi from a declarative spec.
 * LLM path: emit CharacterSpec JSON → assembleCharacter(spec).
 *
 * Hierarchy for silhouette stance (see stance.ts):
 *   root  — facing +Z; BakeCanvas rotationY turns the whole sprite
 *     head / face / hair / helmet  — stay on root so faceCheat uses body yaw
 *     upperBody (yaw ≈ ±45°) — torso, hem, cape, arms (+ weapons)
 *     legs — planted on root with ipsilateral lead foot
 *
 * Full-head helmets (`helmetMode.mount === "replace"`) skip the skin skull
 * (and hair); closed helms also skip face/eyes so the replacement mesh is
 * the readable head silhouette.
 */
export function assembleCharacter(spec: CharacterSpec): Group {
  const root = new Group();
  root.name = "chibi";

  const leadSide = resolveLeadSide(spec.leadSide);

  const helmetMode = helmetModeFor(spec.helmet?.style);
  const replaceHead = helmetMode.mount === "replace";
  const showFace = !replaceHead || helmetMode.showFace;
  const headScale = spec.head?.scale ?? 1;

  if (!replaceHead) {
    const head = generateHead({
      skin: spec.skin,
      scale: headScale,
    });
    root.add(head);
    addHullOutlines(head, 0.03);
    tagPartGroup(head, PartGroupId.HEAD);
  }

  // Face stays un-outlined so eyes stay crisp (skipped under closed helms)
  if (showFace) {
    const face = generateFace({
      skin: spec.skin,
      eyeColor: spec.face?.eyeColor,
      nose: spec.face?.nose,
    });
    root.add(face);
    tagPartGroup(face, PartGroupId.HEAD);
  }

  // Hair is under / inside replacements — skip so it doesn't poke out
  if (!replaceHead && spec.hair) {
    const hair = generateHair({
      style: spec.hair.style,
      color: spec.hair.color,
      complexity: spec.hair.complexity,
    });
    root.add(hair);
    addHullOutlines(hair, 0.026);
    tagPartGroup(hair, PartGroupId.HEAD);
  }

  if (spec.helmet && spec.helmet.style !== "none") {
    const helmet = generateHelmet({
      style: spec.helmet.style,
      color: spec.helmet.color,
      visor: spec.helmet.visor,
      scale: headScale,
    });
    root.add(helmet);
    addHullOutlines(helmet, 0.032);
    tagPartGroup(helmet, PartGroupId.HEAD);
  }

  const upper = new Group();
  upper.name = "upperBody";
  upper.rotation.y = torsoYawForLead(leadSide);
  root.add(upper);

  const torso = generateTorso({
    style: spec.torso.style,
    color: spec.torso.color,
    trim: spec.torso.trim,
    skin: spec.skin,
  });
  upper.add(torso);
  addHullOutlines(torso, 0.03);
  tagPartGroup(torso, PartGroupId.TORSO);

  const hem = spec.accessories?.hem ?? "none";
  if (hem !== "none") {
    const hemG = generateHem({
      style: hem,
      color: spec.accessories?.hemColor ?? spec.torso.trim ?? spec.torso.color,
    });
    upper.add(hemG);
    addHullOutlines(hemG, 0.024);
    tagPartGroup(hemG, PartGroupId.ACCESSORY);
  }

  if (spec.accessories?.cape) {
    const cape = generateCape({
      color:
        spec.accessories.capeColor ??
        spec.torso.trim ??
        spec.torso.color,
    });
    upper.add(cape);
    addHullOutlines(cape, 0.028);
    tagPartGroup(cape, PartGroupId.ACCESSORY);
  }

  const arms = generateArms({
    pose: spec.arms.pose,
    skin: spec.skin,
    sleeveColor: spec.arms.sleeveColor ?? spec.torso.color,
    sleeveLength: spec.arms.sleeveLength,
    handColor: spec.arms.handColor,
    leadSide,
  });
  upper.add(arms.root);
  addHullOutlines(arms.root, 0.028);
  tagPartGroup(arms.root, PartGroupId.ARMS);

  const legs = generateLegs({
    pose: spec.legs.pose,
    pantColor: spec.legs.pantColor,
    bootColor: spec.legs.bootColor,
    leadSide,
  });
  root.add(legs);
  addHullOutlines(legs, 0.028);
  tagPartGroup(legs, PartGroupId.LEGS);

  if (spec.weapon && spec.weapon.type !== "none") {
    // Shield nests on the trail (back) hand; other weapons extend the lead hand.
    // Explicit weapon.hand still wins when present.
    const defaultHand =
      spec.weapon.type === "shield"
        ? leadSide === "right"
          ? "left"
          : "right"
        : leadSide;
    const handId = spec.weapon.hand ?? defaultHand;
    const hand = handId === "left" ? arms.leftHand : arms.rightHand;
    const weapon = generateWeapon({
      type: spec.weapon.type,
      color: spec.weapon.color,
      hand: handId,
    });
    hand.add(weapon);
    addHullOutlines(weapon, 0.022);
    tagPartGroup(weapon, PartGroupId.WEAPON);
  }

  return root;
}

export const PRESETS: Record<PresetId, CharacterSpec> = {
  mage: {
    skin: "#e4a672",
    leadSide: "right",
    head: { scale: 0.92 },
    hair: { style: "long", color: "#5b3d8a", complexity: 5 },
    face: { eyeColor: "#2a1c4a", nose: true },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "hoodedRobe", color: "#3d6e70", trim: "#c7cfcc" },
    accessories: { hem: "skirt", hemColor: "#2a4550", cape: true, capeColor: "#3d6e70" },
    arms: { pose: "cast", sleeveColor: "#3d6e70", sleeveLength: 0.9 },
    legs: { pose: "ready", pantColor: "#2a4550", bootColor: "#322947" },
    weapon: { type: "staff", hand: "right", color: "#8b5a2b" },
  },
  knight: {
    skin: "#e4a672",
    leadSide: "right",
    head: { scale: 0.9 },
    hair: { style: "bald", color: "#433455" },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "knight", color: "#9aa4b0", visor: "#2a2e3a" },
    torso: { style: "fullPlate", color: "#b0b8c4", trim: "#6a7484" },
    accessories: { hem: "none", cape: true, capeColor: "#6a7484" },
    arms: {
      pose: "extended",
      sleeveColor: "#9aa4b0",
      sleeveLength: 0.95,
      handColor: "#e4a672",
    },
    legs: { pose: "lunge", pantColor: "#6a7484", bootColor: "#3a415c" },
    weapon: { type: "sword", hand: "right", color: "#dfe4ea" },
  },
  soldier: {
    skin: "#c98a6a",
    leadSide: "right",
    head: { scale: 0.9 },
    hair: { style: "bald", color: "#2a2035" },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "sciFi", color: "#3a3555", visor: "#5ad4a0" },
    torso: { style: "chestplate", color: "#5ad4a0", trim: "#2a2540" },
    accessories: { hem: "loincloth", hemColor: "#2a2540" },
    arms: {
      pose: "extended",
      sleeveColor: "#2a2540",
      sleeveLength: 0.75,
      handColor: "#c98a6a",
    },
    legs: { pose: "wide", pantColor: "#2a2540", bootColor: "#1a1c2c" },
    weapon: { type: "rifle", hand: "right", color: "#1a1c2c" },
  },
  rogue: {
    skin: "#e4a672",
    leadSide: "right",
    head: { scale: 0.9 },
    hair: { style: "spiky", color: "#f0d48a", complexity: 7 },
    face: { eyeColor: "#2a6ebd" },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "jacket", color: "#322947", trim: "#e83b3b" },
    accessories: { hem: "loincloth", hemColor: "#e83b3b", cape: true, capeColor: "#322947" },
    arms: { pose: "ready", sleeveColor: "#322947", sleeveLength: 0.55 },
    legs: { pose: "crouch", pantColor: "#1a1c2c", bootColor: "#433455" },
    weapon: { type: "none", color: "#000000" },
  },
  scientist: {
    skin: "#f0c8a0",
    leadSide: "right",
    head: { scale: 0.94 },
    hair: { style: "mohawk", color: "#e83b3b", complexity: 6 },
    face: { eyeColor: "#3d6e70", nose: true },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "jacket", color: "#c7cfcc", trim: "#3d6e70" },
    accessories: { hem: "none" },
    arms: {
      pose: "raise",
      sleeveColor: "#c7cfcc",
      sleeveLength: 0.7,
      handColor: "#f0c8a0",
    },
    legs: { pose: "ready", pantColor: "#5a6a7a", bootColor: "#1a1c2c" },
    weapon: { type: "none", color: "#000000" },
  },
  cleric: {
    skin: "#f0c8a0",
    leadSide: "right",
    head: { scale: 0.9 },
    hair: { style: "bob", color: "#e8e4d8", complexity: 4 },
    face: { eyeColor: "#3d6e70", nose: true },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "hoodedRobe", color: "#c7cfcc", trim: "#f5e07a" },
    accessories: { hem: "skirt", hemColor: "#c7cfcc", cape: true, capeColor: "#9aa4b0" },
    arms: { pose: "cast", sleeveColor: "#c7cfcc", sleeveLength: 0.92 },
    legs: { pose: "ready", pantColor: "#9aa4b0", bootColor: "#5a6a7a" },
    weapon: { type: "staff", hand: "right", color: "#f5e07a" },
  },
  ranger: {
    skin: "#d4a574",
    leadSide: "right",
    head: { scale: 0.9 },
    hair: { style: "braid", color: "#6b3a1f", complexity: 5 },
    face: { eyeColor: "#2a4550", nose: true },
    helmet: { style: "cap", color: "#3d5c40" },
    torso: { style: "jacket", color: "#3d5c40", trim: "#8b5a2b" },
    accessories: { hem: "loincloth", hemColor: "#8b5a2b" },
    arms: {
      pose: "reach",
      sleeveColor: "#3d5c40",
      sleeveLength: 0.65,
      handColor: "#d4a574",
    },
    legs: { pose: "guard", pantColor: "#2a4030", bootColor: "#322947" },
    weapon: { type: "sword", hand: "right", color: "#8b5a2b" },
  },
  barbarian: {
    skin: "#c98a6a",
    leadSide: "right",
    head: { scale: 0.9 },
    hair: { style: "topknot", color: "#1a1c2c", complexity: 6 },
    face: { eyeColor: "#e83b3b", nose: true },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "tank", color: "#5a4030", trim: "#8b5a2b" },
    accessories: { hem: "loincloth", hemColor: "#5a4030", cape: true, capeColor: "#433455" },
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
    leadSide: "right",
    head: { scale: 0.9 },
    hair: { style: "fringe", color: "#3a9bb5", complexity: 5 },
    face: { eyeColor: "#5a2a7a" },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "robe", color: "#5a4a7a", trim: "#c7cfcc" },
    accessories: { hem: "skirt", hemColor: "#5a4a7a" },
    arms: { pose: "ready", sleeveColor: "#5a4a7a", sleeveLength: 0.88 },
    legs: { pose: "ready", pantColor: "#433455", bootColor: "#2a2540" },
    weapon: { type: "none", color: "#000000" },
  },
  pirate: {
    skin: "#e4a672",
    // Mirrored silhouette — left lead, blade in forward hand.
    leadSide: "left",
    head: { scale: 0.9 },
    hair: { style: "twinTails", color: "#1a1c2c", complexity: 6 },
    face: { eyeColor: "#1a1c2c", nose: true },
    helmet: { style: "cap", color: "#e83b3b" },
    torso: { style: "jacket", color: "#3d6e70", trim: "#e83b3b" },
    accessories: { hem: "loincloth", hemColor: "#e83b3b", cape: true, capeColor: "#3d6e70" },
    arms: {
      pose: "ready",
      sleeveColor: "#3d6e70",
      sleeveLength: 0.5,
      handColor: "#e4a672",
    },
    legs: { pose: "ready", pantColor: "#2a2540", bootColor: "#8b5a2b" },
    weapon: { type: "sword", hand: "left", color: "#c7cfcc" },
  },
  goatman: {
    // Replace-mount goat head; tank torso = shirtless at chibi scale.
    skin: "#c98a6a",
    leadSide: "right",
    head: { scale: 0.92 },
    hair: { style: "bald", color: "#5a4030" },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "goat", color: "#5a4030", visor: "#e8e4d8" },
    torso: { style: "tank", color: "#c98a6a", trim: "#433455" },
    accessories: { hem: "loincloth", hemColor: "#433455" },
    arms: {
      pose: "raise",
      sleeveColor: "#c98a6a",
      sleeveLength: 0.12,
      handColor: "#c98a6a",
    },
    legs: { pose: "wide", pantColor: "#322947", bootColor: "#1a1c2c" },
    weapon: { type: "sword", hand: "right", color: "#9aa4b0" },
  },
};

export function getPreset(id: PresetId): CharacterSpec {
  return structuredClone(PRESETS[id]);
}
