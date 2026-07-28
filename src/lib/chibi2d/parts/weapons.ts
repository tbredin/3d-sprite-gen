import type { WeaponType } from "../../chibi";
import { fillCapsule, fillEllipse, fillPoly, fillRect, project, shade, u } from "../draw";
import type { DrawCtx, Pt } from "../types";

type Hand = { x: number; y: number; z: number };

function gripPt(ctx: DrawCtx, hand: Hand): Pt {
  return project(ctx, hand.x, hand.y, hand.z);
}

/** Tip point for blades/hafts: up + slightly forward, biased by handSide × flipX. */
function bladeTip(ctx: DrawCtx, hand: Hand, handSide: 1 | -1, len: number): Pt {
  const bias = handSide * ctx.flipX;
  return project(
    ctx,
    hand.x + bias * len * 0.12,
    hand.y + len * 0.85,
    hand.z + len * 0.35,
  );
}

/** Muzzle / barrel tip: roughly horizontal-forward. */
function gunTip(ctx: DrawCtx, hand: Hand, handSide: 1 | -1, len: number): Pt {
  const bias = handSide * ctx.flipX;
  return project(
    ctx,
    hand.x + bias * len * 0.08,
    hand.y + len * 0.08,
    hand.z + len,
  );
}

function wood(color: string) {
  return shade(color, -0.25);
}

function drawHandle(
  g: CanvasRenderingContext2D,
  grip: Pt,
  tip: Pt,
  t: number,
  color: string,
  frac = 0.22,
) {
  const hx = grip.x + (tip.x - grip.x) * frac;
  const hy = grip.y + (tip.y - grip.y) * frac;
  fillCapsule(g, grip.x, grip.y, hx, hy, t, wood(color));
  fillEllipse(g, grip.x, grip.y, t * 1.1, t * 1.1, shade(color, -0.35));
}

function drawStraightBlade(
  g: CanvasRenderingContext2D,
  grip: Pt,
  tip: Pt,
  halfW: number,
  color: string,
  guardW: number,
) {
  const dx = tip.x - grip.x;
  const dy = tip.y - grip.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const base = 0.18;
  const bx = grip.x + dx * base;
  const by = grip.y + dy * base;
  fillCapsule(g, grip.x, grip.y, bx, by, halfW * 0.7, wood(color));
  fillCapsule(
    g,
    bx - nx * guardW,
    by - ny * guardW,
    bx + nx * guardW,
    by + ny * guardW,
    halfW * 0.55,
    shade(color, 0.35),
  );
  fillPoly(
    g,
    [
      { x: bx + nx * halfW, y: by + ny * halfW },
      { x: tip.x + nx * halfW * 0.35, y: tip.y + ny * halfW * 0.35 },
      { x: tip.x, y: tip.y },
      { x: tip.x - nx * halfW * 0.35, y: tip.y - ny * halfW * 0.35 },
      { x: bx - nx * halfW, y: by - ny * halfW },
    ],
    shade(color, 0.05),
  );
  fillCapsule(
    g,
    bx + nx * halfW * 0.35,
    by + ny * halfW * 0.35,
    tip.x + nx * halfW * 0.15,
    tip.y + ny * halfW * 0.15,
    Math.max(0.6, halfW * 0.22),
    shade(color, 0.28),
  );
}

function drawCurvedBlade(
  g: CanvasRenderingContext2D,
  grip: Pt,
  tip: Pt,
  halfW: number,
  color: string,
  curve: number,
) {
  const dx = tip.x - grip.x;
  const dy = tip.y - grip.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const mid = {
    x: grip.x + dx * 0.55 + nx * curve,
    y: grip.y + dy * 0.55 + ny * curve,
  };
  const base = { x: grip.x + dx * 0.2, y: grip.y + dy * 0.2 };
  fillCapsule(g, grip.x, grip.y, base.x, base.y, halfW * 0.65, wood(color));
  fillEllipse(g, base.x, base.y, halfW * 1.4, halfW * 1.1, shade(color, 0.3));
  fillPoly(
    g,
    [
      { x: base.x + nx * halfW, y: base.y + ny * halfW },
      { x: mid.x + nx * halfW * 1.1, y: mid.y + ny * halfW * 1.1 },
      { x: tip.x, y: tip.y },
      { x: mid.x - nx * halfW * 0.6, y: mid.y - ny * halfW * 0.6 },
      { x: base.x - nx * halfW * 0.7, y: base.y - ny * halfW * 0.7 },
    ],
    shade(color, 0.05),
  );
  fillCapsule(
    g,
    mid.x + nx * halfW * 0.5,
    mid.y + ny * halfW * 0.5,
    tip.x,
    tip.y,
    Math.max(0.6, halfW * 0.2),
    shade(color, 0.28),
  );
}

function drawAxeHead(
  g: CanvasRenderingContext2D,
  haftEnd: Pt,
  nx: number,
  ny: number,
  bit: number,
  color: string,
  bearded = false,
) {
  const bitPts = bearded
    ? [
        { x: haftEnd.x + nx * bit * 0.15, y: haftEnd.y + ny * bit * 0.15 },
        { x: haftEnd.x + nx * bit, y: haftEnd.y + ny * bit - bit * 0.55 },
        { x: haftEnd.x + nx * bit * 1.15, y: haftEnd.y + ny * bit * 0.2 },
        { x: haftEnd.x + nx * bit * 0.85, y: haftEnd.y + ny * bit * 0.85 },
        { x: haftEnd.x - nx * bit * 0.1, y: haftEnd.y - ny * bit * 0.1 },
      ]
    : [
        { x: haftEnd.x - nx * bit * 0.1, y: haftEnd.y - ny * bit * 0.1 },
        { x: haftEnd.x + nx * bit * 0.2, y: haftEnd.y + ny * bit * 0.2 - bit * 0.55 },
        { x: haftEnd.x + nx * bit, y: haftEnd.y + ny * bit },
        { x: haftEnd.x + nx * bit * 0.2, y: haftEnd.y + ny * bit * 0.2 + bit * 0.55 },
      ];
  fillPoly(g, bitPts, shade(color, 0.05));
  fillCapsule(
    g,
    haftEnd.x + nx * bit * 0.55,
    haftEnd.y + ny * bit * 0.55 - bit * 0.2,
    haftEnd.x + nx * bit * 0.9,
    haftEnd.y + ny * bit * 0.9,
    Math.max(0.7, bit * 0.12),
    shade(color, 0.3),
  );
}

function drawHaftWeapon(
  ctx: DrawCtx,
  hand: Hand,
  handSide: 1 | -1,
  len: number,
  haftR: number,
  color: string,
  head: (g: CanvasRenderingContext2D, end: Pt, nx: number, ny: number) => void,
) {
  const g = ctx.ctx;
  const grip = gripPt(ctx, hand);
  const tip = bladeTip(ctx, hand, handSide, len);
  const dx = tip.x - grip.x;
  const dy = tip.y - grip.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const end = { x: grip.x + dx * 0.92, y: grip.y + dy * 0.92 };
  fillCapsule(g, grip.x, grip.y, tip.x, tip.y, haftR, wood(color));
  fillCapsule(
    g,
    grip.x,
    grip.y,
    grip.x + dx * 0.18,
    grip.y + dy * 0.18,
    haftR * 1.15,
    shade(color, -0.35),
  );
  head(g, end, nx * (handSide * ctx.flipX >= 0 ? 1 : -1), ny * (handSide * ctx.flipX >= 0 ? 1 : -1));
}

function drawGun(
  ctx: DrawCtx,
  hand: Hand,
  handSide: 1 | -1,
  barrelLen: number,
  color: string,
  opts: { heavy?: boolean; flint?: boolean; stock?: boolean; carbine?: boolean },
) {
  const g = ctx.ctx;
  const grip = gripPt(ctx, hand);
  const tip = gunTip(ctx, hand, handSide, barrelLen);
  const dx = tip.x - grip.x;
  const dy = tip.y - grip.y;
  const bodyR = u(ctx, opts.heavy ? 0.07 : opts.stock ? 0.055 : 0.045);
  const barrelR = u(ctx, opts.heavy ? 0.04 : 0.028);
  fillCapsule(g, grip.x, grip.y, tip.x, tip.y, barrelR, shade(color, 0.05));
  fillRect(
    g,
    grip.x - bodyR * (opts.heavy ? 1.4 : 1.1),
    grip.y - bodyR * 0.9,
    bodyR * (opts.heavy ? 2.8 : 2.2),
    bodyR * 1.8,
    shade(color, -0.08),
    1,
  );
  const gripDrop = u(ctx, 0.1);
  fillCapsule(
    g,
    grip.x,
    grip.y,
    grip.x - dx * 0.05,
    grip.y + gripDrop,
    bodyR * 0.55,
    wood(color),
  );
  if (opts.flint) {
    fillEllipse(
      g,
      grip.x + dx * 0.25,
      grip.y + dy * 0.25 - bodyR,
      bodyR * 0.7,
      bodyR * 0.55,
      shade(color, 0.25),
    );
  }
  if (opts.stock || opts.carbine) {
    const back = {
      x: grip.x - dx * (opts.carbine ? 0.35 : 0.55),
      y: grip.y - dy * (opts.carbine ? 0.35 : 0.55) + u(ctx, 0.04),
    };
    fillCapsule(g, grip.x, grip.y, back.x, back.y, bodyR * 0.85, wood(color));
  }
  fillEllipse(g, tip.x, tip.y, barrelR * 1.1, barrelR * 1.1, shade(color, -0.2));
}

function drawShield(ctx: DrawCtx, hand: Hand, handSide: 1 | -1, color: string) {
  const g = ctx.ctx;
  const bias = handSide * ctx.flipX;
  const c = project(
    ctx,
    hand.x + handSide * 0.14,
    hand.y + 0.02,
    hand.z + 0.06,
  );
  const rx = u(ctx, 0.22);
  const ry = u(ctx, 0.26);
  fillEllipse(g, c.x, c.y, rx * 1.08, ry * 1.08, shade(color, -0.25));
  fillEllipse(g, c.x, c.y, rx, ry, shade(color, 0));
  fillPoly(
    g,
    [
      { x: c.x, y: c.y - ry * 1.05 },
      { x: c.x + rx * 0.85 * bias, y: c.y },
      { x: c.x, y: c.y + ry * 1.15 },
      { x: c.x - rx * 0.55 * bias, y: c.y },
    ],
    shade(color, -0.08),
  );
  fillEllipse(g, c.x + bias * rx * 0.1, c.y, u(ctx, 0.055), u(ctx, 0.055), shade(color, 0.35));
}

export function drawWeaponAt(
  ctx: DrawCtx,
  hand: { x: number; y: number; z: number },
  type: WeaponType,
  color: string,
  handSide: 1 | -1,
): void {
  if (type === "none") return;
  const g = ctx.ctx;
  const grip = gripPt(ctx, hand);
  const bias = handSide * ctx.flipX;

  switch (type) {
    case "sword": {
      const tip = bladeTip(ctx, hand, handSide, 0.55);
      drawStraightBlade(g, grip, tip, u(ctx, 0.055), color, u(ctx, 0.12));
      break;
    }
    case "swordBroad": {
      const tip = bladeTip(ctx, hand, handSide, 0.58);
      drawStraightBlade(g, grip, tip, u(ctx, 0.08), color, u(ctx, 0.16));
      break;
    }
    case "swordCurved": {
      const tip = bladeTip(ctx, hand, handSide, 0.55);
      drawCurvedBlade(g, grip, tip, u(ctx, 0.06), color, u(ctx, 0.1) * bias);
      break;
    }
    case "swordRapier": {
      const tip = bladeTip(ctx, hand, handSide, 0.7);
      const dx = tip.x - grip.x;
      const dy = tip.y - grip.y;
      drawHandle(g, grip, tip, u(ctx, 0.035), color, 0.16);
      fillEllipse(
        g,
        grip.x + dx * 0.18,
        grip.y + dy * 0.18,
        u(ctx, 0.08),
        u(ctx, 0.06),
        shade(color, 0.3),
      );
      fillCapsule(g, grip.x + dx * 0.2, grip.y + dy * 0.2, tip.x, tip.y, u(ctx, 0.028), shade(color, 0.08));
      fillEllipse(g, tip.x, tip.y, u(ctx, 0.03), u(ctx, 0.03), shade(color, 0.3));
      break;
    }
    case "swordClaymore": {
      const tip = bladeTip(ctx, hand, handSide, 0.85);
      drawStraightBlade(g, grip, tip, u(ctx, 0.07), color, u(ctx, 0.18));
      break;
    }
    case "dagger": {
      const tip = bladeTip(ctx, hand, handSide, 0.32);
      drawStraightBlade(g, grip, tip, u(ctx, 0.045), color, u(ctx, 0.09));
      break;
    }
    case "daggerCurved": {
      const tip = bladeTip(ctx, hand, handSide, 0.34);
      drawCurvedBlade(g, grip, tip, u(ctx, 0.05), color, u(ctx, 0.08) * bias);
      break;
    }
    case "claw": {
      const base = project(ctx, hand.x, hand.y + 0.04, hand.z + 0.02);
      fillRect(
        g,
        base.x - u(ctx, 0.07),
        base.y - u(ctx, 0.05),
        u(ctx, 0.14),
        u(ctx, 0.1),
        shade(color, -0.1),
        1,
      );
      for (const t of [-0.08, 0, 0.08] as const) {
        const tip = project(ctx, hand.x + bias * 0.02, hand.y + 0.22, hand.z + 0.08 + t);
        fillCapsule(g, base.x + t * ctx.scale, base.y, tip.x, tip.y, u(ctx, 0.025), shade(color, 0.1));
      }
      break;
    }
    case "clawTwin": {
      const base = project(ctx, hand.x, hand.y + 0.02, hand.z);
      fillRect(
        g,
        base.x - u(ctx, 0.08),
        base.y - u(ctx, 0.06),
        u(ctx, 0.16),
        u(ctx, 0.12),
        shade(color, -0.12),
        1,
      );
      for (const t of [-0.07, 0.07] as const) {
        const tip = project(ctx, hand.x + bias * 0.02, hand.y + 0.38, hand.z + t);
        fillCapsule(g, base.x + t * ctx.scale * 0.5, base.y, tip.x, tip.y, u(ctx, 0.03), shade(color, 0.1));
        fillEllipse(g, tip.x, tip.y, u(ctx, 0.03), u(ctx, 0.03), shade(color, 0.28));
      }
      break;
    }
    case "axe":
      drawHaftWeapon(ctx, hand, handSide, 0.55, u(ctx, 0.035), color, (gg, end, nx, ny) => {
        drawAxeHead(gg, end, nx, ny, u(ctx, 0.16), color);
      });
      break;
    case "axeBearded":
      drawHaftWeapon(ctx, hand, handSide, 0.55, u(ctx, 0.035), color, (gg, end, nx, ny) => {
        drawAxeHead(gg, end, nx, ny, u(ctx, 0.18), color, true);
      });
      break;
    case "axeHand":
      drawHaftWeapon(ctx, hand, handSide, 0.38, u(ctx, 0.032), color, (gg, end, nx, ny) => {
        drawAxeHead(gg, end, nx, ny, u(ctx, 0.12), color);
      });
      break;
    case "greataxe":
      drawHaftWeapon(ctx, hand, handSide, 0.85, u(ctx, 0.042), color, (gg, end, nx, ny) => {
        drawAxeHead(gg, end, nx, ny, u(ctx, 0.24), color);
        fillEllipse(gg, end.x, end.y - u(ctx, 0.08), u(ctx, 0.04), u(ctx, 0.04), shade(color, 0.25));
      });
      break;
    case "greataxeDouble":
      drawHaftWeapon(ctx, hand, handSide, 0.85, u(ctx, 0.042), color, (gg, end, nx, ny) => {
        drawAxeHead(gg, end, nx, ny, u(ctx, 0.2), color);
        drawAxeHead(gg, end, -nx, -ny, u(ctx, 0.2), color);
      });
      break;
    case "hammer":
      drawHaftWeapon(ctx, hand, handSide, 0.45, u(ctx, 0.035), color, (gg, end) => {
        const s = u(ctx, 0.1);
        fillRect(gg, end.x - s, end.y - s * 0.7, s * 2, s * 1.4, shade(color, 0.05), 1);
        fillRect(gg, end.x - s * 1.05, end.y - s * 0.85, s * 2.1, s * 0.35, shade(color, 0.3), 0);
      });
      break;
    case "hammerWar":
      drawHaftWeapon(ctx, hand, handSide, 0.55, u(ctx, 0.038), color, (gg, end, nx, ny) => {
        const s = u(ctx, 0.12);
        fillRect(gg, end.x - s * 1.2, end.y - s * 0.65, s * 2.4, s * 1.3, shade(color, 0.05), 1);
        fillPoly(
          gg,
          [
            { x: end.x + nx * s * 1.3, y: end.y + ny * s * 1.3 },
            { x: end.x + nx * s * 0.4, y: end.y + ny * s * 0.4 - s * 0.5 },
            { x: end.x + nx * s * 0.4, y: end.y + ny * s * 0.4 + s * 0.5 },
          ],
          shade(color, 0.25),
        );
      });
      break;
    case "hammerClub":
      drawHaftWeapon(ctx, hand, handSide, 0.5, u(ctx, 0.04), color, (gg, end) => {
        fillEllipse(gg, end.x, end.y, u(ctx, 0.11), u(ctx, 0.13), shade(color, -0.05));
        fillEllipse(gg, end.x, end.y - u(ctx, 0.03), u(ctx, 0.07), u(ctx, 0.08), shade(color, 0.15));
      });
      break;
    case "maul":
      drawHaftWeapon(ctx, hand, handSide, 0.95, u(ctx, 0.045), color, (gg, end) => {
        const s = u(ctx, 0.16);
        fillRect(gg, end.x - s, end.y - s * 0.85, s * 2, s * 1.7, shade(color, 0.02), 2);
        fillRect(gg, end.x - s * 1.1, end.y - s, s * 2.2, s * 0.35, shade(color, -0.2), 0);
        fillRect(gg, end.x - s * 1.1, end.y + s * 0.55, s * 2.2, s * 0.35, shade(color, -0.2), 0);
        fillEllipse(gg, end.x, end.y, u(ctx, 0.045), u(ctx, 0.045), shade(color, 0.3));
      });
      break;
    case "maulSpiked":
      drawHaftWeapon(ctx, hand, handSide, 0.95, u(ctx, 0.045), color, (gg, end) => {
        const s = u(ctx, 0.15);
        fillEllipse(gg, end.x, end.y, s, s * 0.95, shade(color, 0.02));
        for (const a of [0, 1, 2, 3, 4, 5] as const) {
          const ang = (a / 6) * Math.PI * 2;
          fillCapsule(
            gg,
            end.x,
            end.y,
            end.x + Math.cos(ang) * s * 1.15,
            end.y + Math.sin(ang) * s * 1.15,
            u(ctx, 0.02),
            shade(color, 0.25),
          );
        }
      });
      break;
    case "spear":
      drawHaftWeapon(ctx, hand, handSide, 1.05, u(ctx, 0.03), color, (gg, end, nx, ny) => {
        const tip = bladeTip(ctx, hand, handSide, 1.15);
        fillPoly(
          gg,
          [
            { x: end.x - nx * u(ctx, 0.07), y: end.y - ny * u(ctx, 0.07) },
            { x: end.x + nx * u(ctx, 0.07), y: end.y + ny * u(ctx, 0.07) },
            { x: tip.x, y: tip.y },
          ],
          shade(color, 0.12),
        );
        fillCapsule(gg, end.x, end.y, tip.x, tip.y, u(ctx, 0.018), shade(color, 0.3));
      });
      break;
    case "spearBarbed":
      drawHaftWeapon(ctx, hand, handSide, 1.05, u(ctx, 0.03), color, (gg, end, nx, ny) => {
        const tip = bladeTip(ctx, hand, handSide, 1.15);
        fillPoly(
          gg,
          [
            { x: end.x - nx * u(ctx, 0.08), y: end.y - ny * u(ctx, 0.08) },
            { x: end.x + nx * u(ctx, 0.08), y: end.y + ny * u(ctx, 0.08) },
            { x: tip.x, y: tip.y },
          ],
          shade(color, 0.1),
        );
        for (const s of [-1, 1] as const) {
          fillPoly(
            gg,
            [
              { x: end.x + nx * s * u(ctx, 0.02), y: end.y + ny * s * u(ctx, 0.02) },
              {
                x: end.x + nx * s * u(ctx, 0.14),
                y: end.y + ny * s * u(ctx, 0.14) + u(ctx, 0.04),
              },
              { x: end.x + (tip.x - end.x) * 0.35, y: end.y + (tip.y - end.y) * 0.35 },
            ],
            shade(color, 0.2),
          );
        }
      });
      break;
    case "halberd":
      drawHaftWeapon(ctx, hand, handSide, 1.0, u(ctx, 0.032), color, (gg, end, nx, ny) => {
        const tip = bladeTip(ctx, hand, handSide, 1.15);
        fillCapsule(gg, end.x, end.y, tip.x, tip.y, u(ctx, 0.022), shade(color, 0.15));
        drawAxeHead(gg, end, nx, ny, u(ctx, 0.18), color);
        fillPoly(
          gg,
          [
            { x: end.x - nx * u(ctx, 0.04), y: end.y - ny * u(ctx, 0.04) },
            { x: end.x - nx * u(ctx, 0.16), y: end.y - ny * u(ctx, 0.16) },
            { x: end.x + (tip.x - end.x) * 0.2, y: end.y + (tip.y - end.y) * 0.2 },
          ],
          shade(color, 0.05),
        );
      });
      break;
    case "staff": {
      const tip = bladeTip(ctx, hand, handSide, 0.85);
      const butt = project(ctx, hand.x, hand.y - 0.25, hand.z - 0.05);
      fillCapsule(g, butt.x, butt.y, tip.x, tip.y, u(ctx, 0.038), shade(color, -0.05));
      fillEllipse(g, tip.x, tip.y, u(ctx, 0.09), u(ctx, 0.09), shade(color, 0.35));
      fillEllipse(g, tip.x, tip.y, u(ctx, 0.055), u(ctx, 0.055), shade(color, 0.55));
      break;
    }
    case "wand": {
      const tip = bladeTip(ctx, hand, handSide, 0.42);
      fillCapsule(g, grip.x, grip.y, tip.x, tip.y, u(ctx, 0.028), wood(color));
      fillPoly(
        g,
        [
          { x: tip.x, y: tip.y - u(ctx, 0.08) },
          { x: tip.x + u(ctx, 0.06), y: tip.y },
          { x: tip.x, y: tip.y + u(ctx, 0.05) },
          { x: tip.x - u(ctx, 0.06), y: tip.y },
        ],
        shade(color, 0.25),
      );
      break;
    }
    case "wandCrystal": {
      const tip = bladeTip(ctx, hand, handSide, 0.48);
      fillCapsule(g, grip.x, grip.y, tip.x, tip.y, u(ctx, 0.03), wood(color));
      for (const o of [
        { x: 0, y: -0.1, s: 1 },
        { x: 0.05, y: -0.04, s: 0.7 },
        { x: -0.05, y: -0.05, s: 0.65 },
      ] as const) {
        fillPoly(
          g,
          [
            { x: tip.x + u(ctx, o.x), y: tip.y + u(ctx, o.y) },
            { x: tip.x + u(ctx, o.x + 0.045 * o.s), y: tip.y + u(ctx, o.y + 0.08 * o.s) },
            { x: tip.x + u(ctx, o.x - 0.045 * o.s), y: tip.y + u(ctx, o.y + 0.08 * o.s) },
          ],
          shade(color, 0.2 + o.s * 0.1),
        );
      }
      break;
    }
    case "pistol":
      drawGun(ctx, hand, handSide, 0.35, color, {});
      break;
    case "pistolFlint":
      drawGun(ctx, hand, handSide, 0.38, color, { flint: true });
      break;
    case "pistolHeavy":
      drawGun(ctx, hand, handSide, 0.42, color, { heavy: true });
      break;
    case "rifle":
      drawGun(ctx, hand, handSide, 0.75, color, { stock: true });
      break;
    case "rifleLong":
      drawGun(ctx, hand, handSide, 0.95, color, { stock: true });
      break;
    case "rifleCarbine":
      drawGun(ctx, hand, handSide, 0.55, color, { carbine: true });
      break;
    case "shield":
      drawShield(ctx, hand, handSide, color);
      break;
    default:
      break;
  }
}
