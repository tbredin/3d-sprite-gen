/** Persisted lighting controls for the iso bake / preview. */

export type RimLightSettings = {
  /**
   * Universal ambient fill — the only soft global light.
   * Keep this low so red/blue rims stay severe edge accents.
   */
  ambientBrightness: number;
  /** Soft key/fill from the camera (readability, not a rim). */
  keyBrightness: number;
  /** Red rim (screen-left) directional intensity. */
  redBrightness: number;
  /** Cool blue rim (screen-right) directional intensity. */
  blueBrightness: number;
  /**
   * How far behind the character each rim sits (away from the camera).
   * Higher = only silhouette edges catch light (true rim).
   */
  redBehind: number;
  blueBehind: number;
  /** Lateral offset from center (screen L/R spread). Keep below behind. */
  redSide: number;
  blueSide: number;
  /**
   * Rim elevation in degrees (−180…180): orbit around mid torso.
   * 0 = level; +90 = above; −90 = below; ±180 = opposite side.
   */
  redHeight: number;
  blueHeight: number;
  /** Hex colours (#rrggbb) for each light. */
  keyColor: string;
  ambientColor: string;
  redColor: string;
  blueColor: string;
};

/**
 * Harsh cel defaults: tiny ambience, faint camera key, strong directionals
 * parked well behind the character so they skim the silhouette only.
 */
export const DEFAULT_RIM_LIGHTS: RimLightSettings = {
  ambientBrightness: 0.05,
  keyBrightness: 0.14,
  redBrightness: 3.6,
  blueBrightness: 2.8,
  redBehind: 4.4,
  blueBehind: 4.4,
  redSide: 1.15,
  blueSide: 1.15,
  // ~previous Y-offset look: atan2(0.75|0.35, rim radius) in degrees.
  redHeight: 9,
  blueHeight: 4,
  keyColor: "#e8eef6",
  ambientColor: "#5a6070",
  redColor: "#ff1e1e",
  blueColor: "#4a9ce0",
};

/** Bump when defaults / semantics change so old washed-out settings don't stick. */
const STORAGE_KEY = "3d-sprite-gen:rim-lights-v7";

export function normalizeLightHex(hex: string, fallback: string): string {
  const h = hex.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{6}$/.test(h)) return `#${h}`;
  if (/^[0-9a-f]{3}$/.test(h)) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return fallback;
}

/** Coerce partial / legacy storage into a full settings object. */
export function normalizeRimLightSettings(
  parsed: Partial<RimLightSettings> & { rimHeight?: number },
): RimLightSettings {
  // Older builds used point-light intensities (~8–9). Directionals need lower values.
  const legacyPoint =
    parsed.keyBrightness == null &&
    typeof parsed.redBrightness === "number" &&
    parsed.redBrightness > 5;
  const scale = legacyPoint ? 0.32 : 1;
  const legacyHeight =
    typeof parsed.rimHeight === "number" ? parsed.rimHeight - 1.05 : undefined;
  return {
    keyBrightness: clampNum(
      parsed.keyBrightness,
      0,
      8,
      DEFAULT_RIM_LIGHTS.keyBrightness,
    ),
    ambientBrightness: clampNum(
      parsed.ambientBrightness,
      0,
      2,
      DEFAULT_RIM_LIGHTS.ambientBrightness,
    ),
    redBrightness: clampNum(
      Number(parsed.redBrightness) * scale,
      0,
      24,
      DEFAULT_RIM_LIGHTS.redBrightness,
    ),
    blueBrightness: clampNum(
      Number(parsed.blueBrightness) * scale,
      0,
      24,
      DEFAULT_RIM_LIGHTS.blueBrightness,
    ),
    redBehind: clampNum(parsed.redBehind, -2, 8, DEFAULT_RIM_LIGHTS.redBehind),
    blueBehind: clampNum(parsed.blueBehind, -2, 8, DEFAULT_RIM_LIGHTS.blueBehind),
    redSide: clampNum(parsed.redSide, 0, 6, DEFAULT_RIM_LIGHTS.redSide),
    blueSide: clampNum(parsed.blueSide, 0, 6, DEFAULT_RIM_LIGHTS.blueSide),
    redHeight: clampNum(
      parsed.redHeight ?? legacyHeight,
      -180,
      180,
      DEFAULT_RIM_LIGHTS.redHeight,
    ),
    blueHeight: clampNum(
      parsed.blueHeight ?? legacyHeight,
      -180,
      180,
      DEFAULT_RIM_LIGHTS.blueHeight,
    ),
    keyColor: normalizeLightHex(
      String(parsed.keyColor ?? ""),
      DEFAULT_RIM_LIGHTS.keyColor,
    ),
    ambientColor: normalizeLightHex(
      String(parsed.ambientColor ?? ""),
      DEFAULT_RIM_LIGHTS.ambientColor,
    ),
    redColor: normalizeLightHex(
      String(parsed.redColor ?? ""),
      DEFAULT_RIM_LIGHTS.redColor,
    ),
    blueColor: normalizeLightHex(
      String(parsed.blueColor ?? ""),
      DEFAULT_RIM_LIGHTS.blueColor,
    ),
  };
}

export function loadRimLightSettings(): RimLightSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_RIM_LIGHTS };
    const parsed = JSON.parse(raw) as Partial<RimLightSettings> & {
      rimHeight?: number;
    };
    return normalizeRimLightSettings(parsed);
  } catch {
    return { ...DEFAULT_RIM_LIGHTS };
  }
}

export function saveRimLightSettings(settings: RimLightSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota / private mode */
  }
}

function clampNum(
  n: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}
