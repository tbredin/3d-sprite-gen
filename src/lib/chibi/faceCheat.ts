import type { Object3D } from "three";
import { isoCameraGroundDir } from "../isoCamera";

/**
 * Soft FF-style per-eye visibility for the fixed iso camera.
 *
 * Toward / front-¾: both eyes. Approaching profile: drop the far eye.
 * Away: hide eyes + mouth. Keep transforms gentle — no big yaw or forward
 * boost (those made the discs stick out / look weird).
 */
export function applySpriteFaceCheat(root: Object3D, bodyRotationY: number) {
  const eyes: Object3D[] = [];
  let mouth: Object3D | undefined;
  root.traverse((obj) => {
    if (obj.name === "eye-left" || obj.name === "eye-right") eyes.push(obj);
    if (obj.name === "mouth") mouth = obj;
  });
  if (!eyes.length) return;

  const { x: tx, z: tz } = isoCameraGroundDir();
  const fx = Math.sin(bodyRotationY);
  const fz = Math.cos(bodyRotationY);
  const towardCam = fx * tx + fz * tz;

  const rightX = Math.cos(bodyRotationY);
  const rightZ = -Math.sin(bodyRotationY);
  const rightTowardCam = rightX * tx + rightZ * tz;

  if (towardCam < 0.08) {
    for (const eye of eyes) {
      eye.visible = false;
      if (eye.userData.restRotY != null) eye.rotation.y = eye.userData.restRotY;
      if (eye.userData.restZ != null) eye.position.z = eye.userData.restZ;
    }
    if (mouth) mouth.visible = false;
    return;
  }

  if (mouth) mouth.visible = towardCam > 0.35;

  for (const eye of eyes) {
    if (eye.userData.restZ == null) {
      eye.userData.restZ = eye.position.z;
      eye.userData.restRotY = eye.rotation.y;
    }
    const restZ = eye.userData.restZ as number;
    const restRotY = eye.userData.restRotY as number;
    const side = eye.name === "eye-right" ? 1 : -1;
    const sideFavor = side * rightTowardCam;

    // Front-on: both. Near profile: camera-side only.
    const visible = towardCam >= 0.55 || sideFavor > -0.12;
    eye.visible = visible;
    // Keep flat on the face plane — no yaw/push that makes rects stick out.
    eye.position.z = restZ;
    eye.rotation.y = restRotY;
  }
}
