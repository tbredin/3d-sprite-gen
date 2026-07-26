import {
  Color,
  MeshBasicMaterial,
  type Camera,
  type Mesh,
  type Scene,
  type WebGLRenderer,
  type WebGLRenderTarget,
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

  return renderAndRestore(gl, scene, camera, size, target, restoreMaterial, restoreVisibility);
}

/**
 * Flat unlit paint of each mesh's assigned base colour (toon / basic `.color`),
 * ignoring lighting, gradient maps, and textures. Used for texture seams —
 * sleeve vs cloth, belt vs torso, boots vs pants — without outlining every
 * lit shade band after quantize.
 */
export function renderMaterialColorBuffer(
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
    const hex = meshBaseColorHex(mesh);
    if (hex == null) {
      if (mesh.visible) {
        restoreVisibility.push({ mesh, visible: true });
        mesh.visible = false;
      }
      return;
    }
    restoreMaterial.push({ mesh, material: mesh.material });
    mesh.material = getFlatColorMaterial(hex);
  });

  return renderAndRestore(gl, scene, camera, size, target, restoreMaterial, restoreVisibility);
}

function meshBaseColorHex(mesh: Mesh): number | null {
  const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  if (!mat || !("color" in mat) || !mat.color) return null;
  return (mat.color as Color).getHex();
}

const flatColorMaterials = new Map<number, MeshBasicMaterial>();

function getFlatColorMaterial(hex: number): MeshBasicMaterial {
  const existing = flatColorMaterials.get(hex);
  if (existing) return existing;
  const mat = new MeshBasicMaterial({
    color: new Color(hex),
    fog: false,
    toneMapped: false,
  });
  flatColorMaterials.set(hex, mat);
  return mat;
}

function renderAndRestore(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  size: number,
  target: WebGLRenderTarget,
  restoreMaterial: { mesh: Mesh; material: Mesh["material"] }[],
  restoreVisibility: { mesh: Mesh; visible: boolean }[],
): Uint8Array {
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
