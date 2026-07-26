import {
  CanvasTexture,
  MeshBasicMaterial,
  NearestFilter,
  SRGBColorSpace,
} from "three";
import type { EyeStyle } from "./types";

const WHITE = "#f7f4ec";

/** Gaze in the face plane — coloured half faces this way. */
export type EyeLook = "left" | "right";

/** Which side of the face this eye sits on (drives bottom slant / mirroring). */
export type EyeSide = "left" | "right";

/**
 * Logical cell size for blocky styles. High enough that nearest filtering
 * stays crisp when the plane is tiny in the 48px bake.
 */
const CELL = 16;

/** Classic slanted 2-column eye (legacy proportions). */
const CLASSIC_COL = 40;
const CLASSIC_BODY = 50;
const CLASSIC_DROP = Math.round(
  CLASSIC_COL * Math.tan((22.5 * Math.PI) / 180),
);

type TexSize = { w: number; h: number };

/** Texture pixel size per style — also drives plane aspect in `generateFace`. */
export function eyeTexSize(style: EyeStyle): TexSize {
  switch (style) {
    case "classic":
      return { w: CLASSIC_COL, h: CLASSIC_BODY + CLASSIC_DROP };
    case "dot":
      // Compact 2×2 solid — reads as a single fat pixel blob at 48px.
      return { w: 2 * CELL, h: 2 * CELL };
    case "tall":
      // Narrow vertical bar (1×3).
      return { w: 1 * CELL, h: 3 * CELL };
    case "slit":
      // Thin horizontal lid (4×1) with gaze-side white tip.
      return { w: 4 * CELL, h: 1 * CELL };
    case "wide":
      // Flat horizontal 3×2 split.
      return { w: 3 * CELL, h: 2 * CELL };
    case "slash":
      // Square diagonal band.
      return { w: 3 * CELL, h: 3 * CELL };
  }
}

/** @deprecated Prefer `eyeTexSize(style)` — kept for callers that assume classic. */
export const EYE_TEX_W = CLASSIC_COL;
export const EYE_TEX_H = CLASSIC_BODY + CLASSIC_DROP;

function classicBottomY(x: number, side: EyeSide): number {
  const t = CLASSIC_COL <= 1 ? 0 : x / (CLASSIC_COL - 1);
  // Left eye: outer (x=0) high, inner (x=max) low. Right eye: mirrored.
  if (side === "left") return CLASSIC_BODY + t * CLASSIC_DROP;
  return CLASSIC_BODY + (1 - t) * CLASSIC_DROP;
}

function paintClassic(
  ctx: CanvasRenderingContext2D,
  eyeColor: string,
  look: EyeLook,
  side: EyeSide,
) {
  const { w, h } = eyeTexSize("classic");
  ctx.clearRect(0, 0, w, h);
  const half = CLASSIC_COL / 2;

  for (const x of Array.from({ length: CLASSIC_COL }, (_, i) => i)) {
    const y1 = Math.round(classicBottomY(x, side));
    const colourLeft = look === "right";
    ctx.fillStyle =
      x < half ? (colourLeft ? eyeColor : WHITE) : colourLeft ? WHITE : eyeColor;
    ctx.fillRect(x, 0, 1, y1);
  }
}

function fillCell(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
}

function paintDot(
  ctx: CanvasRenderingContext2D,
  eyeColor: string,
  _look: EyeLook,
  _side: EyeSide,
) {
  const { w, h } = eyeTexSize("dot");
  ctx.clearRect(0, 0, w, h);
  // Solid 2×2 block — survives NN downscale as ~1–2 bake pixels.
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) fillCell(ctx, col, row, eyeColor);
  }
}

function paintTall(
  ctx: CanvasRenderingContext2D,
  eyeColor: string,
  look: EyeLook,
  _side: EyeSide,
) {
  const { w, h } = eyeTexSize("tall");
  ctx.clearRect(0, 0, w, h);
  // Vertical stack: colour body + white tip on the gaze-facing end.
  // look=right → white at bottom; look=left → white at top (reads as glance).
  const whiteRow = look === "right" ? 2 : 0;
  for (let row = 0; row < 3; row++) {
    fillCell(ctx, 0, row, row === whiteRow ? WHITE : eyeColor);
  }
}

function paintSlit(
  ctx: CanvasRenderingContext2D,
  eyeColor: string,
  look: EyeLook,
  _side: EyeSide,
) {
  const { w, h } = eyeTexSize("slit");
  ctx.clearRect(0, 0, w, h);
  // Horizontal lid: colour run with a single white tip toward gaze.
  const whiteCol = look === "right" ? 3 : 0;
  for (let col = 0; col < 4; col++) {
    fillCell(ctx, col, 0, col === whiteCol ? WHITE : eyeColor);
  }
}

function paintWide(
  ctx: CanvasRenderingContext2D,
  eyeColor: string,
  look: EyeLook,
  _side: EyeSide,
) {
  const { w, h } = eyeTexSize("wide");
  ctx.clearRect(0, 0, w, h);
  // Flat 3×2: iris column + sclera column(s), flipped by gaze.
  const colourLeft = look === "right";
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const isColour = colourLeft ? col === 0 : col === 2;
      fillCell(ctx, col, row, isColour ? eyeColor : WHITE);
    }
  }
}

function paintSlash(
  ctx: CanvasRenderingContext2D,
  eyeColor: string,
  look: EyeLook,
  side: EyeSide,
) {
  const { w, h } = eyeTexSize("slash");
  ctx.clearRect(0, 0, w, h);
  // 3×3 diagonal colour band with a white trailing edge for gaze.
  // Face side mirrors so both eyes lean toward the midline the same way.
  const flip = (look === "left") !== (side === "right");

  for (let i = 0; i < 3; i++) {
    const col = flip ? 2 - i : i;
    fillCell(ctx, col, i, eyeColor);
    // White highlight one cell "behind" the slash toward gaze.
    const whiteCol = flip ? col + 1 : col - 1;
    if (whiteCol >= 0 && whiteCol < 3) {
      fillCell(ctx, whiteCol, i, WHITE);
    }
  }
}

function paintEye(
  ctx: CanvasRenderingContext2D,
  eyeColor: string,
  look: EyeLook,
  side: EyeSide,
  style: EyeStyle,
) {
  switch (style) {
    case "classic":
      paintClassic(ctx, eyeColor, look, side);
      break;
    case "dot":
      paintDot(ctx, eyeColor, look, side);
      break;
    case "tall":
      paintTall(ctx, eyeColor, look, side);
      break;
    case "slit":
      paintSlit(ctx, eyeColor, look, side);
      break;
    case "wide":
      paintWide(ctx, eyeColor, look, side);
      break;
    case "slash":
      paintSlash(ctx, eyeColor, look, side);
      break;
  }
}

export function makeCartoonEyeTexture(
  eyeColor: string,
  look: EyeLook = "right",
  side: EyeSide = "left",
  style: EyeStyle = "classic",
): CanvasTexture {
  const { w, h } = eyeTexSize(style);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  paintEye(ctx, eyeColor, look, side, style);

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
  style: EyeStyle = "classic",
): MeshBasicMaterial {
  const map = makeCartoonEyeTexture(eyeColor, look, side, style);
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
  mat.userData.eyeStyle = style as EyeStyle;
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
  const style = (mat.userData.eyeStyle as EyeStyle) ?? "classic";
  paintEye(ctx, eyeColor, look, side, style);
  map.needsUpdate = true;
  mat.userData.eyeLook = look;
}
