import type { HairStyle } from "../../chibi";
import { fillCapsule, fillEllipse, fillPoly, fillRect, project, shade, u } from "../draw";
import type { DrawCtx } from "../types";
import { headProps, type Anchors } from "../layout";

type HairCtx = {
  g: CanvasRenderingContext2D;
  cx: number;
  cy: number;
  r: number;
  /** Head Height scale — vertical hair volume follows the skull. */
  yScale: number;
  color: string;
  dark: string;
  light: string;
  n: number;
  flip: number;
  face: boolean;
};

function hairBase(ctx: DrawCtx, a: Anchors): HairCtx | null {
  const hair = ctx.spec.hair;
  if (!hair || hair.style === "bald") return null;
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
  const color = hair.color;
  return {
    g: ctx.ctx,
    cx: c.x * 0.45 + aPt.x * 0.55,
    cy: c.y * 0.45 + aPt.y * 0.55,
    r,
    yScale: hp.yScale,
    color,
    dark: shade(color, -0.12),
    light: shade(color, 0.1),
    n: Math.max(1, Math.min(8, hair.complexity ?? 4)),
    flip: ctx.flipX,
    face: ctx.showFace,
  };
}

function withIsoHeadTransform(h: HairCtx, draw: () => void) {
  const skew = h.face ? 0.2 * h.flip : -0.12 * h.flip;
  const yScale = (h.face ? 0.93 : 0.96) * h.yScale;
  h.g.save();
  h.g.translate(h.cx, h.cy);
  h.g.transform(1, 0, skew, yScale, 0, 0);
  h.g.translate(-h.cx, -h.cy);
  draw();
  h.g.restore();
}

function crown(h: HairCtx, rx = 1.05, ry = 0.85, yOff = -0.35) {
  fillEllipse(h.g, h.cx, h.cy + h.r * yOff, h.r * rx, h.r * ry, h.color);
}

function sides(h: HairCtx, drop = 0.15, width = 0.35) {
  fillEllipse(h.g, h.cx - h.r * 0.85, h.cy + h.r * drop, h.r * width, h.r * 0.55, h.color);
  fillEllipse(h.g, h.cx + h.r * 0.85, h.cy + h.r * drop, h.r * width, h.r * 0.55, h.color);
}

function backVolume(h: HairCtx, drop = 0.55, rx = 0.75, ry = 0.7) {
  fillEllipse(h.g, h.cx, h.cy + h.r * drop, h.r * rx, h.r * ry, h.dark);
}

function bangs(h: HairCtx, wide = 0.7, thick = 0.28) {
  if (!h.face) return;
  fillEllipse(h.g, h.cx, h.cy - h.r * 0.15, h.r * wide, h.r * thick, h.color);
  fillEllipse(h.g, h.cx - h.r * 0.15, h.cy - h.r * 0.22, h.r * 0.22, h.r * 0.18, h.light);
}

function bluntBangs(h: HairCtx) {
  if (!h.face) return;
  fillRect(h.g, h.cx - h.r * 0.72, h.cy - h.r * 0.35, h.r * 1.44, h.r * 0.42, h.color);
  fillEllipse(h.g, h.cx, h.cy - h.r * 0.28, h.r * 0.2, h.r * 0.12, h.light);
}

function spike(
  h: HairCtx,
  ox: number,
  oy: number,
  tipX: number,
  tipY: number,
  baseW: number,
  color = h.color,
) {
  fillPoly(
    h.g,
    [
      { x: h.cx + ox - baseW, y: h.cy + oy },
      { x: h.cx + tipX, y: h.cy + tipY },
      { x: h.cx + ox + baseW, y: h.cy + oy },
    ],
    color,
  );
}

function crownSpikes(h: HairCtx, count: number, height = 0.85, spread = 0.55) {
  const m = Math.max(2, count);
  for (let i = 0; i < m; i++) {
    const t = m === 1 ? 0 : (i / (m - 1)) * 2 - 1;
    const ox = t * h.r * spread;
    const oy = -h.r * 0.55;
    const tipY = oy - h.r * (height + (i % 2) * 0.12);
    spike(h, ox, oy, ox + t * h.r * 0.08, tipY, h.r * 0.14, i % 2 === 0 ? h.color : h.dark);
  }
}

function lock(h: HairCtx, x: number, y0: number, y1: number, thick: number, color = h.color) {
  fillCapsule(h.g, h.cx + x, h.cy + y0, h.cx + x * 0.85, h.cy + y1, thick, color);
}

function twinTails(h: HairCtx, len = 1.1, rootY = -0.15, spread = 1.05) {
  for (const s of [-1, 1] as const) {
    fillEllipse(h.g, h.cx + s * h.r * spread, h.cy + h.r * rootY, h.r * 0.28, h.r * 0.28, h.color);
    fillCapsule(
      h.g,
      h.cx + s * h.r * spread,
      h.cy + h.r * rootY,
      h.cx + s * h.r * (spread + 0.15),
      h.cy + h.r * (rootY + len),
      h.r * 0.16,
      h.color,
    );
    fillEllipse(
      h.g,
      h.cx + s * h.r * (spread + 0.12),
      h.cy + h.r * (rootY + len),
      h.r * 0.14,
      h.r * 0.14,
      h.light,
    );
  }
}

function pony(h: HairCtx, ox: number, rootY: number, tipY: number, thick = 0.2) {
  fillEllipse(h.g, h.cx + ox, h.cy + h.r * rootY, h.r * 0.28, h.r * 0.25, h.color);
  fillCapsule(
    h.g,
    h.cx + ox,
    h.cy + h.r * rootY,
    h.cx + ox * 0.7,
    h.cy + h.r * tipY,
    h.r * thick,
    h.color,
  );
  fillEllipse(h.g, h.cx + ox * 0.7, h.cy + h.r * tipY, h.r * 0.16, h.r * 0.16, h.light);
}

function bunAt(h: HairCtx, ox: number, oy: number, size = 0.42) {
  fillEllipse(h.g, h.cx + ox, h.cy + oy, h.r * size, h.r * size * 0.9, h.color);
  fillEllipse(h.g, h.cx + ox - h.r * 0.08, h.cy + oy - h.r * 0.12, h.r * size * 0.35, h.r * size * 0.3, h.light);
}

function braidChain(h: HairCtx, ox: number, y0: number, steps: number, dir = 0) {
  for (let i = 0; i < steps; i++) {
    const x = ox + (i % 2 === 0 ? 1 : -1) * h.r * 0.08 + dir * i * h.r * 0.02;
    const y = y0 + i * h.r * 0.22;
    fillEllipse(h.g, h.cx + x, h.cy + y, h.r * (0.2 - i * 0.012), h.r * 0.18, i % 2 === 0 ? h.color : h.dark);
  }
}

function curlsRing(h: HairCtx, count: number, radius = 0.95, y = 0.05) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    fillEllipse(
      h.g,
      h.cx + Math.cos(a) * h.r * radius,
      h.cy + h.r * y + Math.sin(a) * h.r * 0.35,
      h.r * 0.28,
      h.r * 0.26,
      i % 2 === 0 ? h.color : h.dark,
    );
  }
}

function longSides(h: HairCtx, len = 1.15) {
  lock(h, -h.r * 0.75, -h.r * 0.05, h.r * len, h.r * 0.22);
  lock(h, h.r * 0.75, -h.r * 0.05, h.r * len, h.r * 0.22);
}

function frameShort(h: HairCtx) {
  crown(h, 1.0, 0.78, -0.38);
  sides(h, 0.05, 0.28);
  if (!h.face) backVolume(h, 0.35, 0.7, 0.45);
}

function frameLong(h: HairCtx) {
  crown(h, 1.08, 0.85, -0.35);
  sides(h, 0.2, 0.38);
  longSides(h);
  backVolume(h, h.face ? 0.65 : 0.85, 0.85, 0.85);
}

function drawStyle(h: HairCtx, style: HairStyle) {
  switch (style) {
    case "bald":
      return;
    case "bowl":
      crown(h, 1.05, 0.7, -0.4);
      sides(h, -0.05, 0.3);
      bangs(h, 0.75, 0.22);
      if (!h.face) backVolume(h, 0.25, 0.65, 0.4);
      break;
    case "bob":
      crown(h, 1.08, 0.8, -0.32);
      sides(h, 0.25, 0.42);
      backVolume(h, 0.45, 0.8, 0.55);
      bangs(h, 0.65, 0.22);
      break;
    case "lob":
      crown(h, 1.08, 0.82, -0.32);
      sides(h, 0.35, 0.45);
      longSides(h, 0.75);
      backVolume(h, 0.55, 0.85, 0.6);
      bangs(h, 0.6, 0.2);
      break;
    case "spiky":
      frameShort(h);
      crownSpikes(h, h.n + 2, 0.95, 0.6);
      if (h.face) {
        spike(h, -h.r * 0.2, -h.r * 0.1, -h.r * 0.15, h.r * 0.05, h.r * 0.12);
        spike(h, h.r * 0.18, -h.r * 0.08, h.r * 0.22, h.r * 0.08, h.r * 0.12);
      }
      break;
    case "mohawk":
      fillEllipse(h.g, h.cx - h.r * 0.7, h.cy, h.r * 0.28, h.r * 0.4, h.dark);
      fillEllipse(h.g, h.cx + h.r * 0.7, h.cy, h.r * 0.28, h.r * 0.4, h.dark);
      for (let i = 0; i < h.n + 1; i++) {
        const t = (i / Math.max(h.n, 1)) * 0.5 - 0.1;
        spike(h, 0, -h.r * (0.2 + t), (i % 2 === 0 ? -1 : 1) * h.r * 0.04, -h.r * (1.15 + t), h.r * 0.16);
      }
      break;
    case "ponytail":
      frameShort(h);
      bangs(h, 0.55, 0.2);
      pony(h, 0, h.face ? 0.15 : 0.05, h.face ? 1.15 : 1.35, 0.22);
      break;
    case "highPony":
      frameShort(h);
      bangs(h, 0.55, 0.2);
      pony(h, 0, -0.55, 0.85, 0.18);
      break;
    case "sidePonytail": {
      frameShort(h);
      bangs(h, 0.5, 0.18);
      const side = h.flip;
      pony(h, side * h.r * 0.85, -0.1, 1.05, 0.2);
      fillEllipse(h.g, h.cx - side * h.r * 0.7, h.cy + h.r * 0.05, h.r * 0.25, h.r * 0.35, h.color);
      break;
    }
    case "long":
      frameLong(h);
      bangs(h, 0.55, 0.2);
      break;
    case "goddess":
      crown(h, 1.2, 0.95, -0.4);
      sides(h, 0.35, 0.5);
      longSides(h, 1.35);
      backVolume(h, h.face ? 0.85 : 1.05, 1.0, 1.0);
      bangs(h, 0.7, 0.24);
      fillEllipse(h.g, h.cx - h.r * 0.25, h.cy - h.r * 0.55, h.r * 0.25, h.r * 0.2, h.light);
      break;
    case "afro": {
      const R = 1.15 + h.n * 0.04;
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.15, h.r * R, h.r * R * 0.95, h.color);
      fillEllipse(h.g, h.cx, h.cy + h.r * 0.25, h.r * R * 0.85, h.r * R * 0.7, h.dark);
      fillEllipse(h.g, h.cx - h.r * 0.25, h.cy - h.r * 0.55, h.r * 0.28, h.r * 0.22, h.light);
      bangs(h, 0.45, 0.18);
      break;
    }
    case "bun":
      frameShort(h);
      bangs(h, 0.5, 0.18);
      bunAt(h, 0, -h.r * 0.95, 0.45);
      break;
    case "lowBun":
      frameShort(h);
      bangs(h, 0.55, 0.2);
      bunAt(h, 0, h.r * (h.face ? 0.55 : 0.75), 0.48);
      break;
    case "spaceBuns":
    case "odango":
      frameShort(h);
      bangs(h, 0.55, 0.2);
      bunAt(h, -h.r * 0.7, -h.r * 0.85, 0.38);
      bunAt(h, h.r * 0.7, -h.r * 0.85, 0.38);
      if (style === "odango") {
        lock(h, -h.r * 0.85, -h.r * 0.4, h.r * 0.7, h.r * 0.14);
        lock(h, h.r * 0.85, -h.r * 0.4, h.r * 0.7, h.r * 0.14);
      }
      break;
    case "braid":
      frameShort(h);
      bangs(h, 0.5, 0.18);
      braidChain(h, 0, h.r * 0.15, 5);
      break;
    case "crownBraid":
      frameShort(h);
      bangs(h, 0.55, 0.2);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        fillEllipse(
          h.g,
          h.cx + Math.cos(a) * h.r * 0.75,
          h.cy - h.r * 0.45 + Math.sin(a) * h.r * 0.22,
          h.r * 0.18,
          h.r * 0.16,
          i % 2 === 0 ? h.color : h.dark,
        );
      }
      braidChain(h, h.r * 0.25, h.r * 0.2, 3, 0.3);
      break;
    case "undercut":
      crown(h, 0.95, 0.7, -0.42);
      bangs(h, 0.65, 0.22);
      crownSpikes(h, h.n, 0.55, 0.4);
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.15, h.r * 0.7, h.r * 0.35, h.color);
      break;
    case "curls":
      crown(h, 1.05, 0.8, -0.35);
      curlsRing(h, h.n + 4, 1.0, 0.1);
      bangs(h, 0.55, 0.2);
      if (!h.face) backVolume(h, 0.7, 0.9, 0.7);
      break;
    case "ringlets":
      frameShort(h);
      bangs(h, 0.55, 0.2);
      for (const s of [-1, 1] as const) {
        for (let i = 0; i < 4; i++) {
          fillEllipse(
            h.g,
            h.cx + s * h.r * (0.75 + (i % 2) * 0.08),
            h.cy - h.r * 0.05 + i * h.r * 0.28,
            h.r * (0.22 - i * 0.015),
            h.r * 0.2,
            i % 2 === 0 ? h.color : h.dark,
          );
        }
      }
      if (!h.face) {
        for (let i = 0; i < 3; i++) {
          fillEllipse(h.g, h.cx + (i - 1) * h.r * 0.2, h.cy + h.r * (0.4 + i * 0.22), h.r * 0.2, h.r * 0.18, h.color);
        }
      }
      break;
    case "topknot":
      frameShort(h);
      bangs(h, 0.45, 0.16);
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.85, h.r * 0.28, h.r * 0.22, h.color);
      spike(h, 0, -h.r * 0.9, 0, -h.r * 1.45, h.r * 0.16);
      break;
    case "fringe":
      crown(h, 1.05, 0.8, -0.35);
      sides(h, 0.1, 0.32);
      lock(h, -h.r * 0.8, -h.r * 0.1, h.r * 0.45, h.r * 0.18);
      lock(h, h.r * 0.8, -h.r * 0.1, h.r * 0.45, h.r * 0.18);
      bangs(h, 0.8, 0.3);
      if (!h.face) backVolume(h, 0.4, 0.7, 0.5);
      break;
    case "bluntBangs":
      frameLong(h);
      bluntBangs(h);
      break;
    case "twinTails":
      frameShort(h);
      bangs(h, 0.55, 0.2);
      twinTails(h, 1.15, -0.1, 1.0);
      break;
    case "pigtails":
      frameShort(h);
      bangs(h, 0.55, 0.2);
      twinTails(h, 0.65, -0.2, 0.95);
      break;
    case "ribbonTails":
      frameShort(h);
      bangs(h, 0.55, 0.2);
      for (const s of [-1, 1] as const) {
        fillEllipse(h.g, h.cx + s * h.r * 1.0, h.cy - h.r * 0.15, h.r * 0.32, h.r * 0.28, h.color);
        fillEllipse(h.g, h.cx + s * h.r * 1.15, h.cy - h.r * 0.05, h.r * 0.22, h.r * 0.2, h.light);
        fillEllipse(h.g, h.cx + s * h.r * 1.15, h.cy - h.r * 0.25, h.r * 0.22, h.r * 0.2, h.dark);
        fillCapsule(
          h.g,
          h.cx + s * h.r * 1.0,
          h.cy - h.r * 0.1,
          h.cx + s * h.r * 1.15,
          h.cy + h.r * 0.95,
          h.r * 0.14,
          h.color,
        );
      }
      break;
    case "pixie":
      crown(h, 0.95, 0.7, -0.4);
      sides(h, -0.05, 0.25);
      crownSpikes(h, h.n + 1, 0.45, 0.45);
      bangs(h, 0.55, 0.18);
      if (!h.face) backVolume(h, 0.2, 0.55, 0.35);
      break;
    case "messy":
      frameShort(h);
      bangs(h, 0.6, 0.22);
      for (let i = 0; i < h.n + 3; i++) {
        const a = (i / (h.n + 3)) * Math.PI * 1.5 - 0.4;
        spike(
          h,
          Math.sin(a) * h.r * 0.55,
          -h.r * 0.45,
          Math.sin(a) * h.r * 0.7,
          -h.r * (0.85 + (i % 3) * 0.15),
          h.r * 0.12,
        );
      }
      break;
    case "dreads":
      frameShort(h);
      bangs(h, 0.5, 0.18);
      for (let i = 0; i < h.n + 4; i++) {
        const t = (i / Math.max(h.n + 3, 1)) * 2 - 1;
        fillCapsule(
          h.g,
          h.cx + t * h.r * 0.85,
          h.cy - h.r * 0.2,
          h.cx + t * h.r * 0.95,
          h.cy + h.r * (0.7 + (i % 3) * 0.15),
          h.r * 0.09,
          i % 2 === 0 ? h.color : h.dark,
        );
      }
      break;
    case "mullet":
      crown(h, 1.0, 0.75, -0.38);
      sides(h, 0.05, 0.3);
      bangs(h, 0.6, 0.2);
      backVolume(h, h.face ? 0.7 : 0.95, 0.9, 0.9);
      lock(h, -h.r * 0.45, h.r * 0.2, h.r * 1.0, h.r * 0.18);
      lock(h, h.r * 0.45, h.r * 0.2, h.r * 1.0, h.r * 0.18);
      break;
    case "pompadour":
      crown(h, 1.0, 0.7, -0.35);
      sides(h, 0.05, 0.28);
      fillEllipse(h.g, h.cx, h.cy - h.r * 0.75, h.r * 0.7, h.r * 0.55, h.color);
      fillEllipse(h.g, h.cx - h.r * 0.15, h.cy - h.r * 0.9, h.r * 0.28, h.r * 0.22, h.light);
      if (h.face) fillEllipse(h.g, h.cx, h.cy - h.r * 0.25, h.r * 0.35, h.r * 0.2, h.color);
      if (!h.face) backVolume(h, 0.3, 0.65, 0.4);
      break;
    case "sidePart": {
      frameShort(h);
      const side = h.flip;
      fillEllipse(h.g, h.cx + side * h.r * 0.45, h.cy - h.r * 0.35, h.r * 0.55, h.r * 0.4, h.color);
      fillEllipse(h.g, h.cx + side * h.r * 0.55, h.cy - h.r * 0.45, h.r * 0.28, h.r * 0.22, h.light);
      if (h.face) {
        for (let i = 0; i < 3; i++) {
          fillEllipse(
            h.g,
            h.cx + side * h.r * (0.15 + i * 0.15),
            h.cy - h.r * (0.15 - i * 0.02),
            h.r * 0.2,
            h.r * 0.16,
            h.color,
          );
        }
      }
      break;
    }
    case "asymmetrical": {
      frameShort(h);
      bangs(h, 0.55, 0.2);
      const longSide = h.flip;
      fillEllipse(h.g, h.cx - longSide * h.r * 0.7, h.cy, h.r * 0.28, h.r * 0.35, h.color);
      lock(h, longSide * h.r * 0.75, -h.r * 0.1, h.r * 1.15, h.r * 0.22);
      fillEllipse(h.g, h.cx + longSide * h.r * 0.7, h.cy + h.r * 0.1, h.r * 0.35, h.r * 0.4, h.color);
      if (!h.face) backVolume(h, 0.55, 0.7, 0.55);
      break;
    }
    case "wavy":
    case "softWaves":
      crown(h, 1.08, 0.85, -0.35);
      sides(h, 0.2, 0.4);
      bangs(h, style === "softWaves" ? 0.6 : 0.5, 0.2);
      for (const s of [-1, 1] as const) {
        for (let i = 0; i < 3; i++) {
          fillCapsule(
            h.g,
            h.cx + s * h.r * (0.65 + i * 0.08),
            h.cy - h.r * 0.05 + i * h.r * 0.05,
            h.cx + s * h.r * (0.75 + i * 0.1),
            h.cy + h.r * (0.45 + i * 0.28),
            h.r * (0.18 - i * 0.02),
            i % 2 === 0 ? h.color : h.dark,
          );
        }
      }
      backVolume(h, h.face ? 0.55 : 0.8, 0.85, 0.7);
      break;
    case "anime":
      frameShort(h);
      bangs(h, 0.75, 0.28);
      lock(h, -h.r * 0.85, -h.r * 0.15, h.r * 0.55, h.r * 0.18);
      lock(h, h.r * 0.85, -h.r * 0.15, h.r * 0.55, h.r * 0.18);
      crownSpikes(h, h.n + 1, 0.75, 0.5);
      break;
    case "hime":
      crown(h, 1.05, 0.8, -0.35);
      sides(h, 0.15, 0.35);
      bluntBangs(h);
      lock(h, -h.r * 0.8, -h.r * 0.15, h.r * 0.85, h.r * 0.2);
      lock(h, h.r * 0.8, -h.r * 0.15, h.r * 0.85, h.r * 0.2);
      backVolume(h, h.face ? 0.5 : 0.75, 0.8, 0.65);
      break;
    case "halfUp":
      frameLong(h);
      bangs(h, 0.55, 0.2);
      bunAt(h, 0, -h.r * 0.85, 0.35);
      break;
    case "layered":
      crown(h, 1.08, 0.85, -0.35);
      bangs(h, 0.6, 0.22);
      for (const s of [-1, 1] as const) {
        for (let i = 0; i < 3; i++) {
          lock(h, s * h.r * (0.65 + i * 0.08), -h.r * 0.1, h.r * (0.45 + i * 0.28), h.r * (0.16 - i * 0.015), i % 2 === 0 ? h.color : h.dark);
        }
      }
      backVolume(h, h.face ? 0.7 : 0.95, 0.9, 0.85);
      break;
    case "curtain":
      crown(h, 1.05, 0.8, -0.35);
      sides(h, 0.15, 0.35);
      if (h.face) {
        for (const s of [-1, 1] as const) {
          fillEllipse(h.g, h.cx + s * h.r * 0.28, h.cy - h.r * 0.2, h.r * 0.28, h.r * 0.28, h.color);
          fillCapsule(
            h.g,
            h.cx + s * h.r * 0.35,
            h.cy - h.r * 0.15,
            h.cx + s * h.r * 0.55,
            h.cy + h.r * 0.45,
            h.r * 0.16,
            h.color,
          );
        }
      }
      backVolume(h, h.face ? 0.5 : 0.75, 0.8, 0.65);
      break;
    case "bubblePonytail":
      frameShort(h);
      bangs(h, 0.5, 0.18);
      fillEllipse(h.g, h.cx, h.cy + h.r * 0.05, h.r * 0.28, h.r * 0.24, h.color);
      for (let i = 0; i < 4; i++) {
        fillEllipse(
          h.g,
          h.cx,
          h.cy + h.r * (0.25 + i * 0.32),
          h.r * (0.28 - i * 0.025),
          h.r * (0.26 - i * 0.02),
          i % 2 === 0 ? h.color : h.dark,
        );
      }
      break;
    case "wolfCut":
      frameShort(h);
      bangs(h, 0.65, 0.24);
      crownSpikes(h, h.n + 2, 0.65, 0.5);
      lock(h, -h.r * 0.7, h.r * 0.05, h.r * 0.7, h.r * 0.16);
      lock(h, h.r * 0.7, h.r * 0.05, h.r * 0.7, h.r * 0.16);
      backVolume(h, h.face ? 0.55 : 0.8, 0.8, 0.65);
      break;
    default: {
      const _exhaustive: never = style;
      void _exhaustive;
      frameShort(h);
    }
  }
}

export function drawHair(ctx: DrawCtx, a: Anchors): void {
  const h = hairBase(ctx, a);
  if (!h) return;
  const style = ctx.spec.hair!.style;
  withIsoHeadTransform(h, () => drawStyle(h, style));
}
