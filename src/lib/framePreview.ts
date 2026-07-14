/** Match server `image_prep.detect_cell_size` for instant client preview. */

const CELL_CANDIDATES = [64, 48, 32] as const;

export function detectCellSize(
  width: number,
  height: number,
): { cell: number; sheet: boolean } {
  if (width === height && (CELL_CANDIDATES as readonly number[]).includes(width)) {
    return { cell: width, sheet: false };
  }

  for (const size of CELL_CANDIDATES) {
    if (width % size === 0 && height % size === 0) {
      const cells = (width / size) * (height / size);
      if (cells >= 2) return { cell: size, sheet: true };
    }
  }

  const short = Math.min(width, height);
  for (const size of CELL_CANDIDATES) {
    if (size <= short && (width > size || height > size)) {
      return { cell: size, sheet: true };
    }
  }

  return { cell: short, sheet: false };
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not decode image"));
    };
    img.src = url;
  });
}

/** Crop top-left cell (if sheet) and return a blob URL for preview. */
export async function previewTripoFrame(file: Blob): Promise<string> {
  const img = await loadImage(file);
  const { cell, sheet } = detectCellSize(img.naturalWidth, img.naturalHeight);
  const w = sheet ? Math.min(cell, img.naturalWidth) : img.naturalWidth;
  const h = sheet ? Math.min(cell, img.naturalHeight) : img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h, 0, 0, w, h);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("preview blob failed"))),
      "image/png",
    );
  });
  return URL.createObjectURL(blob);
}
