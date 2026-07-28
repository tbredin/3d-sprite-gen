import type { BrowStyle, EyeStyle } from "../../chibi";
import { fillEllipse, fillRect, project, shade, u } from "../draw";
import type { DrawCtx } from "../types";
import { headProps, type Anchors } from "../layout";

/**
 * Eye plate sizes — ~50% of the first 2D pass so plates read as 2–3 bake
 * pixels at 48px (closer to the 3D faceTexture footprint).
 */
function eyeLayout(style: EyeStyle) {
  switch (style) {
    case "square":
      return { w: 0.055, h: 0.065, iris: 0.5, drop: 0 };
    case "flat":
      return { w: 0.065, h: 0.045, iris: 0.5, drop: 0.01 };
    case "lean":
      return { w: 0.045, h: 0.075, iris: 0.5, drop: 0.015 };
    case "spark":
      return { w: 0.05, h: 0.06, iris: 0.75, drop: 0.015 };
    case "lid":
      return { w: 0.055, h: 0.04, iris: 0.5, drop: 0.01 };
    case "classic":
    default:
      return { w: 0.05, h: 0.06, iris: 0.5, drop: 0.015 };
  }
}

function drawOneEye(
  ctx: DrawCtx,
  cx: number,
  cy: number,
  side: 1 | -1,
  style: EyeStyle,
  iris: string,
) {
  const L = eyeLayout(style);
  const ew = u(ctx, L.w);
  const eh = u(ctx, L.h);
  const g = ctx.ctx;
  fillEllipse(g, cx, cy, ew, eh, "#f7f4ec");
  const irisW = ew * L.iris;
  const irisX = cx + side * ew * (1 - L.iris) * 0.35;
  fillEllipse(g, irisX, cy + u(ctx, L.drop) * 0.3, irisW, eh * 0.85, iris);
  fillEllipse(g, cx - side * ew * 0.25, cy - eh * 0.25, ew * 0.18, eh * 0.18, "#ffffff");
}

function drawBrow(
  ctx: DrawCtx,
  cx: number,
  cy: number,
  side: 1 | -1,
  style: BrowStyle,
  color: string,
) {
  if (style === "none") return;
  const g = ctx.ctx;
  const w = u(ctx, style === "short" ? 0.035 : style === "thick" ? 0.06 : 0.05);
  const h = u(ctx, style === "thick" ? 0.018 : style === "thin" ? 0.008 : 0.011);
  const lift =
    style === "arched" ? -u(ctx, 0.01) : style === "angled" ? -u(ctx, 0.005) : 0;
  const tilt = style === "angled" ? side * 0.35 : style === "soft" ? side * 0.1 : 0;
  g.save();
  g.translate(cx, cy + lift);
  g.rotate(tilt);
  fillRect(g, -w, -h / 2, w * 2, h, color, h);
  g.restore();
}

/**
 * Eyes sit on the lower-forward face pad (matches 3D `faceY` + `EYE_V_FRAC`),
 * projected in character space so toward-br / toward-bl read as ¾ iso — not
 * a face-on billboard centered on the skull.
 */
export function drawFace(ctx: DrawCtx, a: Anchors, opts?: { hideLeft?: boolean; hideRight?: boolean }) {
  if (!ctx.showFace) return;
  const face = ctx.spec.face;
  const style: EyeStyle = face?.style ?? "classic";
  const brow: BrowStyle = face?.browStyle ?? "thin";
  const iris = face?.eyeColor ?? "#2a1a10";
  const spacing = face?.spacing ?? 1;
  const eyeScale = face?.scale ?? 1;
  const yOff = face?.y ?? 0;
  const hp = headProps(ctx.spec, a);

  // Eye-Y slider response in 2D: stronger than pure proportional scaling so
  // ±0.25 gives a clearly visible adjustment at 32–64px.
  const EYE_Y_RESPONSE = 0.55;
  // Requested nudge: ~10px on the upscaled preview (display is 4x native).
  const EYE_DRAW_NUDGE_PX = 2.5;
  // Lower default eye row for iso readability; slider still fine-tunes from here.
  const faceCy = hp.centerY + hp.r * hp.yScale * 0.03 + yOff * EYE_Y_RESPONSE;
  const faceCz = hp.r * 0.48;
  // Bias the face mass toward the camera-facing diagonal (screen down+out).
  const faceCx = ctx.flipX * hp.r * 0.1;
  const halfSep = hp.r * 0.2 * spacing * eyeScale;

  const center = project(ctx, faceCx, faceCy, faceCz);
  // Facing direction on screen (sample forward in local +Z).
  const fwd2 = project(ctx, faceCx, faceCy, faceCz + hp.r * 0.4);
  const fx = fwd2.x - center.x;
  const fy = fwd2.y - center.y;
  const fl = Math.hypot(fx, fy) || 1;
  const nx = fx / fl;
  const ny = fy / fl;
  // Eye line must be perpendicular to facing axis.
  const ex = -ny;
  const ey = nx;
  const sepPx = u(ctx, halfSep);
  const left = { x: center.x - ex * sepPx, y: center.y - ey * sepPx };
  const right = { x: center.x + ex * sepPx, y: center.y + ey * sepPx };
  // Near eye (toward camera side) sits slightly lower in iso reads.
  const nearIsRight = ctx.flipX > 0;
  const browLift = u(ctx, 0.055 * eyeScale * hp.yScale);

  if (!opts?.hideLeft) {
    const cy = left.y + (nearIsRight ? u(ctx, 0.008) : 0) + EYE_DRAW_NUDGE_PX;
    drawOneEye(ctx, left.x, cy, -1, style, iris);
    drawBrow(ctx, left.x, cy - browLift, -1, brow, shade(ctx.spec.skin, -0.35));
  }
  if (!opts?.hideRight) {
    const cy = right.y + (nearIsRight ? 0 : u(ctx, 0.008)) + EYE_DRAW_NUDGE_PX;
    drawOneEye(ctx, right.x, cy, 1, style, iris);
    drawBrow(ctx, right.x, cy - browLift, 1, brow, shade(ctx.spec.skin, -0.35));
  }
}
