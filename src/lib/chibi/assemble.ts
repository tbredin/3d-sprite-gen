import { Group, Quaternion, Vector3 } from "three";
import type { CharacterSpec, PresetId, WeaponType } from "./types";
import { TWO_HANDED_TYPES } from "./types";
import { helmetModeFor } from "./helmetMode";
import { addHullOutlines } from "./outlines";
import { PartGroupId, tagPartGroup } from "./partGroups";
import {
  generateArms,
  generateBackLoadout,
  generateCape,
  generateFace,
  generateHair,
  generateHead,
  generateHelmet,
  generateHem,
  generateLegs,
  generateNeck,
  generatePouches,
  generateTorso,
  generateWeapon,
  neckAttachY,
} from "./parts";
import { legsYawForLead, resolveLeadSide, torsoYawForLead } from "./stance";

/**
 * Assemble a full chibi from a declarative spec.
 * LLM path: emit CharacterSpec JSON → assembleCharacter(spec).
 *
 * Hierarchy for silhouette stance (see stance.ts):
 *   root  — facing +Z; BakeCanvas rotationY turns the whole sprite
 *     neck — fixed skin stump (not scaled with the head)
 *     headPivot @ neck — size/height scale + sticky yaw pivot from the neck
 *       headLocal — world-authored geometry offset so neck is the origin
 *     upperBody (yaw ≈ ±45°) — torso, hem, cape, back gear, arms (+ weapons)
 *     legs (yaw ≈ 40% of torso) — planted ipsilateral lead; tracks ¾ body
 *
 * Full-head helmets (`helmetMode.mount === "replace"`) skip the skin skull
 * (and hair); closed helms also skip face/eyes so the replacement mesh is
 * the readable head silhouette.
 */
export type AssembleOptions = {
  /** Draw cartoon eyes on the face. Default true. */
  showEyes?: boolean;
  /** Skin skull / hair / helmet / neck. Default true. */
  showHead?: boolean;
  /** Torso mesh + hem / cape / pouches / back loadout. Default true. */
  showTorso?: boolean;
  /** Arms (weapons parented to hands hide with them). Default true. */
  showArms?: boolean;
  /** Legs. Default true. */
  showLegs?: boolean;
};

/** Per-row show/hide for the Character panel (eyes + body parts). */
export type PartVisibility = {
  eyes: boolean;
  head: boolean;
  torso: boolean;
  arms: boolean;
  legs: boolean;
};

export const DEFAULT_PART_VISIBILITY: PartVisibility = {
  eyes: true,
  head: true,
  torso: true,
  arms: true,
  legs: true,
};

/**
 * Eye meshes (by name) hidden by a lens overlay so the glass reads as a solid
 * cover. `goggles` blank both eyes; `scouter` covers the +x (screen-right) eye
 * to match its single lens placement in generateHelmet.
 */
function eyesHiddenByHelmet(style?: string): Set<string> {
  if (style === "goggles") return new Set(["eye-left", "eye-right"]);
  if (style === "scouter") return new Set(["eye-right"]);
  return new Set();
}

type HeldWeapon = Exclude<WeaponType, "none" | "shield">;
type GripRole = "lead" | "off";

/**
 * Weapons are built in a canonical local frame with the grip at the origin:
 * sword/staff length runs up +Y, rifle length runs forward +Z. `axis` is that
 * length direction; `grip` is where the hold point sits in the hand's space so
 * the handle passes through the mitt.
 */
/** Bladed / hafted frame: length up +Y, hold point just under the guard. */
const hafted = () => ({
  axis: new Vector3(0, 1, 0),
  // Hand: wrist at origin, fist −Y, knuckles +Z. Hold point sits in the finger
  // / palm channel (past the wrist), not near the cuff.
  grip: new Vector3(0, -0.14, 0.12),
});
/** Gun frame: barrel forward +Z, hold point at the receiver. */
const gunned = () => ({
  axis: new Vector3(0, 0, 1),
  grip: new Vector3(0, -0.12, 0.1),
});
/**
 * Pistols hang their rake grip below the origin — raise the prop so that
 * handle sits in the mitt and the slide/barrel clear above the knuckles.
 */
const pistolled = () => ({
  axis: new Vector3(0, 0, 1),
  grip: new Vector3(0, 0, 0.12),
});

const WEAPON_GRIP: Record<HeldWeapon, { axis: Vector3; grip: Vector3 }> = {
  sword: hafted(),
  swordBroad: hafted(),
  swordCurved: hafted(),
  swordRapier: hafted(),
  swordClaymore: hafted(),
  dagger: hafted(),
  daggerCurved: hafted(),
  claw: hafted(),
  clawTwin: hafted(),
  axe: hafted(),
  axeBearded: hafted(),
  axeHand: hafted(),
  greataxe: hafted(),
  greataxeDouble: hafted(),
  hammer: hafted(),
  hammerWar: hafted(),
  hammerClub: hafted(),
  maul: hafted(),
  maulSpiked: hafted(),
  spear: hafted(),
  spearBarbed: hafted(),
  halberd: hafted(),
  staff: hafted(),
  wand: hafted(),
  wandCrystal: hafted(),
  pistol: pistolled(),
  pistolFlint: pistolled(),
  pistolHeavy: pistolled(),
  rifle: gunned(),
  rifleLong: gunned(),
  rifleCarbine: gunned(),
};

/** Barrel-forward props share the rifle carry and its trail-hand foregrip. */
const GUN_TYPES = new Set<WeaponType>([
  "pistol",
  "pistolFlint",
  "pistolHeavy",
  "rifle",
  "rifleLong",
  "rifleCarbine",
]);

/** Two-handed weapons — the trail hand is IK'd onto the shaft below the grip. */
const TWO_HANDED = new Set<WeaponType>(TWO_HANDED_TYPES);
/**
 * Where the trail hand grips (weapon-local): down the shaft toward the butt for
 * hafted weapons, forward along the barrel for long guns.
 */
const TWO_HAND_GRIP: Partial<Record<HeldWeapon, Vector3>> = {
  maul: new Vector3(0, -0.26, 0),
  maulSpiked: new Vector3(0, -0.26, 0),
  spear: new Vector3(0, -0.26, 0),
  spearBarbed: new Vector3(0, -0.28, 0),
  halberd: new Vector3(0, -0.28, 0),
  greataxe: new Vector3(0, -0.3, 0),
  greataxeDouble: new Vector3(0, -0.3, 0),
  rifle: new Vector3(0, 0, 0.3),
  rifleLong: new Vector3(0, 0, 0.34),
  rifleCarbine: new Vector3(0, 0, 0.26),
};

/**
 * DEBUG: candidate off-hand blade/staff carries. `dir(out)` returns the body-
 * space direction the weapon length should point, where `out` (+1 right / −1
 * left) sends the lean toward the holding hand's side. Switch between these live
 * via `setOffhandVariant` to compare which low carry reads best.
 */
// Angles are measured DOWN FROM HORIZONTAL so the tip stays above the floor:
// dir = (cos(a)·out, −sin(a), fwd). Small `a` = shallow / more horizontal.
const belowGround = (deg: number, out: number, fwd = 0.1) => {
  const a = (deg * Math.PI) / 180;
  return new Vector3(Math.cos(a) * out, -Math.sin(a), fwd);
};
export const OFFHAND_VARIANTS: { id: string; dir: (out: number) => Vector3 }[] =
  [
    // ~30° below horizontal, out to the side — shallow low guard.
    { id: "ground-30", dir: (o) => belowGround(30, o) },
    // Shallower ~20° — blade almost level, held out to the side.
    { id: "ground-20", dir: (o) => belowGround(20, o) },
    // Steeper ~45° below horizontal (still clears the floor).
    { id: "ground-45", dir: (o) => belowGround(45, o) },
    // ~30° below horizontal, angled forward past the hip.
    { id: "ground-30-fwd", dir: (o) => belowGround(30, o, 0.6) },
    // ~30° below horizontal, trailing behind the hip.
    { id: "ground-30-back", dir: (o) => belowGround(30, o, -0.5) },
  ];
export const OFFHAND_VARIANT_IDS = OFFHAND_VARIANTS.map((v) => v.id);

let offhandVariantIndex = 0;
export function setOffhandVariant(i: number) {
  offhandVariantIndex = Math.max(
    0,
    Math.min(OFFHAND_VARIANTS.length - 1, Math.floor(i)),
  );
}
export function getOffhandVariant() {
  return offhandVariantIndex;
}

/**
 * Body-space direction the weapon's length should point.
 * - Lead hand: up-and-out ~39° off vertical so the blade clears the face and
 *   cuts a legible diagonal (not planted vertically in front of the character).
 * - Off hand: low guard chosen from `OFFHAND_VARIANTS` (debug-switchable).
 * `out` sends the lean toward the holding hand's side (+X right, −X left).
 */
function weaponTargetDir(
  type: HeldWeapon,
  role: GripRole,
  handId: "left" | "right",
): Vector3 {
  const out = handId === "right" ? 1 : -1;
  if (GUN_TYPES.has(type)) {
    return role === "off"
      ? new Vector3(0.3 * out, -0.5, 0.82)
      : new Vector3(0.28 * out, -0.18, 1);
  }
  if (role === "off") {
    const v = OFFHAND_VARIANTS[offhandVariantIndex] ?? OFFHAND_VARIANTS[0];
    return v.dir(out);
  }
  const theta = 0.68; // ~39° off vertical
  return new Vector3(Math.sin(theta) * out, Math.cos(theta), 0.18);
}

/**
 * Aim a held weapon in body space so it always reads as gripped and cuts a
 * legible diagonal, regardless of arm pose. The weapon is a child of `hand`; we
 * cancel the hand's rotation (relative to `upper`) and align the weapon's length
 * axis to the desired body-space direction.
 */
function aimHeldWeapon(
  weapon: Group,
  hand: Group,
  upper: Group,
  root: Group,
  type: HeldWeapon,
  handId: "left" | "right",
  role: GripRole,
) {
  root.updateMatrixWorld(true);
  const qUpper = new Quaternion();
  upper.getWorldQuaternion(qUpper);
  const qHand = new Quaternion();
  hand.getWorldQuaternion(qHand);
  // hand orientation relative to the torso frame.
  const handRelUpper = qUpper.invert().multiply(qHand);
  const dir = weaponTargetDir(type, role, handId).normalize();
  const desired = new Quaternion().setFromUnitVectors(WEAPON_GRIP[type].axis, dir);
  weapon.quaternion.copy(handRelUpper.invert().multiply(desired));
  weapon.position.copy(WEAPON_GRIP[type].grip);
}

/**
 * Two-bone IK: swing the trail arm so its hand grips a point on the (already
 * aimed) two-handed weapon's shaft. The hand is `elbow → shoulder → arms.root`;
 * we set the shoulder and elbow world orientations directly so the wrist lands
 * on the target and the forearm points down the shaft.
 */
function reachHandToWeapon(
  hand: Group,
  weapon: Group,
  gripLocal: Vector3,
  root: Group,
  upperLen: number,
  foreLen: number,
  side: 1 | -1,
) {
  root.updateMatrixWorld(true);
  const elbow = hand.parent as Group | null;
  const shoulder = elbow?.parent as Group | null;
  const shoulderParent = shoulder?.parent as Group | null;
  if (!elbow || !shoulder || !shoulderParent) return;

  const S = new Vector3();
  shoulder.getWorldPosition(S);
  const T = weapon.localToWorld(gripLocal.clone());

  const u = upperLen;
  const f = foreLen;
  const toT = new Vector3().subVectors(T, S);
  let d = toT.length();
  d = Math.min(u + f - 1e-3, Math.max(Math.abs(u - f) + 1e-3, d));
  const axisST = toT.clone().normalize();

  // Pole so the elbow drifts down / back / outboard (natural bend, no lock).
  const pole = new Vector3(side * 0.45, -0.5, -0.85).normalize();
  const perp = pole
    .clone()
    .addScaledVector(axisST, -pole.dot(axisST));
  if (perp.lengthSq() < 1e-5) perp.set(-axisST.z, 0, axisST.x);
  perp.normalize();

  const cosA = (u * u + d * d - f * f) / (2 * u * d);
  const a = Math.acos(Math.min(1, Math.max(-1, cosA)));
  const E = S.clone()
    .addScaledVector(axisST, u * Math.cos(a))
    .addScaledVector(perp, u * Math.sin(a));

  const DOWN = new Vector3(0, -1, 0);
  const qParent = new Quaternion();
  shoulderParent.getWorldQuaternion(qParent);

  const dirSE = new Vector3().subVectors(E, S).normalize();
  const qShoulderWorld = new Quaternion().setFromUnitVectors(DOWN, dirSE);
  shoulder.quaternion.copy(qParent.clone().invert().multiply(qShoulderWorld));
  shoulder.updateMatrixWorld(true);

  const dirET = new Vector3().subVectors(T, E).normalize();
  const qElbowWorld = new Quaternion().setFromUnitVectors(DOWN, dirET);
  const qShoulderW = new Quaternion();
  shoulder.getWorldQuaternion(qShoulderW);
  elbow.quaternion.copy(qShoulderW.clone().invert().multiply(qElbowWorld));
  hand.rotation.set(0, 0, 0);
}

export function assembleCharacter(
  spec: CharacterSpec,
  opts?: AssembleOptions,
): Group {
  const root = new Group();
  root.name = "chibi";

  const leadSide = resolveLeadSide(spec.leadSide);
  const showEyes = opts?.showEyes ?? true;
  const showHead = opts?.showHead ?? true;
  const showTorso = opts?.showTorso ?? true;
  const showArms = opts?.showArms ?? true;
  const showLegs = opts?.showLegs ?? true;

  const helmetMode = helmetModeFor(spec.helmet?.style);
  const replaceHead = helmetMode.mount === "replace";
  const showFace = (!replaceHead || helmetMode.showFace) && showEyes;
  const headScale = spec.head?.scale ?? 1;
  const headSize = spec.head?.size ?? 1;
  const headYScale = spec.head?.yScale ?? 1;
  const headShape = spec.head?.shape;
  const neckY = neckAttachY();

  // Skin neck sits on the torso and does not scale with the head — stops the
  // skull floating when body is small or head size is dialled down.
  const neck = generateNeck(spec.skin);
  root.add(neck);
  addHullOutlines(neck, 0.022);
  tagPartGroup(neck, PartGroupId.HEAD);

  // Head assembly pivots at the neck: size / height scale and sticky yaw all
  // share this origin. Geometry is authored in world Y, then offset into a
  // local group so (0,0,0) of headPivot is the neck joint.
  const headPivot = new Group();
  headPivot.name = "headPivot";
  headPivot.position.set(0, neckY, 0);
  headPivot.scale.set(headSize, headSize * headYScale, headSize);
  root.add(headPivot);

  const headLocal = new Group();
  headLocal.name = "headLocal";
  headLocal.position.set(0, -neckY, 0);
  headPivot.add(headLocal);

  if (!replaceHead) {
    const head = generateHead({
      skin: spec.skin,
      scale: headScale,
      shape: headShape,
    });
    headLocal.add(head);
    addHullOutlines(head, 0.03);
    tagPartGroup(head, PartGroupId.HEAD);
  }

  // Face stays un-outlined so eyes stay crisp (skipped under closed helms)
  if (showFace) {
    const face = generateFace({
      style: spec.face?.style ?? "classic",
      browStyle: spec.face?.browStyle ?? "none",
      eyeColor: spec.face?.eyeColor,
      browColor: spec.hair?.color ?? spec.face?.eyeColor,
      // Independent of head.scale — scientist bumps eyes without touching hair.
      scale: spec.face?.scale ?? 1,
      spacing: spec.face?.spacing ?? 1,
      y: spec.face?.y ?? 0,
      headScale,
      shape: headShape,
    });
    // Hide the eye(s) sitting directly behind a lens (goggles/scouter) so the
    // lens reads as an opaque cover instead of an eye poking through the glass.
    // Brows are parented under their eye, so they hide with it.
    const hiddenEyes = eyesHiddenByHelmet(spec.helmet?.style);
    if (hiddenEyes.size > 0) {
      for (const child of face.children) {
        if (hiddenEyes.has(child.name)) child.visible = false;
      }
    }
    headLocal.add(face);
    tagPartGroup(face, PartGroupId.HEAD);
  }

  // Hair is under / inside replacements — skip so it doesn't poke out.
  // Hair geometry is intentionally not multiplied by head.scale.
  if (!replaceHead && spec.hair) {
    const hair = generateHair({
      style: spec.hair.style,
      color: spec.hair.color,
      complexity: spec.hair.complexity,
    });
    headLocal.add(hair);
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
    headLocal.add(helmet);
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
    detailStyle: spec.torso.detailStyle,
    detailColor: spec.torso.detailColor,
    skin: spec.skin,
  });
  upper.add(torso);
  addHullOutlines(torso, 0.03);
  tagPartGroup(torso, PartGroupId.TORSO);

  const hem = spec.accessories?.hem ?? "none";
  let hemG: ReturnType<typeof generateHem> | null = null;
  if (hem !== "none") {
    hemG = generateHem({
      style: hem,
      color: spec.accessories?.hemColor ?? spec.torso.trim ?? spec.torso.color,
    });
    upper.add(hemG);
    addHullOutlines(hemG, 0.024);
    tagPartGroup(hemG, PartGroupId.ACCESSORY);
  }

  let cape: ReturnType<typeof generateCape> | null = null;
  if (spec.accessories?.cape) {
    cape = generateCape({
      color:
        spec.accessories.capeColor ??
        spec.torso.trim ??
        spec.torso.color,
    });
    upper.add(cape);
    addHullOutlines(cape, 0.028);
    tagPartGroup(cape, PartGroupId.ACCESSORY);
  }

  let pouches: ReturnType<typeof generatePouches> | null = null;
  if (spec.accessories?.pouches) {
    pouches = generatePouches({
      color:
        spec.accessories.pouchColor ??
        spec.torso.trim ??
        spec.torso.color,
    });
    upper.add(pouches);
    addHullOutlines(pouches, 0.022);
    tagPartGroup(pouches, PartGroupId.ACCESSORY);
  }

  const backStyle = spec.accessories?.backLoadout ?? "none";
  let back: ReturnType<typeof generateBackLoadout> | null = null;
  if (backStyle !== "none") {
    back = generateBackLoadout({
      style: backStyle,
      color:
        spec.accessories?.backLoadoutColor ??
        spec.weapon?.color ??
        spec.torso.trim ??
        spec.torso.color,
    });
    upper.add(back);
    addHullOutlines(back, 0.024);
    tagPartGroup(back, PartGroupId.WEAPON);
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
  legs.rotation.y = legsYawForLead(leadSide);
  root.add(legs);
  addHullOutlines(legs, 0.028);
  tagPartGroup(legs, PartGroupId.LEGS);

  const trailHandId: "left" | "right" = leadSide === "right" ? "left" : "right";
  let mainHandId: "left" | "right" | null = null;
  if (spec.weapon && spec.weapon.type !== "none") {
    // Shield nests on the trail (back) hand; other weapons extend the lead hand.
    // Explicit weapon.hand still wins when present.
    const defaultHand =
      spec.weapon.type === "shield" ? trailHandId : leadSide;
    const handId = spec.weapon.hand ?? defaultHand;
    mainHandId = handId;
    const hand = handId === "left" ? arms.leftHand : arms.rightHand;
    const weapon = generateWeapon({
      type: spec.weapon.type,
      color: spec.weapon.color,
      hand: handId,
    });
    hand.add(weapon);
    // Shields hug the forearm (handled in geometry); pointed props are aimed in
    // body space so they always look gripped rather than skewered into the arm.
    // A blade in the lead hand rides high-and-out; on the trail hand it drops low.
    if (spec.weapon.type !== "shield") {
      const role: GripRole = handId === leadSide ? "lead" : "off";
      aimHeldWeapon(weapon, hand, upper, root, spec.weapon.type, handId, role);
      // Two-handers: swing the trail arm up so its hand grips the lower shaft.
      if (TWO_HANDED.has(spec.weapon.type)) {
        const gripLocal = TWO_HAND_GRIP[
          spec.weapon.type as HeldWeapon
        ] as Vector3 | undefined;
        const trailHand =
          trailHandId === "left" ? arms.leftHand : arms.rightHand;
        if (gripLocal) {
          reachHandToWeapon(
            trailHand,
            weapon,
            gripLocal,
            root,
            arms.upperLen,
            arms.foreLen,
            trailHandId === "right" ? 1 : -1,
          );
        }
      }
    }
    addHullOutlines(weapon, 0.022);
    tagPartGroup(weapon, PartGroupId.WEAPON);
  }

  // Off-hand prop on the trail hand: a shield to guard, or a second blade/gun
  // carried low at the side. Skipped for two-handers (both hands busy) or when
  // the main weapon already fills that hand.
  if (
    spec.offhand &&
    spec.offhand.type !== "none" &&
    mainHandId !== trailHandId &&
    !(spec.weapon && TWO_HANDED.has(spec.weapon.type))
  ) {
    const trailHand = trailHandId === "left" ? arms.leftHand : arms.rightHand;
    const off = generateWeapon({
      type: spec.offhand.type,
      color: spec.offhand.color,
      hand: trailHandId,
    });
    trailHand.add(off);
    if (spec.offhand.type !== "shield") {
      aimHeldWeapon(off, trailHand, upper, root, spec.offhand.type, trailHandId, "off");
    }
    addHullOutlines(off, 0.022);
    tagPartGroup(off, PartGroupId.WEAPON);
  }

  // Part-row show/hide toggles — keep geometry built so re-showing is free.
  if (!showHead) {
    headPivot.visible = false;
    neck.visible = false;
  }
  if (!showTorso) {
    torso.visible = false;
    if (hemG) hemG.visible = false;
    if (cape) cape.visible = false;
    if (pouches) pouches.visible = false;
    if (back) back.visible = false;
  }
  if (!showArms) arms.root.visible = false;
  if (!showLegs) legs.visible = false;

  return root;
}

export const PRESETS: Record<PresetId, CharacterSpec> = {
  /** Mystical tall crown + temple ridges; silver-violet cascade. */
  mage: {
    skin: "#e8c4a0",
    leadSide: "right",
    head: { shape: "mage", scale: 1 },
    hair: { style: "long", color: "#7a5cb8", complexity: 7 },
    face: { eyeColor: "#3a2060" },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "robe", color: "#3d6e70", trim: "#c7cfcc" },
    accessories: {
      hem: "skirt",
      hemColor: "#2a4550",
      cape: true,
      capeColor: "#2a4550",
      pouches: true,
      pouchColor: "#2a4550",
      backLoadout: "pack",
      backLoadoutColor: "#5b3d8a",
    },
    arms: { pose: "cast", sleeveColor: "#3d6e70", sleeveLength: 0.9 },
    legs: { pose: "ready", pantColor: "#2a4550", bootColor: "#322947" },
    weapon: { type: "wand", hand: "right", color: "#8b5a2b" },
  },

  /** Helm-ready square brow + jaw blocks; short cropped fringe. */
  knight: {
    skin: "#e4a672",
    leadSide: "right",
    head: { shape: "knight", scale: 0.96 },
    hair: { style: "undercut", color: "#2a2035", complexity: 3 },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "none", color: "#000000" },
    torso: {
      style: "fullPlate",
      color: "#b0b8c4",
      trim: "#6a7484",
      detailStyle: "ornate",
      detailColor: "#f5c542",
    },
    accessories: {
      hem: "none",
      cape: true,
      capeColor: "#5a2030",
      pouches: true,
      pouchColor: "#6a7484",
      backLoadout: "scabbard",
      backLoadoutColor: "#dfe4ea",
    },
    arms: {
      pose: "extended",
      sleeveColor: "#9aa4b0",
      sleeveLength: 0.95,
      handColor: "#e4a672",
    },
    legs: { pose: "ready", pantColor: "#6a7484", bootColor: "#3a415c" },
    weapon: { type: "swordBroad", hand: "right", color: "#dfe4ea" },
    offhand: { type: "shield", color: "#9aa4b0" },
  },

  /** Compact tough skull + hard brow; military bowl crop. */
  soldier: {
    skin: "#c98a6a",
    leadSide: "right",
    head: { shape: "soldier", scale: 1 },
    hair: { style: "bowl", color: "#1a1c2c", complexity: 2 },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "none", color: "#000000" },
    torso: {
      style: "chestplate",
      color: "#5ad4a0",
      trim: "#2a2540",
      detailStyle: "classic",
      detailColor: "#f5c542",
    },
    accessories: {
      hem: "loincloth",
      hemColor: "#2a2540",
      pouches: true,
      pouchColor: "#2a2540",
      backLoadout: "pack",
      backLoadoutColor: "#3a3555",
    },
    arms: {
      pose: "extended",
      sleeveColor: "#2a2540",
      sleeveLength: 0.75,
      handColor: "#c98a6a",
    },
    legs: { pose: "ready", pantColor: "#2a2540", bootColor: "#1a1c2c" },
    weapon: { type: "rifleCarbine", hand: "right", color: "#1a1c2c" },
  },

  /** Lean sly cheeks + sharp chin; messy ash fringe. */
  rogue: {
    skin: "#e4a672",
    leadSide: "right",
    head: { shape: "rogue", scale: 1 },
    hair: { style: "messy", color: "#c8b878", complexity: 7 },
    face: { eyeColor: "#2a6ebd" },
    helmet: { style: "bandana", color: "#1a1c2c" },
    torso: { style: "jacket", color: "#322947", trim: "#e83b3b" },
    accessories: {
      hem: "loincloth",
      hemColor: "#e83b3b",
      cape: true,
      capeColor: "#1a1c2c",
      pouches: true,
      pouchColor: "#433455",
      backLoadout: "scabbard",
      backLoadoutColor: "#c7cfcc",
    },
    arms: { pose: "ready", sleeveColor: "#322947", sleeveLength: 0.55 },
    legs: { pose: "ready", pantColor: "#1a1c2c", bootColor: "#433455" },
    weapon: { type: "daggerCurved", hand: "right", color: "#c7cfcc" },
  },

  /** Oversized forehead dome; wild red mohawk. */
  scientist: {
    skin: "#f0c8a0",
    leadSide: "right",
    head: { shape: "scientist", scale: 1.08 },
    hair: { style: "mohawk", color: "#ff4a3a", complexity: 8 },
    face: { eyeColor: "#2a7080", scale: 1.1 },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "jacket", color: "#c7cfcc", trim: "#3d6e70" },
    accessories: {
      hem: "none",
      pouches: true,
      pouchColor: "#3d6e70",
      backLoadout: "pack",
      backLoadoutColor: "#5a6a7a",
    },
    arms: {
      pose: "ready",
      sleeveColor: "#c7cfcc",
      sleeveLength: 0.7,
      handColor: "#f0c8a0",
    },
    legs: { pose: "ready", pantColor: "#5a6a7a", bootColor: "#1a1c2c" },
    weapon: { type: "pistol", hand: "right", color: "#3d6e70" },
  },

  /** Soft serene cheeks; pale bob, gentle eyes. */
  cleric: {
    skin: "#ffe8d0",
    leadSide: "right",
    head: { shape: "cleric", scale: 1 },
    hair: { style: "bob", color: "#f0ece0", complexity: 5 },
    face: { eyeColor: "#4a7a80" },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "robe", color: "#c7cfcc", trim: "#f5e07a" },
    accessories: {
      hem: "skirt",
      hemColor: "#c7cfcc",
      cape: true,
      capeColor: "#9aa4b0",
      pouches: true,
      pouchColor: "#9aa4b0",
      backLoadout: "pack",
      backLoadoutColor: "#9aa4b0",
    },
    arms: { pose: "cast", sleeveColor: "#c7cfcc", sleeveLength: 0.92 },
    legs: { pose: "ready", pantColor: "#9aa4b0", bootColor: "#5a6a7a" },
    weapon: { type: "hammer", hand: "right", color: "#f5e07a" },
  },

  /** Weather-lean skull; forest braid. */
  ranger: {
    skin: "#d4a574",
    leadSide: "right",
    head: { shape: "ranger", scale: 1 },
    hair: { style: "braid", color: "#5a3018", complexity: 6 },
    face: { eyeColor: "#2a4550" },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "jacket", color: "#3d5c40", trim: "#8b5a2b" },
    accessories: {
      hem: "loincloth",
      hemColor: "#8b5a2b",
      pouches: true,
      pouchColor: "#8b5a2b",
      backLoadout: "quiver",
      backLoadoutColor: "#6b3a1f",
    },
    arms: {
      pose: "reach",
      sleeveColor: "#3d5c40",
      sleeveLength: 0.65,
      handColor: "#d4a574",
    },
    legs: { pose: "ready", pantColor: "#2a4030", bootColor: "#322947" },
    weapon: { type: "spearBarbed", hand: "right", color: "#8b5a2b" },
  },

  /** Wide brutal brow + thick jaw; wild black topknot. */
  barbarian: {
    skin: "#c98a6a",
    leadSide: "right",
    head: { shape: "barbarian", scale: 1.05 },
    hair: { style: "topknot", color: "#0a0c12", complexity: 7 },
    face: { eyeColor: "#c42828" },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "tank", color: "#5a4030", trim: "#8b5a2b" },
    accessories: {
      hem: "loincloth",
      hemColor: "#5a4030",
      cape: true,
      capeColor: "#433455",
      pouches: true,
      pouchColor: "#433455",
      backLoadout: "greatsword",
      backLoadoutColor: "#7a8090",
    },
    arms: {
      pose: "ready",
      sleeveColor: "#c98a6a",
      sleeveLength: 0.15,
      handColor: "#c98a6a",
    },
    legs: { pose: "wide", pantColor: "#433455", bootColor: "#1a1c2c" },
    weapon: { type: "greataxe", hand: "right", color: "#7a8090" },
  },

  /** Youthful soft skull + big eyes; aqua twin-tails. */
  acolyte: {
    skin: "#ffe0bd",
    leadSide: "right",
    head: { shape: "acolyte", scale: 1.02 },
    hair: { style: "twinTails", color: "#4ab0c8", complexity: 6 },
    face: { eyeColor: "#6a3a8a" },
    helmet: { style: "none", color: "#000000" },
    torso: { style: "robe", color: "#5a4a7a", trim: "#c7cfcc" },
    accessories: {
      hem: "skirt",
      hemColor: "#5a4a7a",
      cape: true,
      capeColor: "#433455",
      pouches: true,
      pouchColor: "#433455",
      backLoadout: "scabbard",
      backLoadoutColor: "#c7cfcc",
    },
    arms: { pose: "ready", sleeveColor: "#5a4a7a", sleeveLength: 0.88 },
    legs: { pose: "ready", pantColor: "#433455", bootColor: "#2a2540" },
    weapon: { type: "wand", hand: "right", color: "#c7cfcc" },
  },

  /** Rugged jaw block + weathered brow; black messy under red bandana. */
  pirate: {
    skin: "#e4a672",
    leadSide: "left",
    head: { shape: "pirate", scale: 1 },
    hair: { style: "messy", color: "#12141c", complexity: 7 },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "bandana", color: "#e83b3b" },
    torso: { style: "jacket", color: "#3d6e70", trim: "#e83b3b" },
    accessories: {
      hem: "loincloth",
      hemColor: "#e83b3b",
      cape: true,
      capeColor: "#2a4550",
      pouches: true,
      pouchColor: "#2a2540",
      backLoadout: "axe",
      backLoadoutColor: "#8b5a2b",
    },
    arms: {
      pose: "ready",
      sleeveColor: "#3d6e70",
      sleeveLength: 0.5,
      handColor: "#e4a672",
    },
    legs: { pose: "ready", pantColor: "#2a2540", bootColor: "#8b5a2b" },
    weapon: { type: "swordCurved", hand: "left", color: "#c7cfcc" },
    offhand: { type: "pistol", color: "#e83b3b" },
  },

  /** Muzzle-ready skull + snout stub under goat helm. */
  goatman: {
    skin: "#c98a6a",
    leadSide: "right",
    head: { shape: "goatman", scale: 1 },
    hair: { style: "bald", color: "#5a4030" },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "goat", color: "#5a4030", visor: "#e8e4d8" },
    torso: { style: "tank", color: "#c98a6a", trim: "#433455" },
    accessories: {
      hem: "loincloth",
      hemColor: "#433455",
      pouches: true,
      pouchColor: "#433455",
      backLoadout: "axe",
      backLoadoutColor: "#9aa4b0",
    },
    arms: {
      pose: "ready",
      sleeveColor: "#c98a6a",
      sleeveLength: 0.12,
      handColor: "#c98a6a",
    },
    legs: { pose: "wide", pantColor: "#322947", bootColor: "#1a1c2c" },
    weapon: { type: "axeBearded", hand: "right", color: "#9aa4b0" },
  },

  /** Cylindrical great helm — cross slits, riveted bands. */
  greatKnight: {
    skin: "#e4a672",
    leadSide: "right",
    head: { shape: "knight", scale: 0.96 },
    hair: { style: "bald", color: "#2a2035" },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "knightGreat", color: "#9aa4b0", visor: "#1a1c2c" },
    torso: {
      style: "fullPlate",
      color: "#b0b8c4",
      trim: "#6a7484",
      detailStyle: "ornate",
      detailColor: "#f5c542",
    },
    accessories: {
      hem: "none",
      cape: true,
      capeColor: "#2a3550",
      pouches: true,
      pouchColor: "#6a7484",
      backLoadout: "greatsword",
      backLoadoutColor: "#dfe4ea",
    },
    arms: {
      pose: "guard",
      sleeveColor: "#9aa4b0",
      sleeveLength: 0.95,
      handColor: "#e4a672",
    },
    legs: { pose: "ready", pantColor: "#6a7484", bootColor: "#3a415c" },
    weapon: { type: "swordClaymore", hand: "right", color: "#dfe4ea" },
    offhand: { type: "shield", color: "#6a7484" },
  },

  /** Winged kettle helm — lateral wing plates + plume. */
  wingedKnight: {
    skin: "#e4a672",
    leadSide: "right",
    head: { shape: "knight", scale: 0.96 },
    hair: { style: "bald", color: "#2a2035" },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "knightWinged", color: "#c7cfcc", visor: "#5a2030" },
    torso: {
      style: "fullPlate",
      color: "#dfe4ea",
      trim: "#8a4050",
      detailStyle: "ornate",
      detailColor: "#f5c542",
    },
    accessories: {
      hem: "none",
      cape: true,
      capeColor: "#8a2030",
      pouches: true,
      pouchColor: "#6a7484",
      backLoadout: "scabbard",
      backLoadoutColor: "#dfe4ea",
    },
    arms: {
      pose: "extended",
      sleeveColor: "#c7cfcc",
      sleeveLength: 0.95,
      handColor: "#e4a672",
    },
    legs: { pose: "ready", pantColor: "#5a6070", bootColor: "#3a415c" },
    weapon: { type: "swordRapier", hand: "right", color: "#dfe4ea" },
    offhand: { type: "shield", color: "#8a4050" },
  },

  /** Sallet + bevor — swept rear tail, single eye slit. */
  salletKnight: {
    skin: "#c98a6a",
    leadSide: "right",
    head: { shape: "soldier", scale: 0.96 },
    hair: { style: "bald", color: "#1a1c2c" },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "knightSallet", color: "#7a8490", visor: "#1a1c2c" },
    torso: {
      style: "chestplate",
      color: "#8a94a0",
      trim: "#4a5565",
      detailStyle: "classic",
      detailColor: "#f5c542",
    },
    accessories: {
      hem: "none",
      pouches: true,
      pouchColor: "#4a5565",
      backLoadout: "scabbard",
      backLoadoutColor: "#c7cfcc",
    },
    arms: {
      pose: "ready",
      sleeveColor: "#7a8490",
      sleeveLength: 0.9,
      handColor: "#c98a6a",
    },
    legs: { pose: "ready", pantColor: "#4a5565", bootColor: "#2a3040" },
    weapon: { type: "halberd", hand: "right", color: "#c7cfcc" },
  },

  /** Delicate tiara over long royal hair. */
  princess: {
    skin: "#ffe0bd",
    leadSide: "right",
    head: { shape: "acolyte", scale: 1 },
    hair: { style: "long", color: "#f0d48a", complexity: 7 },
    face: { eyeColor: "#6a3a8a" },
    helmet: { style: "princess", color: "#f5e07a", visor: "#e8a0c8" },
    torso: { style: "robe", color: "#c06090", trim: "#f5e07a" },
    accessories: {
      hem: "skirt",
      hemColor: "#a04070",
      cape: true,
      capeColor: "#e8a0c8",
      pouches: false,
      backLoadout: "none",
    },
    arms: { pose: "cast", sleeveColor: "#c06090", sleeveLength: 0.92 },
    legs: { pose: "ready", pantColor: "#a04070", bootColor: "#f5e07a" },
    weapon: { type: "wandCrystal", hand: "right", color: "#f5e07a" },
  },

  /** Arched royal crown over short cropped hair. */
  king: {
    skin: "#e4a672",
    leadSide: "right",
    head: { shape: "cleric", scale: 1 },
    hair: { style: "bowl", color: "#2a2035", complexity: 3 },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "king", color: "#f5e07a", visor: "#e83b3b" },
    torso: { style: "robe", color: "#3a5080", trim: "#f5e07a" },
    accessories: {
      hem: "skirt",
      hemColor: "#2a3555",
      cape: true,
      capeColor: "#8a2030",
      pouches: true,
      pouchColor: "#2a3555",
      backLoadout: "none",
    },
    arms: { pose: "salute", sleeveColor: "#3a5080", sleeveLength: 0.9 },
    legs: { pose: "stand", pantColor: "#2a3555", bootColor: "#1a1c2c" },
    weapon: { type: "swordBroad", hand: "right", color: "#f5e07a" },
  },

  /** Sealed flight helmet with goggle visor. */
  pilot: {
    skin: "#c98a6a",
    leadSide: "right",
    head: { shape: "soldier", scale: 1 },
    hair: { style: "bald", color: "#1a1c2c" },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "pilot", color: "#3a4555", visor: "#5ad4a0" },
    torso: { style: "jacket", color: "#2a3550", trim: "#5ad4a0" },
    accessories: {
      hem: "none",
      pouches: true,
      pouchColor: "#1a1c2c",
      backLoadout: "pack",
      backLoadoutColor: "#3a4555",
    },
    arms: {
      pose: "ready",
      sleeveColor: "#2a3550",
      sleeveLength: 0.75,
      handColor: "#c98a6a",
    },
    legs: { pose: "ready", pantColor: "#1a1c2c", bootColor: "#3a4555" },
    weapon: { type: "pistolHeavy", hand: "right", color: "#1a1c2c" },
  },

  /** Kabuto with maedate crest + mempo. */
  samurai: {
    skin: "#e4a672",
    leadSide: "right",
    head: { shape: "knight", scale: 0.96 },
    hair: { style: "bald", color: "#1a1c2c" },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "samurai", color: "#2a2540", visor: "#e83b3b" },
    torso: { style: "chestplate", color: "#3d5c40", trim: "#8b5a2b" },
    accessories: {
      hem: "skirt",
      hemColor: "#5a2030",
      pouches: true,
      pouchColor: "#433455",
      backLoadout: "scabbard",
      backLoadoutColor: "#c7cfcc",
    },
    arms: {
      pose: "ready",
      sleeveColor: "#3d5c40",
      sleeveLength: 0.7,
      handColor: "#e4a672",
    },
    legs: { pose: "ready", pantColor: "#2a2540", bootColor: "#1a1c2c" },
    weapon: { type: "swordCurved", hand: "right", color: "#c7cfcc" },
  },

  /** Nasal helm with outward horns. */
  viking: {
    skin: "#c98a6a",
    leadSide: "right",
    head: { shape: "barbarian", scale: 1.02 },
    hair: { style: "bald", color: "#0a0c12" },
    face: { eyeColor: "#c42828" },
    helmet: { style: "viking", color: "#6a7484", visor: "#e8e4d8" },
    torso: { style: "tank", color: "#5a4030", trim: "#8b5a2b" },
    accessories: {
      hem: "loincloth",
      hemColor: "#5a4030",
      cape: true,
      capeColor: "#433455",
      pouches: true,
      pouchColor: "#433455",
      backLoadout: "axe",
      backLoadoutColor: "#9aa4b0",
    },
    arms: {
      pose: "ready",
      sleeveColor: "#c98a6a",
      sleeveLength: 0.15,
      handColor: "#c98a6a",
    },
    legs: { pose: "wide", pantColor: "#433455", bootColor: "#1a1c2c" },
    weapon: { type: "axeBearded", hand: "right", color: "#9aa4b0" },
    offhand: { type: "shield", color: "#6a7484" },
  },

  /** Nemes headdress with uraeus — face open. */
  pharaoh: {
    skin: "#e4a672",
    leadSide: "right",
    head: { shape: "cleric", scale: 1 },
    hair: { style: "bald", color: "#1a1c2c" },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "pharaoh", color: "#f5e07a", visor: "#1a1c2c" },
    torso: { style: "robe", color: "#3a6e8a", trim: "#f5e07a" },
    accessories: {
      hem: "skirt",
      hemColor: "#2a5080",
      cape: false,
      pouches: true,
      pouchColor: "#8b5a2b",
      backLoadout: "none",
    },
    arms: { pose: "cast", sleeveColor: "#3a6e8a", sleeveLength: 0.85 },
    legs: { pose: "stand", pantColor: "#2a5080", bootColor: "#f5e07a" },
    weapon: { type: "spear", hand: "right", color: "#f5e07a" },
  },

  /** Masked cowl with eye slit. */
  ninja: {
    skin: "#e4a672",
    leadSide: "right",
    head: { shape: "rogue", scale: 1 },
    hair: { style: "bald", color: "#1a1c2c" },
    face: { eyeColor: "#1a1c2c" },
    helmet: { style: "ninja", color: "#1a1c2c", visor: "#2a2035" },
    torso: { style: "jacket", color: "#1a1c2c", trim: "#433455" },
    accessories: {
      hem: "loincloth",
      hemColor: "#1a1c2c",
      cape: false,
      pouches: true,
      pouchColor: "#2a2540",
      backLoadout: "scabbard",
      backLoadoutColor: "#c7cfcc",
    },
    arms: {
      pose: "ready",
      sleeveColor: "#1a1c2c",
      sleeveLength: 0.85,
      handColor: "#e4a672",
    },
    legs: { pose: "crouch", pantColor: "#1a1c2c", bootColor: "#2a2540" },
    weapon: { type: "swordCurved", hand: "right", color: "#c7cfcc" },
    offhand: { type: "dagger", color: "#9aa4b0" },
  },
};

export function getPreset(id: PresetId): CharacterSpec {
  return structuredClone(PRESETS[id]);
}
