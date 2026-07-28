import type { HelmetStyle } from "../../chibi";
import { helmetModeFor } from "../../chibi/helmetMode";
import { fillCapsule, fillEllipse, fillPoly, fillRect, project, shade, u } from "../draw";
import type { DrawCtx } from "../types";
import { headProps, type Anchors } from "../layout";

type HelmCtx = {
  g: CanvasRenderingContext2D;
  cx: number;
  cy: number;
  r: number;
  /** Head Height scale — vertical offsets / crown stretch follow the skull. */
  yScale: number;
  color: string;
  dark: string;
  light: string;
  visor: string;
  flip: number;
  face: boolean;
  style: HelmetStyle;
};

function helmBase(ctx: DrawCtx, a: Anchors): HelmCtx | null {
  const helmet = ctx.spec.helmet;
  if (!helmet || helmet.style === "none") return null;
  const hp = headProps(ctx.spec, a);
  const c = project(ctx, 0, hp.centerY, 0);
  const front = project(
    ctx,
    ctx.flipX * hp.r * 0.14,
    hp.centerY - hp.r * hp.yScale * 0.08,
    hp.r * 0.42,
  );
  const back = project(
    ctx,
    -ctx.flipX * hp.r * 0.1,
    hp.centerY - hp.r * hp.yScale * 0.02,
    -hp.r * 0.26,
  );
  const aPt = ctx.showFace ? front : back;
  const r = u(ctx, hp.r);
  const color = helmet.color;
  return {
    g: ctx.ctx,
    cx: c.x * 0.45 + aPt.x * 0.55,
    cy: c.y * 0.45 + aPt.y * 0.55,
    r,
    yScale: hp.yScale,
    color,
    dark: shade(color, -0.15),
    light: shade(color, 0.12),
    visor: helmet.visor ?? shade(color, -0.25),
    flip: ctx.flipX,
    face: ctx.showFace,
    style: helmet.style,
  };
}

function withIsoHeadTransform(h: HelmCtx, draw: () => void) {
  const skew = h.face ? 0.2 * h.flip : -0.12 * h.flip;
  // Iso foreshortening × head Height so helms grow/shrink with the skull.
  const yScale = (h.face ? 0.93 : 0.96) * h.yScale;
  h.g.save();
  h.g.translate(h.cx, h.cy);
  h.g.transform(1, 0, skew, yScale, 0, 0);
  h.g.translate(-h.cx, -h.cy);
  draw();
  h.g.restore();
}

function lid(h: HelmCtx, y = -0.75, rx = 0.85, ry = 0.22) {
  fillEllipse(h.g, h.cx, h.cy + h.r * y, h.r * rx, h.r * ry, h.dark);
}

function jaw(h: HelmCtx, y = 0.55, rx = 0.7, ry = 0.4) {
  fillEllipse(h.g, h.cx, h.cy + h.r * y, h.r * rx, h.r * ry, h.dark);
}

function dualSlits(h: HelmCtx, y = -0.05) {
  if (!h.face) return;
  const vw = h.r * 0.55;
  const vh = Math.max(1.2, h.r * 0.08);
  fillRect(h.g, h.cx - vw, h.cy + h.r * (y - 0.08), vw * 2, vh, h.visor);
  fillRect(h.g, h.cx - vw * 0.85, h.cy + h.r * (y + 0.08), vw * 1.7, vh * 0.85, h.visor);
  fillRect(h.g, h.cx - h.r * 0.06, h.cy + h.r * (y - 0.12), h.r * 0.12, h.r * 0.4, h.color);
}

function singleSlit(h: HelmCtx, y = -0.05, w = 1.1) {
  if (!h.face) return;
  fillRect(h.g, h.cx - h.r * w * 0.5, h.cy + h.r * y, h.r * w, Math.max(1.5, h.r * 0.12), h.visor);
}

function tOpening(h: HelmCtx) {
  if (!h.face) return;
  fillRect(h.g, h.cx - h.r * 0.55, h.cy - h.r * 0.08, h.r * 1.1, Math.max(1.5, h.r * 0.12), h.visor);
  fillRect(h.g, h.cx - h.r * 0.1, h.cy - h.r * 0.05, h.r * 0.2, h.r * 0.55, h.visor);
}

function browBand(h: HelmCtx, y = -0.25, w = 1.5, ht = 0.18) {
  if (!h.face) return;
  fillRect(h.g, h.cx - h.r * w * 0.5, h.cy + h.r * y, h.r * w, h.r * ht, h.dark);
}

function spikePoly(
  h: HelmCtx,
  x0: number,
  y0: number,
  tipX: number,
  tipY: number,
  baseW: number,
  color: string,
) {
  fillPoly(
    h.g,
    [
      { x: h.cx + x0 - baseW, y: h.cy + y0 },
      { x: h.cx + tipX, y: h.cy + tipY },
      { x: h.cx + x0 + baseW, y: h.cy + y0 },
    ],
    color,
  );
}

function wing(h: HelmCtx, side: number, color = h.light) {
  fillPoly(
    h.g,
    [
      { x: h.cx + side * h.r * 0.7, y: h.cy - h.r * 0.35 },
      { x: h.cx + side * h.r * 1.55, y: h.cy - h.r * 0.85 },
      { x: h.cx + side * h.r * 1.35, y: h.cy - h.r * 0.15 },
      { x: h.cx + side * h.r * 0.85, y: h.cy + h.r * 0.05 },
    ],
    color,
  );
}

function horn(h: HelmCtx, side: number, color: string) {
  fillPoly(
    h.g,
    [
      { x: h.cx + side * h.r * 0.55, y: h.cy - h.r * 0.45 },
      { x: h.cx + side * h.r * 1.25, y: h.cy - h.r * 1.25 },
      { x: h.cx + side * h.r * 0.35, y: h.cy - h.r * 0.55 },
    ],
    color,
  );
}

function closedShell(h: HelmCtx, boost = 1.15) {
  const rr = h.r * boost;
  fillEllipse(h.g, h.cx, h.cy, rr * 1.02, rr * 0.98, h.color);
}

function drawHelmetStyle(h: HelmCtx) {
  void helmetModeFor(h.style);

  switch (h.style) {
    case "none":
      return;
    case "knight":
      closedShell(h, 1.15);
      lid(h, -0.72, 0.9, 0.2);
      jaw(h, 0.55, 0.75, 0.42);
      browBand(h, -0.28, 1.55, 0.16);
      dualSlits(h, -0.02);
      break;
    case "knightGreat":
      fillEllipse(h.g, h.cx, h.cy, h.r * 1.15, h.r * 1.15, h.color);
      fillRect(h.g, h.cx - h.r * 0.95, h.cy - h.r * 1.05, h.r * 1.9, h.r * 0.35, h.dark);
      fillRect(h.g, h.cx - h.r * 1.05, h.cy - h.r * 0.2, h.r * 2.1, h.r * 0.12, h.dark);
      if (h.face) {
        fillRect(h.g, h.cx - h.r * 0.55, h.cy - h.r * 0.08, h.r * 1.1, Math.max(1.2, h.r * 0.1), h.visor);
        fillRect(h.g, h.cx - h.r * 0.06, h.cy - h.r * 0.35, h.r * 0.12, h.r * 0.7, h.visor);
      }
      break;
    case "knightWinged":
      closedShell(h, 1.15);
      lid(h, -0.7, 0.88, 0.2);
      jaw(h, 0.5, 0.72, 0.4);
      dualSlits(h, -0.02);
      wing(h, -1);
      wing(h, 1);
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.95, h.r * 0.18, h.r * 0.22, h.light);
      break;
    case "knightSallet":
      closedShell(h, 1.12);
      fillEllipse(h.g, h.cx, h.cy + h.r * 0.35, h.r * 0.95, h.r * 0.55, h.color);
      fillEllipse(h.g, h.cx, h.cy + h.r * 0.75, h.r * 0.55, h.r * 0.35, h.dark);
      if (!h.face) fillEllipse(h.g, h.cx, h.cy + h.r * 0.15, h.r * 0.85, h.r * 0.7, h.dark);
      singleSlit(h, -0.08, 1.2);
      spikePoly(h, 0, h.r * 0.55, 0, h.r * 0.95, h.r * 0.2, h.dark);
      break;
    case "knightBarbute":
      closedShell(h, 1.12);
      jaw(h, 0.45, 0.7, 0.45);
      tOpening(h);
      break;
    case "knightBascinet":
      closedShell(h, 1.1);
      spikePoly(h, 0, -h.r * 0.7, 0, -h.r * 1.35, h.r * 0.28, h.color);
      fillEllipse(h.g, h.cx, h.cy + h.r * 0.15, h.r * 0.85, h.r * 0.55, h.dark);
      if (h.face) {
        fillPoly(
          h.g,
          [
            { x: h.cx - h.r * 0.55, y: h.cy - h.r * 0.15 },
            { x: h.cx + h.r * 0.55, y: h.cy - h.r * 0.15 },
            { x: h.cx + h.r * 0.35, y: h.cy + h.r * 0.45 },
            { x: h.cx - h.r * 0.35, y: h.cy + h.r * 0.45 },
          ],
          h.visor,
        );
      }
      break;
    case "cap":
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.45, h.r * 1.15, h.r * 0.65, h.color);
      if (h.face) {
        fillEllipse(h.g, h.cx, h.cy - h.r * 0.15, h.r * 0.95, h.r * 0.18, h.dark);
        fillRect(h.g, h.cx - h.r * 0.7, h.cy - h.r * 0.22, h.r * 1.4, h.r * 0.12, h.color);
      } else {
        fillEllipse(h.g, h.cx, h.cy - h.r * 0.2, h.r * 1.0, h.r * 0.35, h.dark);
      }
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.95, h.r * 0.12, h.r * 0.1, h.visor);
      break;
    case "sciFi":
      closedShell(h, 1.2);
      lid(h, -0.7, 0.75, 0.16);
      browBand(h, -0.3, 1.45, 0.22);
      fillEllipse(h.g, h.cx - h.r * 0.95, h.cy + h.r * 0.05, h.r * 0.22, h.r * 0.45, h.dark);
      fillEllipse(h.g, h.cx + h.r * 0.95, h.cy + h.r * 0.05, h.r * 0.22, h.r * 0.45, h.dark);
      jaw(h, 0.6, 0.65, 0.35);
      if (h.face) {
        fillRect(h.g, h.cx - h.r * 0.65, h.cy - h.r * 0.05, h.r * 1.3, h.r * 0.2, h.visor);
        fillRect(h.g, h.cx - h.r * 0.55, h.cy, h.r * 1.1, Math.max(1.2, h.r * 0.07), shade(h.visor, -0.35));
      }
      fillRect(h.g, h.cx + h.r * 0.55, h.cy - h.r * 1.0, h.r * 0.08, h.r * 0.28, h.light);
      break;
    case "visor":
      closedShell(h, 1.2);
      jaw(h, 0.55, 0.7, 0.38);
      fillRect(h.g, h.cx - h.r * 0.08, h.cy - h.r * 0.95, h.r * 0.16, h.r * 0.35, h.light);
      if (h.face) {
        fillRect(h.g, h.cx - h.r * 0.95, h.cy - h.r * 0.2, h.r * 1.9, h.r * 0.45, shade(h.visor, -0.4));
        fillRect(h.g, h.cx - h.r * 0.8, h.cy - h.r * 0.12, h.r * 1.6, h.r * 0.28, h.visor);
        fillRect(h.g, h.cx - h.r * 0.55, h.cy - h.r * 0.18, h.r * 0.45, Math.max(1.2, h.r * 0.08), shade(h.visor, 0.35));
      }
      break;
    case "goggles": {
      const eyeY = h.cy - h.r * 0.05;
      const gap = h.r * 0.42;
      fillRect(h.g, h.cx - h.r * 0.85, eyeY - h.r * 0.22, h.r * 1.7, h.r * 0.16, h.dark);
      for (const s of [-1, 1] as const) {
        const ex = h.cx + s * gap * h.flip;
        fillEllipse(h.g, ex, eyeY, h.r * 0.38, h.r * 0.38, h.dark);
        fillEllipse(h.g, ex, eyeY, h.r * 0.28, h.r * 0.28, h.visor);
        fillEllipse(h.g, ex - h.r * 0.1, eyeY - h.r * 0.1, h.r * 0.1, h.r * 0.08, shade(h.visor, 0.45));
      }
      fillRect(h.g, h.cx - h.r * 0.12, eyeY - h.r * 0.08, h.r * 0.24, h.r * 0.14, h.dark);
      break;
    }
    case "scouter": {
      const side = h.flip;
      const ex = h.cx + side * h.r * 0.42;
      const eyeY = h.cy - h.r * 0.05;
      const earX = side > 0 ? h.cx + h.r * 0.55 : h.cx - h.r * 1.0;
      fillRect(h.g, earX, eyeY - h.r * 0.2, h.r * 0.45, h.r * 0.35, h.dark);
      fillRect(h.g, ex - h.r * 0.32, eyeY - h.r * 0.22, h.r * 0.64, h.r * 0.42, h.dark);
      fillRect(h.g, ex - h.r * 0.26, eyeY - h.r * 0.16, h.r * 0.52, h.r * 0.3, h.visor);
      fillRect(h.g, ex - h.r * 0.18, eyeY - h.r * 0.2, h.r * 0.32, Math.max(1.2, h.r * 0.07), shade(h.visor, 0.4));
      break;
    }
    case "astronautBubble":
      fillEllipse(h.g, h.cx, h.cy, h.r * 1.35, h.r * 1.3, h.color);
      if (h.face) {
        fillEllipse(h.g, h.cx, h.cy + h.r * 0.05, h.r * 0.85, h.r * 0.65, h.visor);
        fillEllipse(h.g, h.cx - h.r * 0.25, h.cy - h.r * 0.15, h.r * 0.22, h.r * 0.16, shade(h.visor, 0.4));
      } else {
        fillEllipse(h.g, h.cx, h.cy + h.r * 0.1, h.r * 0.7, h.r * 0.55, h.dark);
      }
      fillEllipse(h.g, h.cx, h.cy + h.r * 0.95, h.r * 0.85, h.r * 0.22, h.light);
      fillEllipse(h.g, h.cx, h.cy - h.r * 1.15, h.r * 0.14, h.r * 0.12, "#e83b3b");
      break;
    case "astronautFlat":
      closedShell(h, 1.2);
      fillRect(h.g, h.cx - h.r * 0.75, h.cy - h.r * 0.95, h.r * 1.5, h.r * 0.4, h.color);
      browBand(h, -0.4, 1.5, 0.12);
      if (h.face) {
        fillRect(h.g, h.cx - h.r * 0.8, h.cy - h.r * 0.25, h.r * 1.6, h.r * 0.55, shade(h.visor, -0.4));
        fillRect(h.g, h.cx - h.r * 0.68, h.cy - h.r * 0.15, h.r * 1.36, h.r * 0.35, h.visor);
      }
      fillEllipse(h.g, h.cx, h.cy + h.r * 0.9, h.r * 0.8, h.r * 0.18, h.light);
      fillRect(h.g, h.cx + h.r * 0.7, h.cy - h.r * 1.15, h.r * 0.08, h.r * 0.45, h.light);
      fillEllipse(h.g, h.cx + h.r * 0.74, h.cy - h.r * 1.2, h.r * 0.1, h.r * 0.1, "#e83b3b");
      break;
    case "astronautVintage":
      closedShell(h, 1.2);
      for (let i = 0; i < 3; i++) {
        fillEllipse(h.g, h.cx, h.cy - h.r * (0.55 - i * 0.2), h.r * (0.95 - i * 0.05), h.r * 0.1, h.dark);
      }
      if (h.face) {
        fillEllipse(h.g, h.cx, h.cy + h.r * 0.05, h.r * 0.55, h.r * 0.55, shade(h.visor, -0.3));
        fillEllipse(h.g, h.cx, h.cy + h.r * 0.05, h.r * 0.42, h.r * 0.42, h.visor);
        fillEllipse(h.g, h.cx - h.r * 0.12, h.cy - h.r * 0.08, h.r * 0.12, h.r * 0.1, shade(h.visor, 0.4));
      }
      fillEllipse(h.g, h.cx, h.cy + h.r * 0.9, h.r * 0.75, h.r * 0.18, h.light);
      break;
    case "crown":
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.7, h.r * 0.95, h.r * 0.18, h.color);
      for (let i = 0; i < 5; i++) {
        const t = (i / 4) * 2 - 1;
        spikePoly(h, t * h.r * 0.75, -h.r * 0.75, t * h.r * 0.75, -h.r * 1.15, h.r * 0.1, h.color);
      }
      if (h.face) fillEllipse(h.g, h.cx, h.cy - h.r * 0.55, h.r * 0.12, h.r * 0.12, h.visor);
      break;
    case "king":
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.65, h.r * 1.0, h.r * 0.22, h.color);
      for (let i = 0; i < 6; i++) {
        const t = (i / 5) * 2 - 1;
        spikePoly(h, t * h.r * 0.8, -h.r * 0.7, t * h.r * 0.8, -h.r * 1.2, h.r * 0.1, h.color);
      }
      fillEllipse(h.g, h.cx, h.cy - h.r * 1.15, h.r * 0.16, h.r * 0.16, h.visor);
      if (h.face) fillEllipse(h.g, h.cx, h.cy - h.r * 0.5, h.r * 0.12, h.r * 0.12, h.visor);
      fillCapsule(h.g, h.cx - h.r * 0.45, h.cy - h.r * 0.85, h.cx + h.r * 0.45, h.cy - h.r * 0.85, h.r * 0.08, h.dark);
      break;
    case "princess":
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.65, h.r * 0.9, h.r * 0.12, h.color);
      spikePoly(h, 0, -h.r * 0.7, 0, -h.r * 1.15, h.r * 0.12, h.color);
      fillEllipse(h.g, h.cx, h.cy - h.r * 1.1, h.r * 0.12, h.r * 0.12, h.visor);
      for (const s of [-1, 1] as const) {
        spikePoly(h, s * h.r * 0.45, -h.r * 0.68, s * h.r * 0.45, -h.r * 0.95, h.r * 0.08, h.color);
        fillEllipse(h.g, h.cx + s * h.r * 0.7, h.cy - h.r * 0.55, h.r * 0.1, h.r * 0.1, shade(h.visor, 0.35));
      }
      break;
    case "wizard":
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.35, h.r * 1.35, h.r * 0.16, h.color);
      fillPoly(
        h.g,
        [
          { x: h.cx - h.r * 0.85, y: h.cy - h.r * 0.4 },
          { x: h.cx + h.r * 0.12, y: h.cy - h.r * 2.2 },
          { x: h.cx + h.r * 0.95, y: h.cy - h.r * 0.4 },
        ],
        h.color,
      );
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.45, h.r * 0.95, h.r * 0.14, h.visor);
      fillEllipse(h.g, h.cx + h.r * 0.1, h.cy - h.r * 2.15, h.r * 0.12, h.r * 0.12, h.visor);
      break;
    case "bandana":
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.55, h.r * 1.0, h.r * 0.45, h.color);
      if (h.face) fillRect(h.g, h.cx - h.r * 0.75, h.cy - h.r * 0.35, h.r * 1.5, h.r * 0.14, h.dark);
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.15, h.r * 0.22, h.r * 0.18, h.color);
      for (const s of [-1, 1] as const) {
        fillCapsule(
          h.g,
          h.cx + s * h.r * 0.1,
          h.cy - h.r * 0.05,
          h.cx + s * h.r * 0.35,
          h.cy + h.r * 0.45,
          h.r * 0.08,
          h.color,
        );
      }
      break;
    case "goat":
      closedShell(h, 1.2);
      horn(h, -1, h.visor);
      horn(h, 1, h.visor);
      if (h.face) {
        fillEllipse(h.g, h.cx, h.cy + h.r * 0.25, h.r * 0.55, h.r * 0.4, h.dark);
        fillEllipse(h.g, h.cx, h.cy + h.r * 0.45, h.r * 0.35, h.r * 0.28, h.color);
        fillEllipse(h.g, h.cx - h.r * 0.12, h.cy + h.r * 0.5, h.r * 0.08, h.r * 0.06, shade(h.visor, -0.5));
        fillEllipse(h.g, h.cx + h.r * 0.12, h.cy + h.r * 0.5, h.r * 0.08, h.r * 0.06, shade(h.visor, -0.5));
      } else {
        fillEllipse(h.g, h.cx, h.cy + h.r * 0.2, h.r * 0.7, h.r * 0.5, h.dark);
      }
      break;
    case "pilot":
      closedShell(h, 1.2);
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.7, h.r * 0.7, h.r * 0.3, h.color);
      browBand(h, -0.32, 1.4, 0.12);
      fillEllipse(h.g, h.cx - h.r * 0.9, h.cy + h.r * 0.1, h.r * 0.22, h.r * 0.4, h.dark);
      fillEllipse(h.g, h.cx + h.r * 0.9, h.cy + h.r * 0.1, h.r * 0.22, h.r * 0.4, h.dark);
      if (h.face) {
        fillRect(h.g, h.cx - h.r * 0.75, h.cy - h.r * 0.15, h.r * 1.5, h.r * 0.35, shade(h.visor, -0.4));
        for (const s of [-1, 1] as const) {
          fillEllipse(h.g, h.cx + s * h.r * 0.32, h.cy, h.r * 0.28, h.r * 0.24, h.dark);
          fillEllipse(h.g, h.cx + s * h.r * 0.32, h.cy, h.r * 0.2, h.r * 0.17, h.visor);
        }
      }
      fillRect(h.g, h.cx + h.r * 0.6, h.cy - h.r * 1.05, h.r * 0.08, h.r * 0.35, h.light);
      break;
    case "samurai":
      closedShell(h, 1.2);
      if (h.face) {
        fillRect(h.g, h.cx - h.r * 0.95, h.cy - h.r * 0.25, h.r * 1.9, h.r * 0.14, h.color);
        fillRect(h.g, h.cx - h.r * 0.65, h.cy + h.r * 0.05, h.r * 1.3, h.r * 0.5, h.visor);
        singleSlit(h, -0.05, 0.95);
      }
      for (const s of [-1, 1] as const) {
        fillPoly(
          h.g,
          [
            { x: h.cx + s * h.r * 0.85, y: h.cy - h.r * 0.2 },
            { x: h.cx + s * h.r * 1.25, y: h.cy - h.r * 0.35 },
            { x: h.cx + s * h.r * 1.15, y: h.cy + h.r * 0.15 },
            { x: h.cx + s * h.r * 0.75, y: h.cy + h.r * 0.1 },
          ],
          h.light,
        );
      }
      spikePoly(h, 0, -h.r * 0.85, 0, -h.r * 1.45, h.r * 0.14, h.visor);
      fillEllipse(h.g, h.cx, h.cy + h.r * 0.75, h.r * 0.85, h.r * 0.25, h.dark);
      break;
    case "viking":
      closedShell(h, 1.2);
      horn(h, -1, h.visor);
      horn(h, 1, h.visor);
      jaw(h, 0.45, 0.7, 0.4);
      if (h.face) {
        fillRect(h.g, h.cx - h.r * 0.08, h.cy - h.r * 0.15, h.r * 0.16, h.r * 0.55, h.dark);
        singleSlit(h, -0.1, 1.15);
      }
      fillEllipse(h.g, h.cx - h.r * 0.85, h.cy + h.r * 0.15, h.r * 0.25, h.r * 0.4, h.dark);
      fillEllipse(h.g, h.cx + h.r * 0.85, h.cy + h.r * 0.15, h.r * 0.25, h.r * 0.4, h.dark);
      break;
    case "pharaoh":
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.35, h.r * 1.15, h.r * 0.75, h.color);
      for (const s of [-1, 1] as const) {
        fillCapsule(
          h.g,
          h.cx + s * h.r * 0.75,
          h.cy - h.r * 0.2,
          h.cx + s * h.r * 0.85,
          h.cy + h.r * 0.95,
          h.r * 0.28,
          s === -1 ? h.color : h.dark,
        );
      }
      for (let i = 0; i < 4; i++) {
        fillRect(
          h.g,
          h.cx - h.r * 0.9,
          h.cy - h.r * (0.55 - i * 0.18),
          h.r * 1.8,
          Math.max(1.2, h.r * 0.06),
          i % 2 === 0 ? h.dark : h.light,
        );
      }
      spikePoly(h, 0, -h.r * 0.85, 0, -h.r * 1.25, h.r * 0.1, h.visor);
      fillEllipse(h.g, h.cx, h.cy - h.r * 1.15, h.r * 0.1, h.r * 0.1, h.visor);
      break;
    case "ninja":
      closedShell(h, 1.1);
      fillEllipse(h.g, h.cx, h.cy + h.r * 0.35, h.r * 0.9, h.r * 0.55, h.dark);
      if (h.face) {
        singleSlit(h, -0.08, 1.15);
        fillRect(h.g, h.cx - h.r * 0.7, h.cy + h.r * 0.15, h.r * 1.4, h.r * 0.35, h.visor);
      } else {
        fillEllipse(h.g, h.cx, h.cy, h.r * 0.95, h.r * 0.85, h.dark);
      }
      fillCapsule(h.g, h.cx - h.r * 0.4, h.cy - h.r * 0.5, h.cx + h.r * 0.4, h.cy - h.r * 0.5, h.r * 0.12, h.color);
      break;
    default: {
      const _exhaustive: never = h.style;
      void _exhaustive;
    }
  }
}

export function eyesHiddenByHelmet2d(style?: HelmetStyle): {
  hideLeft: boolean;
  hideRight: boolean;
} {
  if (style === "goggles") return { hideLeft: true, hideRight: true };
  if (style === "scouter") return { hideLeft: false, hideRight: true };
  return { hideLeft: false, hideRight: false };
}

export function drawHelmet(ctx: DrawCtx, a: Anchors): void {
  const h = helmBase(ctx, a);
  if (!h) return;
  withIsoHeadTransform(h, () => drawHelmetStyle(h));
}
