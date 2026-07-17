import type { Mesh, MeshBasicMaterial, Object3D } from "three";
import { isoCameraGroundDir } from "../isoCamera";
import { setEyeLook, type EyeLook } from "./faceTexture";

/**
 * Soft FF-style face visibility for the fixed iso camera.
 *
 * Away: hide both. Mostly front-on: both eyes. Near profile: camera-nearest only.
 * Gaze colour sits on the screen-facing half of each visible eye.
 */
export function applySpriteFaceCheat(root: Object3D, bodyRotationY: number) {
  const eyes: Mesh[] = [];
  root.traverse((obj) => {
    if (obj.name === "eye-left" || obj.name === "eye-right") {
      eyes.push(obj as Mesh);
    }
  });
  if (!eyes.length) return;

  const { x: tx, z: tz } = isoCameraGroundDir();
  const fx = Math.sin(bodyRotationY);
  const fz = Math.cos(bodyRotationY);
  const towardCam = fx * tx + fz * tz;

  const rightX = Math.cos(bodyRotationY);
  const rightZ = -Math.sin(bodyRotationY);
  const rightTowardCam = rightX * tx + rightZ * tz;

  if (towardCam < 0.15) {
    for (const eye of eyes) eye.visible = false;
    return;
  }

  // Only a narrow front cone shows both; near-profile (one eye) is the default.
  const showBoth = towardCam >= 0.88;
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
