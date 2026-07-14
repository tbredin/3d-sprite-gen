/** Persisted lighting controls for the iso bake / preview. */

export type RimLightSettings = {
  /** Dim fill from the camera direction (keeps forms readable). */
  keyBrightness: number;
  /** Global ambient under the rims. */
  ambientBrightness: number;
  /** Red rim (screen-left) intensity. */
  redBrightness: number;
  /** Cool blue rim (screen-right) intensity. */
  blueBrightness: number;
  /**
   * How far behind the character each rim sits (away from the camera plane).
   * Higher = darker camera-facing face between the rims.
   */
  redBehind: number;
  blueBehind: number;
  /** Lateral offset from center (screen L/R spread). */
  redSide: number;
  blueSide: number;
  /**
   * Rim elevation in degrees (−180…180): orbit around mid torso.
   * 0 = level; +90 = above; −90 = below; ±180 = opposite side.
   */
  redHeight: number;
  blueHeight: number;
};

export const DEFAULT_RIM_LIGHTS: RimLightSettings = {
  keyBrightness: 0.55,
  ambientBrightness: 0.18,
  redBrightness: 2.8,
  blueBrightness: 2.4,
  redBehind: 2.8,
  blueBehind: 2.8,
  redSide: 2.5,
  blueSide: 2.5,
  // ~previous Y-offset look: atan2(0.75|0.35, rim radius) in degrees.
  redHeight: 9,
  blueHeight: 4,
};

/** Bump when height semantics change (Y offset → orbit degrees). */
const STORAGE_KEY = "3d-sprite-gen:rim-lights-v7";

export function loadRimLightSettings(): RimLightSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_RIM_LIGHTS };
    const parsed = JSON.parse(raw) as Partial<RimLightSettings> & {
      rimHeight?: number;
    };
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
    };
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
