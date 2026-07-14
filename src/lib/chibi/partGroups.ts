import { Color, type Mesh, MeshBasicMaterial, type Object3D } from "three";

/**
 * Stable integer IDs for the major part groups used by the per-part outline
 * spike. Assigned once in assembleCharacter via tagPartGroup — never derived
 * from spec content — so they stay stable across rerolls/presets.
 */
export const PartGroupId = {
  NONE: 0,
  HEAD: 1,
  TORSO: 2,
  ARMS: 3,
  LEGS: 4,
  WEAPON: 5,
  ACCESSORY: 6,
} as const;

export type PartGroupId = (typeof PartGroupId)[keyof typeof PartGroupId];

/**
 * Flat colors used to paint the ID pass. Channels are pure 0/1 so the
 * rendered byte is 0x00 or 0xff regardless of any sRGB/linear encoding the
 * renderer applies — the ID buffer only needs equality checks, but keeping
 * the encoding round-trip lossless makes decoding trivial too.
 */
const ID_COLOR: Record<number, [number, number, number]> = {
  [PartGroupId.HEAD]: [1, 0, 0],
  [PartGroupId.TORSO]: [0, 1, 0],
  [PartGroupId.ARMS]: [0, 0, 1],
  [PartGroupId.LEGS]: [1, 1, 0],
  [PartGroupId.WEAPON]: [1, 0, 1],
  [PartGroupId.ACCESSORY]: [0, 1, 1],
};

const idMaterials = new Map<number, MeshBasicMaterial>();

/** Cached flat/unlit material that encodes a part group id as a solid color. */
export function getPartGroupMaterial(id: number): MeshBasicMaterial {
  const existing = idMaterials.get(id);
  if (existing) return existing;
  const [r, g, b] = ID_COLOR[id] ?? [0, 0, 0];
  const mat = new MeshBasicMaterial({
    color: new Color(r, g, b),
    fog: false,
    toneMapped: false,
  });
  idMaterials.set(id, mat);
  return mat;
}

/** Tag every mesh under `root` (skipping outline shells) with a part group id. */
export function tagPartGroup(root: Object3D, id: PartGroupId) {
  root.traverse((obj) => {
    const m = obj as Mesh;
    if (!m.isMesh || m.userData.isOutline) return;
    m.userData.partGroupId = id;
  });
}

/** Decode one RGBA id-pass pixel back to a part group id (0 = background). */
export function decodePartGroupPixel(
  r: number,
  g: number,
  b: number,
  a: number,
): number {
  if (a < 8) return PartGroupId.NONE;
  const rb = r > 127 ? 1 : 0;
  const gb = g > 127 ? 1 : 0;
  const bb = b > 127 ? 1 : 0;
  for (const key of Object.keys(ID_COLOR)) {
    const id = Number(key);
    const [ir, ig, ib] = ID_COLOR[id]!;
    if (ir === rb && ig === gb && ib === bb) return id;
  }
  return PartGroupId.NONE;
}
