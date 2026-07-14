/** ENDESGA-64 — bundled so palette lock works offline (Lospec). */
export type Palette = {
  name: string;
  author: string;
  colors: string[];
};

export type SpriteSize = 32 | 48 | 64;

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

const OUTLINE_STORAGE_KEY = "3d-sprite-gen:outline-hex";

export function normalizePaletteHex(hex: string): string {
  return hex.replace("#", "").toLowerCase();
}

export function loadOutlineHex(paletteColors?: string[]): string {
  const fallback = DEFAULT_OUTLINE_HEX;
  try {
    const raw = localStorage.getItem(OUTLINE_STORAGE_KEY);
    if (!raw) return fallback;
    const hex = normalizePaletteHex(raw);
    if (!/^[0-9a-f]{6}$/.test(hex)) return fallback;
    if (paletteColors?.length && !paletteColors.some((c) => normalizePaletteHex(c) === hex)) {
      return fallback;
    }
    return hex;
  } catch {
    return fallback;
  }
}

export function saveOutlineHex(hex: string) {
  localStorage.setItem(OUTLINE_STORAGE_KEY, normalizePaletteHex(hex));
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
 */
export function applyPartOutline(
  data: ImageData,
  outlineHex = DEFAULT_OUTLINE_HEX,
  idBuffer?: Uint8Array | Uint8ClampedArray,
  decodePixel?: (r: number, g: number, b: number, a: number) => number,
): ImageData {
  const { width: w, height: h, data: px } = data;
  const [or, og, ob] = hexToRgb(outlineHex);
  const opaque = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    opaque[i] = px[i * 4 + 3] >= 8 ? 1 : 0;
  }

  const partId = new Int16Array(w * h).fill(0);
  if (idBuffer && decodePixel) {
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      partId[i] = decodePixel(idBuffer[o]!, idBuffer[o + 1]!, idBuffer[o + 2]!, idBuffer[o + 3]!);
    }
  }

  const NEIGHBORS = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const;
  const outlinePixels = new Set<number>();

  // Outer silhouette: transparent pixel touching an opaque one grows the ring.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (opaque[i]) continue;
      for (const [dy, dx] of NEIGHBORS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (opaque[ny * w + nx]) {
          outlinePixels.add(i);
          break;
        }
      }
    }
  }

  // Internal seams: opaque pixel bordering an opaque pixel from a different
  // part. Only the lower-id side is repainted so a seam stays 1px wide
  // instead of 2px (one line drawn on each side of the boundary).
  if (idBuffer && decodePixel) {
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
            outlinePixels.add(i);
            break;
          }
        }
      }
    }
  }

  for (const i of outlinePixels) {
    const o = i * 4;
    px[o] = or;
    px[o + 1] = og;
    px[o + 2] = ob;
    px[o + 3] = 255;
  }
  return data;
}

export async function loadPalette(slug = "endesga-64"): Promise<Palette> {
  const res = await fetch(`/${slug}.json`);
  if (!res.ok) throw new Error(`palette ${slug} not found`);
  return res.json() as Promise<Palette>;
}
