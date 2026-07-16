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
  king: {
    style: "king",
    mount: "overlay",
    showFace: true,
    notes: "Arched royal crown with fleur spikes + front gem; overlay only.",
  },
  princess: {
    style: "princess",
    mount: "overlay",
    showFace: true,
    notes: "Delicate tiara circlet + center jewel + side pearls; overlay only.",
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
      "DS Elite Knight kettle (×1.2 knight-only boost) — closed replace; dual slits + T-nasal.",
  },
  knightGreat: {
    style: "knightGreat",
    mount: "replace",
    showFace: false,
    notes:
      "Cylindrical great helm (×1.2) — flat lid, cross slits, riveted bands; closed replace.",
  },
  knightWinged: {
    style: "knightWinged",
    mount: "replace",
    showFace: false,
    notes:
      "Winged kettle (×1.2) — Elite kettle body + lateral wing plates + plume stub.",
  },
  knightSallet: {
    style: "knightSallet",
    mount: "replace",
    showFace: false,
    notes:
      "Sallet + bevor (×1.2) — swept rear tail, single eye slit, pointed chin cup.",
  },
  sciFi: {
    style: "sciFi",
    mount: "replace",
    showFace: false,
    notes:
      "Sealed infantry helm (×1.3 radius boost) — brow plate + cheek cups + thin visor.",
  },
  pilot: {
    style: "pilot",
    mount: "replace",
    showFace: false,
    notes:
      "Flight/pilot helmet (×1.3) — rounded shell, goggle visor band, cheek cups, antenna.",
  },
  samurai: {
    style: "samurai",
    mount: "replace",
    showFace: false,
    notes:
      "Kabuto (×1.3) — bowl dome, mabizashi brim, side fukigaeshi, tall maedate crest.",
  },
  viking: {
    style: "viking",
    mount: "replace",
    showFace: false,
    notes:
      "Nasal helm (×1.3) — rounded dome, nose guard, cheek flaps, outward horns.",
  },
  hood: {
    style: "hood",
    mount: "replace",
    showFace: true,
    notes: "Head-sized cowl replaces skull; face stays in the window.",
  },
  pharaoh: {
    style: "pharaoh",
    mount: "replace",
    showFace: true,
    notes:
      "Nemes headdress (×1.2) — striped lappets beside face, uraeus cobra; face open.",
  },
  ninja: {
    style: "ninja",
    mount: "replace",
    showFace: false,
    notes:
      "Masked cowl (×1.2) — wrapped head + menpo lower mask; eye slit only.",
  },
  goat: {
    style: "goat",
    mount: "replace",
    showFace: false,
    notes:
      "Animal head (×1.3 boost) — horns root in skull then curl out / up / forward; welded muzzle.",
  },
};

export function helmetModeFor(style: HelmetStyle | undefined): HelmetMode {
  return HELMET_CATALOG[style ?? "none"];
}

export function isHeadReplacement(style: HelmetStyle | undefined): boolean {
  return helmetModeFor(style).mount === "replace";
}
