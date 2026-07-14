import {
  DEFAULT_OUTLINE_HEX,
  hexToRgb,
  nearestPaletteColor,
  normalizePaletteHex,
} from "./palette";

/**
 * Depth + normal discontinuity outline pass (spike).
 *
 * Complements the silhouette-only `applyPixelOutline` by drawing internal
 * crease lines (limb-over-torso overlaps, joints, folds) wherever the baked
 * geometry's view-space depth or normal changes sharply between cardinal
 * neighbours — the classic "Drawing the Line on 3D Pixel Art" / Sobel-ish
 * outline trick, done per-pixel at native sprite resolution instead of via a
 * screen-space post shader.
 *
 * Soft response (gamma + softness + separate weights) keeps mid-slider
 * settings from painting every curved surface as a harsh binary edge.
 *
 * See docs/SPIKE-depth-normal-edges.md for the full write-up and tuning notes.
 */

export type EdgeDetectOptions = {
  /** World-space (view-axis) depth delta above which depth response rises. */
  depthThreshold: number;
  /** Normal angle delta between cardinal neighbours (degrees). */
  normalThresholdDeg: number;
  /** 0–1 blend weight for the depth channel. */
  depthWeight: number;
  /** 0–1 blend weight for the normal channel. */
  normalWeight: number;
  /**
   * Soft onset width (0 = near-binary at threshold, 1 = wide ramp).
   * Mid defaults keep curve surfaces from lighting up all at once.
   */
  softness: number;
  /**
   * Gamma on the soft response (>1 = slower onset / fewer mid-strength edges).
   */
  thresholdGamma: number;
};

/** Slider / clamp bounds — higher threshold = fewer, more selective edges. */
export const EDGE_DEPTH_MIN = 0.01;
export const EDGE_DEPTH_MAX = 0.5;
export const EDGE_DEPTH_STEP = 0.01;
export const EDGE_NORMAL_MIN = 5;
export const EDGE_NORMAL_MAX = 99;
export const EDGE_NORMAL_STEP = 1;
export const EDGE_WEIGHT_MIN = 0;
export const EDGE_WEIGHT_MAX = 1;
export const EDGE_WEIGHT_STEP = 0.05;
export const EDGE_SOFTNESS_MIN = 0;
export const EDGE_SOFTNESS_MAX = 1;
export const EDGE_SOFTNESS_STEP = 0.05;
export const EDGE_GAMMA_MIN = 0.4;
export const EDGE_GAMMA_MAX = 3;
export const EDGE_GAMMA_STEP = 0.05;
export const EDGE_OPACITY_MIN = 0.05;
export const EDGE_OPACITY_MAX = 1;
export const EDGE_OPACITY_STEP = 0.05;
export const EDGE_DILATE_MIN = 0;
export const EDGE_DILATE_MAX = 2;
export const EDGE_DILATE_STEP = 1;
export const EDGE_BLUR_MIN = 0;
export const EDGE_BLUR_MAX = 2;
export const EDGE_BLUR_STEP = 1;

/**
 * Defaults tuned for a softer mid-range: slightly higher thresholds, softer
 * ramp, mild gamma, and opacity under 1 so enabling the pass isn't severe.
 */
export const DEFAULT_EDGE_OPTIONS: EdgeDetectOptions = {
  depthThreshold: 0.34,
  normalThresholdDeg: 82,
  depthWeight: 1,
  normalWeight: 0.75,
  softness: 0.55,
  thresholdGamma: 1.45,
};

export type EdgeOutlineSettings = EdgeDetectOptions & {
  enabled: boolean;
  /** Endesga hex (no #) for depth/normal crease pixels — independent of silhouette outline. */
  color: string;
  /** Edge composite strength (0–1). */
  opacity: number;
  /** Expand edge mask by N cardinal rings (0–2). */
  dilate: number;
  /** Box-blur passes on the strength field (0–2) before paint. */
  blur: number;
};

/** Matches the previous shared outline default so enabling edges doesn't jump colour. */
export const DEFAULT_EDGE_OUTLINE_SETTINGS: EdgeOutlineSettings = {
  enabled: false,
  color: DEFAULT_OUTLINE_HEX,
  opacity: 0.72,
  dilate: 0,
  blur: 0,
  ...DEFAULT_EDGE_OPTIONS,
};

/** v3: soft curve + opacity/dilate/blur + separate channel weights. */
const EDGE_OUTLINE_STORAGE_KEY = "3d-sprite-gen:edge-outline-v3";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function clampOpt(
  n: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return clamp(n, min, max);
}

/** Clamp / fill a partial snapshot into a full EdgeOutlineSettings. */
export function normalizeEdgeOutlineSettings(
  partial: Partial<EdgeOutlineSettings>,
  paletteColors?: string[],
): EdgeOutlineSettings {
  const fallback = { ...DEFAULT_EDGE_OUTLINE_SETTINGS };
  let color =
    typeof partial.color === "string"
      ? normalizePaletteHex(partial.color)
      : fallback.color;
  if (!/^[0-9a-f]{6}$/.test(color)) color = fallback.color;
  if (
    paletteColors?.length &&
    !paletteColors.some((c) => normalizePaletteHex(c) === color)
  ) {
    color = fallback.color;
  }
  return {
    enabled: partial.enabled === true,
    color,
    depthThreshold: clampOpt(
      partial.depthThreshold,
      EDGE_DEPTH_MIN,
      EDGE_DEPTH_MAX,
      fallback.depthThreshold,
    ),
    normalThresholdDeg: clampOpt(
      partial.normalThresholdDeg,
      EDGE_NORMAL_MIN,
      EDGE_NORMAL_MAX,
      fallback.normalThresholdDeg,
    ),
    depthWeight: clampOpt(
      partial.depthWeight,
      EDGE_WEIGHT_MIN,
      EDGE_WEIGHT_MAX,
      fallback.depthWeight,
    ),
    normalWeight: clampOpt(
      partial.normalWeight,
      EDGE_WEIGHT_MIN,
      EDGE_WEIGHT_MAX,
      fallback.normalWeight,
    ),
    softness: clampOpt(
      partial.softness,
      EDGE_SOFTNESS_MIN,
      EDGE_SOFTNESS_MAX,
      fallback.softness,
    ),
    thresholdGamma: clampOpt(
      partial.thresholdGamma,
      EDGE_GAMMA_MIN,
      EDGE_GAMMA_MAX,
      fallback.thresholdGamma,
    ),
    opacity: clampOpt(
      partial.opacity,
      EDGE_OPACITY_MIN,
      EDGE_OPACITY_MAX,
      fallback.opacity,
    ),
    dilate: Math.round(
      clampOpt(partial.dilate, EDGE_DILATE_MIN, EDGE_DILATE_MAX, fallback.dilate),
    ),
    blur: Math.round(
      clampOpt(partial.blur, EDGE_BLUR_MIN, EDGE_BLUR_MAX, fallback.blur),
    ),
  };
}

export function loadEdgeOutlineSettings(
  paletteColors?: string[],
): EdgeOutlineSettings {
  try {
    const raw = localStorage.getItem(EDGE_OUTLINE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_EDGE_OUTLINE_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<EdgeOutlineSettings>;
    return normalizeEdgeOutlineSettings(parsed, paletteColors);
  } catch {
    return { ...DEFAULT_EDGE_OUTLINE_SETTINGS };
  }
}

export function saveEdgeOutlineSettings(settings: EdgeOutlineSettings) {
  const n = normalizeEdgeOutlineSettings(settings);
  localStorage.setItem(
    EDGE_OUTLINE_STORAGE_KEY,
    JSON.stringify({
      enabled: n.enabled,
      color: n.color,
      depthThreshold: n.depthThreshold,
      normalThresholdDeg: n.normalThresholdDeg,
      depthWeight: n.depthWeight,
      normalWeight: n.normalWeight,
      softness: n.softness,
      thresholdGamma: n.thresholdGamma,
      opacity: n.opacity,
      dilate: n.dilate,
      blur: n.blur,
    }),
  );
}

const UNPACK_DOWNSCALE = 255 / 256;

/**
 * Mirrors three.js's `unpackRGBAToDepth` (packing.glsl) so we can decode a
 * `MeshDepthMaterial({ depthPacking: RGBADepthPacking })` render target on
 * the CPU. RGBA packing gives ~24 bits of depth precision regardless of the
 * camera's near/far span, so no need to fit a tight frustum per bake.
 */
export function decodeDepthBuffer(rgba: Uint8Array, size: number): Float32Array {
  const out = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    const r = rgba[o] / 255;
    const g = rgba[o + 1] / 255;
    const b = rgba[o + 2] / 255;
    const a = rgba[o + 3] / 255;
    out[i] =
      r * UNPACK_DOWNSCALE +
      (g * UNPACK_DOWNSCALE) / 256 +
      (b * UNPACK_DOWNSCALE) / 65536 +
      a / 16777216;
  }
  return out;
}

/**
 * `MeshNormalMaterial` packs the view-space normal as `normal * 0.5 + 0.5`
 * into RGB. Decoding back to [-1, 1] gives per-pixel view-space normals,
 * which is exactly what we want for a fixed iso camera bake.
 */
export function decodeNormalBuffer(rgba: Uint8Array, size: number): Float32Array {
  const out = new Float32Array(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    out[i * 3] = (rgba[o] / 255) * 2 - 1;
    out[i * 3 + 1] = (rgba[o + 1] / 255) * 2 - 1;
    out[i * 3 + 2] = (rgba[o + 2] / 255) * 2 - 1;
  }
  return out;
}

/**
 * Convert a packed [0, 1] depth-buffer value to view-axis world units.
 * For an `OrthographicCamera` the depth buffer is linear in view-space z,
 * so this is a plain lerp between near and far (no perspective divide).
 */
export function depthToWorldUnits(d: number, near: number, far: number): number {
  return near + d * (far - near);
}

/** Flip a size×size RGBA buffer's rows top<->bottom (WebGL readback is bottom-up). */
export function flipRowsRGBA(buffer: Uint8Array, size: number): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  const row = size * 4;
  for (let y = 0; y < size; y++) {
    const src = (size - 1 - y) * row;
    out.set(buffer.subarray(src, src + row), y * row);
  }
  return out;
}

/**
 * Erode the opaque mask by one cardinal-neighbour ring. Pixels right next to
 * the silhouette are heavily foreshortened (their surface normal is nearly
 * perpendicular to the view axis), so depth/normal deltas spike there even
 * on a perfectly smooth capsule. Restricting edge *candidates* to this
 * eroded "core" mask keeps the internal-crease pass from redrawing the
 * whole silhouette rim from the inside.
 */
export function erodeMask(opaque: Uint8Array, w: number, h: number): Uint8Array {
  const core = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!opaque[i]) continue;
      let interior = true;
      for (const [dy, dx] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || !opaque[ny * w + nx]) {
          interior = false;
          break;
        }
      }
      core[i] = interior ? 1 : 0;
    }
  }
  return core;
}

/**
 * Soft step around a threshold: value just below threshold stays low;
 * softness widens the ramp; gamma > 1 pushes the useful response later.
 */
export function softThresholdResponse(
  value: number,
  threshold: number,
  softness: number,
  gamma: number,
): number {
  const soft = clamp(softness, 0, 1);
  const half = Math.max(1e-5, threshold * (0.04 + soft * 0.96));
  const t = (value - (threshold - half)) / (2 * half);
  const s = clamp(t, 0, 1);
  const smooth = s * s * (3 - 2 * s);
  const g = Math.max(0.05, gamma);
  return Math.pow(smooth, g);
}

function dilateStrength(
  src: Float32Array,
  w: number,
  h: number,
  rings: number,
): Float32Array {
  if (rings <= 0) return src;
  let cur = src;
  for (let r = 0; r < rings; r++) {
    const next = new Float32Array(cur.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let m = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            m = Math.max(m, cur[ny * w + nx]);
          }
        }
        next[y * w + x] = m;
      }
    }
    cur = next;
  }
  return cur;
}

function blurStrength(
  src: Float32Array,
  w: number,
  h: number,
  passes: number,
): Float32Array {
  if (passes <= 0) return src;
  let cur = src;
  for (let p = 0; p < passes; p++) {
    const next = new Float32Array(cur.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            sum += cur[ny * w + nx];
            count++;
          }
        }
        next[y * w + x] = count ? sum / count : 0;
      }
    }
    cur = next;
  }
  return cur;
}

/**
 * Cardinal-neighbour depth+normal discontinuity strength field (0–1),
 * restricted to pixel pairs that are both inside the silhouette.
 * Soft response + separate channel weights replace the old binary OR.
 */
export function detectDepthNormalEdges(
  opaque: Uint8Array,
  depthWorld: Float32Array,
  normals: Float32Array,
  w: number,
  h: number,
  opts: EdgeDetectOptions,
): Float32Array {
  const edges = new Float32Array(w * h);
  const core = erodeMask(opaque, w, h);
  const depthW = clamp(opts.depthWeight, 0, 1);
  const normalW = clamp(opts.normalWeight, 0, 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!core[i]) continue;
      let best = 0;
      for (const [dy, dx] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (!opaque[ni]) continue;

        const dDepth = Math.abs(depthWorld[i] - depthWorld[ni]);
        const depthResp =
          softThresholdResponse(
            dDepth,
            opts.depthThreshold,
            opts.softness,
            opts.thresholdGamma,
          ) * depthW;

        const ax = normals[i * 3];
        const ay = normals[i * 3 + 1];
        const az = normals[i * 3 + 2];
        const bx = normals[ni * 3];
        const by = normals[ni * 3 + 1];
        const bz = normals[ni * 3 + 2];
        const dot = clamp(ax * bx + ay * by + az * bz, -1, 1);
        const angleDeg = (Math.acos(dot) * 180) / Math.PI;
        const normalResp =
          softThresholdResponse(
            angleDeg,
            opts.normalThresholdDeg,
            opts.softness,
            opts.thresholdGamma,
          ) * normalW;

        best = Math.max(best, depthResp, normalResp);
      }
      edges[i] = best;
    }
  }
  return edges;
}

/**
 * Dilate / blur the strength field then composite with opacity over existing pixels.
 * Soft blends leave intermediate RGBs off-palette — when `paletteColors` is set,
 * the edge hex and every painted pixel are snapped to the nearest palette entry
 * so the final bake stays Endesga-locked (same contract as post-quantize outlines).
 */
export function applyEdgeMask(
  data: ImageData,
  edges: Float32Array,
  edgeHex: string,
  opacity = 1,
  dilate = 0,
  blur = 0,
  paletteColors?: string[],
): ImageData {
  const w = data.width;
  const h = data.height;
  let field = edges;
  field = dilateStrength(field, w, h, Math.round(dilate));
  field = blurStrength(field, w, h, Math.round(blur));
  const paletteRgb = paletteColors?.length
    ? paletteColors.map(hexToRgb)
    : undefined;
  let [or, og, ob] = hexToRgb(edgeHex);
  if (paletteRgb) {
    [or, og, ob] = nearestPaletteColor(or, og, ob, paletteRgb);
  }
  const px = data.data;
  const op = clamp(opacity, 0, 1);
  for (let i = 0; i < field.length; i++) {
    const strength = field[i] * op;
    if (strength <= 0.02) continue;
    const o = i * 4;
    const a = px[o + 3] / 255;
    if (a < 0.02) continue;
    const t = clamp(strength, 0, 1);
    let r = Math.round(px[o] * (1 - t) + or * t);
    let g = Math.round(px[o + 1] * (1 - t) + og * t);
    let b = Math.round(px[o + 2] * (1 - t) + ob * t);
    if (paletteRgb) {
      [r, g, b] = nearestPaletteColor(r, g, b, paletteRgb);
    }
    px[o] = r;
    px[o + 1] = g;
    px[o + 2] = b;
    px[o + 3] = 255;
  }
  return data;
}
