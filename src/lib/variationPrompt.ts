/** Prompt template for AI sprite variations (no LLM in v1). */

import type { CharacterSpec } from "./chibi";
import { FACING_PRESETS, type FacingId } from "./facing";

/** House style — always on. Keep “pixel” light (pixel-art-xl tip). */
const STYLE_GUIDELINES = [
  "isometric low-top-down chibi character sprite",
  "SNES-era JRPG look",
  "Sea of Stars / Lufia II / Breath of Fire DNA",
  "readable silhouette",
  "charming hand-authored pixel details",
  "single isolated character",
  "plain backdrop",
].join(", ");

function facingHint(facing?: FacingId): string | null {
  if (!facing || facing === "custom") {
    return "isometric low-top-down view, fixed game camera";
  }
  const preset = FACING_PRESETS.find((p) => p.id === facing);
  return preset?.conceptHint ?? null;
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
    bits.push(`${humanizeToken(spec.helmet.style)} helmet`);
  } else if (spec.hair?.style) {
    bits.push(`${humanizeToken(spec.hair.style)} hair`);
  }

  if (spec.torso?.style) {
    bits.push(`${humanizeToken(spec.torso.style)} outfit`);
  }

  const hem = spec.accessories?.hem;
  if (hem && hem !== "none") {
    bits.push(humanizeToken(hem));
  }
  if (spec.accessories?.cape) {
    bits.push("cape");
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
    bits.push("tiny 2x2 pixel eyes, no mouth, no nose");
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

/**
 * Final SD prompt = house guidelines + camera/facing language + character
 * settings + optional user steer.
 *
 * Camera height / lights stay out of the text — they are already in the
 * pre-quantize bake that ControlNet + img2img condition on.
 */
export function buildVariationPrompt(
  spec: CharacterSpec,
  opts: VariationPromptOpts,
): string {
  const layers: string[] = [STYLE_GUIDELINES];

  const view = facingHint(opts.facing);
  if (view) layers.push(view);

  const settings: string[] = [
    `${opts.size}×${opts.size} sprite cell`,
    "crisp limited palette after render",
  ];
  if (opts.paletteName?.trim()) {
    settings.push(`${opts.paletteName.trim()} colours`);
  } else if (opts.paletteSlug?.trim()) {
    settings.push(`${opts.paletteSlug.trim()} palette`);
  }
  layers.push(settings.join(", "));

  const character = characterBits(spec);
  if (character.length) {
    layers.push(character.join(", "));
  }

  const steer = opts.steer?.trim();
  if (steer) {
    layers.push(steer);
  }

  return layers.join(". ");
}
