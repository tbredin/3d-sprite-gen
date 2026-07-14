import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { OrthographicCamera } from "three";
import { CHIBI } from "./chibi/units";

/**
 * Sea of Stars / BoF-ish low top-down isometric.
 * Character faces +Z (away / top-right under this camera).
 * Frustum fitted to the chibi (feet at y=0).
 */
export const ISO = {
  elevation: Math.atan(1 / Math.SQRT2),
  azimuth: Math.PI / 4,
  /** World half-extent — full chibi with margin. */
  frustum: CHIBI.totalHeight * 0.85,
  distance: 10,
  lookY: CHIBI.totalHeight * 0.45,
} as const;

/** Unit vector from origin toward the locked iso camera (3D). */
export function isoCameraDir() {
  const { elevation, azimuth } = ISO;
  const x = Math.cos(elevation) * Math.sin(azimuth);
  const y = Math.sin(elevation);
  const z = Math.cos(elevation) * Math.cos(azimuth);
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}

/** Unit vector from origin toward the locked iso camera on the XZ plane. */
export function isoCameraGroundDir() {
  const { x, z } = isoCameraDir();
  const len = Math.hypot(x, z) || 1;
  return { x: x / len, z: z / len };
}

/** World position of the locked iso camera. */
export function isoCameraPosition() {
  const { distance } = ISO;
  const d = isoCameraDir();
  return [d.x * distance, d.y * distance, d.z * distance] as const;
}

/**
 * Rim light origin points sit behind the character (away from camera) and split
 * left/right. Used as DirectionalLight positions (rays aim at the origin).
 */
export function isoRimLightPositions(opts?: {
  behind?: number;
  behindLeft?: number;
  behindRight?: number;
  side?: number;
  sideLeft?: number;
  sideRight?: number;
  height?: number;
}) {
  const behindLeft = opts?.behindLeft ?? opts?.behind ?? 2.6;
  const behindRight = opts?.behindRight ?? opts?.behind ?? 2.6;
  const sideLeft = opts?.sideLeft ?? opts?.side ?? 2.4;
  const sideRight = opts?.sideRight ?? opts?.side ?? 2.4;
  const height = opts?.height ?? 1.55;
  const { x: tx, z: tz } = isoCameraGroundDir();
  const bx = -tx;
  const bz = -tz;
  const rx = -tz;
  const rz = tx;

  return {
    // Names match screen sides in the iso bake preview.
    left: [
      bx * behindLeft + rx * sideLeft,
      height,
      bz * behindLeft + rz * sideLeft,
    ] as const,
    right: [
      bx * behindRight - rx * sideRight,
      height,
      bz * behindRight - rz * sideRight,
    ] as const,
  };
}

export function placeIsoCamera(
  camera: OrthographicCamera,
  aspect: number,
  zoom = 1,
) {
  const { elevation, azimuth, frustum, distance, lookY } = ISO;
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
export function IsoCamera({ zoom = 1 }: { zoom?: number }) {
  const { set, size } = useThree();
  const camera = useMemo(() => new OrthographicCamera(), []);

  useLayoutEffect(() => {
    set({ camera });
  }, [camera, set]);

  useLayoutEffect(() => {
    placeIsoCamera(camera, size.width / Math.max(size.height, 1), zoom);
  }, [camera, zoom, size.width, size.height]);

  return <primitive object={camera} />;
}
