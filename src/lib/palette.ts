/** ENDESGA-64 — bundled so palette lock works offline (Lospec). */
export type Palette = {
  name: string;
  author: string;
  colors: string[];
};

export type SpriteSize = 32 | 42 | 48 | 64;

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function nearestPaletteColor(
  r: number,
  g: number,
  b: number,
  paletteRgb: [number, number, number][],
): [number, number, number] {
  let best = paletteRgb[0];
  let bestDist = Infinity;
  for (const c of paletteRgb) {
    const dr = r - c[0];
    const dg = g - c[1];
    const db = b - c[2];
    const d = dr * dr + dg * dg + db * db;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/** Quantize ImageData in place; preserve fully transparent pixels. */
export function quantizeImageData(
  data: ImageData,
  colors: string[],
): ImageData {
  const paletteRgb = colors.map(hexToRgb);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) {
      px[i] = 0;
      px[i + 1] = 0;
      px[i + 2] = 0;
      px[i + 3] = 0;
      continue;
    }
    const [nr, ng, nb] = nearestPaletteColor(px[i], px[i + 1], px[i + 2], paletteRgb);
    px[i] = nr;
    px[i + 1] = ng;
    px[i + 2] = nb;
    px[i + 3] = 255;
  }
  return data;
}

/** Default bake outline — Endesga deep indigo (nearest classic near-black rim). */
export const DEFAULT_OUTLINE_HEX = "1a1932";

/** Per-pass outline colours (silhouette rim vs internal part seams). */
export type OutlineColors = {
  silhouette: string;
  partSeams: string;
};

export const DEFAULT_OUTLINE_COLORS: OutlineColors = {
  silhouette: DEFAULT_OUTLINE_HEX,
  partSeams: DEFAULT_OUTLINE_HEX,
};

const OUTLINE_COLORS_STORAGE_KEY = "3d-sprite-gen:outline-colors-v1";
/** Pre-split storage — migrated once into both colours when v1 is absent. */
const OUTLINE_HEX_LEGACY_KEY = "3d-sprite-gen:outline-hex";

export function normalizePaletteHex(hex: string): string {
  return hex.replace("#", "").toLowerCase();
}

function sanitizeOutlineHex(raw: string, paletteColors?: string[]): string | null {
  const hex = normalizePaletteHex(raw);
  if (!/^[0-9a-f]{6}$/.test(hex)) return null;
  if (paletteColors?.length && !paletteColors.some((c) => normalizePaletteHex(c) === hex)) {
    return null;
  }
  return hex;
}

export function loadOutlineColors(paletteColors?: string[]): OutlineColors {
  const fallback = { ...DEFAULT_OUTLINE_COLORS };
  try {
    const raw = localStorage.getItem(OUTLINE_COLORS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OutlineColors>;
      return {
        silhouette:
          (typeof parsed.silhouette === "string" &&
            sanitizeOutlineHex(parsed.silhouette, paletteColors)) ||
          fallback.silhouette,
        partSeams:
          (typeof parsed.partSeams === "string" &&
            sanitizeOutlineHex(parsed.partSeams, paletteColors)) ||
          fallback.partSeams,
      };
    }
    const legacy = localStorage.getItem(OUTLINE_HEX_LEGACY_KEY);
    if (legacy) {
      const hex = sanitizeOutlineHex(legacy, paletteColors) ?? fallback.silhouette;
      return { silhouette: hex, partSeams: hex };
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function saveOutlineColors(colors: OutlineColors) {
  localStorage.setItem(
    OUTLINE_COLORS_STORAGE_KEY,
    JSON.stringify({
      silhouette: normalizePaletteHex(colors.silhouette),
      partSeams: normalizePaletteHex(colors.partSeams),
    }),
  );
}

/** Which outline passes run after palette quantize. */
export type OutlinePassSettings = {
  /** Outer 1px ring (transparent touching opaque). */
  silhouette: boolean;
  /** Internal seams between part groups (needs an ID pass). */
  partSeams: boolean;
};

export const DEFAULT_OUTLINE_PASS: OutlinePassSettings = {
  silhouette: true,
  partSeams: true,
};

const OUTLINE_PASS_STORAGE_KEY = "3d-sprite-gen:outline-pass-v1";

export function loadOutlinePassSettings(): OutlinePassSettings {
  try {
    const raw = localStorage.getItem(OUTLINE_PASS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OUTLINE_PASS };
    const parsed = JSON.parse(raw) as Partial<OutlinePassSettings>;
    return {
      silhouette: parsed.silhouette !== false,
      partSeams: parsed.partSeams !== false,
    };
  } catch {
    return { ...DEFAULT_OUTLINE_PASS };
  }
}

export function saveOutlinePassSettings(settings: OutlinePassSettings) {
  localStorage.setItem(OUTLINE_PASS_STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Single-pixel outline: every empty neighbour of an opaque pixel becomes outline.
 * Runs after quantize so the rim is one solid palette colour.
 */
export function applyPixelOutline(
  data: ImageData,
  outlineHex = DEFAULT_OUTLINE_HEX,
): ImageData {
  const { width: w, height: h, data: px } = data;
  const [or, og, ob] = hexToRgb(outlineHex);
  const opaque = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    opaque[i] = px[i * 4 + 3] >= 8 ? 1 : 0;
  }
  const ring: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (opaque[i]) continue;
      let next = false;
      for (const [dy, dx] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (opaque[ny * w + nx]) {
          next = true;
          break;
        }
      }
      if (next) ring.push(i);
    }
  }
  for (const i of ring) {
    const o = i * 4;
    px[o] = or;
    px[o + 1] = og;
    px[o + 2] = ob;
    px[o + 3] = 255;
  }
  return data;
}

/**
 * Single-pixel outline that also draws seams between differently-tagged
 * part groups, not just the outer silhouette. `idBuffer` is an RGBA byte
 * buffer at the same size/orientation as `data`, produced by
 * `renderPartGroupBuffer` + decoded per-pixel with `decodePartGroupPixel`.
 * Falls back to silhouette-only outlining when `idBuffer` is omitted.
 * Silhouette rim and part seams each use their own palette hex.
 */
export function applyPartOutline(
  data: ImageData,
  colors: OutlineColors = DEFAULT_OUTLINE_COLORS,
  idBuffer?: Uint8Array | Uint8ClampedArray,
  decodePixel?: (r: number, g: number, b: number, a: number) => number,
  pass: OutlinePassSettings = DEFAULT_OUTLINE_PASS,
): ImageData {
  if (!pass.silhouette && !pass.partSeams) return data;

  const { width: w, height: h, data: px } = data;
  const [sr, sg, sb] = hexToRgb(colors.silhouette);
  const [pr, pg, pb] = hexToRgb(colors.partSeams);
  const opaque = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    opaque[i] = px[i * 4 + 3] >= 8 ? 1 : 0;
  }

  const wantSeams = pass.partSeams && !!idBuffer && !!decodePixel;
  const partId = new Int16Array(w * h).fill(0);
  if (wantSeams) {
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      partId[i] = decodePixel!(idBuffer![o]!, idBuffer![o + 1]!, idBuffer![o + 2]!, idBuffer![o + 3]!);
    }
  }

  const NEIGHBORS = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const;
  const silhouettePixels = new Set<number>();
  const seamPixels = new Set<number>();

  // Outer silhouette: transparent pixel touching an opaque one grows the ring.
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
            silhouettePixels.add(i);
            break;
          }
        }
      }
    }
  }

  // Internal seams: opaque pixel bordering an opaque pixel from a different
  // part. Only the lower-id side is repainted so a seam stays 1px wide
  // instead of 2px (one line drawn on each side of the boundary).
  if (wantSeams) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!opaque[i] || partId[i] <= 0) continue;
        for (const [dy, dx] of NEIGHBORS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (!opaque[ni] || partId[ni] <= 0) continue;
          if (partId[ni] !== partId[i] && partId[i] < partId[ni]) {
            seamPixels.add(i);
            break;
          }
        }
      }
    }
  }

  for (const i of silhouettePixels) {
    const o = i * 4;
    px[o] = sr;
    px[o + 1] = sg;
    px[o + 2] = sb;
    px[o + 3] = 255;
  }
  for (const i of seamPixels) {
    const o = i * 4;
    px[o] = pr;
    px[o + 1] = pg;
    px[o + 2] = pb;
    px[o + 3] = 255;
  }
  return data;
}

export async function loadPalette(slug = "endesga-64"): Promise<Palette> {
  const res = await fetch(`/${slug}.json`);
  if (!res.ok) throw new Error(`palette ${slug} not found`);
  return res.json() as Promise<Palette>;
}
