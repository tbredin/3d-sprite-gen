import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import {
  assembleCharacter,
  applySpriteFaceCheat,
  oppositeLeadSide,
  stickyHeadYaw,
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
    const disposeMat = (m: {
      dispose: () => void;
      map?: { dispose: () => void } | null;
    }) => {
      m.map?.dispose();
      m.dispose();
    };
    if (Array.isArray(mesh.material)) {
      for (const m of mesh.material) disposeMat(m);
    } else if (mesh.material) {
      disposeMat(mesh.material);
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
  yawRef,
  mirror = false,
  showEyes = true,
}: {
  spec: CharacterSpec;
  /** Body yaw from the iso facing control — drives FF-style face cheating. */
  rotationY?: number;
  /**
   * Live yaw (e.g. turntable). When set, face cheat follows this ref each frame
   * instead of the static `rotationY` prop.
   */
  yawRef?: MutableRefObject<number>;
  /**
   * Flip left/right by assembling the opposite lead (weapon + torso yaw + stance).
   * Keeps body facing / BakeCanvas rotationY unchanged.
   */
  mirror?: boolean;
  /** Toggle the cartoon eye plates. */
  showEyes?: boolean;
}) {
  const effectiveSpec = useMemo(
    () => (mirror ? mirroredSpec(spec) : spec),
    [spec, mirror],
  );

  const group = useMemo(
    () => assembleCharacter(effectiveSpec, { showEyes }),
    [effectiveSpec, showEyes],
  );
  const headPivot = useMemo(() => group.getObjectByName("headPivot") ?? null, [group]);
  const liveYaw = useRef(yawRef);
  liveYaw.current = yawRef;

  // Sticky head: lean the head a little toward the camera on top of the body
  // yaw, then cull eyes against where the head actually points. Keyed to yaw
  // only, so it works for presets, drag, and the turntable alike.
  const applyHeadAndFace = useCallback(
    (bodyYaw: number) => {
      const delta = stickyHeadYaw(bodyYaw);
      if (headPivot) headPivot.rotation.y = delta;
      applySpriteFaceCheat(group, bodyYaw + delta);
    },
    [group, headPivot],
  );

  useLayoutEffect(() => {
    if (yawRef) return;
    applyHeadAndFace(rotationY);
  }, [applyHeadAndFace, rotationY, yawRef]);

  useFrame(() => {
    const ref = liveYaw.current;
    if (!ref) return;
    applyHeadAndFace(ref.current);
  });

  useEffect(() => () => disposeObject(group), [group]);

  return <primitive object={group} />;
}
