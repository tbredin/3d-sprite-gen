import type { ArmPose, LegPose, WeaponType } from "../../chibi";
import { armJointsForPose, legJointsForPose, leadSign, TWO_HANDED_TYPES } from "../../chibi";
import { fillCapsule, fillEllipse, project, shade, u } from "../draw";
import type { DrawCtx } from "../types";
import type { Anchors } from "../layout";
import { drawWeaponAt } from "./weapons";

type Joint = { x: number; y: number; z: number };

/** 2D leg tuning: slightly smaller and tighter stance. */
const LEG_2D_SCALE = 0.88;
const LEG_STANCE_SCALE = 0.82;

/** Approximate two-bone arm tip in character space from pose joints. */
function armChain(
  ctx: DrawCtx,
  a: Anchors,
  side: 1 | -1,
  pose: ArmPose,
): { shoulder: Joint; elbow: Joint; hand: Joint } {
  const joints = armJointsForPose(pose, side, ctx.lead);
  const shX = side * a.shoulderWidth * 0.48;
  const shY = a.shoulderY;
  const shZ = 0;
  const upper = a.armLength * 0.55;
  const fore = a.armLength * 0.45;
  // Convert Euler-ish shoulder into a forward/down/out direction (sprite approx).
  const sx = joints.shoulder.x;
  const sy = joints.shoulder.y;
  const sz = joints.shoulder.z;
  const dirX = Math.sin(sy) * 0.35 + Math.sin(sz) * 0.85;
  const dirY = -Math.cos(sx) * 0.55 - 0.2;
  const dirZ = Math.sin(sx) * 0.9 + Math.cos(sy) * 0.15;
  const len = Math.hypot(dirX, dirY, dirZ) || 1;
  const ux = (dirX / len) * upper;
  const uy = (dirY / len) * upper;
  const uz = (dirZ / len) * upper;
  const elbow = { x: shX + ux, y: shY + uy, z: shZ + uz };
  const bend = Math.abs(joints.elbow);
  const fx = ux * 0.15 + side * 0.05;
  const fy = -fore * Math.cos(bend * 0.5) - 0.05;
  const fz = uz * 0.4 + Math.sin(-joints.elbow) * fore * 0.7;
  const fl = Math.hypot(fx, fy, fz) || 1;
  const hand = {
    x: elbow.x + (fx / fl) * fore,
    y: elbow.y + (fy / fl) * fore,
    z: elbow.z + (fz / fl) * fore,
  };
  return { shoulder: { x: shX, y: shY, z: shZ }, elbow, hand };
}

function legChain(
  ctx: DrawCtx,
  a: Anchors,
  side: 1 | -1,
  pose: LegPose,
): { hip: Joint; knee: Joint; foot: Joint } {
  const joints = legJointsForPose(pose, side, ctx.lead);
  const hipX = side * a.hipWidth * 0.38 * LEG_STANCE_SCALE;
  const hipY = a.hipY + (joints.hipY ?? 0);
  const hipZ = 0;
  const thigh = (a.hipY - a.footY) * 0.52 * LEG_2D_SCALE;
  const shin = (a.hipY - a.footY) * 0.48 * LEG_2D_SCALE;
  const hx = joints.hip.x;
  const hz = joints.hip.z;
  const dirX = Math.sin(hz) * 0.9;
  const dirY = -Math.cos(hx) * 0.75 - 0.15;
  const dirZ = Math.sin(hx) * 0.85;
  const len = Math.hypot(dirX, dirY, dirZ) || 1;
  const knee = {
    x: hipX + (dirX / len) * thigh,
    y: hipY + (dirY / len) * thigh,
    z: hipZ + (dirZ / len) * thigh,
  };
  const kneeBend = joints.knee;
  const foot = {
    x: knee.x + dirX * 0.15 * shin,
    y: a.footY + 0.02,
    z: knee.z + Math.sin(hx) * shin * 0.55 - kneeBend * 0.05,
  };
  return { hip: { x: hipX, y: hipY, z: hipZ }, knee, foot };
}

export function drawLegs(ctx: DrawCtx, a: Anchors) {
  const pose: LegPose = ctx.spec.legs.pose;
  const pant = ctx.spec.legs.pantColor;
  const boot = ctx.spec.legs.bootColor;
  const thick = u(ctx, a.legThick * 0.45 * LEG_2D_SCALE);
  const g = ctx.ctx;

  // Draw trail then lead so lead overlaps.
  const order: (1 | -1)[] =
    ctx.lead === "right" ? [-1, 1] : [1, -1];

  for (const side of order) {
    const chain = legChain(ctx, a, side, pose);
    const hip = project(ctx, chain.hip.x, chain.hip.y, chain.hip.z);
    const knee = project(ctx, chain.knee.x, chain.knee.y, chain.knee.z);
    const foot = project(ctx, chain.foot.x, chain.foot.y, chain.foot.z);
    fillCapsule(g, hip.x, hip.y, knee.x, knee.y, thick, pant);
    fillCapsule(g, knee.x, knee.y, foot.x, foot.y, thick * 0.9, shade(pant, -0.05));
    // Boot
    fillEllipse(
      g,
      foot.x,
      foot.y + u(ctx, 0.02),
      u(ctx, a.footLength * 0.55 * LEG_2D_SCALE),
      u(ctx, a.footWidth * 0.45 * LEG_2D_SCALE),
      boot,
    );
  }
}

export function drawArms(
  ctx: DrawCtx,
  a: Anchors,
  opts?: { skipWeapons?: boolean },
) {
  const pose: ArmPose = ctx.spec.arms.pose;
  const sleeve = ctx.spec.arms.sleeveColor ?? shade(ctx.spec.torso.color, -0.08);
  const handColor = ctx.spec.arms.handColor ?? ctx.spec.skin;
  const sleeveLen = Math.max(0, Math.min(1, ctx.spec.arms.sleeveLength ?? 0.85));
  const thick = u(ctx, a.armThick * 0.42);
  const g = ctx.ctx;

  const leadS = leadSign(ctx.lead);
  const trailS = (leadS === 1 ? -1 : 1) as 1 | -1;
  // Away facings: draw lead first (farther); toward: trail first.
  const order: (1 | -1)[] = ctx.showFace ? [trailS, leadS] : [leadS, trailS];

  const hands: Record<number, { x: number; y: number; z: number }> = {};

  for (const side of order) {
    const chain = armChain(ctx, a, side, pose);
    hands[side] = chain.hand;
    const sh = project(ctx, chain.shoulder.x, chain.shoulder.y, chain.shoulder.z);
    const el = project(ctx, chain.elbow.x, chain.elbow.y, chain.elbow.z);
    const hd = project(ctx, chain.hand.x, chain.hand.y, chain.hand.z);

    fillCapsule(g, sh.x, sh.y, el.x, el.y, thick, sleeve);
    if (sleeveLen > 0.35) {
      fillCapsule(
        g,
        el.x,
        el.y,
        el.x + (hd.x - el.x) * sleeveLen,
        el.y + (hd.y - el.y) * sleeveLen,
        thick * 0.9,
        shade(sleeve, -0.04),
      );
    }
    fillEllipse(g, hd.x, hd.y, u(ctx, a.handSize * 0.55), u(ctx, a.handSize * 0.5), handColor);
  }

  if (opts?.skipWeapons) return;

  const weapon = ctx.spec.weapon;
  const offhand = ctx.spec.offhand;
  const mainType = weapon?.type ?? "none";
  const twoHand = (TWO_HANDED_TYPES as WeaponType[]).includes(mainType);

  // Main weapon in lead hand (or shield trail by default).
  if (weapon && mainType !== "none") {
    const handSide =
      mainType === "shield"
        ? trailS
        : weapon.hand === "left"
          ? (-1 as 1 | -1)
          : weapon.hand === "right"
            ? (1 as 1 | -1)
            : leadS;
    const h = hands[handSide] ?? hands[leadS]!;
    drawWeaponAt(ctx, h, mainType, weapon.color, handSide);
    if (twoHand) {
      const other = hands[handSide === 1 ? -1 : 1];
      if (other) {
        // Soft second-hand cue near grip.
        const p = project(ctx, other.x, other.y, other.z);
        fillEllipse(ctx.ctx, p.x, p.y, u(ctx, a.handSize * 0.4), u(ctx, a.handSize * 0.35), handColor);
      }
    }
  }

  if (offhand && offhand.type !== "none" && !twoHand) {
    const h = hands[trailS]!;
    drawWeaponAt(ctx, h, offhand.type, offhand.color, trailS);
  }
}
