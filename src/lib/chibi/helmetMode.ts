import type { HelmetStyle } from "./types";

/**
 * How head gear relates to the skull mesh after taller-head proportions.
 *
 * - `overlay` — additive prop on top of an existing head (cap, crowns).
 * - `replace` — the gear *is* the head silhouette; hide the skin skull
 *   (and usually hair). Closed helms also hide face/eyes.
 * - `none` — no gear.
 */
export type HelmetMount = "none" | "overlay" | "replace";

export type HelmetMode = {
  style: HelmetStyle;
  mount: HelmetMount;
  /** When replacing: keep face/eyes in an opening (hood window). */
  showFace: boolean;
  /** One-line intent for spike notes / LLM tooling. */
  notes: string;
};

/**
 * Catalog of current `HelmetStyle` values and how they should mount.
 *
 * Related (not a helmet style): `torso.style === "hoodedRobe"` still grows a
 * soft cowl *around* the head in `generateTorso` — left as follow-up; see
 * SPIKE doc.
 */
export const HELMET_CATALOG: Record<HelmetStyle, HelmetMode> = {
  none: {
    style: "none",
    mount: "none",
    showFace: true,
    notes: "Bare head — skull + face + hair as usual.",
  },
  cap: {
    style: "cap",
    mount: "overlay",
    showFace: true,
    notes: "Small brim hat on the crown; keep skull/face/hair.",
  },
  knight: {
    style: "knight",
    mount: "replace",
    showFace: false,
    notes: "Closed plate helm — replaces skull; visor slits only, no face mesh.",
  },
  sciFi: {
    style: "sciFi",
    mount: "replace",
    showFace: false,
    notes: "Sealed dome helm — replaces skull; glowing visor band, no face mesh.",
  },
  hood: {
    style: "hood",
    mount: "replace",
    showFace: true,
    notes: "Deep cowl replaces skull volume; face stays visible in the window.",
  },
};

export function helmetModeFor(style: HelmetStyle | undefined): HelmetMode {
  return HELMET_CATALOG[style ?? "none"];
}

export function isHeadReplacement(style: HelmetStyle | undefined): boolean {
  return helmetModeFor(style).mount === "replace";
}
