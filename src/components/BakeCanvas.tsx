import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  DoubleSide,
  MeshDepthMaterial,
  MeshNormalMaterial,
  NearestFilter,
  OrthographicCamera,
  RGBADepthPacking,
  RGBAFormat,
  UnsignedByteType,
  WebGLRenderTarget,
  type Object3D,
} from "three";
import {
  placeIsoCamera,
  isoRimLightPositions,
  isoCameraPosition,
  DEFAULT_CAMERA_HEIGHT,
} from "../lib/isoCamera";
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
import {
  applyEdgeMask,
  decodeDepthBuffer,
  decodeNormalBuffer,
  depthToWorldUnits,
  detectDepthNormalEdges,
  DEFAULT_EDGE_OPTIONS,
  flipRowsRGBA,
  type EdgeDetectOptions,
} from "../lib/edgeOutline";
import type { CharacterSpec } from "../lib/chibi";
import { CHARACTER_PIVOT_Y } from "../lib/chibi/units";
import type { RimLightSettings } from "../lib/rimLights";

export type EdgeOutlineSettings = EdgeDetectOptions & {
  enabled: boolean;
};

export const DEFAULT_EDGE_OUTLINE_SETTINGS: EdgeOutlineSettings = {
  enabled: false,
  ...DEFAULT_EDGE_OPTIONS,
};

type BakeProps = {
  size: SpriteSize;
  colors: string[];
  /** Endesga hex (no #) for the 1px baked outline. */
  outlineHex: string;
  outlinePass?: OutlinePassSettings;
  zoom: number;
  /** 1 = classic iso elevation; higher = steeper camera. */
  cameraHeight?: number;
  rotationX: number;
  rotationY: number;
  spec: CharacterSpec;
  rimLights: RimLightSettings;
  /** Depth+normal discontinuity outline pass — see docs/SPIKE-depth-normal-edges.md. */
  edgeOutline?: EdgeOutlineSettings;
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
  cameraHeight,
  rotationX,
  rotationY,
  rimKey,
  edgeOutline,
  onCaptured,
}: {
  size: SpriteSize;
  colors: string[];
  outlineHex: string;
  outlinePass: OutlinePassSettings;
  zoom: number;
  cameraHeight: number;
  rotationX: number;
  rotationY: number;
  /** Changes when lighting knobs move so the PNG rebakes. */
  rimKey: string;
  edgeOutline: EdgeOutlineSettings;
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
  const depthMaterial = useMemo(
    () =>
      new MeshDepthMaterial({ depthPacking: RGBADepthPacking, side: DoubleSide }),
    [],
  );
  const normalMaterial = useMemo(() => new MeshNormalMaterial({ side: DoubleSide }), []);
  const onCapturedRef = useRef(onCaptured);
  onCapturedRef.current = onCaptured;
  const outlinePassRef = useRef(outlinePass);
  outlinePassRef.current = outlinePass;
  const edgeOutlineRef = useRef(edgeOutline);
  edgeOutlineRef.current = edgeOutline;

  useEffect(() => () => target.dispose(), [target]);
  useEffect(
    () => () => {
      depthMaterial.dispose();
      normalMaterial.dispose();
    },
    [depthMaterial, normalMaterial],
  );

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;

        target.setSize(size, size);
        placeIsoCamera(bakeCam, 1, zoom, cameraHeight);

        const prev = gl.getRenderTarget();
        gl.setRenderTarget(target);
        gl.setClearColor(0x000000, 0);
        gl.clear(true, true, true);
        gl.render(scene, bakeCam);
        gl.setRenderTarget(prev);

        const buffer = new Uint8Array(size * size * 4);
        gl.readRenderTargetPixels(target, 0, 0, size, size, buffer);
        const flipped = flipRowsRGBA(buffer, size);

        const pass = outlinePassRef.current;
        let idFlipped: Uint8Array | undefined;
        // Skip the ID pass when seams are off — it is an extra full render.
        if (pass.partSeams) {
          const idBuffer = renderPartGroupBuffer(gl, scene, bakeCam, size, target);
          idFlipped = flipRowsRGBA(idBuffer, size);
        }

        const opaqueMask = new Uint8Array(size * size);
        for (let i = 0; i < size * size; i++) {
          opaqueMask[i] = flipped[i * 4 + 3] >= 8 ? 1 : 0;
        }

        const imageData = new ImageData(new Uint8ClampedArray(flipped), size, size);
        quantizeImageData(imageData, colors);

        // Internal creases first; silhouette + part seams paint on top.
        const edge = edgeOutlineRef.current;
        if (edge.enabled) {
          const hiddenHulls: Object3D[] = [];
          scene.traverse((obj) => {
            if (obj.userData.isOutline && obj.visible) {
              hiddenHulls.push(obj);
              obj.visible = false;
            }
          });
          const prevOverride = scene.overrideMaterial;

          scene.overrideMaterial = depthMaterial;
          gl.setRenderTarget(target);
          gl.setClearColor(0x000000, 0);
          gl.clear(true, true, true);
          gl.render(scene, bakeCam);
          const depthRaw = new Uint8Array(size * size * 4);
          gl.readRenderTargetPixels(target, 0, 0, size, size, depthRaw);

          scene.overrideMaterial = normalMaterial;
          gl.clear(true, true, true);
          gl.render(scene, bakeCam);
          const normalRaw = new Uint8Array(size * size * 4);
          gl.readRenderTargetPixels(target, 0, 0, size, size, normalRaw);

          scene.overrideMaterial = prevOverride;
          gl.setRenderTarget(prev);
          for (const obj of hiddenHulls) obj.visible = true;

          const depthFlipped = flipRowsRGBA(depthRaw, size);
          const normalFlipped = flipRowsRGBA(normalRaw, size);
          const depthPacked = decodeDepthBuffer(depthFlipped, size);
          const depthWorld = new Float32Array(depthPacked.length);
          for (let i = 0; i < depthPacked.length; i++) {
            depthWorld[i] = depthToWorldUnits(depthPacked[i], bakeCam.near, bakeCam.far);
          }
          const normals = decodeNormalBuffer(normalFlipped, size);

          const edges = detectDepthNormalEdges(
            opaqueMask,
            depthWorld,
            normals,
            size,
            size,
            edge,
          );
          applyEdgeMask(imageData, edges, outlineHex);
        }

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
    cameraHeight,
    rotationX,
    rotationY,
    rimKey,
    target,
    bakeCam,
    depthMaterial,
    normalMaterial,
    edgeOutline.enabled,
    edgeOutline.depthThreshold,
    edgeOutline.normalThresholdDeg,
  ]);

  return null;
}

/**
 * Force square 1:1 aspect for the locked iso camera so a zero/odd
 * ResizeObserver reading can't collapse the ortho frustum.
 */
function IsoCameraSquare({
  zoom,
  cameraHeight,
}: {
  zoom: number;
  cameraHeight: number;
}) {
  const { set } = useThree();
  const camera = useMemo(() => new OrthographicCamera(), []);

  useLayoutEffect(() => {
    placeIsoCamera(camera, 1, zoom, cameraHeight);
    set({ camera });
  }, [camera, set, zoom, cameraHeight]);

  return <primitive object={camera} />;
}

export function BakeCanvas({
  size,
  colors,
  outlineHex,
  outlinePass = DEFAULT_OUTLINE_PASS,
  zoom,
  cameraHeight = DEFAULT_CAMERA_HEIGHT,
  rotationX,
  rotationY,
  spec,
  rimLights,
  edgeOutline = DEFAULT_EDGE_OUTLINE_SETTINGS,
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
    cameraHeight,
  });
  const camPos = isoCameraPosition(cameraHeight);
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
    cameraHeight,
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
      <IsoCameraSquare zoom={zoom} cameraHeight={cameraHeight} />
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
      <group position={[0, CHARACTER_PIVOT_Y, 0]} rotation={[rotationX, rotationY, 0]}>
        <group position={[0, -CHARACTER_PIVOT_Y, 0]}>
          <ChibiCharacter spec={spec} rotationY={rotationY} />
        </group>
      </group>
      <BakeCapture
        size={size}
        colors={colors}
        outlineHex={outlineHex}
        outlinePass={outlinePass}
        zoom={zoom}
        cameraHeight={cameraHeight}
        rotationX={rotationX}
        rotationY={rotationY}
        rimKey={rimKey}
        edgeOutline={edgeOutline}
        onCaptured={onCaptured}
      />
    </Canvas>
  );
}

export function saveSprite(dataUrl: string, size: SpriteSize) {
  downloadDataUrl(dataUrl, `sprite-iso-${size}.png`);
}
