import type { BrowStyle, EyeStyle } from "../../chibi";
import { fillEllipse, fillRect, project, shade, u } from "../draw";
import type { DrawCtx } from "../types";
import type { Anchors } from "../layout";

function eyeLayout(style: EyeStyle) {
  switch (style) {
    case "square":
      return { w: 0.11, h: 0.13, iris: 0.5, drop: 0 };
    case "flat":
      return { w: 0.13, h: 0.09, iris: 0.5, drop: 0.02 };
    case "lean":
      return { w: 0.09, h: 0.15, iris: 0.5, drop: 0.03 };
    case "spark":
      return { w: 0.1, h: 0.12, iris: 0.75, drop: 0.03 };
    case "lid":
      return { w: 0.11, h: 0.08, iris: 0.5, drop: 0.02 };
    case "classic":
    default:
      return { w: 0.1, h: 0.12, iris: 0.5, drop: 0.03 };
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
  // White plate
  fillEllipse(g, cx, cy, ew, eh, "#f7f4ec");
  // Iris half toward gaze (screen-outward slightly)
  const irisW = ew * L.iris;
  const irisX = cx + side * ew * (1 - L.iris) * 0.35;
  fillEllipse(g, irisX, cy + u(ctx, L.drop) * 0.3, irisW, eh * 0.85, iris);
  // Tiny glint
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
  const w = u(ctx, style === "short" ? 0.07 : style === "thick" ? 0.12 : 0.1);
  const h = u(ctx, style === "thick" ? 0.035 : style === "thin" ? 0.015 : 0.022);
  const lift =
    style === "arched" ? -u(ctx, 0.02) : style === "angled" ? -u(ctx, 0.01) : 0;
  const tilt = style === "angled" ? side * 0.35 : style === "soft" ? side * 0.1 : 0;
  g.save();
  g.translate(cx, cy + lift);
  g.rotate(tilt);
  fillRect(g, -w, -h / 2, w * 2, h, color, h);
  g.restore();
}

export function drawFace(ctx: DrawCtx, a: Anchors, opts?: { hideLeft?: boolean; hideRight?: boolean }) {
  if (!ctx.showFace) return;
  const face = ctx.spec.face;
  const style: EyeStyle = face?.style ?? "classic";
  const brow: BrowStyle = face?.browStyle ?? "thin";
  const iris = face?.eyeColor ?? "#2a1a10";
  const spacing = face?.spacing ?? 1;
  const eyeScale = face?.scale ?? 1;
  const yOff = face?.y ?? 0;

  const head = project(ctx, 0, a.headCenterY + yOff * 0.12, a.skullR * 0.55);
  const gap = u(ctx, a.skullR * 0.42 * spacing * eyeScale);
  const leftX = head.x - gap * ctx.flipX;
  const rightX = head.x + gap * ctx.flipX;
  const ey = head.y - u(ctx, 0.02);

  // Screen-left / screen-right relative to flip
  if (!opts?.hideLeft) {
    drawOneEye(ctx, leftX, ey, -1 as 1 | -1, style, iris);
    drawBrow(ctx, leftX, ey - u(ctx, 0.1 * eyeScale), -1, brow, shade(ctx.spec.skin, -0.35));
  }
  if (!opts?.hideRight) {
    drawOneEye(ctx, rightX, ey, 1 as 1 | -1, style, iris);
    drawBrow(ctx, rightX, ey - u(ctx, 0.1 * eyeScale), 1, brow, shade(ctx.spec.skin, -0.35));
  }
}
