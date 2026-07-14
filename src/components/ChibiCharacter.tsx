import { useEffect, useLayoutEffect, useMemo } from "react";
import {
  assembleCharacter,
  applySpriteFaceCheat,
  oppositeLeadSide,
  type CharacterSpec,
} from "../lib/chibi";
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

/**
 * True L↔R mirror of an asymmetric fighting stance: swap leadSide (and any
 * explicit weapon hand) then reassemble. Avoids `scale.x = -1`, which conjugates
 * the ~45° torso yaw and reads as an extra turn instead of a side swap.
 */
function mirroredSpec(spec: CharacterSpec): CharacterSpec {
  const lead = oppositeLeadSide(spec.leadSide);
  const next: CharacterSpec = { ...spec, leadSide: lead };
  if (spec.weapon && spec.weapon.hand) {
    next.weapon = {
      ...spec.weapon,
      hand: oppositeLeadSide(spec.weapon.hand),
    };
  }
  return next;
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
  /**
   * Flip left/right by assembling the opposite lead (weapon + torso yaw + stance).
   * Keeps body facing / BakeCanvas rotationY unchanged.
   */
  mirror?: boolean;
}) {
  const effectiveSpec = useMemo(
    () => (mirror ? mirroredSpec(spec) : spec),
    [spec, mirror],
  );

  const group = useMemo(() => assembleCharacter(effectiveSpec), [effectiveSpec]);

  useLayoutEffect(() => {
    applySpriteFaceCheat(group, rotationY);
  }, [group, rotationY]);

  useEffect(() => () => disposeObject(group), [group]);

  return <primitive object={group} />;
}
