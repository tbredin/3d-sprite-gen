import {
  normalizeEdgeOutlineSettings,
  type EdgeOutlineSettings,
} from "./edgeOutline";

/** Named snapshot of the full edge-detection board. */
export type EdgeProfile = {
  id: string;
  name: string;
  settings: EdgeOutlineSettings;
  updatedAt: number;
};

const STORAGE_KEY = "3d-sprite-gen:edge-profiles-v1";

export function loadEdgeProfiles(): EdgeProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeProfile)
      .filter((p): p is EdgeProfile => p != null);
  } catch {
    return [];
  }
}

export function saveEdgeProfiles(profiles: EdgeProfile[]) {
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

/** Snapshot whatever is currently driving the edge pass. */
export function snapshotCurrentEdge(
  settings: EdgeOutlineSettings,
  name: string,
): EdgeProfile {
  return {
    id: createProfileId(),
    name: name.trim() || "Untitled",
    settings: normalizeEdgeOutlineSettings(settings),
    updatedAt: Date.now(),
  };
}

function normalizeProfile(raw: unknown): EdgeProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<EdgeProfile>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  if (!o.settings || typeof o.settings !== "object") return null;
  return {
    id: o.id,
    name: o.name.trim() || "Untitled",
    settings: normalizeEdgeOutlineSettings(
      o.settings as Partial<EdgeOutlineSettings>,
    ),
    updatedAt:
      typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt)
        ? o.updatedAt
        : Date.now(),
  };
}
