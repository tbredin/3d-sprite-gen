import type { BackLoadout, BodyDetailStyle, HemStyle, TorsoStyle } from "../../chibi";
import { fillCapsule, fillEllipse, fillPoly, fillRect, project, shade, u } from "../draw";
import type { DrawCtx } from "../types";
import type { Anchors } from "../layout";

function bodyDiamond(
  ctx: DrawCtx,
  cy: number,
  halfW: number,
  halfH: number,
  color: string,
  skew = 0,
) {
  const g = ctx.ctx;
  const mid = project(ctx, 0, cy, 0);
  const top = project(ctx, 0, cy + halfH, 0);
  const bot = project(ctx, 0, cy - halfH, 0);
  const left = project(ctx, -halfW, cy, skew);
  const right = project(ctx, halfW, cy, skew);
  fillPoly(
    g,
    [
      { x: top.x, y: top.y },
      { x: right.x, y: right.y },
      { x: bot.x, y: bot.y },
      { x: left.x, y: left.y },
    ],
    color,
  );
  return mid;
}

function shoulders(
  ctx: DrawCtx,
  a: Anchors,
  color: string,
  radius = 0.14,
) {
  const g = ctx.ctx;
  const r = u(ctx, radius);
  for (const s of [-1, 1] as const) {
    const p = project(ctx, s * a.shoulderWidth * 0.48, a.shoulderY - 0.02, 0.02);
    fillEllipse(g, p.x, p.y, r, r * 0.85, color);
  }
}

function belt(ctx: DrawCtx, a: Anchors, color: string, detail: string, ornate: boolean) {
  const g = ctx.ctx;
  const L = project(ctx, -a.hipWidth * 0.5, a.hipY + 0.1, 0.05);
  const R = project(ctx, a.hipWidth * 0.5, a.hipY + 0.1, 0.05);
  fillCapsule(g, L.x, L.y, R.x, R.y, u(ctx, 0.04), color);
  const buckle = project(ctx, 0, a.hipY + 0.1, a.torsoDepth * 0.55);
  const bw = u(ctx, ornate ? 0.09 : 0.07);
  fillRect(g, buckle.x - bw, buckle.y - bw * 0.7, bw * 2, bw * 1.4, detail, 1);
  if (ornate) {
    fillRect(g, buckle.x - bw * 0.35, buckle.y - bw * 0.35, bw * 0.7, bw * 0.7, shade(detail, -0.35), 0);
  }
}

function bodyDetails(
  ctx: DrawCtx,
  a: Anchors,
  style: TorsoStyle,
  detailStyle: BodyDetailStyle,
  detail: string,
  armored: boolean,
) {
  if (detailStyle === "none") return;
  const g = ctx.ctx;
  const midY = (a.hipY + a.shoulderY) * 0.5;
  const frontZ = a.torsoDepth * 0.55;

  if (armored) {
    const top = project(ctx, 0, midY + (a.shoulderY - a.hipY) * 0.28, frontZ);
    const bot = project(ctx, 0, midY - (a.shoulderY - a.hipY) * 0.15, frontZ);
    fillCapsule(g, top.x, top.y, bot.x, bot.y, u(ctx, 0.03), detail);
    const barL = project(ctx, -a.hipWidth * 0.35, midY + 0.08, frontZ);
    const barR = project(ctx, a.hipWidth * 0.35, midY + 0.08, frontZ);
    fillCapsule(g, barL.x, barL.y, barR.x, barR.y, u(ctx, 0.025), detail);
    if (detailStyle === "ornate") {
      const crest = project(ctx, 0, midY + 0.06, frontZ + 0.02);
      fillRect(g, crest.x - u(ctx, 0.07), crest.y - u(ctx, 0.05), u(ctx, 0.14), u(ctx, 0.1), detail, 1);
    }
    return;
  }

  const buttons = style === "jacket" || style === "plain" || style === "robe";
  if (buttons) {
    const count = detailStyle === "ornate" ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const p = project(ctx, 0.03 * ctx.flipX, midY + 0.1 - i * 0.1, frontZ);
      fillEllipse(g, p.x, p.y, u(ctx, 0.035), u(ctx, 0.035), detail);
    }
  }

  const necklace =
    style === "tank" ||
    style === "robe" ||
    style === "hoodedRobe" ||
    detailStyle === "ornate";
  if (necklace) {
    for (const s of [-1, 0, 1] as const) {
      const p = project(
        ctx,
        s * 0.07,
        a.shoulderY - 0.1 - Math.abs(s) * 0.02,
        frontZ,
      );
      fillEllipse(g, p.x, p.y, u(ctx, 0.032), u(ctx, 0.032), detail);
    }
    const pendant = project(ctx, 0, a.shoulderY - 0.18, frontZ + 0.02);
    fillRect(
      g,
      pendant.x - u(ctx, 0.04),
      pendant.y - u(ctx, 0.045),
      u(ctx, 0.08),
      u(ctx, 0.09),
      detail,
      1,
    );
  }
}

export function drawTorso(ctx: DrawCtx, a: Anchors): void {
  const style: TorsoStyle = ctx.spec.torso.style;
  const color = ctx.spec.torso.color;
  const trim = ctx.spec.torso.trim ?? shade(color, -0.15);
  const detailStyle: BodyDetailStyle = ctx.spec.torso.detailStyle ?? "classic";
  const armored = style === "chestplate" || style === "fullPlate";
  const detail =
    ctx.spec.torso.detailColor ??
    (armored ? "#f5c542" : ctx.spec.torso.trim ?? "#d7dde5");
  const g = ctx.ctx;
  const midY = (a.hipY + a.shoulderY) * 0.5;
  const H = a.shoulderY - a.hipY;
  const hip = project(ctx, 0, a.hipY + 0.05, 0);
  const skin = ctx.spec.skin;

  fillEllipse(g, hip.x, hip.y, u(ctx, a.hipWidth * 0.45), u(ctx, 0.1), shade(color, -0.05));

  switch (style) {
    case "tank": {
      bodyDiamond(ctx, midY, a.hipWidth * 0.42, H * 0.42, shade(color, 0), 0.04);
      const chest = project(ctx, 0, midY + H * 0.12, a.torsoDepth * 0.35);
      fillEllipse(g, chest.x, chest.y, u(ctx, a.hipWidth * 0.32), u(ctx, 0.12), shade(skin, -0.02));
      shoulders(ctx, a, shade(skin, -0.04), 0.12);
      belt(ctx, a, shade(trim, -0.05), detail, detailStyle === "ornate");
      break;
    }
    case "robe": {
      bodyDiamond(ctx, midY - 0.02, a.hipWidth * 0.52, H * 0.55, shade(color, 0), 0.06);
      const hemL = project(ctx, -a.hipWidth * 0.4, a.hipY - 0.02, -0.08);
      const hemR = project(ctx, a.hipWidth * 0.4, a.hipY - 0.02, -0.08);
      fillCapsule(g, hemL.x, hemL.y, hemR.x, hemR.y, u(ctx, 0.08), shade(color, -0.06));
      shoulders(ctx, a, shade(color, -0.04), 0.13);
      if (ctx.spec.torso.trim) {
        const bandL = project(ctx, -a.hipWidth * 0.45, a.hipY + 0.08, 0.04);
        const bandR = project(ctx, a.hipWidth * 0.45, a.hipY + 0.08, 0.04);
        fillCapsule(g, bandL.x, bandL.y, bandR.x, bandR.y, u(ctx, 0.035), trim);
      }
      break;
    }
    case "hoodedRobe": {
      bodyDiamond(ctx, midY - 0.04, a.hipWidth * 0.55, H * 0.58, shade(color, 0), 0.07);
      const backHood = project(ctx, 0, a.shoulderY + 0.06, -0.1);
      fillEllipse(
        g,
        backHood.x,
        backHood.y,
        u(ctx, a.skullR * 0.55),
        u(ctx, a.skullR * 0.45),
        shade(color, -0.08),
      );
      if (ctx.showFace) {
        for (const s of [-1, 1] as const) {
          const cowl = project(ctx, s * a.skullR * 0.55, a.headCenterY - 0.06, 0.02);
          fillEllipse(g, cowl.x, cowl.y, u(ctx, 0.1), u(ctx, 0.12), shade(color, -0.05));
        }
        const neck = project(ctx, 0, a.shoulderY + 0.02, 0.06);
        fillEllipse(g, neck.x, neck.y, u(ctx, 0.16), u(ctx, 0.08), shade(color, -0.02));
      }
      for (const s of [-1, 1] as const) {
        const sh = project(ctx, s * 0.4, midY + 0.04, 0.04);
        const el = project(ctx, s * 0.55, midY - 0.08, 0.08);
        fillCapsule(g, sh.x, sh.y, el.x, el.y, u(ctx, 0.1), shade(color, -0.04));
      }
      if (ctx.spec.torso.trim) {
        const bandL = project(ctx, -a.hipWidth * 0.48, a.hipY + 0.08, 0.04);
        const bandR = project(ctx, a.hipWidth * 0.48, a.hipY + 0.08, 0.04);
        fillCapsule(g, bandL.x, bandL.y, bandR.x, bandR.y, u(ctx, 0.038), trim);
      }
      break;
    }
    case "chestplate": {
      shoulders(ctx, a, shade(trim, -0.05), 0.16);
      bodyDiamond(ctx, midY, a.hipWidth * 0.5, H * 0.45, shade(trim, 0), 0.04);
      const plate = project(ctx, 0, midY + H * 0.1, a.torsoDepth * 0.2);
      fillEllipse(
        g,
        plate.x,
        plate.y,
        u(ctx, a.hipWidth * 0.38),
        u(ctx, H * 0.22),
        shade(color, 0.05),
      );
      const lower = project(ctx, 0, midY - H * 0.15, a.torsoDepth * 0.15);
      fillEllipse(
        g,
        lower.x,
        lower.y,
        u(ctx, a.hipWidth * 0.34),
        u(ctx, H * 0.16),
        shade(color, -0.02),
      );
      belt(ctx, a, shade(color, -0.08), detail, detailStyle === "ornate");
      break;
    }
    case "fullPlate": {
      const collar = project(ctx, 0, a.shoulderY - 0.02, 0.02);
      fillEllipse(g, collar.x, collar.y, u(ctx, 0.18), u(ctx, 0.08), shade(trim, 0));
      bodyDiamond(ctx, midY + H * 0.05, a.hipWidth * 0.52, H * 0.32, shade(color, 0.02), 0.05);
      bodyDiamond(ctx, midY - H * 0.12, a.hipWidth * 0.48, H * 0.22, shade(trim, -0.02), 0.04);
      for (const s of [-1, 1] as const) {
        const p = project(ctx, s * a.shoulderWidth * 0.55, a.shoulderY - 0.04, 0.04);
        fillEllipse(g, p.x, p.y, u(ctx, 0.16), u(ctx, 0.14), shade(color, 0));
        fillRect(
          g,
          p.x - u(ctx, 0.1),
          p.y - u(ctx, 0.04),
          u(ctx, 0.2),
          u(ctx, 0.1),
          shade(trim, -0.05),
          1,
        );
      }
      for (const s of [-1, 0, 1] as const) {
        const fauld = project(ctx, s * 0.14, a.hipY + 0.1, 0.12);
        fillRect(
          g,
          fauld.x - u(ctx, 0.07),
          fauld.y - u(ctx, 0.06),
          u(ctx, 0.14),
          u(ctx, 0.12),
          shade(color, -0.05),
          1,
        );
      }
      belt(ctx, a, shade(color, -0.1), detail, detailStyle === "ornate");
      break;
    }
    case "jacket": {
      bodyDiamond(ctx, midY, a.hipWidth * 0.48, H * 0.45, shade(color, 0), 0.05);
      shoulders(ctx, a, shade(color, -0.04), 0.14);
      const openL = project(ctx, -0.06 * ctx.flipX, midY + 0.05, a.torsoDepth * 0.5);
      const openR = project(ctx, 0.1 * ctx.flipX, midY - 0.05, a.torsoDepth * 0.5);
      fillCapsule(g, openL.x, openL.y, openR.x, openR.y, u(ctx, 0.03), shade(trim, 0.05));
      const collL = project(ctx, -0.1, a.shoulderY + 0.02, -0.06);
      const collR = project(ctx, 0.1, a.shoulderY + 0.02, -0.06);
      fillCapsule(g, collL.x, collL.y, collR.x, collR.y, u(ctx, 0.045), shade(color, -0.08));
      belt(ctx, a, trim, detail, detailStyle === "ornate");
      break;
    }
    case "plain":
    default: {
      bodyDiamond(ctx, midY, a.hipWidth * 0.45, H * 0.42, shade(color, 0), 0.04);
      const chest = project(ctx, 0, midY + H * 0.1, a.torsoDepth * 0.3);
      fillEllipse(
        g,
        chest.x,
        chest.y,
        u(ctx, a.hipWidth * 0.3),
        u(ctx, 0.1),
        shade(color, 0.06),
      );
      shoulders(ctx, a, shade(color, -0.04), 0.13);
      belt(ctx, a, trim, detail, detailStyle === "ornate");
      break;
    }
  }

  bodyDetails(ctx, a, style, detailStyle, detail, armored);
}

function drawHem(ctx: DrawCtx, a: Anchors, style: HemStyle, color: string) {
  if (style === "none") return;
  const g = ctx.ctx;
  const y = a.hipY + 0.02;
  if (style === "skirt") {
    const topL = project(ctx, -a.hipWidth * 0.4, y + 0.04, 0.05);
    const topR = project(ctx, a.hipWidth * 0.4, y + 0.04, 0.05);
    const botL = project(ctx, -a.hipWidth * 0.55, y - 0.16, 0.08);
    const botR = project(ctx, a.hipWidth * 0.55, y - 0.16, 0.08);
    fillPoly(
      g,
      [
        { x: topL.x, y: topL.y },
        { x: topR.x, y: topR.y },
        { x: botR.x, y: botR.y },
        { x: botL.x, y: botL.y },
      ],
      shade(color, 0),
    );
    for (const s of [-1, 0, 1] as const) {
      const scallop = project(ctx, s * 0.18, y - 0.18, 0.1);
      fillEllipse(g, scallop.x, scallop.y, u(ctx, 0.08), u(ctx, 0.06), shade(color, -0.05));
    }
  } else if (style === "loincloth") {
    const beltL = project(ctx, -a.hipWidth * 0.45, y + 0.04, 0.04);
    const beltR = project(ctx, a.hipWidth * 0.45, y + 0.04, 0.04);
    fillCapsule(g, beltL.x, beltL.y, beltR.x, beltR.y, u(ctx, 0.035), shade(color, -0.05));
    const front = project(ctx, 0, y - 0.1, a.torsoDepth * 0.45);
    fillRect(
      g,
      front.x - u(ctx, 0.1),
      front.y - u(ctx, 0.04),
      u(ctx, 0.2),
      u(ctx, 0.22),
      shade(color, 0),
      2,
    );
    fillEllipse(g, front.x, front.y + u(ctx, 0.14), u(ctx, 0.07), u(ctx, 0.06), shade(color, -0.06));
  }
}

function drawCape(ctx: DrawCtx, a: Anchors, color: string) {
  const g = ctx.ctx;
  const midY = (a.hipY + a.shoulderY) * 0.45;
  const topL = project(ctx, -a.shoulderWidth * 0.35, a.shoulderY, -0.12);
  const topR = project(ctx, a.shoulderWidth * 0.35, a.shoulderY, -0.12);
  const botL = project(ctx, -a.hipWidth * 0.55, a.hipY - 0.06, -0.4);
  const botR = project(ctx, a.hipWidth * 0.55, a.hipY - 0.06, -0.4);
  fillPoly(
    g,
    [
      { x: topL.x, y: topL.y },
      { x: topR.x, y: topR.y },
      { x: botR.x, y: botR.y },
      { x: botL.x, y: botL.y },
    ],
    shade(color, 0),
  );
  for (const s of [-1, 0, 1] as const) {
    const scallop = project(ctx, s * 0.16, a.hipY - 0.08, -0.42);
    fillEllipse(g, scallop.x, scallop.y, u(ctx, 0.08), u(ctx, 0.06), shade(color, -0.06));
  }
  const claspL = project(ctx, -0.12, a.shoulderY, -0.06);
  const claspR = project(ctx, 0.12, a.shoulderY, -0.06);
  fillEllipse(g, claspL.x, claspL.y, u(ctx, 0.05), u(ctx, 0.05), shade(color, 0.2));
  fillEllipse(g, claspR.x, claspR.y, u(ctx, 0.05), u(ctx, 0.05), shade(color, 0.2));
  const shine = project(ctx, 0, midY + 0.08, -0.38);
  fillEllipse(g, shine.x, shine.y, u(ctx, 0.06), u(ctx, 0.1), shade(color, 0.12));
}

function drawPouches(ctx: DrawCtx, a: Anchors, color: string) {
  const g = ctx.ctx;
  const y = a.hipY + 0.08;
  const dark = shade(color, -0.25);
  for (const s of [-1, 1] as const) {
    const p = project(ctx, s * 0.36, y, 0.12);
    fillRect(g, p.x - u(ctx, 0.07), p.y - u(ctx, 0.07), u(ctx, 0.14), u(ctx, 0.14), shade(color, 0), 1);
    fillRect(g, p.x - u(ctx, 0.065), p.y - u(ctx, 0.09), u(ctx, 0.13), u(ctx, 0.05), dark, 0);
    fillEllipse(g, p.x, p.y - u(ctx, 0.06), u(ctx, 0.025), u(ctx, 0.025), shade(color, 0.35));
  }
}

function drawBackLoadout(ctx: DrawCtx, a: Anchors, style: BackLoadout, color: string) {
  if (style === "none") return;
  const g = ctx.ctx;
  const midY = (a.hipY + a.shoulderY) * 0.5;
  const backZ = -0.35;
  const leather = "#4a3626";
  const metal = shade(color, 0.35);

  if (style === "scabbard") {
    const top = project(ctx, 0.18, midY + 0.22, backZ);
    const bot = project(ctx, -0.08, midY - 0.2, backZ);
    fillCapsule(g, bot.x, bot.y, top.x, top.y, u(ctx, 0.05), shade(leather, 0));
    fillEllipse(g, top.x, top.y, u(ctx, 0.045), u(ctx, 0.045), metal);
    const guard = project(ctx, -0.02, midY - 0.08, backZ);
    fillRect(g, guard.x - u(ctx, 0.07), guard.y - u(ctx, 0.02), u(ctx, 0.14), u(ctx, 0.04), shade(color, 0.2), 0);
  } else if (style === "greatsword") {
    const tip = project(ctx, -0.02, midY + 0.55, backZ - 0.04);
    const guard = project(ctx, -0.1, midY - 0.02, backZ);
    const pommel = project(ctx, -0.14, midY - 0.22, backZ);
    fillCapsule(g, guard.x, guard.y, tip.x, tip.y, u(ctx, 0.055), shade(color, 0.05));
    fillPoly(
      g,
      [
        { x: tip.x - u(ctx, 0.04), y: tip.y + u(ctx, 0.02) },
        { x: tip.x + u(ctx, 0.04), y: tip.y + u(ctx, 0.02) },
        { x: tip.x, y: tip.y - u(ctx, 0.1) },
      ],
      shade(color, 0.15),
    );
    fillCapsule(
      g,
      guard.x - u(ctx, 0.1),
      guard.y,
      guard.x + u(ctx, 0.1),
      guard.y,
      u(ctx, 0.03),
      metal,
    );
    fillCapsule(g, guard.x, guard.y, pommel.x, pommel.y, u(ctx, 0.035), shade(leather, 0));
  } else if (style === "quiver") {
    const top = project(ctx, 0.14, midY + 0.22, backZ);
    const bot = project(ctx, 0.22, midY - 0.12, backZ);
    fillCapsule(g, bot.x, bot.y, top.x, top.y, u(ctx, 0.08), shade(leather, 0));
    for (let i = 0; i < 3; i++) {
      const f = project(ctx, 0.1 + i * 0.035, midY + 0.3, backZ - 0.02 + i * 0.015);
      fillPoly(
        g,
        [
          { x: f.x, y: f.y - u(ctx, 0.06) },
          { x: f.x + u(ctx, 0.03), y: f.y },
          { x: f.x - u(ctx, 0.03), y: f.y },
        ],
        shade(color, 0.15),
      );
    }
  } else if (style === "pack") {
    const pack = project(ctx, 0, midY + 0.04, backZ);
    fillRect(
      g,
      pack.x - u(ctx, 0.16),
      pack.y - u(ctx, 0.12),
      u(ctx, 0.32),
      u(ctx, 0.26),
      shade(color, 0),
      2,
    );
    const roll = project(ctx, 0, midY + 0.22, backZ);
    fillEllipse(g, roll.x, roll.y, u(ctx, 0.14), u(ctx, 0.07), shade(color, 0.15));
    for (const s of [-1, 1] as const) {
      const strap = project(ctx, s * 0.1, midY, -0.18);
      fillRect(g, strap.x - u(ctx, 0.02), strap.y - u(ctx, 0.12), u(ctx, 0.04), u(ctx, 0.24), shade(leather, 0), 0);
    }
  } else if (style === "axe") {
    const butt = project(ctx, 0.02, midY - 0.12, backZ);
    const head = project(ctx, 0.24, midY + 0.32, backZ);
    fillCapsule(g, butt.x, butt.y, head.x, head.y, u(ctx, 0.035), shade(leather, 0));
    fillPoly(
      g,
      [
        { x: head.x - u(ctx, 0.04), y: head.y - u(ctx, 0.08) },
        { x: head.x + u(ctx, 0.14), y: head.y },
        { x: head.x - u(ctx, 0.04), y: head.y + u(ctx, 0.08) },
      ],
      shade(color, 0.08),
    );
    fillEllipse(g, head.x, head.y, u(ctx, 0.035), u(ctx, 0.035), metal);
  }
}

export function drawAccessories(ctx: DrawCtx, a: Anchors, layer: "back" | "front"): void {
  const acc = ctx.spec.accessories;
  if (!acc) return;

  if (layer === "back") {
    if (acc.cape) {
      drawCape(ctx, a, acc.capeColor ?? shade(ctx.spec.torso.color, -0.1));
    }
    const loadout = acc.backLoadout ?? "none";
    if (loadout !== "none") {
      drawBackLoadout(ctx, a, loadout, acc.backLoadoutColor ?? ctx.spec.torso.color);
    }
    return;
  }

  const hem = acc.hem ?? "none";
  if (hem !== "none") {
    drawHem(ctx, a, hem, acc.hemColor ?? shade(ctx.spec.torso.color, -0.05));
  }
  if (acc.pouches) {
    drawPouches(ctx, a, acc.pouchColor ?? shade(ctx.spec.torso.color, -0.15));
  }
}
