/**
 * Session persistence for the working character — spec, part locks, and the
 * view prefs that change what the figure looks like. Reloading continues where
 * the last session left off instead of snapping back to the mage preset.
 *
 * Body scale keeps its own key (`loadBodyScale` / `saveBodyScale` in units.ts).
 *
 * Loading rebuilds the spec field by field: unknown styles / poses fall back to
 * safe members of their union and unknown keys are dropped, so a stale or
 * hand-edited payload can never feed garbage into `assembleCharacter`. Widen
 * the version suffix when the spec grows fields worth keeping across releases.
 */

import { ARM_POSES } from "./armPoses";
import { LEG_POSES } from "./legPoses";
import {
  DEFAULT_PART_VISIBILITY,
  type PartVisibility,
} from "./assemble";
import { EMPTY_LOCKS } from "./random";
import type { PartLocks } from "./random";
import {
  BACK_LOADOUTS,
  BODY_DETAIL_STYLES,
  BROW_STYLES,
  EYE_STYLES,
  FACTION_IDS,
  HAIR_STYLES,
  HEAD_SHAPES,
  HELMET_STYLES,
  HEM_STYLES,
  PRESET_IDS,
  TORSO_STYLES,
  WEAPON_TYPES,
} from "./types";
import type { CharacterSpec, PresetId } from "./types";

const CHARACTER_STORAGE_KEY = "3d-sprite-gen:character-v1";

export type PersistedCharacter = {
  spec: CharacterSpec;
  locks: PartLocks;
  /** App-level body scale lock (not part of CharacterSpec). */
  bodyScaleLocked: boolean;
  /** `"random"` once the spec has drifted off a named preset. */
  presetId: PresetId | "random";
  mirror: boolean;
  /** Per-row show/hide for eyes + body parts. */
  partVisibility: PartVisibility;
  allowHelmets: boolean;
  factionLocked: boolean;
};

/**
 * Generous numeric guards — the spec is also authored by hand / by an LLM, so
 * only nonsense (NaN, wild magnitudes) is corrected, not off-slider values.
 */
const SCALE_MIN = 0.05;
const SCALE_MAX = 8;

type Dict = Record<string, unknown>;

function dict(v: unknown): Dict | null {
  return v != null && typeof v === "object" && !Array.isArray(v)
    ? (v as Dict)
    : null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function num(v: unknown, min: number, max: number): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.min(max, Math.max(min, v));
}

function oneOf<T extends string>(allowed: readonly T[], v: unknown): T | undefined {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : undefined;
}

function side(v: unknown): "left" | "right" | undefined {
  return v === "left" || v === "right" ? v : undefined;
}

function sanitizeHead(raw: unknown): CharacterSpec["head"] | undefined {
  const o = dict(raw);
  if (!o) return undefined;
  const head: NonNullable<CharacterSpec["head"]> = {};
  const shape = oneOf(HEAD_SHAPES, o.shape);
  if (shape) head.shape = shape;
  const scale = num(o.scale, SCALE_MIN, SCALE_MAX);
  if (scale != null) head.scale = scale;
  const size = num(o.size, SCALE_MIN, SCALE_MAX);
  if (size != null) head.size = size;
  const yScale = num(o.yScale, SCALE_MIN, SCALE_MAX);
  if (yScale != null) head.yScale = yScale;
  return head;
}

function sanitizeHair(raw: unknown): CharacterSpec["hair"] | undefined {
  const o = dict(raw);
  const color = o ? str(o.color) : undefined;
  if (!o || !color) return undefined;
  const hair: NonNullable<CharacterSpec["hair"]> = {
    style: oneOf(HAIR_STYLES, o.style) ?? "bald",
    color,
  };
  const complexity = num(o.complexity, 1, 8);
  if (complexity != null) hair.complexity = Math.round(complexity);
  return hair;
}

function sanitizeHelmet(raw: unknown): CharacterSpec["helmet"] | undefined {
  const o = dict(raw);
  const color = o ? str(o.color) : undefined;
  if (!o || !color) return undefined;
  const helmet: NonNullable<CharacterSpec["helmet"]> = {
    style: oneOf(HELMET_STYLES, o.style) ?? "none",
    color,
  };
  const visor = str(o.visor);
  if (visor) helmet.visor = visor;
  return helmet;
}

function sanitizeFace(raw: unknown): CharacterSpec["face"] | undefined {
  const o = dict(raw);
  if (!o) return undefined;
  const face: NonNullable<CharacterSpec["face"]> = {};
  const style = oneOf(EYE_STYLES, o.style);
  if (style) face.style = style;
  const browStyle = oneOf(BROW_STYLES, o.browStyle);
  if (browStyle) face.browStyle = browStyle;
  const eyeColor = str(o.eyeColor);
  if (eyeColor) face.eyeColor = eyeColor;
  const scale = num(o.scale, SCALE_MIN, SCALE_MAX);
  if (scale != null) face.scale = scale;
  const spacing = num(o.spacing, SCALE_MIN, SCALE_MAX);
  if (spacing != null) face.spacing = spacing;
  const y = num(o.y, -2, 2);
  if (y != null) face.y = y;
  return face;
}

function sanitizeAccessories(
  raw: unknown,
): CharacterSpec["accessories"] | undefined {
  const o = dict(raw);
  if (!o) return undefined;
  const acc: NonNullable<CharacterSpec["accessories"]> = {};
  const hem = oneOf(HEM_STYLES, o.hem);
  if (hem) acc.hem = hem;
  const hemColor = str(o.hemColor);
  if (hemColor) acc.hemColor = hemColor;
  if (typeof o.cape === "boolean") acc.cape = o.cape;
  const capeColor = str(o.capeColor);
  if (capeColor) acc.capeColor = capeColor;
  if (typeof o.pouches === "boolean") acc.pouches = o.pouches;
  const pouchColor = str(o.pouchColor);
  if (pouchColor) acc.pouchColor = pouchColor;
  const backLoadout = oneOf(BACK_LOADOUTS, o.backLoadout);
  if (backLoadout) acc.backLoadout = backLoadout;
  const backLoadoutColor = str(o.backLoadoutColor);
  if (backLoadoutColor) acc.backLoadoutColor = backLoadoutColor;
  return acc;
}

function sanitizeWeapon(raw: unknown): CharacterSpec["weapon"] | undefined {
  const o = dict(raw);
  const color = o ? str(o.color) : undefined;
  if (!o || !color) return undefined;
  const weapon: NonNullable<CharacterSpec["weapon"]> = {
    type: oneOf(WEAPON_TYPES, o.type) ?? "none",
    color,
  };
  const hand = side(o.hand);
  if (hand) weapon.hand = hand;
  return weapon;
}

function sanitizeOffhand(raw: unknown): CharacterSpec["offhand"] | undefined {
  const o = dict(raw);
  const color = o ? str(o.color) : undefined;
  if (!o || !color) return undefined;
  return {
    type: oneOf(WEAPON_TYPES, o.type) ?? "none",
    color,
  };
}

/**
 * Rebuild a spec from untrusted JSON, or `null` when the structural core
 * (skin + torso / arms / legs with their colours) is missing — the caller then
 * falls back to a preset rather than shipping a half-built character.
 */
export function sanitizeCharacterSpec(raw: unknown): CharacterSpec | null {
  const o = dict(raw);
  if (!o) return null;
  const skin = str(o.skin);
  const rawTorso = dict(o.torso);
  const rawArms = dict(o.arms);
  const rawLegs = dict(o.legs);
  if (!skin || !rawTorso || !rawArms || !rawLegs) return null;

  const torsoColor = str(rawTorso.color);
  const pantColor = str(rawLegs.pantColor);
  const bootColor = str(rawLegs.bootColor);
  if (!torsoColor || !pantColor || !bootColor) return null;

  const spec: CharacterSpec = {
    skin,
    torso: {
      style: oneOf(TORSO_STYLES, rawTorso.style) ?? "plain",
      color: torsoColor,
    },
    arms: {
      pose: oneOf(ARM_POSES, rawArms.pose) ?? "idle",
    },
    legs: {
      pose: oneOf(LEG_POSES, rawLegs.pose) ?? "stand",
      pantColor,
      bootColor,
    },
  };

  const trim = str(rawTorso.trim);
  if (trim) spec.torso.trim = trim;
  const detailStyle = oneOf(BODY_DETAIL_STYLES, rawTorso.detailStyle);
  if (detailStyle) spec.torso.detailStyle = detailStyle;
  const detailColor = str(rawTorso.detailColor);
  if (detailColor) spec.torso.detailColor = detailColor;

  const sleeveColor = str(rawArms.sleeveColor);
  if (sleeveColor) spec.arms.sleeveColor = sleeveColor;
  const sleeveLength = num(rawArms.sleeveLength, 0, 1);
  if (sleeveLength != null) spec.arms.sleeveLength = sleeveLength;
  const handColor = str(rawArms.handColor);
  if (handColor) spec.arms.handColor = handColor;

  const leadSide = side(o.leadSide);
  if (leadSide) spec.leadSide = leadSide;

  const head = sanitizeHead(o.head);
  if (head) spec.head = head;
  const hair = sanitizeHair(o.hair);
  if (hair) spec.hair = hair;
  const helmet = sanitizeHelmet(o.helmet);
  if (helmet) spec.helmet = helmet;
  const face = sanitizeFace(o.face);
  if (face) spec.face = face;
  const accessories = sanitizeAccessories(o.accessories);
  if (accessories) spec.accessories = accessories;
  const weapon = sanitizeWeapon(o.weapon);
  if (weapon) spec.weapon = weapon;
  const offhand = sanitizeOffhand(o.offhand);
  if (offhand) spec.offhand = offhand;
  const faction = oneOf(FACTION_IDS, o.faction);
  if (faction) spec.faction = faction;

  return spec;
}

function sanitizeLocks(raw: unknown): PartLocks {
  const o = dict(raw);
  if (!o) return { ...EMPTY_LOCKS };
  return {
    head: bool(o.head, false),
    torso: bool(o.torso, false),
    arms: bool(o.arms, false),
    legs: bool(o.legs, false),
    eyes: bool(o.eyes, false),
    eyeLayout: bool(o.eyeLayout, false),
    headSize: bool(o.headSize, false),
  };
}

function sanitizePartVisibility(raw: unknown, legacyShowEyes?: unknown): PartVisibility {
  const o = dict(raw);
  // Older sessions only stored `showEyes` — fold that into the eyes flag.
  const eyesFallback = bool(legacyShowEyes, true);
  if (!o) {
    return { ...DEFAULT_PART_VISIBILITY, eyes: eyesFallback };
  }
  return {
    eyes: bool(o.eyes, eyesFallback),
    head: bool(o.head, true),
    torso: bool(o.torso, true),
    arms: bool(o.arms, true),
    legs: bool(o.legs, true),
  };
}

function sanitizePresetId(raw: unknown): PresetId | "random" {
  if (raw === "random") return "random";
  return oneOf(PRESET_IDS, raw) ?? "random";
}

/** `null` when nothing usable is stored — caller keeps its own defaults. */
export function loadCharacterPersist(): PersistedCharacter | null {
  try {
    const raw = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = dict(JSON.parse(raw) as unknown);
    if (!parsed) return null;
    const spec = sanitizeCharacterSpec(parsed.spec);
    if (!spec) return null;
    return {
      spec,
      locks: sanitizeLocks(parsed.locks),
      bodyScaleLocked: bool(parsed.bodyScaleLocked, false),
      presetId: sanitizePresetId(parsed.presetId),
      mirror: bool(parsed.mirror, false),
      partVisibility: sanitizePartVisibility(
        parsed.partVisibility,
        parsed.showEyes,
      ),
      allowHelmets: bool(parsed.allowHelmets, false),
      factionLocked: bool(parsed.factionLocked, false),
    };
  } catch {
    return null;
  }
}

export function saveCharacterPersist(state: PersistedCharacter) {
  try {
    localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}
