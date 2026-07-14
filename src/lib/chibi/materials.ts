import {
  CanvasTexture,
  Color,
  DoubleSide,
  MeshToonMaterial,
  NearestFilter,
} from "three";

let gradientMap: CanvasTexture | null = null;

function getGradientMap() {
  if (gradientMap) return gradientMap;
  const c = document.createElement("canvas");
  // Three hard cel bands: deep shadow / mid / lit. Soft wrap from side rims
  // stays in mid instead of flipping the whole sprite into the lit band.
  c.width = 3;
  c.height = 1;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(3, 1);
  const bands = [42, 128, 255];
  for (let i = 0; i < 3; i++) {
    img.data[i * 4] = bands[i]!;
    img.data[i * 4 + 1] = bands[i]!;
    img.data[i * 4 + 2] = bands[i]!;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  gradientMap = new CanvasTexture(c);
  gradientMap.minFilter = NearestFilter;
  gradientMap.magFilter = NearestFilter;
  gradientMap.generateMipmaps = false;
  return gradientMap;
}

/**
 * Surface toon fill. Raises very dark hues so large parts stay readable after
 * Endesga lock — near-black reserved for detail materials / pixel outline.
 */
export function toon(color: string): MeshToonMaterial {
  const c = new Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  if (hsl.l < 0.3) {
    c.setHSL(hsl.h, Math.min(1, hsl.s * 1.08), 0.34);
  }
  return new MeshToonMaterial({
    color: c,
    gradientMap: getGradientMap(),
    side: DoubleSide,
  });
}

/** Eyes, lids, tiny accents — may stay near-black. */
export function toonDetail(color: string): MeshToonMaterial {
  return new MeshToonMaterial({
    color: new Color(color),
    gradientMap: getGradientMap(),
    side: DoubleSide,
  });
}
