import { useMemo } from "react";
import {
  CanvasTexture,
  Color,
  DoubleSide,
  MeshToonMaterial,
  NearestFilter,
} from "three";

function makeGradientMap() {
  const c = document.createElement("canvas");
  c.width = 3;
  c.height = 1;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(3, 1);
  const bands = [80, 160, 255];
  for (let i = 0; i < 3; i++) {
    img.data[i * 4] = bands[i];
    img.data[i * 4 + 1] = bands[i];
    img.data[i * 4 + 2] = bands[i];
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(c);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

function toon(color: string) {
  return new MeshToonMaterial({
    color: new Color(color),
    gradientMap: makeGradientMap(),
    side: DoubleSide,
  });
}

/**
 * Placeholder low-poly chibi: oversized head, short limbs,
 * facing +Z (away / top-right under our iso camera).
 */
export function PlaceholderChibi() {
  const mats = useMemo(
    () => ({
      robe: toon("#3d6e70"),
      trim: toon("#c7cfcc"),
      skin: toon("#e4a672"),
      hair: toon("#433455"),
      boot: toon("#322947"),
    }),
    [],
  );

  return (
    <group>
      <mesh position={[0, 0.55, 0]} material={mats.robe}>
        <boxGeometry args={[0.55, 0.7, 0.35]} />
      </mesh>
      <mesh position={[0, 0.28, 0.02]} material={mats.trim}>
        <boxGeometry args={[0.58, 0.1, 0.38]} />
      </mesh>
      <mesh position={[0, 1.15, 0.02]} material={mats.skin}>
        <boxGeometry args={[0.55, 0.55, 0.5]} />
      </mesh>
      <mesh position={[0, 1.38, -0.05]} material={mats.hair}>
        <boxGeometry args={[0.58, 0.28, 0.55]} />
      </mesh>
      <mesh position={[-0.42, 0.55, 0]} material={mats.robe}>
        <boxGeometry args={[0.18, 0.55, 0.18]} />
      </mesh>
      <mesh position={[0.42, 0.55, 0]} material={mats.robe}>
        <boxGeometry args={[0.18, 0.55, 0.18]} />
      </mesh>
      <mesh position={[-0.16, 0.05, 0]} material={mats.boot}>
        <boxGeometry args={[0.2, 0.35, 0.22]} />
      </mesh>
      <mesh position={[0.16, 0.05, 0]} material={mats.boot}>
        <boxGeometry args={[0.2, 0.35, 0.22]} />
      </mesh>
    </group>
  );
}
