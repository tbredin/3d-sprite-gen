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
  c.width = 3;
  c.height = 1;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(3, 1);
  const bands = [70, 150, 255];
  for (let i = 0; i < 3; i++) {
    img.data[i * 4] = bands[i];
    img.data[i * 4 + 1] = bands[i];
    img.data[i * 4 + 2] = bands[i];
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  gradientMap = new CanvasTexture(c);
  gradientMap.minFilter = NearestFilter;
  gradientMap.magFilter = NearestFilter;
  gradientMap.generateMipmaps = false;
  return gradientMap;
}

export function toon(color: string): MeshToonMaterial {
  return new MeshToonMaterial({
    color: new Color(color),
    gradientMap: getGradientMap(),
    side: DoubleSide,
  });
}
