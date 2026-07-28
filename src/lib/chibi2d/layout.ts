import {
  applyBodyScale,
  clampBodyScale,
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

/** Global 2D art-direction boost for taller heads. */
const HEAD_HEIGHT_2D_MULT = 1.25;
/** Global 2D head size trim (user-tuned baseline correction). */
const HEAD_SIZE_2D_BIAS = -0.2;
/** Lower body stack baseline in 2D (head stays pinned in drawCharacter). */
const BODY_BASELINE_Y_2D = -0.15;

export function headProps(spec: CharacterSpec, a: Anchors): HeadProps {
  const sizeBase = Math.max(0.55, Math.min(1.45, spec.head?.size ?? 1));
  const size = Math.max(0.55, Math.min(1.45, sizeBase + HEAD_SIZE_2D_BIAS));
  const yScaleBase = Math.max(0.55, Math.min(1.55, spec.head?.yScale ?? 1));
  const yScale = yScaleBase * HEAD_HEIGHT_2D_MULT;
  const neckY = a.shoulderY + 0.1;
  const centerY = neckY + (a.headCenterY - neckY) * size * yScale;
  return { size, yScale, neckY, centerY, r: a.skullR * size };
}

/**
 * 2D body slider recenter:
 * - Keep UI range the same
 * - Make slider midpoint (~1.0) render like old ~1.45 body bulk in 2D
 */
const BODY_SCALE_2D_CENTER_BIAS = 0.45;

export function anchorsForScale(bodyScale: number): Anchors {
  const target2DScale = bodyScale + BODY_SCALE_2D_CENTER_BIAS;
  const bounded = clampBodyScale(target2DScale);
  applyBodyScale(bounded);
  // Allow >1.5 visual bulk in 2D by extending body dims past CHIBI clamp.
  const overflowMul = target2DScale > bounded ? target2DScale / bounded : 1;
  const shoulderY = LAYOUT.shoulderY;
  const hipDelta = (LAYOUT.hipY - shoulderY) * overflowMul;
  const footDelta = (LAYOUT.footY - shoulderY) * overflowMul;
  return {
    footY: shoulderY + footDelta,
    hipY: shoulderY + hipDelta,
    shoulderY,
    headCenterY: LAYOUT.headCenterY,
    headTopY: LAYOUT.headTopY,
    hipWidth: CHIBI.hipWidth * overflowMul,
    shoulderWidth: CHIBI.shoulderWidth * overflowMul,
    skullR: CHIBI.skullR,
    headTall: CHIBI.headTall,
    armThick: CHIBI.armThick * overflowMul,
    legThick: CHIBI.legThick * overflowMul,
    armLength: CHIBI.armLength * overflowMul,
    handSize: CHIBI.handSize,
    footLength: CHIBI.footLength,
    footWidth: CHIBI.footWidth,
    torsoDepth: CHIBI.torsoDepth * overflowMul,
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
    bodyY: (opts.bodyY ?? 0) + BODY_BASELINE_Y_2D,
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
