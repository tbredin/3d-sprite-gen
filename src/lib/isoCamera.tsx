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
