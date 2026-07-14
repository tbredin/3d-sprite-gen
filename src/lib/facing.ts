/** Screen-facing presets on the fixed isometric camera. */
export type FacingId = "away-tr" | "away-tl" | "toward-br" | "toward-bl";

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

export const DEFAULT_FACING: FacingId = "away-tr";

export function getFacing(id: FacingId): FacingPreset {
  return FACING_PRESETS.find((p) => p.id === id) ?? FACING_PRESETS[0];
}

/** Full text sent into concept generation (character + facing). */
export function composeConceptPrompt(characterPrompt: string, facingId: FacingId): string {
  const hint = getFacing(facingId).conceptHint;
  const base = characterPrompt.trim().replace(/,+\s*$/, "");
  return `${base}, ${hint}`;
}
