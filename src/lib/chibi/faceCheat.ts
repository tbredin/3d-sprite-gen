import type { Mesh, MeshBasicMaterial, Object3D } from "three";
import { isoCameraGroundDir } from "../isoCamera";
import { setEyeLook, type EyeLook } from "./faceTexture";

/**
 * Below this camera-facing dot the head is treated as looking away — hide both.
 */
const HIDE_BOTH_BELOW = 0.15;

/**
 * At/above this camera-facing dot both eyes read. Widened from the old narrow
 * front cone so the toward-bl / toward-br facings (head leaned slightly toward
 * camera, see headStick.ts) still show both eyes. cos(~35°) ≈ 0.82.
 */
const SHOW_BOTH_ABOVE = 0.82;

/**
 * Soft FF-style face visibility for the fixed iso camera.
 *
 * Away: hide both. Mostly front-on: both eyes. Near profile: camera-nearest only.
 * Gaze colour sits on the screen-facing half of each visible eye.
 *
 * `headRotationY` is the head's effective yaw (body yaw plus any sticky head
 * lean), so eye culling follows where the head actually points.
 */
export function applySpriteFaceCheat(root: Object3D, headRotationY: number) {
  const eyes: Mesh[] = [];
  root.traverse((obj) => {
    if (obj.name === "eye-left" || obj.name === "eye-right") {
      eyes.push(obj as Mesh);
    }
  });
  if (!eyes.length) return;

  const { x: tx, z: tz } = isoCameraGroundDir();
  const fx = Math.sin(headRotationY);
  const fz = Math.cos(headRotationY);
  const towardCam = fx * tx + fz * tz;

  const rightX = Math.cos(headRotationY);
  const rightZ = -Math.sin(headRotationY);
  const rightTowardCam = rightX * tx + rightZ * tz;

  if (towardCam < HIDE_BOTH_BELOW) {
    for (const eye of eyes) eye.visible = false;
    return;
  }

  // Front-ish cone shows both; near-profile (one eye) is the default.
  const showBoth = towardCam >= SHOW_BOTH_ABOVE;
  const preferRight = rightTowardCam >= 0;
  for (const eye of eyes) {
    const isRight = eye.name === "eye-right";
    eye.visible = showBoth || isRight === preferRight;
  }

  const camRightX = -tz;
  const camRightZ = tx;
  const forwardOnScreen = fx * camRightX + fz * camRightZ;
  const look: EyeLook = forwardOnScreen >= 0 ? "right" : "left";

  for (const eye of eyes) {
    if (!eye.visible) continue;
    setEyeLook(eye.material as MeshBasicMaterial, look);
  }
}
