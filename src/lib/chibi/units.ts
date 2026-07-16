/** Chibi proportion units — one “head” is the world unit. */
export const HEAD = 1;

/** Hands / feet stay fixed across body profiles — legibility at tiny bake sizes. */
const HAND_SIZE = 0.2 * HEAD;
const FOOT_LENGTH = 0.32 * HEAD;
const FOOT_WIDTH = 0.24 * HEAD;

/**
 * Super-deformed chibi for isometric bake.
 * Head budget is modest — face readability comes from construction, not
 * extreme vertical stretch (that overcorrected into “long head”).
 */
const HEAD_TALL = 1.05 * HEAD;
const SKULL_R = 0.4 * HEAD;

export type BodyProfileId = "trim" | "compact" | "tiny";

export type ChibiUnits = {
  readonly head: number;
  readonly headTall: number;
  readonly torso: number;
  readonly legs: number;
  readonly totalHeight: number;
  readonly hipWidth: number;
  readonly shoulderWidth: number;
  readonly torsoDepth: number;
  readonly armLength: number;
  readonly armThick: number;
  readonly legThick: number;
  readonly handSize: number;
  readonly footLength: number;
  readonly footWidth: number;
  readonly skullR: number;
};

export type LayoutUnits = {
  readonly footY: number;
  readonly hipY: number;
  readonly shoulderY: number;
  readonly headCenterY: number;
  readonly headTopY: number;
};

type BodyProfileDef = {
  label: string;
  torso: number;
  legs: number;
  hipWidth: number;
  shoulderWidth: number;
  torsoDepth: number;
  armLength: number;
  armThick: number;
  legThick: number;
};

/**
 * Three smaller-body options — torso + leg shafts shrink together.
 * Hands & feet stay put for tiny-bake legibility (mitts/boots still read).
 * Baseline (pre-profile) was torso 0.34 · legs 0.40 · legThick 0.22.
 */
export const BODY_PROFILES: Record<BodyProfileId, BodyProfileDef> = {
  trim: {
    label: "A · trim (−12% body)",
    torso: 0.3 * HEAD,
    legs: 0.32 * HEAD,
    hipWidth: 0.5 * HEAD,
    shoulderWidth: 0.62 * HEAD,
    torsoDepth: 0.36 * HEAD,
    armLength: 0.34 * HEAD,
    armThick: 0.18 * HEAD,
    /** ~hipWidth * 0.34 — was staying too chubby vs narrow hips. */
    legThick: 0.17 * HEAD,
  },
  compact: {
    label: "B · compact (−24% body)",
    torso: 0.26 * HEAD,
    legs: 0.26 * HEAD,
    hipWidth: 0.46 * HEAD,
    shoulderWidth: 0.58 * HEAD,
    torsoDepth: 0.34 * HEAD,
    armLength: 0.3 * HEAD,
    armThick: 0.17 * HEAD,
    legThick: 0.15 * HEAD,
  },
  tiny: {
    label: "C · tiny (−35% body)",
    torso: 0.22 * HEAD,
    legs: 0.22 * HEAD,
    hipWidth: 0.42 * HEAD,
    shoulderWidth: 0.54 * HEAD,
    torsoDepth: 0.32 * HEAD,
    armLength: 0.26 * HEAD,
    armThick: 0.16 * HEAD,
    legThick: 0.13 * HEAD,
  },
};

export const BODY_PROFILE_IDS: BodyProfileId[] = ["trim", "compact", "tiny"];

const BODY_PROFILE_STORAGE_KEY = "3d-sprite-gen:body-profile-v1";

function buildChibi(def: BodyProfileDef): ChibiUnits {
  return {
    head: HEAD,
    headTall: HEAD_TALL,
    torso: def.torso,
    legs: def.legs,
    totalHeight: HEAD_TALL + def.torso + def.legs,
    hipWidth: def.hipWidth,
    shoulderWidth: def.shoulderWidth,
    torsoDepth: def.torsoDepth,
    armLength: def.armLength,
    armThick: def.armThick,
    legThick: def.legThick,
    handSize: HAND_SIZE,
    footLength: FOOT_LENGTH,
    footWidth: FOOT_WIDTH,
    skullR: SKULL_R,
  };
}

function buildLayout(chibi: ChibiUnits): LayoutUnits {
  return {
    footY: 0,
    hipY: chibi.legs,
    shoulderY: chibi.legs + chibi.torso,
    headCenterY: chibi.legs + chibi.torso + chibi.headTall * 0.48,
    headTopY: chibi.totalHeight,
  };
}

function applyProfileDef(def: BodyProfileDef) {
  CHIBI = buildChibi(def);
  LAYOUT = buildLayout(CHIBI);
  CHARACTER_PIVOT_Y = CHIBI.totalHeight * 0.5;
}

export function applyBodyProfile(id: BodyProfileId) {
  applyProfileDef(BODY_PROFILES[id]);
}

export function loadBodyProfile(): BodyProfileId {
  try {
    const raw = localStorage.getItem(BODY_PROFILE_STORAGE_KEY);
    if (raw === "trim" || raw === "compact" || raw === "tiny") return raw;
  } catch {
    /* ignore */
  }
  return "compact";
}

export function saveBodyProfile(id: BodyProfileId) {
  try {
    localStorage.setItem(BODY_PROFILE_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

const initialProfile = loadBodyProfile();
export let CHIBI: ChibiUnits = buildChibi(BODY_PROFILES.trim);
export let LAYOUT: LayoutUnits = buildLayout(CHIBI);
export let CHARACTER_PIVOT_Y = CHIBI.totalHeight * 0.5;

applyBodyProfile(initialProfile);

export function capsuleCylinderLength(radius: number, targetHeight: number) {
  return Math.max(0.02, targetHeight - 2 * radius);
}
