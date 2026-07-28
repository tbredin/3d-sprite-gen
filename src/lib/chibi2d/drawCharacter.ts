import type { CharacterSpec } from "../chibi";
import { helmetModeFor } from "../chibi/helmetMode";
import {
  applyPartOutline,
  hexToRgb,
  nearestPaletteColor,
  quantizeImageData,
  type BayerDitherSettings,
} from "../palette";
import { DEFAULT_EDGE_OUTLINE_SETTINGS, type EdgeOutlineSettings } from "../edgeOutline";
import type { RimLightSettings } from "../rimLights";
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
  const sourceImageData = ctx.getImageData(0, 0, size, size);
  applyFauxLighting2D(sourceImageData, opts.rimLights, opts.facing);
  ctx.putImageData(sourceImageData, 0, 0);
  const sourceDataUrl = canvas.toDataURL("image/png");

  let imageData = new ImageData(
    new Uint8ClampedArray(sourceImageData.data),
    size,
    size,
  );
  const dither: BayerDitherSettings | null = opts.bayerDither?.enabled
    ? {
        enabled: true,
        strength: opts.bayerDither.strength,
      }
    : null;
  imageData = quantizeImageData(imageData, opts.colors, dither);

  // 2D approximation for outlines panel:
  // - `silhouette` is exact.
  // - `partSeams` / `textureSeams` use color-boundary maps from the source pass.
  const idBuffer = new Uint8ClampedArray(sourceImageData.data);
  const materialColorBuffer = new Uint8ClampedArray(sourceImageData.data);
  imageData = applyPartOutline(
    imageData,
    opts.outlineColors,
    idBuffer,
    (r, g, b, a) => (a < 8 ? 0 : ((r << 16) | (g << 8) | b) >>> 0),
    opts.outlinePass,
    materialColorBuffer,
    opts.colors,
  );

  const edge = opts.edgeOutline ?? DEFAULT_EDGE_OUTLINE_SETTINGS;
  if (edge.enabled) {
    applySpriteEdgeApprox(imageData, edge, opts.colors);
  }

  ctx.putImageData(imageData, 0, 0);
  return { sourceDataUrl, bakedDataUrl: canvas.toDataURL("image/png") };
}

/**
 * SNES-era faux lighting: 3 discrete toon bands (shadow / mid / lit) plus
 * thin colored rim accents on silhouette edges. Intentionally simple.
 */
function applyFauxLighting2D(
  data: ImageData,
  lights: RimLightSettings,
  facing: DrawCharacterOptions["facing"],
) {
  const { width: w, height: h, data: px } = data;
  const alphaMin = 8;
  const cx = (w - 1) * 0.5;
  const cy = (h - 1) * 0.52;
  const maxR = Math.max(1, Math.hypot(cx, cy * 0.9));
  const [ar, ag, ab] = hexToRgb(lights.ambientColor);
  const [kr, kg, kb] = hexToRgb(lights.keyColor);
  const [rr, rg, rb] = hexToRgb(lights.redColor);
  const [br, bg, bb] = hexToRgb(lights.blueColor);

  // Top-left key, biased toward camera-facing diagonal for readable front mass.
  const keyL = normalize2(-0.55, -1);
  const faceDir =
    facing === "toward-br"
      ? normalize2(0.85, 0.55)
      : facing === "toward-bl"
        ? normalize2(-0.85, 0.55)
        : facing === "away-tr"
          ? normalize2(0.75, -0.65)
          : normalize2(-0.75, -0.65);
  const redDir = normalize2(-1 - lights.redSide * 0.15, 0.05 + lights.redHeight / 220);
  const blueDir = normalize2(1 + lights.blueSide * 0.15, 0.05 + lights.blueHeight / 220);

  const idx = (x: number, y: number) => (y * w + x) * 4;
  const isOpaque = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    return px[idx(x, y) + 3]! >= alphaMin;
  };

  // Ambient lifts the shadow band floor; key widens the lit band.
  const amb = Math.min(1, lights.ambientBrightness * 0.9 + 0.08);
  const keyAmt = Math.min(1.4, lights.keyBrightness * 0.55 + 0.35);
  const redAmt = Math.min(0.85, lights.redBrightness * 0.07);
  const blueAmt = Math.min(0.85, lights.blueBrightness * 0.07);

  // Three toon multipliers — clear separation for tiny sprites.
  const BAND_SHADOW = 0.62 + amb * 0.12;
  const BAND_MID = 0.88 + amb * 0.06;
  const BAND_LIT = 1.12 + keyAmt * 0.08;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      if (px[i + 3]! < alphaMin) continue;

      const n = normalize2((x - cx) / maxR, (y - cy) / maxR);
      const edge =
        (!isOpaque(x - 1, y) ? 1 : 0) +
        (!isOpaque(x + 1, y) ? 1 : 0) +
        (!isOpaque(x, y - 1) ? 1 : 0) +
        (!isOpaque(x, y + 1) ? 1 : 0);
      const edgeF = edge / 4;

      const key = Math.max(0, dot2(n, keyL));
      const faceBoost = Math.max(0, dot2(n, faceDir));
      // Continuous light score → snap to 3 bands for cel readability.
      const light = Math.min(1, 0.55 * key + 0.45 * faceBoost);
      const band =
        light < 0.28 ? BAND_SHADOW : light < 0.62 ? BAND_MID : BAND_LIT;

      let r = px[i]!;
      let g = px[i + 1]!;
      let b = px[i + 2]!;

      // Band multiply + tiny ambient wash (keeps shadow hues from going dead).
      r = Math.round(r * band + ar * amb * 0.1);
      g = Math.round(g * band + ag * amb * 0.1);
      b = Math.round(b * band + ab * amb * 0.1);

      // Lit-band highlight tint toward key colour (not a soft gradient).
      if (band === BAND_LIT) {
        const ht = Math.min(0.28, 0.12 + keyAmt * 0.1);
        r = Math.round(r * (1 - ht) + kr * ht);
        g = Math.round(g * (1 - ht) + kg * ht);
        b = Math.round(b * (1 - ht) + kb * ht);
      }

      // Thin rim accents only on silhouette — classic SNES edge pop.
      if (edgeF > 0) {
        const rf = redAmt * Math.max(0, dot2(n, redDir)) * edgeF;
        const bf = blueAmt * Math.max(0, dot2(n, blueDir)) * edgeF;
        if (rf > 0.02) {
          r = Math.round(r * (1 - rf) + rr * rf);
          g = Math.round(g * (1 - rf) + rg * rf);
          b = Math.round(b * (1 - rf) + rb * rf);
        }
        if (bf > 0.02) {
          r = Math.round(r * (1 - bf) + br * bf);
          g = Math.round(g * (1 - bf) + bg * bf);
          b = Math.round(b * (1 - bf) + bb * bf);
        }
      }

      px[i] = clamp255(r);
      px[i + 1] = clamp255(g);
      px[i + 2] = clamp255(b);
    }
  }
}

function dot2(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.x + a.y * b.y;
}

function normalize2(x: number, y: number) {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
}

function clamp255(v: number) {
  return Math.max(0, Math.min(255, v));
}

function applySpriteEdgeApprox(
  data: ImageData,
  edge: EdgeOutlineSettings,
  paletteColors: string[],
) {
  const { width: w, height: h, data: px } = data;
  const score = new Float32Array(w * h);
  const alphaMin = 8;
  const c = hexToRgb(`#${edge.color}`);
  const paletteRgb = paletteColors.map(hexToRgb);
  const thresh = Math.max(8, edge.depthThreshold * 255);
  const softness = Math.max(1, edge.softness * 96);
  const gamma = Math.max(0.2, edge.thresholdGamma);

  const idx = (x: number, y: number) => (y * w + x) * 4;
  const lumaAt = (i: number) => px[i]! * 0.299 + px[i + 1]! * 0.587 + px[i + 2]! * 0.114;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(x, y);
      const a0 = px[i + 3]!;
      if (a0 < alphaMin) continue;
      const l0 = lumaAt(i);
      let best = 0;
      const n = [
        idx(x - 1, y),
        idx(x + 1, y),
        idx(x, y - 1),
        idx(x, y + 1),
      ];
      for (const j of n) {
        const aj = px[j + 3]!;
        if (aj < alphaMin) {
          best = Math.max(best, 255);
          continue;
        }
        const dl = Math.abs(l0 - lumaAt(j));
        const dr = Math.abs(px[i]! - px[j]!);
        const dg = Math.abs(px[i + 1]! - px[j + 1]!);
        const db = Math.abs(px[i + 2]! - px[j + 2]!);
        const dc = (dr + dg + db) / 3;
        best = Math.max(best, dl * edge.depthWeight + dc * edge.normalWeight);
      }
      const t = Math.max(0, best - thresh) / softness;
      score[y * w + x] = Math.pow(Math.min(1, t), gamma) * edge.opacity;
    }
  }

  for (let pass = 0; pass < edge.dilate; pass++) {
    const next = new Float32Array(score);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (score[i]! > 0) continue;
        const m = Math.max(
          score[i - 1]!,
          score[i + 1]!,
          score[i - w]!,
          score[i + w]!,
        );
        next[i] = m * 0.85;
      }
    }
    score.set(next);
  }

  for (let pass = 0; pass < edge.blur; pass++) {
    const next = new Float32Array(score);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        next[i] =
          (score[i]! * 2 +
            score[i - 1]! +
            score[i + 1]! +
            score[i - w]! +
            score[i + w]!) /
          6;
      }
    }
    score.set(next);
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = score[y * w + x]!;
      if (s <= 0.001) continue;
      const i = idx(x, y);
      if (px[i + 3]! < alphaMin) continue;
      let r = Math.round(px[i]! * (1 - s) + c[0] * s);
      let g = Math.round(px[i + 1]! * (1 - s) + c[1] * s);
      let b = Math.round(px[i + 2]! * (1 - s) + c[2] * s);
      [r, g, b] = nearestPaletteColor(r, g, b, paletteRgb);
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = 255;
    }
  }
}
