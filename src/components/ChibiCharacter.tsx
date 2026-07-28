import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import {
  assembleCharacter,
  applySpriteFaceCheat,
  oppositeLeadSide,
  stickyHeadYaw,
  DEFAULT_PART_VISIBILITY,
  type CharacterSpec,
  type PartVisibility,
} from "../lib/chibi";
import { applyBodyScale } from "../lib/chibi/units";
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

/** Strip head size/height so proportion slider drags don't rebuild the mesh. */
function meshTopologySpec(spec: CharacterSpec): CharacterSpec {
  return {
    ...spec,
    head: {
      ...spec.head,
      size: 1,
      yScale: 1,
    },
  };
}

/**
 * R3F wrapper around assembleCharacter.
 * Rebuilds when topology / eyes / body scale change; head size & height update
 * the existing headPivot scale so slider drags stay live.
 */
export function ChibiCharacter({
  spec,
  bodyScale = 1,
  bodyY = 0,
  rotationY = 0,
  yawRef,
  mirror = false,
  partVisibility = DEFAULT_PART_VISIBILITY,
}: {
  spec: CharacterSpec;
  /** Continuous body scale — triggers reassembly (layout units). */
  bodyScale?: number;
  /**
   * Vertical offset for torso/arms/legs only (head stays pinned).
   * Live-updated without reassembling the mesh.
   */
  bodyY?: number;
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
  /** Per-row show/hide (eyes + body parts). */
  partVisibility?: PartVisibility;
}) {
  const effectiveSpec = useMemo(
    () => (mirror ? mirroredSpec(spec) : spec),
    [spec, mirror],
  );

  const headSize = effectiveSpec.head?.size ?? 1;
  const headYScale = effectiveSpec.head?.yScale ?? 1;

  // Coalesce body-scale rebuilds to one per frame while the slider is dragged.
  const [assembledScale, setAssembledScale] = useState(bodyScale);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAssembledScale(bodyScale));
    return () => cancelAnimationFrame(id);
  }, [bodyScale]);

  // Stable when only head proportions change — avoids tearing down the mesh
  // on every Size/Height slider tick.
  const topologyKey = JSON.stringify(meshTopologySpec(effectiveSpec));
  const visibilityKey = JSON.stringify(partVisibility);

  const group = useMemo(() => {
    applyBodyScale(assembledScale);
    const vis = JSON.parse(visibilityKey) as PartVisibility;
    return assembleCharacter(JSON.parse(topologyKey) as CharacterSpec, {
      showEyes: vis.eyes,
      showHead: vis.head,
      showTorso: vis.torso,
      showArms: vis.arms,
      showLegs: vis.legs,
    });
  }, [topologyKey, visibilityKey, assembledScale]);

  const headPivot = useMemo(
    () => group.getObjectByName("headPivot") ?? null,
    [group],
  );
  const upperBody = useMemo(
    () => group.getObjectByName("upperBody") ?? null,
    [group],
  );
  const legs = useMemo(() => group.getObjectByName("legs") ?? null, [group]);

  // Live proportion updates — no reassemble.
  useLayoutEffect(() => {
    if (!headPivot) return;
    headPivot.scale.set(headSize, headSize * headYScale, headSize);
  }, [headPivot, headSize, headYScale]);

  // Body Y fine-tune — shift torso/arms + legs; head/neck stay put.
  useLayoutEffect(() => {
    if (upperBody) upperBody.position.y = bodyY;
    if (legs) legs.position.y = bodyY;
  }, [upperBody, legs, bodyY]);

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
