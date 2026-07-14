import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  NearestFilter,
  OrthographicCamera,
  RGBAFormat,
  UnsignedByteType,
  WebGLRenderTarget,
} from "three";
import { placeIsoCamera, isoRimLightPositions, isoCameraPosition } from "../lib/isoCamera";
import { ChibiCharacter } from "./ChibiCharacter";
import { downloadDataUrl } from "../lib/capture";
import {
  applyPartOutline,
  DEFAULT_OUTLINE_PASS,
  quantizeImageData,
  type OutlinePassSettings,
  type SpriteSize,
} from "../lib/palette";
import { renderPartGroupBuffer } from "../lib/chibi/idPass";
import { decodePartGroupPixel } from "../lib/chibi/partGroups";
import type { CharacterSpec } from "../lib/chibi";
import type { RimLightSettings } from "../lib/rimLights";

/** Flip a bottom-up WebGL readback into top-down image row order. */
function flipRows(buffer: Uint8Array, size: number) {
  const flipped = new Uint8ClampedArray(size * size * 4);
  const row = size * 4;
  for (let y = 0; y < size; y++) {
    const src = (size - 1 - y) * row;
    flipped.set(buffer.subarray(src, src + row), y * row);
  }
  return flipped;
}

type BakeProps = {
  size: SpriteSize;
  colors: string[];
  /** Endesga hex (no #) for the 1px baked outline. */
  outlineHex: string;
  outlinePass?: OutlinePassSettings;
  zoom: number;
  rotationX: number;
  rotationY: number;
  spec: CharacterSpec;
  rimLights: RimLightSettings;
  onCaptured: (dataUrl: string) => void;
  /** CSS display size (NN upscale of the native size×size buffer). */
  displayPx?: number;
};

/**
 * Continuously bake the quantized sprite whenever the scene / view changes.
 * Short debounce keeps drag-rotate smooth while the PNG panel stays live.
 */
function BakeCapture({
  size,
  colors,
  outlineHex,
  outlinePass,
  zoom,
  rotationX,
  rotationY,
  rimKey,
  onCaptured,
}: {
  size: SpriteSize;
  colors: string[];
  outlineHex: string;
  outlinePass: OutlinePassSettings;
  zoom: number;
  rotationX: number;
  rotationY: number;
  /** Changes when lighting knobs move so the PNG rebakes. */
  rimKey: string;
  onCaptured: (dataUrl: string) => void;
}) {
  const { gl, scene } = useThree();
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
  const onCapturedRef = useRef(onCaptured);
  onCapturedRef.current = onCaptured;
  const outlinePassRef = useRef(outlinePass);
  outlinePassRef.current = outlinePass;

  useEffect(() => () => target.dispose(), [target]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;

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
        const flipped = flipRows(buffer, size);

        const pass = outlinePassRef.current;
        let idFlipped: Uint8Array | undefined;
        // Skip the ID pass when seams are off — it is the expensive second render.
        if (pass.partSeams) {
          const idBuffer = renderPartGroupBuffer(gl, scene, bakeCam, size, target);
          idFlipped = flipRows(idBuffer, size);
        }

        const imageData = new ImageData(flipped, size, size);
        quantizeImageData(imageData, colors);
        applyPartOutline(
          imageData,
          outlineHex,
          idFlipped,
          idFlipped ? decodePartGroupPixel : undefined,
          pass,
        );

        const out = document.createElement("canvas");
        out.width = size;
        out.height = size;
        const ctx = out.getContext("2d")!;
        ctx.putImageData(imageData, 0, 0);
        onCapturedRef.current(out.toDataURL("image/png"));
      });
    }, 40);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    gl,
    scene,
    size,
    colors,
    outlineHex,
    outlinePass.silhouette,
    outlinePass.partSeams,
    zoom,
    rotationX,
    rotationY,
    rimKey,
    target,
    bakeCam,
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
  outlineHex,
  outlinePass = DEFAULT_OUTLINE_PASS,
  zoom,
  rotationX,
  rotationY,
  spec,
  rimLights,
  onCaptured,
  displayPx,
}: BakeProps) {
  const view = displayPx ?? size * 4;
  const dpr = size / view;
  const rim = isoRimLightPositions({
    behindLeft: rimLights.redBehind,
    behindRight: rimLights.blueBehind,
    sideLeft: rimLights.redSide,
    sideRight: rimLights.blueSide,
    height: rimLights.rimHeight,
  });
  const camPos = isoCameraPosition();
  const rimKey = [
    rimLights.keyBrightness,
    rimLights.ambientBrightness,
    rimLights.redBrightness,
    rimLights.blueBrightness,
    rimLights.redBehind,
    rimLights.blueBehind,
    rimLights.redSide,
    rimLights.blueSide,
    rimLights.rimHeight,
  ].join(":");

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
      {/*
        Directional rims = parallel colored rays from behind L/R (classic toon rim).
        Camera key = soft frontal fill so midtones don't vanish.
      */}
      <ambientLight intensity={rimLights.ambientBrightness} color="#9aa8c0" />
      <directionalLight
        color="#dfe8f4"
        intensity={rimLights.keyBrightness}
        position={camPos}
      />
      <directionalLight
        color="#ff3a3a"
        intensity={rimLights.redBrightness}
        position={rim.left}
      />
      <directionalLight
        color="#7ec8ff"
        intensity={rimLights.blueBrightness}
        position={rim.right}
      />
      <group rotation={[rotationX, rotationY, 0]}>
        <ChibiCharacter spec={spec} />
      </group>
      <BakeCapture
        size={size}
        colors={colors}
        outlineHex={outlineHex}
        outlinePass={outlinePass}
        zoom={zoom}
        rotationX={rotationX}
        rotationY={rotationY}
        rimKey={rimKey}
        onCaptured={onCaptured}
      />
    </Canvas>
  );
}

export function saveSprite(dataUrl: string, size: SpriteSize) {
  downloadDataUrl(dataUrl, `sprite-iso-${size}.png`);
}
