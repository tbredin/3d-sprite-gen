import { useEffect, useRef } from "react";
import type { CharacterSpec, PartVisibility } from "../lib/chibi";
import {
  bakeCharacter2D,
  type IsoDir2D,
} from "../lib/chibi2d";
import type { BayerDitherSettings, SpriteSize } from "../lib/palette";

export type Sprite2DCanvasProps = {
  size: SpriteSize;
  colors: string[];
  facing: IsoDir2D;
  spec: CharacterSpec;
  bodyScale: number;
  bodyY?: number;
  mirror?: boolean;
  partVisibility?: PartVisibility;
  displayPx: number;
  silhouetteOutlineHex?: string;
  outlineSilhouette?: boolean;
  bayerDither?: BayerDitherSettings | null;
  onCaptured?: (dataUrl: string) => void;
  onSourceCaptured?: (dataUrl: string) => void;
};

/**
 * Pure Canvas2D isometric chibi preview. Re-bakes whenever spec / facing /
 * size / palette knobs change — same CharacterSpec as the 3D path.
 */
export function Sprite2DCanvas({
  size,
  colors,
  facing,
  spec,
  bodyScale,
  bodyY = 0,
  mirror = false,
  partVisibility,
  displayPx,
  silhouetteOutlineHex,
  outlineSilhouette = true,
  bayerDither = null,
  onCaptured,
  onSourceCaptured,
}: Sprite2DCanvasProps) {
  const displayRef = useRef<HTMLCanvasElement>(null);
  const onCapturedRef = useRef(onCaptured);
  const onSourceCapturedRef = useRef(onSourceCaptured);
  onCapturedRef.current = onCaptured;
  onSourceCapturedRef.current = onSourceCaptured;

  useEffect(() => {
    const display = displayRef.current;
    if (!display || colors.length === 0) return;

    const { sourceDataUrl, bakedDataUrl } = bakeCharacter2D(spec, {
      facing,
      size,
      bodyScale,
      bodyY,
      mirror,
      partVisibility,
      colors,
      silhouetteOutlineHex,
      outlineSilhouette,
      bayerDither,
    });

    onSourceCapturedRef.current?.(sourceDataUrl);
    onCapturedRef.current?.(bakedDataUrl);

    const img = new Image();
    img.onload = () => {
      display.width = displayPx;
      display.height = displayPx;
      const g = display.getContext("2d");
      if (!g) return;
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, displayPx, displayPx);
      g.drawImage(img, 0, 0, displayPx, displayPx);
    };
    img.src = bakedDataUrl;
  }, [
    size,
    colors,
    facing,
    spec,
    bodyScale,
    bodyY,
    mirror,
    partVisibility,
    displayPx,
    silhouetteOutlineHex,
    outlineSilhouette,
    bayerDither,
  ]);

  return (
    <canvas
      ref={displayRef}
      className="sprite-2d-canvas"
      width={displayPx}
      height={displayPx}
      style={{ width: displayPx, height: displayPx, imageRendering: "pixelated" }}
    />
  );
}
