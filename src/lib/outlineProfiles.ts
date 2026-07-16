import {
  normalizeEdgeOutlineSettings,
  type EdgeOutlineSettings,
} from "./edgeOutline";
import {
  DEFAULT_OUTLINE_COLORS,
  DEFAULT_OUTLINE_PASS,
  normalizePaletteHex,
  type OutlineColors,
  type OutlinePassSettings,
} from "./palette";

/**
 * Named snapshot of the full Outlines panel: silhouette / part-seams toggles
 * + colours, and the entire edge-detection board.
 */
export type OutlineProfileSettings = {
  pass: OutlinePassSettings;
  colors: OutlineColors;
  edge: EdgeOutlineSettings;
};

export type OutlineProfile = {
  id: string;
  name: string;
  settings: OutlineProfileSettings;
  updatedAt: number;
};

const STORAGE_KEY = "3d-sprite-gen:outline-profiles-v1";
/** Edge-only profiles from before the full-panel snapshot. */
const LEGACY_EDGE_PROFILES_KEY = "3d-sprite-gen:edge-profiles-v1";

export function loadOutlineProfiles(
  paletteColors?: string[],
): OutlineProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((p) => normalizeProfile(p, paletteColors))
        .filter((p): p is OutlineProfile => p != null);
    }
    return migrateLegacyEdgeProfiles(paletteColors);
  } catch {
    return [];
  }
}

/**
 * One-shot: fold old edge-only profiles into v1 with default sil/seams,
 * then drop the legacy key so we don't re-migrate.
 */
function migrateLegacyEdgeProfiles(
  paletteColors?: string[],
): OutlineProfile[] {
  try {
    const raw = localStorage.getItem(LEGACY_EDGE_PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(LEGACY_EDGE_PROFILES_KEY);
      return [];
    }
    const migrated = parsed
      .map((p) => normalizeLegacyEdgeProfile(p, paletteColors))
      .filter((p): p is OutlineProfile => p != null);
    if (migrated.length) saveOutlineProfiles(migrated);
    localStorage.removeItem(LEGACY_EDGE_PROFILES_KEY);
    return migrated;
  } catch {
    return [];
  }
}

export function saveOutlineProfiles(profiles: OutlineProfile[]) {
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

export function normalizeOutlineProfileSettings(
  partial: Partial<OutlineProfileSettings> & {
    /** Legacy edge-only shape used `settings` as EdgeOutlineSettings directly. */
    enabled?: boolean;
    color?: string;
    depthThreshold?: number;
  },
  paletteColors?: string[],
): OutlineProfileSettings {
  // Legacy: entire settings bag was EdgeOutlineSettings.
  const looksLikeEdgeOnly =
    partial.pass == null &&
    partial.colors == null &&
    partial.edge == null &&
    (typeof partial.enabled === "boolean" ||
      typeof partial.color === "string" ||
      typeof partial.depthThreshold === "number");

  const edgeSource = looksLikeEdgeOnly
    ? (partial as Partial<EdgeOutlineSettings>)
    : ((partial.edge ?? {}) as Partial<EdgeOutlineSettings>);

  return {
    pass: normalizePass(partial.pass),
    colors: normalizeColors(partial.colors, paletteColors),
    edge: normalizeEdgeOutlineSettings(edgeSource, paletteColors),
  };
}

/** Snapshot whatever is currently driving the Outlines panel. */
export function snapshotCurrentOutline(
  settings: OutlineProfileSettings,
  name: string,
  paletteColors?: string[],
): OutlineProfile {
  return {
    id: createProfileId(),
    name: name.trim() || "Untitled",
    settings: normalizeOutlineProfileSettings(settings, paletteColors),
    updatedAt: Date.now(),
  };
}

function normalizePass(
  raw: Partial<OutlinePassSettings> | undefined,
): OutlinePassSettings {
  return {
    silhouette: raw?.silhouette !== false,
    partSeams: raw?.partSeams !== false,
  };
}

function normalizeColors(
  raw: Partial<OutlineColors> | undefined,
  paletteColors?: string[],
): OutlineColors {
  const fallback = { ...DEFAULT_OUTLINE_COLORS };
  const sil =
    typeof raw?.silhouette === "string"
      ? sanitizeHex(raw.silhouette, paletteColors)
      : null;
  const seams =
    typeof raw?.partSeams === "string"
      ? sanitizeHex(raw.partSeams, paletteColors)
      : null;
  return {
    silhouette: sil ?? fallback.silhouette,
    partSeams: seams ?? fallback.partSeams,
  };
}

function sanitizeHex(raw: string, paletteColors?: string[]): string | null {
  const hex = normalizePaletteHex(raw);
  if (!/^[0-9a-f]{6}$/.test(hex)) return null;
  if (
    paletteColors?.length &&
    !paletteColors.some((c) => normalizePaletteHex(c) === hex)
  ) {
    return null;
  }
  return hex;
}

function normalizeProfile(
  raw: unknown,
  paletteColors?: string[],
): OutlineProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<OutlineProfile>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  if (!o.settings || typeof o.settings !== "object") return null;
  return {
    id: o.id,
    name: o.name.trim() || "Untitled",
    settings: normalizeOutlineProfileSettings(
      o.settings as Partial<OutlineProfileSettings>,
      paletteColors,
    ),
    updatedAt:
      typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt)
        ? o.updatedAt
        : Date.now(),
  };
}

/** Old edge-profiles-v1 entries: `{ id, name, settings: EdgeOutlineSettings }`. */
function normalizeLegacyEdgeProfile(
  raw: unknown,
  paletteColors?: string[],
): OutlineProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as {
    id?: unknown;
    name?: unknown;
    settings?: unknown;
    updatedAt?: unknown;
  };
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  if (!o.settings || typeof o.settings !== "object") return null;
  return {
    id: o.id,
    name: o.name.trim() || "Untitled",
    settings: {
      pass: { ...DEFAULT_OUTLINE_PASS },
      colors: { ...DEFAULT_OUTLINE_COLORS },
      edge: normalizeEdgeOutlineSettings(
        o.settings as Partial<EdgeOutlineSettings>,
        paletteColors,
      ),
    },
    updatedAt:
      typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt)
        ? o.updatedAt
        : Date.now(),
  };
}
