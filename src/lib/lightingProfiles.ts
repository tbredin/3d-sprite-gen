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

function preset(
  id: string,
  name: string,
  patch: Partial<RimLightSettings>,
): LightingProfile {
  return {
    id: `builtin-${id}`,
    name,
    settings: normalizeRimLightSettings({ ...DEFAULT_RIM_LIGHTS, ...patch }),
    updatedAt: 0,
    builtin: true,
  };
}

/**
 * Built-in lighting presets.
 * First group (~12): preserve current rim/cool looks + recommended SNES-style.
 * Second group (+10): extra moods / environments for bake A/B.
 */
export const BUILTIN_LIGHTING_PRESETS: LightingProfile[] = [
  // —— Preserve current rim / cool family ——
  preset("lava-office-rim", "Lava / office rim (current)", {
    // Exact DEFAULT_RIM_LIGHTS — harsh red left + cool blue right rims.
  }),
  preset("cool-dual-rim", "Cool dual rim", {
    ambientBrightness: 0.08,
    keyBrightness: 0.22,
    keyColor: "#dce8f5",
    ambientColor: "#4a5568",
    redBrightness: 2.4,
    blueBrightness: 3.2,
    redColor: "#ff4a6a",
    blueColor: "#5eb0f0",
    redBehind: 4.6,
    blueBehind: 4.6,
  }),
  preset("lava-dominant", "Lava dominant rim", {
    ambientBrightness: 0.06,
    keyBrightness: 0.18,
    keyColor: "#f0e8e0",
    ambientColor: "#5a4840",
    redBrightness: 4.4,
    blueBrightness: 1.4,
    redColor: "#ff1a00",
    blueColor: "#6a90b0",
    redBehind: 4.2,
    blueBehind: 4.8,
    redHeight: 12,
    blueHeight: 2,
  }),
  preset("office-cool-key", "Office cool key + soft rims", {
    ambientBrightness: 0.22,
    keyBrightness: 1.1,
    keyColor: "#eef3f8",
    ambientColor: "#6a7388",
    redBrightness: 1.2,
    blueBrightness: 1.6,
    redColor: "#e07070",
    blueColor: "#7ab0e0",
    redBehind: 4.0,
    blueBehind: 4.0,
  }),
  preset("harsh-complement", "Harsh complementary rims", {
    ambientBrightness: 0.03,
    keyBrightness: 0.1,
    keyColor: "#e8eef6",
    ambientColor: "#3a4050",
    redBrightness: 4.8,
    blueBrightness: 4.2,
    redColor: "#ff0000",
    blueColor: "#2080ff",
    redBehind: 5.0,
    blueBehind: 5.0,
    redSide: 1.35,
    blueSide: 1.35,
  }),
  preset("soft-cool-fill", "Soft cool fill", {
    ambientBrightness: 0.4,
    keyBrightness: 1.4,
    keyColor: "#e4eef8",
    ambientColor: "#7080a0",
    redBrightness: 0.55,
    blueBrightness: 0.9,
    redColor: "#c88888",
    blueColor: "#88b0d8",
    redBehind: 3.6,
    blueBehind: 3.6,
  }),

  // —— Recommended SNES / FF-style readability ——
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
  preset("sea-of-stars-soft", "Sea of Stars soft", {
    ambientBrightness: 0.48,
    keyBrightness: 1.7,
    keyColor: "#fff8f0",
    ambientColor: "#9aa0a8",
    redBrightness: 0.2,
    blueBrightness: 0.35,
    redColor: "#e0c8b0",
    blueColor: "#b8cce0",
    redBehind: 3.5,
    blueBehind: 3.5,
  }),
  preset("flat-cel-readable", "Flat cel readable", {
    ambientBrightness: 0.55,
    keyBrightness: 2.4,
    keyColor: "#ffffff",
    ambientColor: "#a0a4a8",
    redBrightness: 0,
    blueBrightness: 0,
    redColor: "#808080",
    blueColor: "#808080",
  }),
  preset("warm-single-key", "Warm single key", {
    ambientBrightness: 0.36,
    keyBrightness: 2.1,
    keyColor: "#ffe8c8",
    ambientColor: "#8a8480",
    redBrightness: 0.45,
    blueBrightness: 0.2,
    redColor: "#ffd9a0",
    blueColor: "#a8b0b8",
    redBehind: 3.4,
    blueBehind: 4.2,
    redHeight: 22,
  }),
  preset("cool-single-key", "Cool single key", {
    ambientBrightness: 0.4,
    keyBrightness: 2.0,
    keyColor: "#e8f0ff",
    ambientColor: "#788090",
    redBrightness: 0.15,
    blueBrightness: 0.65,
    redColor: "#c0a8a0",
    blueColor: "#a8c4e0",
    redBehind: 4.2,
    blueBehind: 3.4,
    blueHeight: 16,
  }),

  // —— +10 extra moods / environments ——
  preset("golden-hour", "Golden hour", {
    ambientBrightness: 0.32,
    keyBrightness: 2.2,
    keyColor: "#ffd090",
    ambientColor: "#a88868",
    redBrightness: 0.9,
    blueBrightness: 0.25,
    redColor: "#ffb060",
    blueColor: "#8898b0",
    redBehind: 3.0,
    blueBehind: 4.5,
    redHeight: 14,
    blueHeight: -4,
  }),
  preset("moonlit", "Moonlit cool", {
    ambientBrightness: 0.28,
    keyBrightness: 1.5,
    keyColor: "#c8d8f0",
    ambientColor: "#3a4860",
    redBrightness: 0.1,
    blueBrightness: 1.4,
    redColor: "#806868",
    blueColor: "#7090d0",
    redBehind: 4.5,
    blueBehind: 3.2,
    blueHeight: 20,
  }),
  preset("magma-cavern", "Magma cavern", {
    ambientBrightness: 0.2,
    keyBrightness: 0.9,
    keyColor: "#ffc080",
    ambientColor: "#604030",
    redBrightness: 3.2,
    blueBrightness: 0.3,
    redColor: "#ff4000",
    blueColor: "#506070",
    redBehind: 2.8,
    blueBehind: 5.0,
    redHeight: -8,
    blueHeight: 12,
  }),
  preset("ice-dungeon", "Ice dungeon", {
    ambientBrightness: 0.35,
    keyBrightness: 1.8,
    keyColor: "#e0f0ff",
    ambientColor: "#506878",
    redBrightness: 0.15,
    blueBrightness: 2.0,
    redColor: "#a09090",
    blueColor: "#60c0e8",
    redBehind: 4.5,
    blueBehind: 2.8,
    blueHeight: 6,
  }),
  preset("torchlight", "Torchlight", {
    ambientBrightness: 0.12,
    keyBrightness: 1.6,
    keyColor: "#ffb060",
    ambientColor: "#3a3028",
    redBrightness: 2.2,
    blueBrightness: 0.15,
    redColor: "#ff8030",
    blueColor: "#405060",
    redBehind: 2.2,
    blueBehind: 5.0,
    redSide: 1.6,
    redHeight: 8,
  }),
  preset("overcast", "Overcast grey", {
    ambientBrightness: 0.5,
    keyBrightness: 1.5,
    keyColor: "#e0e4e8",
    ambientColor: "#888c90",
    redBrightness: 0.2,
    blueBrightness: 0.25,
    redColor: "#b0a8a0",
    blueColor: "#a0a8b0",
    redBehind: 3.5,
    blueBehind: 3.5,
  }),
  preset("high-noon", "High noon iso", {
    ambientBrightness: 0.3,
    keyBrightness: 2.8,
    keyColor: "#fff8e8",
    ambientColor: "#909080",
    redBrightness: 0.3,
    blueBrightness: 0.3,
    redColor: "#e0d0b0",
    blueColor: "#b0c0d0",
    redBehind: 3.0,
    blueBehind: 3.0,
    redHeight: 42,
    blueHeight: 38,
  }),
  preset("contre-jour", "Contre-jour silhouette", {
    ambientBrightness: 0.08,
    keyBrightness: 0.25,
    keyColor: "#e8e8f0",
    ambientColor: "#404850",
    redBrightness: 2.8,
    blueBrightness: 3.0,
    redColor: "#ffd0a0",
    blueColor: "#a0c8ff",
    redBehind: 1.8,
    blueBehind: 1.8,
    redSide: 0.9,
    blueSide: 0.9,
    redHeight: 6,
    blueHeight: 6,
  }),
  preset("pastel-candy", "Pastel candy", {
    ambientBrightness: 0.45,
    keyBrightness: 1.6,
    keyColor: "#fff0f5",
    ambientColor: "#a898a8",
    redBrightness: 0.7,
    blueBrightness: 0.7,
    redColor: "#f0a0c0",
    blueColor: "#a0c0f0",
    redBehind: 3.6,
    blueBehind: 3.6,
    redHeight: 10,
    blueHeight: 10,
  }),
  preset("studio-soft", "Studio soft three-point", {
    ambientBrightness: 0.35,
    keyBrightness: 1.9,
    keyColor: "#f5f5f0",
    ambientColor: "#8a8c88",
    redBrightness: 0.7,
    blueBrightness: 0.85,
    redColor: "#e8d8c8",
    blueColor: "#c8d8e8",
    redBehind: 3.2,
    blueBehind: 3.2,
    redSide: 1.2,
    blueSide: 1.2,
    redHeight: 16,
    blueHeight: 12,
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
