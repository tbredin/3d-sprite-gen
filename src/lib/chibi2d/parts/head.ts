import type { HeadShape } from "../../chibi";
import { fillEllipse, fillLozenge, fillPoly, project, shade, u } from "../draw";
import type { DrawCtx } from "../types";
import type { Anchors } from "../layout";

function headScale(spec: DrawCtx["spec"]) {
  const size = spec.head?.size ?? 1;
  const yScale = spec.head?.yScale ?? 1;
  return { size: Math.max(0.55, Math.min(1.45, size)), yScale: Math.max(0.55, Math.min(1.55, yScale)) };
}

export function drawNeck(ctx: DrawCtx, a: Anchors, skin: string) {
  const top = project(ctx, 0, a.shoulderY + 0.06, 0);
  const bot = project(ctx, 0, a.shoulderY - 0.02, 0);
  const r = u(ctx, 0.1);
  fillEllipse(ctx.ctx, (top.x + bot.x) / 2, (top.y + bot.y) / 2, r * 0.85, r * 1.1, shade(skin, -0.05));
}

export function drawHead(ctx: DrawCtx, a: Anchors, skin: string) {
  const shape: HeadShape = ctx.spec.head?.shape ?? "lozenge";
  const { size, yScale } = headScale(ctx.spec);
  const c = project(ctx, 0, a.headCenterY, 0);
  const w = u(ctx, a.skullR * size * 1.05);
  const h = u(ctx, a.skullR * size * yScale * 1.15);
  const g = ctx.ctx;
  const mid = shade(skin, 0);
  const dark = shade(skin, -0.12);
  const light = shade(skin, 0.08);

  switch (shape) {
    case "mage":
      fillLozenge(g, c.x, c.y, w * 0.95, h * 1.05, mid);
      fillEllipse(g, c.x, c.y - h * 0.15, w * 0.7, h * 0.55, light);
      break;
    case "knight":
    case "soldier":
      fillEllipse(g, c.x, c.y, w * 0.95, h * 0.95, mid);
      fillEllipse(g, c.x, c.y + h * 0.25, w * 0.7, h * 0.45, dark);
      break;
    case "rogue":
      fillLozenge(g, c.x, c.y, w * 0.85, h * 1.1, mid);
      break;
    case "scientist":
      fillEllipse(g, c.x, c.y, w * 1.05, h * 0.9, mid);
      break;
    case "cleric":
      fillEllipse(g, c.x, c.y, w, h, mid);
      fillEllipse(g, c.x, c.y + h * 0.35, w * 0.55, h * 0.35, dark);
      break;
    case "ranger":
      fillLozenge(g, c.x, c.y + h * 0.05, w * 0.9, h, mid);
      break;
    case "barbarian":
      fillEllipse(g, c.x, c.y, w * 1.1, h * 0.95, mid);
      fillEllipse(g, c.x, c.y + h * 0.3, w * 0.85, h * 0.4, dark);
      break;
    case "acolyte":
      fillEllipse(g, c.x, c.y, w * 0.9, h * 1.05, mid);
      break;
    case "pirate":
      fillEllipse(g, c.x, c.y, w, h * 0.95, mid);
      fillEllipse(g, c.x + w * 0.15 * ctx.flipX, c.y + h * 0.2, w * 0.35, h * 0.25, dark);
      break;
    case "goatman":
      fillEllipse(g, c.x, c.y, w * 0.95, h, mid);
      // Horns stubs (full horns come from helmet=goat when used).
      fillPoly(
        g,
        [
          { x: c.x - w * 0.55, y: c.y - h * 0.4 },
          { x: c.x - w * 0.85, y: c.y - h * 1.15 },
          { x: c.x - w * 0.25, y: c.y - h * 0.55 },
        ],
        shade(skin, -0.18),
      );
      fillPoly(
        g,
        [
          { x: c.x + w * 0.55, y: c.y - h * 0.4 },
          { x: c.x + w * 0.85, y: c.y - h * 1.15 },
          { x: c.x + w * 0.25, y: c.y - h * 0.55 },
        ],
        shade(skin, -0.18),
      );
      break;
    case "lozenge":
    default:
      fillLozenge(g, c.x, c.y, w, h, mid);
      fillEllipse(g, c.x, c.y - h * 0.12, w * 0.65, h * 0.5, light);
      break;
  }
}
