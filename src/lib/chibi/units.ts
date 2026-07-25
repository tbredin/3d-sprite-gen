/** Chibi proportion units — one “head” is the world unit. */
export const HEAD = 1;

/** Hands / feet stay fixed across body scales — legibility at tiny bake sizes. */
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

/** Continuous body scale (torso / legs / shoulders). Head + hands/feet stay put. */
export const BODY_SCALE_MIN = 0.5;
export const BODY_SCALE_MAX = 1.5;
export const BODY_SCALE_DEFAULT = 1;

/** @deprecated Discrete presets — kept for migration from older localStorage. */
export type BodyProfileId = "normal" | "trim" | "compact" | "tiny";

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

/** Baseline body at 1× — continuous scales multiply these dims. */
const BODY_BASE: BodyProfileDef = {
  label: "1.00×",
  torso: 0.34 * HEAD,
  legs: 0.4 * HEAD,
  hipWidth: 0.56 * HEAD,
  shoulderWidth: 0.7 * HEAD,
  torsoDepth: 0.4 * HEAD,
  armLength: 0.38 * HEAD,
  armThick: 0.2 * HEAD,
  legThick: 0.22 * HEAD,
};

/**
 * Legacy discrete body options (pre–continuous slider).
 * Approximate × factors used when migrating old localStorage values.
 */
export const BODY_PROFILES: Record<BodyProfileId, BodyProfileDef> = {
  normal: { ...BODY_BASE, label: "A · −0% normal size" },
  trim: {
    label: "B · trim (−12% body)",
    torso: 0.3 * HEAD,
    legs: 0.32 * HEAD,
    hipWidth: 0.5 * HEAD,
    shoulderWidth: 0.62 * HEAD,
    torsoDepth: 0.36 * HEAD,
    armLength: 0.34 * HEAD,
    armThick: 0.18 * HEAD,
    legThick: 0.17 * HEAD,
  },
  compact: {
    label: "C · compact (−24% body)",
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
    label: "D · tiny (−35% body)",
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

export const BODY_PROFILE_IDS: BodyProfileId[] = [
  "normal",
  "trim",
  "compact",
  "tiny",
];

const LEGACY_PROFILE_TO_SCALE: Record<BodyProfileId, number> = {
  normal: 1,
  trim: 0.88,
  compact: 0.76,
  tiny: 0.65,
};

const BODY_SCALE_STORAGE_KEY = "3d-sprite-gen:body-scale-v1";
const LEGACY_BODY_PROFILE_STORAGE_KEY = "3d-sprite-gen:body-profile-v1";

export function clampBodyScale(scale: number): number {
  if (!Number.isFinite(scale)) return BODY_SCALE_DEFAULT;
  return Math.min(BODY_SCALE_MAX, Math.max(BODY_SCALE_MIN, scale));
}

function scaledBodyDef(scale: number): BodyProfileDef {
  const s = clampBodyScale(scale);
  return {
    label: `${s.toFixed(2)}×`,
    torso: BODY_BASE.torso * s,
    legs: BODY_BASE.legs * s,
    hipWidth: BODY_BASE.hipWidth * s,
    shoulderWidth: BODY_BASE.shoulderWidth * s,
    torsoDepth: BODY_BASE.torsoDepth * s,
    armLength: BODY_BASE.armLength * s,
    armThick: BODY_BASE.armThick * s,
    legThick: BODY_BASE.legThick * s,
  };
}

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

/** Apply continuous body scale (0.5–1.5). Head / hands / feet stay fixed. */
export function applyBodyScale(scale: number) {
  applyProfileDef(scaledBodyDef(scale));
}

/** @deprecated Prefer `applyBodyScale`. */
export function applyBodyProfile(id: BodyProfileId) {
  applyBodyScale(LEGACY_PROFILE_TO_SCALE[id] ?? BODY_SCALE_DEFAULT);
}

export function loadBodyScale(): number {
  try {
    const raw = localStorage.getItem(BODY_SCALE_STORAGE_KEY);
    if (raw != null) {
      const n = Number(raw);
      if (Number.isFinite(n)) return clampBodyScale(n);
    }
    // Migrate discrete profile ids from the previous control.
    const legacy = localStorage.getItem(LEGACY_BODY_PROFILE_STORAGE_KEY);
    if (
      legacy === "normal" ||
      legacy === "trim" ||
      legacy === "compact" ||
      legacy === "tiny"
    ) {
      return LEGACY_PROFILE_TO_SCALE[legacy];
    }
  } catch {
    /* ignore */
  }
  return BODY_SCALE_DEFAULT;
}

export function saveBodyScale(scale: number) {
  try {
    localStorage.setItem(
      BODY_SCALE_STORAGE_KEY,
      String(clampBodyScale(scale)),
    );
  } catch {
    /* ignore */
  }
}

/** @deprecated Prefer `loadBodyScale`. */
export function loadBodyProfile(): BodyProfileId {
  const scale = loadBodyScale();
  let best: BodyProfileId = "normal";
  let bestDist = Infinity;
  for (const id of BODY_PROFILE_IDS) {
    const d = Math.abs(LEGACY_PROFILE_TO_SCALE[id] - scale);
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return best;
}

/** @deprecated Prefer `saveBodyScale`. */
export function saveBodyProfile(id: BodyProfileId) {
  saveBodyScale(LEGACY_PROFILE_TO_SCALE[id] ?? BODY_SCALE_DEFAULT);
}

const initialScale = loadBodyScale();
export let CHIBI: ChibiUnits = buildChibi(BODY_BASE);
export let LAYOUT: LayoutUnits = buildLayout(CHIBI);
export let CHARACTER_PIVOT_Y = CHIBI.totalHeight * 0.5;

applyBodyScale(initialScale);

export function capsuleCylinderLength(radius: number, targetHeight: number) {
  return Math.max(0.02, targetHeight - 2 * radius);
}
