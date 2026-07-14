import type { RimLightSettings } from "./rimLights";

/** Named snapshot of the full rim / fill lighting board. */
export type LightingProfile = {
  id: string;
  name: string;
  settings: RimLightSettings;
  updatedAt: number;
};

const STORAGE_KEY = "3d-sprite-gen:lighting-profiles-v1";

export function loadLightingProfiles(): LightingProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeProfile)
      .filter((p): p is LightingProfile => p != null);
  } catch {
    return [];
  }
}

export function saveLightingProfiles(profiles: LightingProfile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
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
    settings: { ...settings },
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
    settings: { ...(o.settings as RimLightSettings) },
    updatedAt:
      typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt)
        ? o.updatedAt
        : Date.now(),
  };
}
