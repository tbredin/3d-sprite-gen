import {
  DEFAULT_RIM_LIGHTS,
  normalizeRimLightSettings,
  type RimLightSettings,
} from "./rimLights";

/** Named snapshot of the full rim / fill lighting board. */
export type LightingProfile = {
  id: string;
  name: string;
  settings: RimLightSettings;
  updatedAt: number;
  /** Built-in presets cannot be deleted from the UI. */
  builtin?: boolean;
};

const STORAGE_KEY = "3d-sprite-gen:lighting-profiles-v1";

/**
 * Neutral merge base so soft presets don’t inherit dramatic side/behind
 * from DEFAULT_RIM_LIGHTS (Ember rim). Each preset should still set the
 * knobs that define its mood; this only fills gaps.
 */
const PRESET_BASE: RimLightSettings = {
  ambientBrightness: 0.35,
  keyBrightness: 1.6,
  redBrightness: 0.4,
  blueBrightness: 0.5,
  redBehind: 3.5,
  blueBehind: 3.5,
  redSide: 1.15,
  blueSide: 1.15,
  redHeight: 12,
  blueHeight: 8,
  keyColor: "#fff4e8",
  ambientColor: "#8a909c",
  redColor: "#e8c8a8",
  blueColor: "#a8c4e0",
};

function preset(
  id: string,
  name: string,
  patch: Partial<RimLightSettings>,
): LightingProfile {
  return {
    id: `builtin-${id}`,
    name,
    settings: normalizeRimLightSettings({ ...PRESET_BASE, ...patch }),
    updatedAt: 0,
    builtin: true,
  };
}

/**
 * Curated lighting moods (keep these distinct):
 * dramatic rim / contre-jour · cool invert · soft readable · flat · night · warm.
 * First preset matches DEFAULT_RIM_LIGHTS.
 */
export const BUILTIN_LIGHTING_PRESETS: LightingProfile[] = [
  // —— Dramatic two-point rims (hot / hotbright lineage) ——
  preset("ember-rim", "Ember rim", {
    // Thin fiery left skim + soft cool wrap on the right; dark core shadow.
    // Refined from saved hot / hotbright — matches DEFAULT_RIM_LIGHTS.
    ...DEFAULT_RIM_LIGHTS,
  }),
  preset("magma-underglow", "Magma underglow", {
    // Same split, but red orbits from below (hot’s −86° idea, dialled in).
    ambientBrightness: 0.04,
    keyBrightness: 0.08,
    keyColor: "#e8eef6",
    ambientColor: "#3a3038",
    redBrightness: 7.0,
    blueBrightness: 2.6,
    redColor: "#ff1a00",
    blueColor: "#d0e4f8",
    redBehind: 4.6,
    blueBehind: 0.9,
    redSide: 1.5,
    blueSide: 2.4,
    redHeight: -62,
    blueHeight: 4,
  }),
  preset("frost-rim", "Frost rim", {
    // Cool invert of ember: thin magenta left rim, strong pale right fill.
    ambientBrightness: 0.05,
    keyBrightness: 0.1,
    keyColor: "#e8f0f8",
    ambientColor: "#384050",
    redBrightness: 2.2,
    blueBrightness: 5.2,
    redColor: "#ff4a7a",
    blueColor: "#e5f4ff",
    redBehind: 4.8,
    blueBehind: 0.7,
    redSide: 1.1,
    blueSide: 2.5,
    redHeight: -28,
    blueHeight: 2,
  }),
  preset("contre-jour", "Contre-jour", {
    // Both lights parked behind — silhouette with dual edge glow, almost no fill.
    ambientBrightness: 0.04,
    keyBrightness: 0.06,
    keyColor: "#e8e8f0",
    ambientColor: "#303840",
    redBrightness: 5.5,
    blueBrightness: 5.0,
    redColor: "#ff6030",
    blueColor: "#90c8ff",
    redBehind: 5.2,
    blueBehind: 5.2,
    redSide: 1.35,
    blueSide: 1.35,
    redHeight: 8,
    blueHeight: 6,
  }),
  // Exact localStorage snapshots from the original hot / hot2 experiments.
  preset("hot", "hot", {
    ambientBrightness: 0.32,
    keyBrightness: 0.3,
    keyColor: "#e8eef6",
    ambientColor: "#5a6070",
    redBrightness: 7.2,
    blueBrightness: 1.75,
    redColor: "#ff1e1e",
    blueColor: "#4a9ce0",
    redBehind: 1.8,
    blueBehind: 1.25,
    redSide: 1.2,
    blueSide: 2.5,
    redHeight: -86,
    blueHeight: -1,
  }),
  preset("hot2", "hot2", {
    ambientBrightness: 0,
    keyBrightness: 0,
    keyColor: "#e8eef6",
    ambientColor: "#3b3c40",
    redBrightness: 6.55,
    blueBrightness: 3.1,
    redColor: "#ff0000",
    blueColor: "#e5f4ff",
    redBehind: 3.9,
    blueBehind: 1.25,
    redSide: 2.25,
    blueSide: 2.5,
    redHeight: -55,
    blueHeight: -1,
  }),

  // —— Soft / readable (SNES family) ——
  preset("snes-key-fill", "SNES key + fill", {
    ambientBrightness: 0.42,
    keyBrightness: 2.0,
    keyColor: "#fff4e8",
    ambientColor: "#8a909c",
    redBrightness: 0.35,
    blueBrightness: 0.55,
    redColor: "#e8c8a8",
    blueColor: "#a8c4e0",
    redBehind: 3.8,
    blueBehind: 3.8,
    redSide: 1.15,
    blueSide: 1.15,
    redHeight: 18,
    blueHeight: 10,
  }),
  preset("ffvi-top-left", "FFVI soft top-left", {
    ambientBrightness: 0.38,
    keyBrightness: 2.3,
    keyColor: "#fff0dc",
    ambientColor: "#909498",
    redBrightness: 0.25,
    blueBrightness: 0.4,
    redColor: "#d8b898",
    blueColor: "#b0c0d0",
    redBehind: 3.2,
    blueBehind: 4.0,
    redSide: 1.4,
    blueSide: 0.7,
    redHeight: 28,
    blueHeight: 8,
  }),
  preset("flat-cel", "Flat cel", {
    ambientBrightness: 0.55,
    keyBrightness: 2.4,
    keyColor: "#ffffff",
    ambientColor: "#a0a4a8",
    redBrightness: 0,
    blueBrightness: 0,
    redBehind: 3.5,
    blueBehind: 3.5,
    redSide: 1.15,
    blueSide: 1.15,
    redHeight: 12,
    blueHeight: 8,
    redColor: "#808080",
    blueColor: "#808080",
  }),
  preset("moonlit", "Moonlit", {
    ambientBrightness: 0.22,
    keyBrightness: 1.2,
    keyColor: "#c8d8f0",
    ambientColor: "#3a4860",
    redBrightness: 0.15,
    blueBrightness: 1.8,
    redColor: "#806868",
    blueColor: "#80a0e0",
    redBehind: 4.5,
    blueBehind: 2.8,
    redSide: 1.15,
    blueSide: 1.6,
    redHeight: 12,
    blueHeight: 18,
  }),
];

export function loadLightingProfiles(): LightingProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeProfile)
      .filter((p): p is LightingProfile => p != null)
      .filter((p) => !p.builtin && !p.id.startsWith("builtin-"));
  } catch {
    return [];
  }
}

export function saveLightingProfiles(profiles: LightingProfile[]) {
  try {
    const userOnly = profiles.filter(
      (p) => !p.builtin && !p.id.startsWith("builtin-"),
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userOnly));
  } catch {
    /* ignore quota / private mode */
  }
}

export function createProfileId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Snapshot whatever is currently driving the bake. */
export function snapshotCurrentLighting(
  settings: RimLightSettings,
  name: string,
): LightingProfile {
  return {
    id: createProfileId(),
    name: name.trim() || "Untitled",
    settings: normalizeRimLightSettings(settings),
    updatedAt: Date.now(),
  };
}

function normalizeProfile(raw: unknown): LightingProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<LightingProfile>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  if (!o.settings || typeof o.settings !== "object") return null;
  const s = o.settings as Partial<RimLightSettings>;
  if (
    typeof s.ambientBrightness !== "number" ||
    typeof s.keyBrightness !== "number" ||
    typeof s.redBrightness !== "number" ||
    typeof s.blueBrightness !== "number"
  ) {
    return null;
  }
  return {
    id: o.id,
    name: o.name.trim() || "Untitled",
    settings: normalizeRimLightSettings(s),
    updatedAt:
      typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt)
        ? o.updatedAt
        : Date.now(),
  };
}
