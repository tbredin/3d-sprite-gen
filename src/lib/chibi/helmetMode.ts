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
    notes: "Shallow brim + crown dome; keep skull/face/hair.",
  },
  crown: {
    style: "crown",
    mount: "overlay",
    showFace: true,
    notes: "Circlet + short spikes on crown; overlay only.",
  },
  wizard: {
    style: "wizard",
    mount: "overlay",
    showFace: true,
    notes: "Tall conical hat on crown; keep face/hair.",
  },
  bandana: {
    style: "bandana",
    mount: "overlay",
    showFace: true,
    notes: "Tied kerchief over crown; slight rear knot.",
  },
  knight: {
    style: "knight",
    mount: "replace",
    showFace: false,
    notes:
      "DS Elite Knight flat-top kettle (~skullR×0.98) — closed replace; dual slits + T-nasal.",
  },
  sciFi: {
    style: "sciFi",
    mount: "replace",
    showFace: false,
    notes:
      "Practical sealed infantry helm hugging egg — brow plate + cheek cups + thin visor, not a sphere blob.",
  },
  hood: {
    style: "hood",
    mount: "replace",
    showFace: true,
    notes: "Head-sized cowl replaces skull; face stays in the window.",
  },
  goat: {
    style: "goat",
    mount: "replace",
    showFace: false,
    notes:
      "Animal head replacement — horns, snout, goat ears; hides human skull/face.",
  },
};

export function helmetModeFor(style: HelmetStyle | undefined): HelmetMode {
  return HELMET_CATALOG[style ?? "none"];
}

export function isHeadReplacement(style: HelmetStyle | undefined): boolean {
  return helmetModeFor(style).mount === "replace";
}
