import {
  CanvasTexture,
  MeshBasicMaterial,
  NearestFilter,
  SRGBColorSpace,
} from "three";
import type { BrowStyle, EyeStyle } from "./types";

const WHITE = "#f7f4ec";

/** Gaze in the face plane — coloured half faces this way. */
export type EyeLook = "left" | "right";

/** Which side of the face this eye sits on (drives bottom slant). */
export type EyeSide = "left" | "right";

/**
 * Shared paint layout. All styles stay near the classic 2-column eye —
 * modest horizontal / vertical leans only, no dots or extreme bars.
 */
type EyeLayout = {
  cols: number;
  /** Vertical body above the slant tip. */
  body: number;
  /** Bottom slant drop toward the face midline (0 = flat). */
  drop: number;
  /** Fraction of width filled with iris colour (rest is sclera). */
  irisFrac: number;
  /** Skip this many rows from the top (sleepy lid). */
  topCrop: number;
};

const LAYOUTS: Record<EyeStyle, EyeLayout> = {
  // Original slanted 2-col plate.
  classic: {
    cols: 40,
    body: 50,
    drop: Math.round(40 * Math.tan((22.5 * Math.PI) / 180)),
    irisFrac: 0.5,
    topCrop: 0,
  },
  // Same idea, flat bottom — blockier / more square.
  square: {
    cols: 40,
    body: 56,
    drop: 0,
    irisFrac: 0.5,
    topCrop: 0,
  },
  // Slightly wider & shorter — horizontal lean.
  flat: {
    cols: 48,
    body: 36,
    drop: Math.round(48 * Math.tan((12 * Math.PI) / 180)),
    irisFrac: 0.5,
    topCrop: 0,
  },
  // Modestly taller — gentle vertical lean (not a 1×N bar).
  lean: {
    cols: 36,
    body: 58,
    drop: Math.round(36 * Math.tan((22.5 * Math.PI) / 180)),
    irisFrac: 0.5,
    topCrop: 0,
  },
  // Mostly iris with a small sclera glint on the gaze side.
  spark: {
    cols: 40,
    body: 50,
    drop: Math.round(40 * Math.tan((22.5 * Math.PI) / 180)),
    irisFrac: 0.75,
    topCrop: 0,
  },
  // Half-lidded: shorter plate, same 2-col split.
  lid: {
    cols: 40,
    body: 28,
    drop: Math.round(40 * Math.tan((18 * Math.PI) / 180)),
    irisFrac: 0.5,
    topCrop: 0,
  },
};

type TexSize = { w: number; h: number };

/** Texture pixel size per style — also drives plane aspect in `generateFace`. */
export function eyeTexSize(style: EyeStyle): TexSize {
  const { cols, body, drop } = LAYOUTS[style];
  return { w: cols, h: body + drop };
}

/** @deprecated Prefer `eyeTexSize(style)` — kept for callers that assume classic. */
export const EYE_TEX_W = LAYOUTS.classic.cols;
export const EYE_TEX_H = LAYOUTS.classic.body + LAYOUTS.classic.drop;

function bottomY(x: number, side: EyeSide, layout: EyeLayout): number {
  const { cols, body, drop } = layout;
  if (drop <= 0 || cols <= 1) return body;
  const t = x / (cols - 1);
  // Left eye: outer (x=0) high, inner (x=max) low. Right eye: mirrored.
  if (side === "left") return body + t * drop;
  return body + (1 - t) * drop;
}

function paintEye(
  ctx: CanvasRenderingContext2D,
  eyeColor: string,
  look: EyeLook,
  side: EyeSide,
  style: EyeStyle,
) {
  const layout = LAYOUTS[style];
  const { w, h } = eyeTexSize(style);
  ctx.clearRect(0, 0, w, h);

  const irisW = Math.max(1, Math.round(layout.cols * layout.irisFrac));
  const colourLeft = look === "right";
  // Iris sits on the gaze side; sclera fills the rest.
  const irisStart = colourLeft ? 0 : layout.cols - irisW;
  const irisEnd = irisStart + irisW;

  for (const x of Array.from({ length: layout.cols }, (_, i) => i)) {
    const y1 = Math.round(bottomY(x, side, layout));
    const isIris = x >= irisStart && x < irisEnd;
    ctx.fillStyle = isIris ? eyeColor : WHITE;
    const y0 = layout.topCrop;
    if (y1 > y0) ctx.fillRect(x, y0, 1, y1 - y0);
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

/* -------------------------------------------------------------------------- */
/* Eyebrows — thin strokes above the eyes. Grids are cropped to opaque cells  */
/* only so tipped eye tops can't show through empty brow texels.              */
/* -------------------------------------------------------------------------- */

const BROW_CELL = 16;

/**
 * Logical stroke for each brow style. `rows` is the tight crop height —
 * every row is used (no empty padding above/below).
 * Col 0 = inner (midline), cols-1 = outer.
 */
function browStroke(
  style: Exclude<BrowStyle, "none">,
): { cols: number; rows: number; cells: Array<{ c: number; r: number }> } {
  switch (style) {
    case "thin":
      return {
        cols: 5,
        rows: 1,
        cells: [0, 1, 2, 3, 4].map((c) => ({ c, r: 0 })),
      };
    case "soft":
      return {
        cols: 4,
        rows: 1,
        cells: [0, 1, 2, 3].map((c) => ({ c, r: 0 })),
      };
    case "angled":
      // Gentle outer lift — still only 2 rows tall.
      return {
        cols: 5,
        rows: 2,
        cells: [
          { c: 0, r: 1 },
          { c: 1, r: 1 },
          { c: 2, r: 1 },
          { c: 3, r: 0 },
          { c: 4, r: 0 },
        ],
      };
    case "short":
      return {
        cols: 3,
        rows: 1,
        cells: [0, 1, 2].map((c) => ({ c, r: 0 })),
      };
    case "thick":
      return {
        cols: 5,
        rows: 2,
        cells: [0, 1, 2, 3, 4].flatMap((c) => [
          { c, r: 0 },
          { c, r: 1 },
        ]),
      };
    case "arched":
      // Soft arch: ends lower, middle higher — 2 rows.
      return {
        cols: 5,
        rows: 2,
        cells: [
          { c: 0, r: 1 },
          { c: 1, r: 0 },
          { c: 2, r: 0 },
          { c: 3, r: 0 },
          { c: 4, r: 1 },
        ],
      };
  }
}

export function browTexSize(style: Exclude<BrowStyle, "none">): TexSize {
  const { cols, rows } = browStroke(style);
  return { w: cols * BROW_CELL, h: rows * BROW_CELL };
}

function fillBrowCell(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(col * BROW_CELL, row * BROW_CELL, BROW_CELL, BROW_CELL);
}

/**
 * Paint a brow into a tight crop. `side` mirrors angled / arched shapes so
 * the outer tip lifts away from the midline.
 */
function paintBrow(
  ctx: CanvasRenderingContext2D,
  color: string,
  side: EyeSide,
  style: Exclude<BrowStyle, "none">,
) {
  const { cols, cells } = browStroke(style);
  const { w, h } = browTexSize(style);
  ctx.clearRect(0, 0, w, h);

  for (const { c, r } of cells) {
    // Texture x: left brow paints inner toward +x (face midline).
    const canvasCol = side === "left" ? cols - 1 - c : c;
    fillBrowCell(ctx, canvasCol, r, color);
  }
}

export function makeCartoonBrowTexture(
  color: string,
  side: EyeSide,
  style: Exclude<BrowStyle, "none">,
): CanvasTexture {
  const { w, h } = browTexSize(style);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  paintBrow(ctx, color, side, style);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function cartoonBrowMaterial(
  color: string,
  side: EyeSide,
  style: Exclude<BrowStyle, "none">,
): MeshBasicMaterial {
  const map = makeCartoonBrowTexture(color, side, style);
  const mat = new MeshBasicMaterial({
    map,
    transparent: true,
    alphaTest: 0.5,
    depthWrite: true,
    toneMapped: false,
  });
  mat.userData.browColor = color;
  mat.userData.browSide = side;
  mat.userData.browStyle = style;
  return mat;
}
