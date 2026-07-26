import { hexToRgb, nearestPaletteColor } from "../palette";
import type { CharacterSpec } from "./types";

function rgbToCssHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Snap one `#rrggbb` / bare hex to the nearest palette entry (`#rrggbb`). */
export function snapHexToPalette(
  hex: string,
  paletteColors: string[],
): string {
  if (!paletteColors.length) {
    return hex.startsWith("#") ? hex : `#${hex}`;
  }
  const [r, g, b] = hexToRgb(hex);
  const [nr, ng, nb] = nearestPaletteColor(
    r,
    g,
    b,
    paletteColors.map(hexToRgb),
  );
  return rgbToCssHex(nr, ng, nb);
}

/**
 * Remap every colour slot on a character spec to the nearest colour in
 * `paletteColors`. Used when the Lospec palette changes so the live 3D
 * materials approximate the bake-time quantization.
 */
export function remapSpecToPalette(
  spec: CharacterSpec,
  paletteColors: string[],
): CharacterSpec {
  if (!paletteColors.length) return spec;

  const paletteRgb = paletteColors.map(hexToRgb);
  const snap = (hex: string): string => {
    const [r, g, b] = hexToRgb(hex);
    const [nr, ng, nb] = nearestPaletteColor(r, g, b, paletteRgb);
    return rgbToCssHex(nr, ng, nb);
  };

  const next = structuredClone(spec);
  next.skin = snap(next.skin);

  if (next.hair) next.hair.color = snap(next.hair.color);

  if (next.helmet) {
    next.helmet.color = snap(next.helmet.color);
    if (next.helmet.visor) next.helmet.visor = snap(next.helmet.visor);
  }

  if (next.face?.eyeColor) {
    next.face = { ...next.face, eyeColor: snap(next.face.eyeColor) };
  }

  next.torso.color = snap(next.torso.color);
  if (next.torso.trim) next.torso.trim = snap(next.torso.trim);
  if (next.torso.detailColor) {
    next.torso.detailColor = snap(next.torso.detailColor);
  }

  if (next.accessories) {
    const a = next.accessories;
    if (a.hemColor) a.hemColor = snap(a.hemColor);
    if (a.capeColor) a.capeColor = snap(a.capeColor);
    if (a.pouchColor) a.pouchColor = snap(a.pouchColor);
    if (a.backLoadoutColor) a.backLoadoutColor = snap(a.backLoadoutColor);
  }

  if (next.arms.sleeveColor) next.arms.sleeveColor = snap(next.arms.sleeveColor);
  if (next.arms.handColor) next.arms.handColor = snap(next.arms.handColor);

  next.legs.pantColor = snap(next.legs.pantColor);
  next.legs.bootColor = snap(next.legs.bootColor);

  if (next.weapon) next.weapon.color = snap(next.weapon.color);
  if (next.offhand) next.offhand.color = snap(next.offhand.color);

  return next;
}
