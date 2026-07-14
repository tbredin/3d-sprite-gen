import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { OrthographicCamera } from "three";
import { CHIBI, CHARACTER_PIVOT_Y } from "./chibi/units";

/**
 * Sea of Stars / BoF-ish low top-down isometric.
 * Character faces +Z (away / top-right under this camera).
 * Frustum fitted to the chibi (feet at y=0).
 *
 * Classic “true iso” elevation is atan(1/√2) ≈ 35.3°. Camera height slider
 * remaps that as a relative scale (1 = default).
 */
export const ISO = {
  elevation: Math.atan(1 / Math.SQRT2),
  azimuth: Math.PI / 4,
  /** World half-extent — full chibi with margin. */
  frustum: CHIBI.totalHeight * 0.85,
  distance: 10,
  lookY: CHIBI.totalHeight * 0.45,
} as const;

/** Default camera-height multiplier (1 = classic iso elevation). */
export const DEFAULT_CAMERA_HEIGHT = 1;

const CAMERA_HEIGHT_STORAGE_KEY = "3d-sprite-gen:camera-height-v1";

export function loadCameraHeight(): number {
  try {
    const raw = localStorage.getItem(CAMERA_HEIGHT_STORAGE_KEY);
    if (raw == null) return DEFAULT_CAMERA_HEIGHT;
    const v = Number(raw);
    if (!Number.isFinite(v)) return DEFAULT_CAMERA_HEIGHT;
    return Math.min(1.55, Math.max(0.55, v));
  } catch {
    return DEFAULT_CAMERA_HEIGHT;
  }
}

export function saveCameraHeight(height: number) {
  try {
    localStorage.setItem(CAMERA_HEIGHT_STORAGE_KEY, String(height));
  } catch {
    /* ignore */
  }
}

/** Effective elevation angle for a height multiplier (1 = ISO.elevation). */
export function isoElevationForHeight(cameraHeight = DEFAULT_CAMERA_HEIGHT): number {
  // Scale sin(elevation) so the slider reads as camera height, while keeping
  // azimuth. Clamp so we never go fully top-down or flat side-view.
  const base = ISO.elevation;
  const sinTarget = Math.sin(base) * cameraHeight;
  return Math.asin(Math.min(0.92, Math.max(0.28, sinTarget)));
}

/** Unit vector from origin toward the iso camera (3D). */
export function isoCameraDir(cameraHeight = DEFAULT_CAMERA_HEIGHT) {
  const elevation = isoElevationForHeight(cameraHeight);
  const { azimuth } = ISO;
  const x = Math.cos(elevation) * Math.sin(azimuth);
  const y = Math.sin(elevation);
  const z = Math.cos(elevation) * Math.cos(azimuth);
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}

/** Unit vector from origin toward the iso camera on the XZ plane. */
export function isoCameraGroundDir(cameraHeight = DEFAULT_CAMERA_HEIGHT) {
  const { x, z } = isoCameraDir(cameraHeight);
  const len = Math.hypot(x, z) || 1;
  return { x: x / len, z: z / len };
}

/** World position of the locked iso camera. */
export function isoCameraPosition(cameraHeight = DEFAULT_CAMERA_HEIGHT) {
  const { distance } = ISO;
  const d = isoCameraDir(cameraHeight);
  return [d.x * distance, d.y * distance, d.z * distance] as const;
}

/**
 * Orbit a horizontal rim offset around the character pivot in that rim's
 * vertical plane. heightDeg: 0 = level (midY), ±90 = above/below, ±180 =
 * level on the opposite side (full half-turn each way).
 */
function orbitRimHeight(
  hx: number,
  hz: number,
  midY: number,
  heightDeg: number,
): readonly [number, number, number] {
  const r = Math.hypot(hx, hz);
  const theta = (heightDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  if (r < 1e-8) {
    // Degenerate flat offset — lift straight up/down by a unit arc so the
    // slider still moves the light.
    return [0, midY + sin, 0] as const;
  }
  return [hx * cos, midY + r * sin, hz * cos] as const;
}

/**
 * Rim light origin points sit behind the character (away from camera) and split
 * left/right. Used as DirectionalLight positions (rays aim at the origin).
 * Height is elevation in degrees: rotate the horizontal rim offset around the
 * character midpoint (0 = level, +90 above, −90 below, ±180 opposite side).
 */
export function isoRimLightPositions(opts?: {
  behind?: number;
  behindLeft?: number;
  behindRight?: number;
  side?: number;
  sideLeft?: number;
  sideRight?: number;
  /** @deprecated use heightLeft / heightRight */
  height?: number;
  /** Elevation degrees −180…180 (orbit, not Y offset). */
  heightLeft?: number;
  heightRight?: number;
  /** World Y for slider 0 (default: chibi midpoint). */
  midY?: number;
  /** Iso camera height multiplier — keeps rim ground-dir in sync with bake cam. */
  cameraHeight?: number;
}) {
  const behindLeft = opts?.behindLeft ?? opts?.behind ?? 2.6;
  const behindRight = opts?.behindRight ?? opts?.behind ?? 2.6;
  const sideLeft = opts?.sideLeft ?? opts?.side ?? 2.4;
  const sideRight = opts?.sideRight ?? opts?.side ?? 2.4;
  const midY = opts?.midY ?? CHARACTER_PIVOT_Y;
  const heightLeft = opts?.heightLeft ?? opts?.height ?? 0;
  const heightRight = opts?.heightRight ?? opts?.height ?? 0;
  const { x: tx, z: tz } = isoCameraGroundDir(opts?.cameraHeight);
  const bx = -tx;
  const bz = -tz;
  const rx = -tz;
  const rz = tx;

  const leftHx = bx * behindLeft + rx * sideLeft;
  const leftHz = bz * behindLeft + rz * sideLeft;
  const rightHx = bx * behindRight - rx * sideRight;
  const rightHz = bz * behindRight - rz * sideRight;

  return {
    // Names match screen sides in the iso bake preview.
    left: orbitRimHeight(leftHx, leftHz, midY, heightLeft),
    right: orbitRimHeight(rightHx, rightHz, midY, heightRight),
  };
}

export function placeIsoCamera(
  camera: OrthographicCamera,
  aspect: number,
  zoom = 1,
  cameraHeight = DEFAULT_CAMERA_HEIGHT,
) {
  const { azimuth, frustum, distance, lookY } = ISO;
  const elevation = isoElevationForHeight(cameraHeight);
  const x = distance * Math.cos(elevation) * Math.sin(azimuth);
  const y = distance * Math.sin(elevation);
  const z = distance * Math.cos(elevation) * Math.cos(azimuth);
  camera.position.set(x, y, z);
  camera.lookAt(0, lookY, 0);
  camera.up.set(0, 1, 0);

  const halfH = frustum / zoom;
  const halfW = halfH * Math.max(aspect, 0.0001);
  camera.left = -halfW;
  camera.right = halfW;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.near = 0.1;
  camera.far = 40;
  camera.updateProjectionMatrix();
}

/** Locked orthographic iso camera for the live preview. */
export function IsoCamera({
  zoom = 1,
  cameraHeight = DEFAULT_CAMERA_HEIGHT,
}: {
  zoom?: number;
  cameraHeight?: number;
}) {
  const { set, size } = useThree();
  const camera = useMemo(() => new OrthographicCamera(), []);

  useLayoutEffect(() => {
    set({ camera });
  }, [camera, set]);

  useLayoutEffect(() => {
    placeIsoCamera(
      camera,
      size.width / Math.max(size.height, 1),
      zoom,
      cameraHeight,
    );
  }, [camera, zoom, cameraHeight, size.width, size.height]);

  return <primitive object={camera} />;
}
