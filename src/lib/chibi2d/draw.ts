import type { DrawCtx, Pt } from "./types";

/** Classic SNES JRPG iso elevation (matches `isoCamera.tsx`). */
const EL = Math.atan(1 / Math.SQRT2);
const SIN_EL = Math.sin(EL);
const COS_EL = Math.cos(EL);
const SQRT_HALF = Math.SQRT1_2;

/**
 * Project character-local (x,y,z) → screen pixels.
 * +X right, +Y up, +Z forward (same as the 3D chibi root).
 * `yaw` rotates the model like BakeCanvas `rotationY`.
 */
export function project(ctx: DrawCtx, x: number, y: number, z: number): Pt {
  const cy = Math.cos(ctx.yaw);
  const sy = Math.sin(ctx.yaw);
  const ry = y + ctx.bodyY;
  const rx = x * cy + z * sy;
  const rz = -x * sy + z * cy;
  const isoX = (rx - rz) * SQRT_HALF;
  const isoY = ry * SIN_EL + (rx + rz) * SQRT_HALF * COS_EL;
  return {
    x: ctx.ox + isoX * ctx.scale,
    y: ctx.oy - isoY * ctx.scale,
  };
}

export function shade(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length < 6) return hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const t = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + amount * 255)));
  return `#${[t(r), t(g), t(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function withAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function fillEllipse(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
) {
  g.beginPath();
  g.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
}

export function strokeEllipse(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  lineWidth = 1,
) {
  g.beginPath();
  g.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  g.strokeStyle = color;
  g.lineWidth = lineWidth;
  g.stroke();
}

export function fillRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  radius = 0,
) {
  g.fillStyle = color;
  if (radius <= 0) {
    g.fillRect(x, y, w, h);
    return;
  }
  const r = Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fill();
}

export function fillPoly(
  g: CanvasRenderingContext2D,
  pts: Pt[],
  color: string,
) {
  if (pts.length < 3) return;
  g.beginPath();
  g.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]!.x, pts[i]!.y);
  g.closePath();
  g.fillStyle = color;
  g.fill();
}

export function fillCapsule(
  g: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  color: string,
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const rr = Math.max(0.6, r);
  g.beginPath();
  g.moveTo(x0 + nx * rr, y0 + ny * rr);
  g.lineTo(x1 + nx * rr, y1 + ny * rr);
  g.arc(x1, y1, rr, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
  g.lineTo(x0 - nx * rr, y0 - ny * rr);
  g.arc(x0, y0, rr, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
  g.closePath();
  g.fillStyle = color;
  g.fill();
}

/** Soft diamond / lozenge head silhouette in screen space. */
export function fillLozenge(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color: string,
) {
  fillPoly(
    g,
    [
      { x: cx, y: cy - h },
      { x: cx + w, y: cy },
      { x: cx, y: cy + h * 0.85 },
      { x: cx - w, y: cy },
    ],
    color,
  );
}

export function u(ctx: DrawCtx, world: number): number {
  return world * ctx.scale;
}
