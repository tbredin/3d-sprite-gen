import { useEffect, useLayoutEffect, useMemo } from "react";
import { assembleCharacter, applySpriteFaceCheat, type CharacterSpec } from "../lib/chibi";
import type { Object3D } from "three";

function disposeObject(root: Object3D) {
  root.traverse((obj) => {
    const mesh = obj as {
      isMesh?: boolean;
      geometry?: { dispose: () => void };
      material?: { dispose: () => void } | { dispose: () => void }[];
    };
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    if (Array.isArray(mesh.material)) {
      for (const m of mesh.material) m.dispose();
    } else {
      mesh.material?.dispose();
    }
  });
}

/** R3F wrapper around assembleCharacter — rebuilds when spec identity changes. */
export function ChibiCharacter({
  spec,
  rotationY = 0,
  mirror = false,
}: {
  spec: CharacterSpec;
  /** Body yaw from the iso facing control — drives FF-style face cheating. */
  rotationY?: number;
  /** Flip left/right via X-scale −1; keeps feet on ground and facing yaw unchanged. */
  mirror?: boolean;
}) {
  const group = useMemo(() => assembleCharacter(spec), [spec]);

  useLayoutEffect(() => {
    applySpriteFaceCheat(group, rotationY);
  }, [group, rotationY]);

  useEffect(() => () => disposeObject(group), [group]);

  return (
    <group scale={[mirror ? -1 : 1, 1, 1]}>
      <primitive object={group} />
    </group>
  );
}
