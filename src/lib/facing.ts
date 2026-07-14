/** Screen-facing presets on the fixed isometric camera. */
export type FacingId =
  | "away-tr"
  | "away-tl"
  | "toward-br"
  | "toward-bl"
  | "custom";

export type FacingPreset = {
  id: FacingId;
  label: string;
  /** Y rotation (radians) applied to the model in the bake scene. */
  rotationY: number;
  /** Appended to the SD concept prompt so mesh matches bake facing. */
  conceptHint: string;
};

/**
 * Camera is locked (Sea of Stars–style iso). Model +Z is “forward”.
 * Default away-tr: facing away toward top-right of frame.
 */
export const FACING_PRESETS: FacingPreset[] = [
  {
    id: "away-tr",
    label: "Away · top-right (default)",
    rotationY: Math.PI,
    conceptHint:
      "isometric low-top-down view, character facing away from camera toward the top-right of the frame, back three-quarter, Sea of Stars / SNES JRPG angle",
  },
  {
    id: "away-tl",
    label: "Away · top-left",
    rotationY: -Math.PI / 2,
    conceptHint:
      "isometric low-top-down view, character facing away from camera toward the top-left of the frame, back three-quarter, Sea of Stars / SNES JRPG angle",
  },
  {
    id: "toward-br",
    label: "Toward · bottom-right",
    rotationY: Math.PI / 2,
    conceptHint:
      "isometric low-top-down view, character facing toward the camera at the bottom-right of the frame, front three-quarter, Sea of Stars / SNES JRPG angle",
  },
  {
    id: "toward-bl",
    label: "Toward · bottom-left",
    rotationY: 0,
    conceptHint:
      "isometric low-top-down view, character facing toward the camera at the bottom-left of the frame, front three-quarter, Sea of Stars / SNES JRPG angle",
  },
];

export const CUSTOM_FACING: FacingPreset = {
  id: "custom",
  label: "Custom",
  rotationY: 0,
  conceptHint:
    "isometric low-top-down view, custom free rotation, Sea of Stars / SNES JRPG angle",
};

export const DEFAULT_FACING: FacingId = "away-tr";

const FACING_STORAGE_KEY = "3d-sprite-gen:iso-facing-v1";

export type FacingPersist = {
  facing: FacingId;
  /** Kept for custom / free drag so reload restores the orbit. */
  rotationX: number;
  rotationY: number;
};

function isFacingId(v: unknown): v is FacingId {
  return (
    v === "away-tr" ||
    v === "away-tl" ||
    v === "toward-br" ||
    v === "toward-bl" ||
    v === "custom"
  );
}

export function loadFacingPersist(): FacingPersist {
  const fallback: FacingPersist = {
    facing: DEFAULT_FACING,
    rotationX: 0,
    rotationY: getFacing(DEFAULT_FACING).rotationY,
  };
  try {
    const raw = localStorage.getItem(FACING_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<FacingPersist>;
    const facing = isFacingId(parsed.facing) ? parsed.facing : DEFAULT_FACING;
    const rotX = Number(parsed.rotationX);
    const rotY = Number(parsed.rotationY);
    if (facing === "custom") {
      return {
        facing,
        rotationX: Number.isFinite(rotX) ? rotX : 0,
        rotationY: Number.isFinite(rotY) ? rotY : getFacing(DEFAULT_FACING).rotationY,
      };
    }
    // Named presets always use canonical yaw (ignore stale custom angles).
    return {
      facing,
      rotationX: 0,
      rotationY: getFacing(facing).rotationY,
    };
  } catch {
    return fallback;
  }
}

export function saveFacingPersist(state: FacingPersist) {
  try {
    localStorage.setItem(FACING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getFacing(id: FacingId): FacingPreset {
  if (id === "custom") return CUSTOM_FACING;
  return FACING_PRESETS.find((p) => p.id === id) ?? FACING_PRESETS[0]!;
}

/** Full text sent into concept generation (character + facing). */
export function composeConceptPrompt(characterPrompt: string, facingId: FacingId): string {
  const hint = getFacing(facingId).conceptHint;
  const base = characterPrompt.trim().replace(/,+\s*$/, "");
  return `${base}, ${hint}`;
}
