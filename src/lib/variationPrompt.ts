/** Prompt template for AI sprite variations (no LLM in v1). */

import type { CharacterSpec } from "./chibi";
import { FACING_PRESETS, type FacingId } from "./facing";

/** Trigger token for the local SDXL house LoRA (see server/app/house_lora.py). */
export const HOUSE_LORA_TRIGGER = "thenvpixel";

/**
 * House style for SDXL — natural language, not SD1.5 tag salad.
 * Keep “pixel” light (pixel-art-xl tip). Lead with the house trigger so the
 * curated-iso LoRA fires when loaded.
 */
const STYLE_GUIDELINES =
  `${HOUSE_LORA_TRIGGER}, a charming isometric low-top-down chibi character ` +
  "sprite in the spirit of SNES-era JRPGs such as Sea of Stars, Lufia II, " +
  "and Breath of Fire. Readable silhouette, hand-authored pixel details, " +
  "single isolated character on a plain backdrop";

function facingHint(facing?: FacingId): string | null {
  if (!facing || facing === "custom") {
    return "Viewed from a fixed isometric low-top-down game camera";
  }
  const preset = FACING_PRESETS.find((p) => p.id === facing);
  const raw = preset?.conceptHint?.trim();
  if (!raw) return null;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function humanizeToken(raw: string): string {
  return raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .toLowerCase();
}

/** Character bits that help the model invent costume/face charm. */
function characterBits(spec: CharacterSpec): string[] {
  const bits: string[] = [];

  if (spec.leadSide) {
    bits.push(`${spec.leadSide}-lead fighting stance`);
  }

  if (spec.helmet?.style && spec.helmet.style !== "none") {
    bits.push(`a ${humanizeToken(spec.helmet.style)} helmet`);
  } else if (spec.hair?.style) {
    bits.push(`${humanizeToken(spec.hair.style)} hair`);
  }

  if (spec.torso?.style) {
    bits.push(`a ${humanizeToken(spec.torso.style)} outfit`);
  }

  const hem = spec.accessories?.hem;
  if (hem && hem !== "none") {
    bits.push(humanizeToken(hem));
  }
  if (spec.accessories?.cape) {
    bits.push("a cape");
  }

  if (spec.arms?.pose) {
    bits.push(`${humanizeToken(spec.arms.pose)} arms`);
  }
  if (spec.legs?.pose) {
    bits.push(`${humanizeToken(spec.legs.pose)} legs`);
  }

  if (spec.weapon?.type && spec.weapon.type !== "none") {
    bits.push(`holding a ${spec.weapon.type}`);
  }

  if (spec.face?.eyeColor) {
    bits.push("tiny 2x2 pixel eyes with no mouth or nose");
  }

  return bits;
}

export type VariationPromptOpts = {
  facing?: FacingId;
  size: number;
  /** Lospec slug, e.g. endesga-64 */
  paletteSlug?: string;
  /** Display name from palette JSON when available */
  paletteName?: string;
  steer?: string;
};

function joinSentences(parts: string[]): string {
  const cleaned = parts
    .map((p) => p.trim().replace(/[.]+$/, ""))
    .filter(Boolean);
  if (!cleaned.length) return "";
  return `${cleaned.join(". ")}.`;
}

/**
 * Final SDXL prompt = house guidelines + camera/facing language + character
 * settings + optional user steer.
 *
 * Camera height / lights stay out of the text — they are already in the
 * pre-quantize bake that ControlNet + img2img condition on.
 */
export function buildVariationPrompt(
  spec: CharacterSpec,
  opts: VariationPromptOpts,
): string {
  const sentences: string[] = [STYLE_GUIDELINES];

  const view = facingHint(opts.facing);
  if (view) sentences.push(view);

  const paletteLabel = opts.paletteName?.trim() || opts.paletteSlug?.trim();
  const cell =
    `Rendered as a crisp ${opts.size}×${opts.size} sprite cell` +
    (paletteLabel ? ` with ${paletteLabel} colours` : " with a limited palette");
  sentences.push(cell);

  const character = characterBits(spec);
  if (character.length) {
    sentences.push(`The character has ${character.join(", ")}`);
  }

  const steer = opts.steer?.trim();
  if (steer) {
    sentences.push(steer);
  }

  return joinSentences(sentences);
}
