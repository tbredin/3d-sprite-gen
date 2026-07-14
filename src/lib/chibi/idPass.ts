import type {
  Camera,
  Mesh,
  Scene,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { getPartGroupMaterial } from "./partGroups";

/**
 * Render the scene with every tagged mesh swapped to its flat part-group
 * material (outline shells + untagged meshes hidden), read back the RGBA
 * buffer, then restore materials/visibility. Reuses the caller's render
 * target — call this right after the color pass has been read out.
 */
export function renderPartGroupBuffer(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  size: number,
  target: WebGLRenderTarget,
): Uint8Array {
  const restoreMaterial: { mesh: Mesh; material: Mesh["material"] }[] = [];
  const restoreVisibility: { mesh: Mesh; visible: boolean }[] = [];

  scene.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    if (mesh.userData.isOutline) {
      if (mesh.visible) {
        restoreVisibility.push({ mesh, visible: true });
        mesh.visible = false;
      }
      return;
    }
    const partGroupId = mesh.userData.partGroupId as number | undefined;
    if (!partGroupId) {
      if (mesh.visible) {
        restoreVisibility.push({ mesh, visible: true });
        mesh.visible = false;
      }
      return;
    }
    restoreMaterial.push({ mesh, material: mesh.material });
    mesh.material = getPartGroupMaterial(partGroupId);
  });

  const prevTarget = gl.getRenderTarget();
  gl.setRenderTarget(target);
  gl.setClearColor(0x000000, 0);
  gl.clear(true, true, true);
  gl.render(scene, camera);
  gl.setRenderTarget(prevTarget);

  const buffer = new Uint8Array(size * size * 4);
  gl.readRenderTargetPixels(target, 0, 0, size, size, buffer);

  for (const { mesh, visible } of restoreVisibility) mesh.visible = visible;
  for (const { mesh, material } of restoreMaterial) mesh.material = material;

  return buffer;
}
