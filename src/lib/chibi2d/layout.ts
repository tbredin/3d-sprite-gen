import {
  applyBodyScale,
  resolveLeadSide,
  oppositeLeadSide,
} from "../chibi";
import { CHIBI, LAYOUT, CHARACTER_PIVOT_Y } from "../chibi/units";
import { getFacing } from "../facing";
import type { CharacterSpec, PartVisibility } from "../chibi";
import { DEFAULT_PART_VISIBILITY } from "../chibi";
import type { DrawCtx, DrawCharacterOptions, IsoDir2D } from "./types";

export type Anchors = {
  footY: number;
  hipY: number;
  shoulderY: number;
  headCenterY: number;
  headTopY: number;
  hipWidth: number;
  shoulderWidth: number;
  skullR: number;
  headTall: number;
  armThick: number;
  legThick: number;
  armLength: number;
  handSize: number;
  footLength: number;
  footWidth: number;
  torsoDepth: number;
};

/**
 * Neck-pivoted head proportions — mirrors 3D `headPivot` scale so Size/Height
 * grow the skull (and hair/helm/face) up from the collar, not about mid-skull.
 */
export type HeadProps = {
  size: number;
  yScale: number;
  /** World-Y of the neck joint. */
  neckY: number;
  /** World-Y of the scaled head centre. */
  centerY: number;
  /** Horizontal skull radius after Size. */
  r: number;
};

export function headProps(spec: CharacterSpec, a: Anchors): HeadProps {
  const size = Math.max(0.55, Math.min(1.45, spec.head?.size ?? 1));
  const yScale = Math.max(0.55, Math.min(1.55, spec.head?.yScale ?? 1));
  const neckY = a.shoulderY + 0.1;
  const centerY = neckY + (a.headCenterY - neckY) * size * yScale;
  return { size, yScale, neckY, centerY, r: a.skullR * size };
}

export function anchorsForScale(bodyScale: number): Anchors {
  applyBodyScale(bodyScale);
  return {
    footY: LAYOUT.footY,
    hipY: LAYOUT.hipY,
    shoulderY: LAYOUT.shoulderY,
    headCenterY: LAYOUT.headCenterY,
    headTopY: LAYOUT.headTopY,
    hipWidth: CHIBI.hipWidth,
    shoulderWidth: CHIBI.shoulderWidth,
    skullR: CHIBI.skullR,
    headTall: CHIBI.headTall,
    armThick: CHIBI.armThick,
    legThick: CHIBI.legThick,
    armLength: CHIBI.armLength,
    handSize: CHIBI.handSize,
    footLength: CHIBI.footLength,
    footWidth: CHIBI.footWidth,
    torsoDepth: CHIBI.torsoDepth,
  };
}

export function makeDrawCtx(
  canvasCtx: CanvasRenderingContext2D,
  spec: CharacterSpec,
  opts: DrawCharacterOptions,
): { draw: DrawCtx; anchors: Anchors; visibility: PartVisibility } {
  const anchors = anchorsForScale(opts.bodyScale);
  const facing = opts.facing;
  const yaw = getFacing(facing).rotationY;
  const size = opts.size;
  // Fit the full chibi (plus a little headroom for hats/weapons) into the bake.
  const worldH = CHIBI.totalHeight * 1.35;
  const scale = size / worldH;
  const lead = opts.mirror
    ? oppositeLeadSide(resolveLeadSide(spec.leadSide))
    : resolveLeadSide(spec.leadSide);

  const draw: DrawCtx = {
    ctx: canvasCtx,
    size,
    facing,
    scale,
    ox: size / 2,
    oy: size / 2 + CHARACTER_PIVOT_Y * scale * 0.15,
    yaw,
    // Body-only offset — head drawers zero this while painting.
    bodyY: opts.bodyY ?? 0,
    showFace: facing === "toward-br" || facing === "toward-bl",
    flipX: facing === "toward-bl" || facing === "away-tl" ? -1 : 1,
    spec,
    lead,
  };

  return {
    draw,
    anchors,
    visibility: opts.partVisibility ?? DEFAULT_PART_VISIBILITY,
  };
}

export function isToward(facing: IsoDir2D): boolean {
  return facing === "toward-br" || facing === "toward-bl";
}
