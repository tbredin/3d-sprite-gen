import type { CharacterSpec } from "../chibi";
import { helmetModeFor } from "../chibi/helmetMode";
import {
  applyPartOutline,
  quantizeImageData,
  type BayerDitherSettings,
  type OutlinePassSettings,
} from "../palette";
import { makeDrawCtx } from "./layout";
import { drawAccessories, drawTorso } from "./parts/torso";
import { drawArms, drawLegs } from "./parts/limbs";
import { drawFace } from "./parts/face";
import { drawHair } from "./parts/hair";
import { drawHead, drawNeck } from "./parts/head";
import { drawHelmet, eyesHiddenByHelmet2d } from "./parts/helmet";
import type { DrawCharacterOptions, Sprite2DBakeOptions } from "./types";

/**
 * Painter-ordered 2D isometric chibi — same CharacterSpec as the 3D assembler.
 * Back accessories → far limbs → torso → near limbs → head stack.
 */
export function drawCharacter(
  canvasCtx: CanvasRenderingContext2D,
  spec: CharacterSpec,
  opts: DrawCharacterOptions,
): void {
  const { draw, anchors, visibility } = makeDrawCtx(canvasCtx, spec, opts);
  const g = draw.ctx;
  g.save();
  g.clearRect(0, 0, draw.size, draw.size);
  g.imageSmoothingEnabled = false;

  const helmStyle = spec.helmet?.style ?? "none";
  const mode = helmetModeFor(helmStyle);
  const replaceHead = mode.mount === "replace";
  const showSkull = visibility.head && !replaceHead;
  const showHair = visibility.head && !replaceHead;
  const showHelm = visibility.head && helmStyle !== "none";
  const showFace =
    visibility.eyes &&
    visibility.head &&
    draw.showFace &&
    (mode.mount !== "replace" || mode.showFace);

  // Body stack — uses draw.bodyY so torso/limbs move independently of the head.
  if (visibility.torso) drawAccessories(draw, anchors, "back");

  if (visibility.legs) drawLegs(draw, anchors);

  // Far arm first on toward facings (drawArms handles order); weapons included.
  if (visibility.arms) drawArms(draw, anchors);

  if (visibility.torso) {
    drawTorso(draw, anchors);
    drawAccessories(draw, anchors, "front");
  }

  // Head stack pinned — clear bodyY so neck/skull/hair/face/helm stay put.
  if (visibility.head) {
    const bodyY = draw.bodyY;
    draw.bodyY = 0;
    drawNeck(draw, anchors, spec.skin);
    if (showSkull) drawHead(draw, anchors, spec.skin);
    if (showHair) drawHair(draw, anchors);
    if (showFace) {
      const hide = eyesHiddenByHelmet2d(helmStyle);
      drawFace(draw, anchors, hide);
    }
    if (showHelm) drawHelmet(draw, anchors);
    draw.bodyY = bodyY;
  }

  g.restore();
}

/** Draw + palette lock + silhouette outline → PNG data URL at bake resolution. */
export function bakeCharacter2D(
  spec: CharacterSpec,
  opts: Sprite2DBakeOptions,
): { sourceDataUrl: string; bakedDataUrl: string } {
  const size = opts.size;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2d context unavailable");

  drawCharacter(ctx, spec, opts);
  const sourceDataUrl = canvas.toDataURL("image/png");

  let imageData = ctx.getImageData(0, 0, size, size);
  const dither: BayerDitherSettings | null = opts.bayerDither?.enabled
    ? {
        enabled: true,
        strength: opts.bayerDither.strength,
      }
    : null;
  imageData = quantizeImageData(imageData, opts.colors, dither);

  if (opts.outlineSilhouette !== false) {
    const pass: OutlinePassSettings = {
      silhouette: true,
      partSeams: false,
      textureSeams: false,
    };
    imageData = applyPartOutline(
      imageData,
      {
        silhouette: opts.silhouetteOutlineHex ?? "b4b4b4",
        partSeams: "2a1a10",
        textureSeams: "2a1a10",
      },
      undefined,
      undefined,
      pass,
      undefined,
      opts.colors,
    );
  }

  ctx.putImageData(imageData, 0, 0);
  return { sourceDataUrl, bakedDataUrl: canvas.toDataURL("image/png") };
}
