import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  NearestFilter,
  OrthographicCamera,
  RGBAFormat,
  UnsignedByteType,
  WebGLRenderTarget,
} from "three";
import { placeIsoCamera } from "../lib/isoCamera";
import { ChibiCharacter } from "./ChibiCharacter";
import { downloadDataUrl } from "../lib/capture";
import {
  applyPixelOutline,
  quantizeImageData,
  type SpriteSize,
} from "../lib/palette";
import type { CharacterSpec } from "../lib/chibi";

type BakeProps = {
  size: SpriteSize;
  colors: string[];
  zoom: number;
  rotationX: number;
  rotationY: number;
  spec: CharacterSpec;
  captureRequest: number;
  onCaptured: (dataUrl: string) => void;
  /** CSS display size (NN upscale of the native size×size buffer). */
  displayPx?: number;
};

function BakeCapture({
  size,
  colors,
  zoom,
  captureRequest,
  onCaptured,
}: {
  size: SpriteSize;
  colors: string[];
  zoom: number;
  captureRequest: number;
  onCaptured: (dataUrl: string) => void;
}) {
  const { gl, scene } = useThree();
  const last = useRef(0);
  const target = useMemo(
    () =>
      new WebGLRenderTarget(size, size, {
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        format: RGBAFormat,
        type: UnsignedByteType,
        generateMipmaps: false,
      }),
    [size],
  );
  const bakeCam = useMemo(() => new OrthographicCamera(), []);

  useEffect(() => () => target.dispose(), [target]);

  useEffect(() => {
    if (captureRequest === 0 || captureRequest === last.current) return;
    last.current = captureRequest;

    target.setSize(size, size);
    placeIsoCamera(bakeCam, 1, zoom);

    const prev = gl.getRenderTarget();
    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    gl.render(scene, bakeCam);
    gl.setRenderTarget(prev);

    const buffer = new Uint8Array(size * size * 4);
    gl.readRenderTargetPixels(target, 0, 0, size, size, buffer);

    const flipped = new Uint8ClampedArray(size * size * 4);
    const row = size * 4;
    for (let y = 0; y < size; y++) {
      const src = (size - 1 - y) * row;
      flipped.set(buffer.subarray(src, src + row), y * row);
    }

    const imageData = new ImageData(flipped, size, size);
    quantizeImageData(imageData, colors);
    applyPixelOutline(imageData);

    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    const ctx = out.getContext("2d")!;
    ctx.putImageData(imageData, 0, 0);
    onCaptured(out.toDataURL("image/png"));
  }, [
    captureRequest,
    gl,
    scene,
    size,
    colors,
    zoom,
    target,
    bakeCam,
    onCaptured,
  ]);

  return null;
}

/**
 * Force square 1:1 aspect for the locked iso camera so a zero/odd
 * ResizeObserver reading can't collapse the ortho frustum.
 */
function IsoCameraSquare({ zoom }: { zoom: number }) {
  const { set } = useThree();
  const camera = useMemo(() => new OrthographicCamera(), []);

  useLayoutEffect(() => {
    placeIsoCamera(camera, 1, zoom);
    set({ camera });
  }, [camera, set, zoom]);

  return <primitive object={camera} />;
}

export function BakeCanvas({
  size,
  colors,
  zoom,
  rotationX,
  rotationY,
  spec,
  captureRequest,
  onCaptured,
  displayPx,
}: BakeProps) {
  const view = displayPx ?? size * 4;
  // Display at view×view CSS px; drawing buffer stays size×size (NN upscale).
  const dpr = size / view;

  return (
    <Canvas
      className="bake-canvas"
      flat
      linear
      gl={{
        alpha: true,
        antialias: false,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      }}
      dpr={dpr}
      style={{
        width: view,
        height: view,
        imageRendering: "pixelated",
        display: "block",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <IsoCameraSquare zoom={zoom} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[-3, 6, 2]} intensity={1.25} />
      <directionalLight position={[2, 3, -2]} intensity={0.4} />
      <group rotation={[rotationX, rotationY, 0]}>
        <ChibiCharacter spec={spec} />
      </group>
      <BakeCapture
        size={size}
        colors={colors}
        zoom={zoom}
        captureRequest={captureRequest}
        onCaptured={onCaptured}
      />
    </Canvas>
  );
}

export function saveSprite(dataUrl: string, size: SpriteSize) {
  downloadDataUrl(dataUrl, `sprite-iso-${size}.png`);
}
