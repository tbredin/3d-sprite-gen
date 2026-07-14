import {
  BackSide,
  Color,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
} from "three";

const outlineMats = new Map<number, MeshBasicMaterial>();

function getOutlineMaterial(thickness: number): MeshBasicMaterial {
  const key = Math.round(thickness * 1000);
  const existing = outlineMats.get(key);
  if (existing) return existing;

  const mat = new MeshBasicMaterial({
    color: new Color("#322947"),
    side: BackSide,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uThickness = { value: thickness };
    // MeshBasicMaterial already declares `normal`; expand along it (not objectNormal).
    shader.vertexShader = `uniform float uThickness;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       transformed += normalize(normal) * uThickness;`,
    );
  };
  mat.customProgramCacheKey = () => `chibi-outline-v2-${key}`;
  outlineMats.set(key, mat);
  return mat;
}

/** Add dark silhouette shells under a part group (skips already-outlined meshes). */
export function addHullOutlines(root: Object3D, thickness = 0.028) {
  const mat = getOutlineMaterial(thickness);
  const hosts: Mesh[] = [];
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh || mesh.userData.isOutline) return;
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    const r = mesh.geometry.boundingSphere?.radius ?? 1;
    if (r < 0.05) return;
    hosts.push(mesh);
  });

  for (const mesh of hosts) {
    const shell = new Mesh(mesh.geometry, mat);
    shell.userData.isOutline = true;
    shell.name = `${mesh.name || "mesh"}-outline`;
    shell.position.copy(mesh.position);
    shell.rotation.copy(mesh.rotation);
    shell.scale.copy(mesh.scale);
    shell.renderOrder = -1;
    mesh.renderOrder = 1;
    mesh.parent?.add(shell);
  }
}
