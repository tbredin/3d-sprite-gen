import {
  CanvasTexture,
  MeshBasicMaterial,
  NearestFilter,
  SRGBColorSpace,
} from "three";

const WHITE = "#f7f4ec";

/** Gaze in the face plane — coloured half faces this way. */
export type EyeLook = "left" | "right";

/** Which side of the face this eye sits on (drives bottom slant). */
export type EyeSide = "left" | "right";

/**
 * Single eye: 2 columns × ~2.5 rows, with a 22.5° bottom edge that drops
 * toward the face midline. Scaled up for crisp nearest filtering.
 */
const COL = 40;
/** Vertical body above the slant tip — keeps the 25% taller feel. */
const BODY = 50;
/** 22.5° over full width → drop = width × tan(22.5°). */
const DROP = Math.round(COL * Math.tan((22.5 * Math.PI) / 180));
export const EYE_TEX_W = COL;
export const EYE_TEX_H = BODY + DROP;

function bottomY(x: number, side: EyeSide): number {
  const t = COL <= 1 ? 0 : x / (COL - 1);
  // Left eye: outer (x=0) high, inner (x=max) low. Right eye: mirrored.
  if (side === "left") return BODY + t * DROP;
  return BODY + (1 - t) * DROP;
}

function paintEye(
  ctx: CanvasRenderingContext2D,
  eyeColor: string,
  look: EyeLook,
  side: EyeSide,
) {
  ctx.clearRect(0, 0, EYE_TEX_W, EYE_TEX_H);
  const half = COL / 2;

  for (const x of Array.from({ length: COL }, (_, i) => i)) {
    const y1 = Math.round(bottomY(x, side));
    const colourLeft = look === "right";
    ctx.fillStyle =
      x < half ? (colourLeft ? eyeColor : WHITE) : colourLeft ? WHITE : eyeColor;
    ctx.fillRect(x, 0, 1, y1);
  }
}

export function makeCartoonEyeTexture(
  eyeColor: string,
  look: EyeLook = "right",
  side: EyeSide = "left",
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = EYE_TEX_W;
  canvas.height = EYE_TEX_H;
  const ctx = canvas.getContext("2d")!;
  paintEye(ctx, eyeColor, look, side);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/** Unlit + alphaTest so the eye blocks stay hard pixels after palette lock. */
export function cartoonEyeMaterial(
  eyeColor: string,
  side: EyeSide,
  look: EyeLook = "right",
): MeshBasicMaterial {
  const map = makeCartoonEyeTexture(eyeColor, look, side);
  const mat = new MeshBasicMaterial({
    map,
    transparent: true,
    alphaTest: 0.5,
    depthWrite: true,
    toneMapped: false,
  });
  mat.userData.eyeColor = eyeColor;
  mat.userData.eyeLook = look as EyeLook;
  mat.userData.eyeSide = side as EyeSide;
  return mat;
}

/** Redraw the existing canvas when gaze flips with facing. */
export function setEyeLook(mat: MeshBasicMaterial, look: EyeLook) {
  if (mat.userData.eyeLook === look) return;
  const map = mat.map as CanvasTexture | null;
  if (!map?.image) return;
  const canvas = map.image as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const eyeColor = (mat.userData.eyeColor as string) ?? "#1a1c2c";
  const side = (mat.userData.eyeSide as EyeSide) ?? "left";
  paintEye(ctx, eyeColor, look, side);
  map.needsUpdate = true;
  mat.userData.eyeLook = look;
}
