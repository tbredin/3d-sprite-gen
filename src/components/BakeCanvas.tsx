import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  DoubleSide,
  Group,
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
import { ANIMATED_BAKE_INTERVAL_MS } from "../lib/facing";
import { ChibiCharacter } from "./ChibiCharacter";
import { downloadDataUrl } from "../lib/capture";
import {
  applyPartOutline,
  DEFAULT_BAYER_DITHER,
  DEFAULT_OUTLINE_PASS,
  quantizeImageData,
  type BayerDitherSettings,
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
  DEFAULT_EDGE_OUTLINE_SETTINGS,
  flipRowsRGBA,
  type EdgeOutlineSettings,
} from "../lib/edgeOutline";
import type { CharacterSpec } from "../lib/chibi";
import { CHARACTER_PIVOT_Y } from "../lib/chibi/units";
import type { RimLightSettings } from "../lib/rimLights";

export {
  DEFAULT_EDGE_OUTLINE_SETTINGS,
  EDGE_BLUR_MAX,
  EDGE_BLUR_MIN,
  EDGE_BLUR_STEP,
  EDGE_DEPTH_MAX,
  EDGE_DEPTH_MIN,
  EDGE_DEPTH_STEP,
  EDGE_DILATE_MAX,
  EDGE_DILATE_MIN,
  EDGE_DILATE_STEP,
  EDGE_GAMMA_MAX,
  EDGE_GAMMA_MIN,
  EDGE_GAMMA_STEP,
  EDGE_NORMAL_MAX,
  EDGE_NORMAL_MIN,
  EDGE_NORMAL_STEP,
  EDGE_OPACITY_MAX,
  EDGE_OPACITY_MIN,
  EDGE_OPACITY_STEP,
  EDGE_SOFTNESS_MAX,
  EDGE_SOFTNESS_MIN,
  EDGE_SOFTNESS_STEP,
  EDGE_WEIGHT_MAX,
  EDGE_WEIGHT_MIN,
  EDGE_WEIGHT_STEP,
  loadEdgeOutlineSettings,
  saveEdgeOutlineSettings,
  type EdgeOutlineSettings,
} from "../lib/edgeOutline";

type BakeProps = {
  size: SpriteSize;
  colors: string[];
  /** Endesga hex (no #) for the outer silhouette rim. */
  silhouetteOutlineHex: string;
  /** Endesga hex (no #) for internal part-seam outlines. */
  partSeamsOutlineHex: string;
  outlinePass?: OutlinePassSettings;
  zoom: number;
  /** 1 = classic iso elevation; higher = steeper camera. */
  cameraHeight?: number;
  rotationX: number;
  rotationY: number;
  /** Continuous yaw turntable (auto-rotate or hold-to-rotate). */
  spinning?: boolean;
  /** Holding live yaw in the pivot (while spinning). */
  rotateMode?: boolean;
  /** Signed rad/s applied each frame while spinning. */
  spinSpeed?: number;
  /** Mirrors the live spin yaw so drag can snap off the turntable. */
  spinYawRef?: MutableRefObject<number>;
  spec: CharacterSpec;
  /** Mirror character left/right by swapping leadSide (not X-scale). */
  mirror?: boolean;
  /** Toggle the cartoon eye plates. Default true. */
  showEyes?: boolean;
  rimLights: RimLightSettings;
  /** Depth+normal discontinuity outline pass — see docs/SPIKE-depth-normal-edges.md. */
  edgeOutline?: EdgeOutlineSettings;
  /** Bayer ordered dither before Endesga lock — see docs/SPIKE-bayer-dither.md. */
  bayerDither?: BayerDitherSettings;
  onCaptured: (dataUrl: string) => void;
  /**
   * Pre-outline bake (RGBA data URL) for AI conditioning — 3D hull silhouette
   * shells are hidden for this capture. Palette crush + 2D rim are applied
   * only on the final bake / after AI generation.
   * See docs/SPIKE-ai-sprite-variations.md.
   */
  onSourceCaptured?: (dataUrl: string) => void;
  /** CSS display size (NN upscale of the native size×size buffer). */
  displayPx?: number;
};

/**
 * Continuously bake the quantized sprite whenever the scene / view changes.
 * Short debounce keeps drag-rotate smooth while the PNG panel stays live.
 * Animated facings (e.g. Rotate) rebake on a fixed interval so the PNG tracks
 * the turntable.
 */
function BakeCapture({
  size,
  colors,
  silhouetteOutlineHex,
  partSeamsOutlineHex,
  outlinePass,
  zoom,
  cameraHeight,
  rotationX,
  rotationY,
  spinning,
  mirror,
  showEyes,
  rimKey,
  edgeOutline,
  bayerDither,
  onCaptured,
  onSourceCaptured,
}: {
  size: SpriteSize;
  colors: string[];
  silhouetteOutlineHex: string;
  partSeamsOutlineHex: string;
  outlinePass: OutlinePassSettings;
  zoom: number;
  cameraHeight: number;
  rotationX: number;
  rotationY: number;
  spinning: boolean;
  mirror: boolean;
  /** Rebake when eye visibility toggles. */
  showEyes: boolean;
  /** Changes when lighting knobs move so the PNG rebakes. */
  rimKey: string;
  edgeOutline: EdgeOutlineSettings;
  bayerDither: BayerDitherSettings;
  onCaptured: (dataUrl: string) => void;
  onSourceCaptured?: (dataUrl: string) => void;
}) {
  const { gl, scene } = useThree();
  const [animTick, setAnimTick] = useState(0);
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
  const onSourceCapturedRef = useRef(onSourceCaptured);
  onSourceCapturedRef.current = onSourceCaptured;
  const outlinePassRef = useRef(outlinePass);
  outlinePassRef.current = outlinePass;
  const edgeOutlineRef = useRef(edgeOutline);
  edgeOutlineRef.current = edgeOutline;
  const bayerDitherRef = useRef(bayerDither);
  bayerDitherRef.current = bayerDither;
  const bakingRef = useRef(false);

  useEffect(() => () => target.dispose(), [target]);
  useEffect(
    () => () => {
      depthMaterial.dispose();
      normalMaterial.dispose();
    },
    [depthMaterial, normalMaterial],
  );

  useEffect(() => {
    if (!spinning) return;
    const id = window.setInterval(
      () => setAnimTick((t) => t + 1),
      ANIMATED_BAKE_INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, [spinning]);

  useEffect(() => {
    let cancelled = false;
    // Animated modes skip the drag debounce so the interval hits ~exactly 10 Hz.
    const delay = spinning ? 0 : 40;
    const timer = window.setTimeout(() => {
      requestAnimationFrame(() => {
        if (cancelled || bakingRef.current) return;
        bakingRef.current = true;

        try {
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

          if (onSourceCapturedRef.current) {
            // AI conditioning must not include silhouette shells — those are
            // re-applied as a 1px 2D rim after generation. Hide hull outlines
            // for this capture only (same trick as the depth/normal edge pass).
            const hiddenHulls: Object3D[] = [];
            scene.traverse((obj) => {
              if (obj.userData.isOutline && obj.visible) {
                hiddenHulls.push(obj);
                obj.visible = false;
              }
            });
            try {
              const prevRt = gl.getRenderTarget();
              gl.setRenderTarget(target);
              gl.setClearColor(0x000000, 0);
              gl.clear(true, true, true);
              gl.render(scene, bakeCam);
              gl.setRenderTarget(prevRt);

              const srcBuf = new Uint8Array(size * size * 4);
              gl.readRenderTargetPixels(target, 0, 0, size, size, srcBuf);
              const srcFlipped = flipRowsRGBA(srcBuf, size);

              const source = document.createElement("canvas");
              source.width = size;
              source.height = size;
              const sctx = source.getContext("2d")!;
              sctx.putImageData(
                new ImageData(new Uint8ClampedArray(srcFlipped), size, size),
                0,
                0,
              );
              onSourceCapturedRef.current(source.toDataURL("image/png"));
            } finally {
              for (const obj of hiddenHulls) obj.visible = true;
            }
          }

          const imageData = new ImageData(new Uint8ClampedArray(flipped), size, size);
          quantizeImageData(imageData, colors, bayerDitherRef.current);

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
            applyEdgeMask(
              imageData,
              edges,
              edge.color,
              edge.opacity,
              edge.dilate,
              edge.blur,
              colors,
            );
          }

          applyPartOutline(
            imageData,
            {
              silhouette: silhouetteOutlineHex,
              partSeams: partSeamsOutlineHex,
            },
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
        } finally {
          bakingRef.current = false;
        }
      });
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    gl,
    scene,
    size,
    colors,
    silhouetteOutlineHex,
    partSeamsOutlineHex,
    outlinePass.silhouette,
    outlinePass.partSeams,
    zoom,
    cameraHeight,
    rotationX,
    rotationY,
    spinning,
    animTick,
    mirror,
    showEyes,
    rimKey,
    target,
    bakeCam,
    depthMaterial,
    normalMaterial,
    edgeOutline.enabled,
    edgeOutline.color,
    edgeOutline.depthThreshold,
    edgeOutline.normalThresholdDeg,
    edgeOutline.depthWeight,
    edgeOutline.normalWeight,
    edgeOutline.softness,
    edgeOutline.thresholdGamma,
    edgeOutline.opacity,
    edgeOutline.dilate,
    edgeOutline.blur,
    bayerDither.enabled,
    bayerDither.strength,
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

/**
 * Pivot group for the chibi. When `spinSpeed` ≠ 0, advances yaw every frame
 * without touching React state — keeps BakeCapture from thrashing.
 * `rotateMode` keeps the live yaw while spinning (or paused mid-hold sync).
 */
function CharacterPivot({
  rotateMode,
  spinSpeed,
  rotationX,
  rotationY,
  spinYawRef,
  spec,
  mirror,
  showEyes,
}: {
  rotateMode: boolean;
  /** Signed rad/s; 0 = frozen at live yaw while rotateMode, else follows props. */
  spinSpeed: number;
  rotationX: number;
  rotationY: number;
  spinYawRef?: MutableRefObject<number>;
  spec: CharacterSpec;
  mirror: boolean;
  showEyes: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const yawRef = useRef(rotationY);
  const wasRotateMode = useRef(rotateMode);

  useLayoutEffect(() => {
    if (rotateMode && !wasRotateMode.current) {
      yawRef.current = rotationY;
      if (spinYawRef) spinYawRef.current = rotationY;
    }
    wasRotateMode.current = rotateMode;

    if (!rotateMode) {
      yawRef.current = rotationY;
      if (spinYawRef) spinYawRef.current = rotationY;
      if (groupRef.current) {
        groupRef.current.rotation.set(rotationX, rotationY, 0);
      }
    }
  }, [rotateMode, rotationX, rotationY, spinYawRef]);

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;
    if (spinSpeed !== 0) {
      yawRef.current += dt * spinSpeed;
      if (spinYawRef) spinYawRef.current = yawRef.current;
    }
    if (rotateMode || spinSpeed !== 0) {
      g.rotation.set(rotationX, yawRef.current, 0);
    }
  });

  return (
    <group ref={groupRef} position={[0, CHARACTER_PIVOT_Y, 0]}>
      <group position={[0, -CHARACTER_PIVOT_Y, 0]}>
        <ChibiCharacter
          spec={spec}
          rotationY={rotationY}
          yawRef={rotateMode ? yawRef : undefined}
          mirror={mirror}
          showEyes={showEyes}
        />
      </group>
    </group>
  );
}

export function BakeCanvas({
  size,
  colors,
  silhouetteOutlineHex,
  partSeamsOutlineHex,
  outlinePass = DEFAULT_OUTLINE_PASS,
  zoom,
  cameraHeight = DEFAULT_CAMERA_HEIGHT,
  rotationX,
  rotationY,
  spinning = false,
  rotateMode = false,
  spinSpeed = 0,
  spinYawRef,
  spec,
  mirror = false,
  showEyes = true,
  rimLights,
  edgeOutline = DEFAULT_EDGE_OUTLINE_SETTINGS,
  bayerDither = DEFAULT_BAYER_DITHER,
  onCaptured,
  onSourceCaptured,
  displayPx,
}: BakeProps) {
  const view = displayPx ?? size * 4;
  const dpr = size / view;
  const rim = isoRimLightPositions({
    behindLeft: rimLights.redBehind,
    behindRight: rimLights.blueBehind,
    sideLeft: rimLights.redSide,
    sideRight: rimLights.blueSide,
    heightLeft: rimLights.redHeight,
    heightRight: rimLights.blueHeight,
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
    rimLights.redHeight,
    rimLights.blueHeight,
    rimLights.keyColor,
    rimLights.ambientColor,
    rimLights.redColor,
    rimLights.blueColor,
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
        Soft fill = ambient + faint camera key only.
        Red/blue are DirectionalLights parked behind the character so they
        skim the silhouette (true rim), not wash the whole sprite.
      */}
      <ambientLight
        intensity={rimLights.ambientBrightness}
        color={rimLights.ambientColor}
      />
      <directionalLight
        color={rimLights.keyColor}
        intensity={rimLights.keyBrightness}
        position={camPos}
      />
      <directionalLight
        color={rimLights.redColor}
        intensity={rimLights.redBrightness}
        position={rim.left}
      />
      <directionalLight
        color={rimLights.blueColor}
        intensity={rimLights.blueBrightness}
        position={rim.right}
      />
      <CharacterPivot
        rotateMode={rotateMode}
        spinSpeed={spinSpeed}
        rotationX={rotationX}
        rotationY={rotationY}
        spinYawRef={spinYawRef}
        spec={spec}
        mirror={mirror}
        showEyes={showEyes}
      />
      <BakeCapture
        size={size}
        colors={colors}
        silhouetteOutlineHex={silhouetteOutlineHex}
        partSeamsOutlineHex={partSeamsOutlineHex}
        outlinePass={outlinePass}
        zoom={zoom}
        cameraHeight={cameraHeight}
        rotationX={rotationX}
        rotationY={rotationY}
        spinning={spinning}
        mirror={mirror}
        showEyes={showEyes}
        rimKey={rimKey}
        edgeOutline={edgeOutline}
        bayerDither={bayerDither}
        onCaptured={onCaptured}
        onSourceCaptured={onSourceCaptured}
      />
    </Canvas>
  );
}

export function saveSprite(dataUrl: string, size: SpriteSize) {
  downloadDataUrl(dataUrl, `sprite-iso-${size}.png`);
}
