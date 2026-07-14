import {
  DEFAULT_OUTLINE_HEX,
  hexToRgb,
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
 * See docs/SPIKE-depth-normal-edges.md for the full write-up and tuning notes.
 */

export type EdgeDetectOptions = {
  /** World-space (view-axis) depth delta above which a cardinal edge fires. */
  depthThreshold: number;
  /** Normal angle delta between cardinal neighbours (degrees) above which a cardinal edge fires. */
  normalThresholdDeg: number;
};

/** Slider / clamp bounds — higher threshold = fewer, more selective edges. */
export const EDGE_DEPTH_MIN = 0.01;
export const EDGE_DEPTH_MAX = 0.5;
export const EDGE_DEPTH_STEP = 0.01;
export const EDGE_NORMAL_MIN = 5;
export const EDGE_NORMAL_MAX = 99;
export const EDGE_NORMAL_STEP = 1;

/**
 * Defaults tuned by eye against the ~2.1-unit-tall chibi rig at 48px.
 * Raised above the old 0.15 / 60° pair: at bake resolution curved surfaces
 * routinely exceed those, so the usable "few edges" range sat past the old
 * slider caps (0.30 depth / 90° normal).
 */
export const DEFAULT_EDGE_OPTIONS: EdgeDetectOptions = {
  depthThreshold: 0.28,
  normalThresholdDeg: 75,
};

export type EdgeOutlineSettings = EdgeDetectOptions & {
  enabled: boolean;
  /** Endesga hex (no #) for depth/normal crease pixels — independent of silhouette outline. */
  color: string;
};

/** Matches the previous shared outline default so enabling edges doesn't jump colour. */
export const DEFAULT_EDGE_OUTLINE_SETTINGS: EdgeOutlineSettings = {
  enabled: false,
  color: DEFAULT_OUTLINE_HEX,
  ...DEFAULT_EDGE_OPTIONS,
};

/** v2: wider depth/normal ranges + more selective defaults. */
const EDGE_OUTLINE_STORAGE_KEY = "3d-sprite-gen:edge-outline-v2";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function loadEdgeOutlineSettings(
  paletteColors?: string[],
): EdgeOutlineSettings {
  const fallback = { ...DEFAULT_EDGE_OUTLINE_SETTINGS };
  try {
    const raw = localStorage.getItem(EDGE_OUTLINE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<EdgeOutlineSettings>;
    let color =
      typeof parsed.color === "string"
        ? normalizePaletteHex(parsed.color)
        : fallback.color;
    if (!/^[0-9a-f]{6}$/.test(color)) color = fallback.color;
    if (
      paletteColors?.length &&
      !paletteColors.some((c) => normalizePaletteHex(c) === color)
    ) {
      color = fallback.color;
    }
    return {
      enabled: parsed.enabled === true,
      color,
      depthThreshold:
        typeof parsed.depthThreshold === "number" &&
        Number.isFinite(parsed.depthThreshold)
          ? clamp(parsed.depthThreshold, EDGE_DEPTH_MIN, EDGE_DEPTH_MAX)
          : fallback.depthThreshold,
      normalThresholdDeg:
        typeof parsed.normalThresholdDeg === "number" &&
        Number.isFinite(parsed.normalThresholdDeg)
          ? clamp(
              parsed.normalThresholdDeg,
              EDGE_NORMAL_MIN,
              EDGE_NORMAL_MAX,
            )
          : fallback.normalThresholdDeg,
    };
  } catch {
    return fallback;
  }
}

export function saveEdgeOutlineSettings(settings: EdgeOutlineSettings) {
  localStorage.setItem(
    EDGE_OUTLINE_STORAGE_KEY,
    JSON.stringify({
      enabled: settings.enabled,
      color: normalizePaletteHex(settings.color),
      depthThreshold: settings.depthThreshold,
      normalThresholdDeg: settings.normalThresholdDeg,
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
 * Cardinal-neighbour depth+normal discontinuity edge mask, restricted to
 * pixel pairs that are both inside the silhouette. The outer silhouette rim
 * is already handled by `applyPixelOutline`; this pass is for the *interior*
 * creases that a pure alpha-silhouette outline can never see (e.g. an arm
 * resting in front of the torso, at the same screen-space alpha). Candidate
 * pixels are further restricted to the eroded "core" mask (see `erodeMask`)
 * so smooth silhouette-edge foreshortening doesn't fire on its own.
 *
 * Each firing pixel is marked (not just the "far" side), so creases render
 * as a ~1-2px line — cheap and matches the chunky look of the rest of the
 * palette-locked bake.
 */
export function detectDepthNormalEdges(
  opaque: Uint8Array,
  depthWorld: Float32Array,
  normals: Float32Array,
  w: number,
  h: number,
  opts: EdgeDetectOptions,
): Uint8Array {
  const edges = new Uint8Array(w * h);
  const core = erodeMask(opaque, w, h);
  const cosThreshold = Math.cos((opts.normalThresholdDeg * Math.PI) / 180);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!core[i]) continue;
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
        if (dDepth > opts.depthThreshold) {
          edges[i] = 1;
          break;
        }

        const ax = normals[i * 3];
        const ay = normals[i * 3 + 1];
        const az = normals[i * 3 + 2];
        const bx = normals[ni * 3];
        const by = normals[ni * 3 + 1];
        const bz = normals[ni * 3 + 2];
        const dot = ax * bx + ay * by + az * bz;
        if (dot < cosThreshold) {
          edges[i] = 1;
          break;
        }
      }
    }
  }
  return edges;
}

/** Composite an edge mask as solid 1px edge colour, in place. */
export function applyEdgeMask(
  data: ImageData,
  edges: Uint8Array,
  edgeHex: string,
): ImageData {
  const [or, og, ob] = hexToRgb(edgeHex);
  const px = data.data;
  for (let i = 0; i < edges.length; i++) {
    if (!edges[i]) continue;
    const o = i * 4;
    px[o] = or;
    px[o + 1] = og;
    px[o + 2] = ob;
    px[o + 3] = 255;
  }
  return data;
}
