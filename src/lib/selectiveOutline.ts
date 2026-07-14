import {
  applyPartOutline,
  DEFAULT_OUTLINE_COLORS,
  DEFAULT_OUTLINE_PASS,
  hexToRgb,
  nearestPaletteColor,
  normalizePaletteHex,
  type OutlineColors,
  type OutlinePassSettings,
} from "./palette";

/**
 * Selective / tinted outline (sel-out) for the pixel bake.
 *
 * Softens the harsh fixed-indigo rim by:
 * 1. **Darker-of-adjacent** — outline colour is a darkened tint of the
 *    neighbouring body pixel(s), snapped back to Endesga.
 * 2. **Lit-side thinning** — rim pixels whose outward normal faces the
 *    light are lightened and, when `litThin` is high, dropped entirely so
 *    the silhouette reads softer without losing the shadow-side lock.
 *
 * Tuned for 42–48px: keep default `litThin` moderate so the contour does
 * not dissolve into the transparent background.
 */

export type SelectiveOutlineSettings = {
  enabled: boolean;
  /**
   * 0 = keep the fixed silhouette/seam hex; 1 = fully darker-of-adjacent.
   */
  tintStrength: number;
  /** How hard to crush adjacent body colour toward black (0–1). */
  darken: number;
  /**
   * 0 = no lit-side change; 1 = fully drop outline where the rim faces light.
   * Mid values lighten only.
   */
  litThin: number;
  /**
   * Light direction in image space (degrees): 0 = +X (right), 90 = up.
   * Default 135 ≈ top-left, matching the iso key-light bias.
   */
  lightAngleDeg: number;
  /** Apply the same tint (no lit thinning) to part-seam pixels. */
  applyToSeams: boolean;
};

export const SEL_OUT_TINT_MIN = 0;
export const SEL_OUT_TINT_MAX = 1;
export const SEL_OUT_TINT_STEP = 0.05;
export const SEL_OUT_DARKEN_MIN = 0;
export const SEL_OUT_DARKEN_MAX = 0.85;
export const SEL_OUT_DARKEN_STEP = 0.05;
export const SEL_OUT_LIT_MIN = 0;
export const SEL_OUT_LIT_MAX = 1;
export const SEL_OUT_LIT_STEP = 0.05;
export const SEL_OUT_ANGLE_MIN = 0;
export const SEL_OUT_ANGLE_MAX = 360;
export const SEL_OUT_ANGLE_STEP = 5;

export const DEFAULT_SELECTIVE_OUTLINE: SelectiveOutlineSettings = {
  enabled: false,
  tintStrength: 0.8,
  darken: 0.38,
  litThin: 0.45,
  lightAngleDeg: 135,
  applyToSeams: true,
};

const STORAGE_KEY = "3d-sprite-gen:selective-outline-v1";

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function normalizeSelectiveOutline(
  raw: Partial<SelectiveOutlineSettings>,
): SelectiveOutlineSettings {
  return {
    enabled: raw.enabled === true,
    tintStrength: clamp(
      Number(raw.tintStrength ?? DEFAULT_SELECTIVE_OUTLINE.tintStrength),
      SEL_OUT_TINT_MIN,
      SEL_OUT_TINT_MAX,
    ),
    darken: clamp(
      Number(raw.darken ?? DEFAULT_SELECTIVE_OUTLINE.darken),
      SEL_OUT_DARKEN_MIN,
      SEL_OUT_DARKEN_MAX,
    ),
    litThin: clamp(
      Number(raw.litThin ?? DEFAULT_SELECTIVE_OUTLINE.litThin),
      SEL_OUT_LIT_MIN,
      SEL_OUT_LIT_MAX,
    ),
    lightAngleDeg:
      ((Number(raw.lightAngleDeg ?? DEFAULT_SELECTIVE_OUTLINE.lightAngleDeg) %
        360) +
        360) %
      360,
    applyToSeams: raw.applyToSeams !== false,
  };
}

export function loadSelectiveOutline(): SelectiveOutlineSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SELECTIVE_OUTLINE };
    return normalizeSelectiveOutline(JSON.parse(raw) as Partial<SelectiveOutlineSettings>);
  } catch {
    return { ...DEFAULT_SELECTIVE_OUTLINE };
  }
}

export function saveSelectiveOutline(settings: SelectiveOutlineSettings) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizeSelectiveOutline(settings)),
  );
}

function luma(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function lightDir(angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  // 0° → +X (right), 90° → up (−Y in image space).
  return [Math.cos(rad), -Math.sin(rad)];
}

type Rgb = [number, number, number];

/**
 * Resolve a selective outline colour for one rim/seam pixel.
 * Returns null when lit-side thinning drops the pixel entirely.
 */
export function resolveSelectiveOutlineColor(opts: {
  settings: SelectiveOutlineSettings;
  fixedHex: string;
  /** Opaque neighbour colours (cardinal). */
  adjacent: Rgb[];
  /** Outward unit-ish direction from body into this empty/seam pixel. */
  outwardX: number;
  outwardY: number;
  /** Precomputed Endesga RGB tuples (avoids per-pixel hex parsing). */
  paletteRgb: Rgb[];
  /** Seams never fully thin — only tint. */
  allowThin: boolean;
}): Rgb | null {
  const { settings, fixedHex, adjacent, outwardX, outwardY, paletteRgb, allowThin } =
    opts;
  const [fr, fg, fb] = hexToRgb(fixedHex);

  if (!settings.enabled || adjacent.length === 0) {
    return [fr, fg, fb];
  }

  let darkest = adjacent[0]!;
  let darkestL = luma(...darkest);
  for (let i = 1; i < adjacent.length; i++) {
    const c = adjacent[i]!;
    const L = luma(...c);
    if (L < darkestL) {
      darkest = c;
      darkestL = L;
    }
  }

  const [lx, ly] = lightDir(settings.lightAngleDeg);
  const olen = Math.hypot(outwardX, outwardY) || 1;
  const ox = outwardX / olen;
  const oy = outwardY / olen;
  const facing = Math.max(0, ox * lx + oy * ly);
  const litAmount = facing * settings.litThin;

  // Drop strongly lit silhouette pixels when thinning is aggressive.
  if (allowThin && litAmount >= 0.72) {
    return null;
  }

  // Lit faces keep more of the body tone (less crush-to-black).
  const effectiveDarken = settings.darken * (1 - litAmount * 0.85);
  let tr = darkest[0] * (1 - effectiveDarken);
  let tg = darkest[1] * (1 - effectiveDarken);
  let tb = darkest[2] * (1 - effectiveDarken);

  // Pull toward a mid-tone of the body on the lit side (classic sel-out).
  if (litAmount > 0.05) {
    const lift = litAmount * 0.55;
    tr = tr + (darkest[0] - tr) * lift;
    tg = tg + (darkest[1] - tg) * lift;
    tb = tb + (darkest[2] - tb) * lift;
  }

  const t = settings.tintStrength;
  const mixed: Rgb = [
    fr + (tr - fr) * t,
    fg + (tg - fg) * t,
    fb + (tb - fb) * t,
  ];

  return nearestPaletteColor(mixed[0], mixed[1], mixed[2], paletteRgb);
}

const NEIGHBORS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
] as const;

/**
 * Outline pass with optional sel-out tinting. Falls through to the fixed
 * indigo/swatch path when selective outlining is disabled.
 */
export function applySelectivePartOutline(
  data: ImageData,
  colors: OutlineColors = DEFAULT_OUTLINE_COLORS,
  idBuffer?: Uint8Array | Uint8ClampedArray,
  decodePixel?: (r: number, g: number, b: number, a: number) => number,
  pass: OutlinePassSettings = DEFAULT_OUTLINE_PASS,
  selective: SelectiveOutlineSettings = DEFAULT_SELECTIVE_OUTLINE,
  paletteColors: string[] = [],
): ImageData {
  if (!selective.enabled || paletteColors.length === 0) {
    return applyPartOutline(data, colors, idBuffer, decodePixel, pass);
  }
  if (!pass.silhouette && !pass.partSeams) return data;

  const { width: w, height: h, data: px } = data;
  const [pr, pg, pb] = hexToRgb(colors.partSeams);
  const paletteRgb = paletteColors.map(
    (c) => hexToRgb(normalizePaletteHex(c)) as Rgb,
  );
  const opaque = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    opaque[i] = px[i * 4 + 3] >= 8 ? 1 : 0;
  }

  const wantSeams = pass.partSeams && !!idBuffer && !!decodePixel;
  const partId = new Int16Array(w * h).fill(0);
  if (wantSeams) {
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      partId[i] = decodePixel!(
        idBuffer![o]!,
        idBuffer![o + 1]!,
        idBuffer![o + 2]!,
        idBuffer![o + 3]!,
      );
    }
  }

  const silhouettePixels: number[] = [];
  const seamPixels: number[] = [];

  if (pass.silhouette) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (opaque[i]) continue;
        for (const [dy, dx] of NEIGHBORS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (opaque[ny * w + nx]) {
            silhouettePixels.push(i);
            break;
          }
        }
      }
    }
  }

  if (wantSeams) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!opaque[i] || partId[i]! <= 0) continue;
        for (const [dy, dx] of NEIGHBORS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (!opaque[ni] || partId[ni]! <= 0) continue;
          if (partId[ni]! !== partId[i]! && partId[i]! < partId[ni]!) {
            seamPixels.push(i);
            break;
          }
        }
      }
    }
  }

  for (const i of silhouettePixels) {
    const x = i % w;
    const y = (i / w) | 0;
    const adjacent: Rgb[] = [];
    let ox = 0;
    let oy = 0;
    for (const [dy, dx] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (!opaque[ni]) continue;
      const no = ni * 4;
      adjacent.push([px[no]!, px[no + 1]!, px[no + 2]!]);
      // Neighbor dx/dy points body→empty? Neighbor is at (x+dx)? No:
      // neighbor is at (x+dx, y+dy), rim is at (x,y). Body→rim = (-dx, -dy).
      ox += -dx;
      oy += -dy;
    }
    const rgb = resolveSelectiveOutlineColor({
      settings: selective,
      fixedHex: colors.silhouette,
      adjacent,
      outwardX: ox,
      outwardY: oy,
      paletteRgb,
      allowThin: true,
    });
    if (!rgb) continue;
    const o = i * 4;
    px[o] = rgb[0];
    px[o + 1] = rgb[1];
    px[o + 2] = rgb[2];
    px[o + 3] = 255;
  }

  for (const i of seamPixels) {
    const o = i * 4;
    if (!selective.applyToSeams) {
      px[o] = pr;
      px[o + 1] = pg;
      px[o + 2] = pb;
      px[o + 3] = 255;
      continue;
    }
    const x = i % w;
    const y = (i / w) | 0;
    const adjacent: Rgb[] = [];
    let ox = 0;
    let oy = 0;
    const selfId = partId[i]!;
    for (const [dy, dx] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (!opaque[ni]) continue;
      const no = ni * 4;
      adjacent.push([px[no]!, px[no + 1]!, px[no + 2]!]);
      if (partId[ni]! !== selfId) {
        ox += dx;
        oy += dy;
      }
    }
    adjacent.push([px[o]!, px[o + 1]!, px[o + 2]!]);
    const rgb = resolveSelectiveOutlineColor({
      settings: selective,
      fixedHex: colors.partSeams,
      adjacent,
      outwardX: ox,
      outwardY: oy,
      paletteRgb,
      allowThin: false,
    });
    if (!rgb) continue;
    px[o] = rgb[0];
    px[o + 1] = rgb[1];
    px[o + 2] = rgb[2];
    px[o + 3] = 255;
  }

  return data;
}
