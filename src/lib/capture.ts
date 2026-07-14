import type { WebGLRenderer } from "three";
import { quantizeImageData } from "./palette";

export type CaptureOptions = {
  size: number;
  colors: string[];
  /** CSS colour for clear; use null for transparent. */
  clearAlpha?: number;
};

/**
 * Capture the current WebGL canvas at `size`×`size`, palette-quantize,
 * return a transparent PNG data URL.
 */
export function capturePixelSprite(
  renderer: WebGLRenderer,
  opts: CaptureOptions,
): string {
  const { size, colors } = opts;
  const canvas = renderer.domElement;
  const src = document.createElement("canvas");
  src.width = canvas.width;
  src.height = canvas.height;
  const sctx = src.getContext("2d", { willReadFrequently: true });
  if (!sctx) throw new Error("2d context unavailable");
  sctx.drawImage(canvas, 0, 0);

  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const octx = out.getContext("2d", { willReadFrequently: true });
  if (!octx) throw new Error("2d context unavailable");
  octx.imageSmoothingEnabled = false;
  octx.clearRect(0, 0, size, size);
  octx.drawImage(src, 0, 0, size, size);

  const imageData = octx.getImageData(0, 0, size, size);
  quantizeImageData(imageData, colors);
  octx.putImageData(imageData, 0, 0);
  return out.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
