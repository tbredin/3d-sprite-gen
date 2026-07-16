import {
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  type Material,
} from "three";
import { toon, toonDetail } from "./materials";
import { capsuleCylinderLength, CHIBI, LAYOUT } from "./units";
import type { HeadShape } from "./types";

function mesh(
  geo: BufferGeometry,
  mat: Material,
  x: number,
  y: number,
  z: number,
) {
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

/**
 * Twelve *different construction skeletons* — not Y-scale variants of one egg.
 * Pick favourites from the head gallery, then we hone those in.
 */
export const DEFAULT_HEAD_SHAPE: HeadShape = "sphere";

/** Mild tip toward iso camera — enough to help, not enough to elongate. */
export const ISO_FACE_TILT = -0.28;

export type FaceLayout = {
  eyeW: number;
  eyeH: number;
  eyeDepth: number;
  eyeTopWiden: number;
  irisW: number;
  irisH: number;
  eyeSpacing: number;
  eyeZ: number;
  eyeLift: number;
  browW: number;
  browH: number;
  browDepth: number;
  mouthWidth: number;
  mouthDrop: number;
};

const BASE_FACE: FaceLayout = {
  eyeW: 0.22,
  eyeH: 0.17,
  eyeDepth: 0.03,
  eyeTopWiden: 1.08,
  irisW: 0.14,
  irisH: 0.125,
  eyeSpacing: 0.16,
  eyeZ: CHIBI.skullR * 0.95,
  eyeLift: 0.04,
  browW: 0.22,
  browH: 0.038,
  browDepth: 0.024,
  mouthWidth: 0.065,
  /** Short chin — previous mouthDrop made jaws read long under iso. */
  mouthDrop: 0.28,
};

/** Per-shape tweaks; most share BASE_FACE with small nudges. */
export const FACE_BY_SHAPE: Record<HeadShape, FaceLayout> = {
  sphere: { ...BASE_FACE },
  capsule: { ...BASE_FACE, eyeLift: 0.06, mouthDrop: 0.3 },
  onion: { ...BASE_FACE, eyeSpacing: 0.155 },
  apple: { ...BASE_FACE, eyeSpacing: 0.17, eyeLift: 0.02 },
  teardrop: { ...BASE_FACE, eyeLift: 0.08, mouthDrop: 0.3 },
  boxy: { ...BASE_FACE, eyeW: 0.2, eyeH: 0.15, eyeTopWiden: 1.02 },
  gourd: { ...BASE_FACE, eyeLift: 0.05 },
  wedge: { ...BASE_FACE, eyeZ: CHIBI.skullR * 1.05, eyeLift: 0.02 },
  pancake: {
    ...BASE_FACE,
    eyeLift: 0.02,
    mouthDrop: 0.24,
    eyeZ: CHIBI.skullR * 1.0,
  },
  lozenge: { ...BASE_FACE, eyeLift: 0.06, mouthDrop: 0.29 },
  peanut: { ...BASE_FACE, eyeSpacing: 0.175, eyeLift: 0.03 },
  disc: {
    ...BASE_FACE,
    eyeW: 0.24,
    eyeH: 0.18,
    eyeZ: CHIBI.skullR * 0.55,
    eyeLift: 0.0,
    mouthDrop: 0.26,
  },
};

export const FACE_READABILITY = FACE_BY_SHAPE.sphere;

function addNeck(g: Group, mat: Material, r: number) {
  g.add(
    mesh(
      new CylinderGeometry(r * 0.3, r * 0.4, 0.14, 10),
      mat,
      0,
      LAYOUT.shoulderY + 0.1,
      0.02,
    ),
  );
}

function tipFace(meshObj: Mesh) {
  meshObj.rotation.x = ISO_FACE_TILT;
}

// ─── 1. sphere — single ball, almost no secondary volumes ───────────────────
function headSphere(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r * 1.05, 16, 14), mat);
  skull.position.set(0, cy, 0);
  skull.scale.set(1.0, 1.08, 0.95);
  g.add(skull);
  const face = new Mesh(new SphereGeometry(r * 0.75, 12, 10), mat);
  face.position.set(0, cy - 0.02, r * 0.5);
  face.scale.set(1.0, 1.05, 0.4);
  tipFace(face);
  g.add(face);
  g.add(mesh(new SphereGeometry(r * 0.22, 8, 6), mat, 0, cy - r * 0.85, r * 0.28));
  addNeck(g, mat, r);
}

// ─── 2. capsule — one vertical capsule as the whole skull ───────────────────
function headCapsule(g: Group, mat: Material, r: number, cy: number) {
  const body = new Mesh(
    new CapsuleGeometry(r * 0.85, capsuleCylinderLength(r * 0.85, r * 2.1), 4, 12),
    mat,
  );
  body.position.set(0, cy, 0);
  g.add(body);
  const face = new Mesh(new SphereGeometry(r * 0.7, 12, 10), mat);
  face.position.set(0, cy - 0.05, r * 0.55);
  face.scale.set(1.0, 1.1, 0.35);
  tipFace(face);
  g.add(face);
  addNeck(g, mat, r);
}

// ─── 3. onion — stacked spheres (classic low-poly doll) ─────────────────────
function headOnion(g: Group, mat: Material, r: number, cy: number) {
  g.add(mesh(new SphereGeometry(r * 0.95, 14, 12), mat, 0, cy + r * 0.35, -0.02));
  g.add(mesh(new SphereGeometry(r * 1.0, 14, 12), mat, 0, cy, 0));
  g.add(mesh(new SphereGeometry(r * 0.7, 12, 10), mat, 0, cy - r * 0.55, 0.05));
  const face = new Mesh(new SphereGeometry(r * 0.72, 12, 10), mat);
  face.position.set(0, cy - 0.02, r * 0.48);
  face.scale.set(1.0, 1.0, 0.4);
  tipFace(face);
  g.add(face);
  g.add(mesh(new SphereGeometry(r * 0.2, 8, 6), mat, 0, cy - r * 0.9, r * 0.25));
  addNeck(g, mat, r);
}

// ─── 4. apple — wide round, flat underside, short chin ───────────────────────
function headApple(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r * 1.08, 16, 14), mat);
  skull.position.set(0, cy + 0.04, 0);
  skull.scale.set(1.12, 0.95, 1.0);
  g.add(skull);
  // Flat bottom disc — stops the jaw from reading long
  g.add(
    mesh(new CylinderGeometry(r * 0.7, r * 0.85, 0.12, 12), mat, 0, cy - r * 0.7, 0.02),
  );
  const face = new Mesh(new SphereGeometry(r * 0.78, 12, 10), mat);
  face.position.set(0, cy, r * 0.52);
  face.scale.set(1.05, 0.95, 0.38);
  tipFace(face);
  g.add(face);
  addNeck(g, mat, r);
}

// ─── 5. teardrop — wide crown, soft taper (chin stays short) ─────────────────
function headTeardrop(g: Group, mat: Material, r: number, cy: number) {
  const crown = new Mesh(new SphereGeometry(r * 1.05, 16, 14), mat);
  crown.position.set(0, cy + r * 0.25, -0.02);
  crown.scale.set(1.05, 0.9, 0.95);
  g.add(crown);
  const mid = new Mesh(new SphereGeometry(r * 0.85, 14, 12), mat);
  mid.position.set(0, cy - r * 0.15, 0);
  mid.scale.set(0.95, 1.0, 0.9);
  g.add(mid);
  const face = new Mesh(new SphereGeometry(r * 0.7, 12, 10), mat);
  face.position.set(0, cy - 0.05, r * 0.45);
  face.scale.set(0.95, 1.05, 0.38);
  tipFace(face);
  g.add(face);
  g.add(mesh(new SphereGeometry(r * 0.22, 8, 6), mat, 0, cy - r * 0.85, r * 0.22));
  addNeck(g, mat, r);
}

// ─── 6. boxy — soft rectangular block (angular anime) ───────────────────────
function headBoxy(g: Group, mat: Material, r: number, cy: number) {
  const block = new Mesh(new BoxGeometry(r * 1.7, r * 1.85, r * 1.5), mat);
  block.position.set(0, cy, 0);
  g.add(block);
  // Soft corner spheres
  for (const [x, y, z] of [
    [-0.55, 0.4, 0.3],
    [0.55, 0.4, 0.3],
    [-0.55, -0.35, 0.3],
    [0.55, -0.35, 0.3],
  ] as const) {
    g.add(mesh(new SphereGeometry(r * 0.28, 8, 6), mat, x * r, cy + y * r, z * r));
  }
  const face = new Mesh(new BoxGeometry(r * 1.3, r * 1.2, r * 0.25), mat);
  face.position.set(0, cy - 0.02, r * 0.72);
  tipFace(face);
  g.add(face);
  addNeck(g, mat, r);
}

// ─── 7. gourd — two balls welded (cranium + jaw blob) ────────────────────────
function headGourd(g: Group, mat: Material, r: number, cy: number) {
  g.add(mesh(new SphereGeometry(r * 1.0, 14, 12), mat, 0, cy + r * 0.35, -0.02));
  g.add(mesh(new SphereGeometry(r * 0.75, 12, 10), mat, 0, cy - r * 0.35, 0.06));
  const face = new Mesh(new SphereGeometry(r * 0.65, 12, 10), mat);
  face.position.set(0, cy - 0.05, r * 0.5);
  face.scale.set(1.0, 1.0, 0.4);
  tipFace(face);
  g.add(face);
  addNeck(g, mat, r);
}

// ─── 8. wedge — angled face slab on a round back ─────────────────────────────
function headWedge(g: Group, mat: Material, r: number, cy: number) {
  const back = new Mesh(new SphereGeometry(r * 0.95, 14, 12), mat);
  back.position.set(0, cy, -r * 0.15);
  back.scale.set(0.95, 1.1, 0.85);
  g.add(back);
  const slab = new Mesh(new BoxGeometry(r * 1.5, r * 1.6, r * 0.35), mat);
  slab.position.set(0, cy - 0.02, r * 0.45);
  slab.rotation.x = ISO_FACE_TILT - 0.1;
  g.add(slab);
  g.add(mesh(new SphereGeometry(r * 0.2, 8, 6), mat, 0, cy - r * 0.8, r * 0.35));
  addNeck(g, mat, r);
}

// ─── 9. pancake — deliberately *flat* (wide > tall) for iso ──────────────────
function headPancake(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r * 1.1, 16, 14), mat);
  skull.position.set(0, cy, 0);
  skull.scale.set(1.15, 0.78, 1.05);
  g.add(skull);
  const face = new Mesh(new SphereGeometry(r * 0.85, 12, 10), mat);
  face.position.set(0, cy + 0.02, r * 0.5);
  face.scale.set(1.1, 0.85, 0.35);
  tipFace(face);
  g.add(face);
  g.add(mesh(new SphereGeometry(r * 0.2, 8, 6), mat, 0, cy - r * 0.55, r * 0.3));
  addNeck(g, mat, r);
}

// ─── 10. lozenge — soft diamond (pointed crown + soft chin) ──────────────────
function headLozenge(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r, 16, 14), mat);
  skull.position.set(0, cy, 0);
  skull.scale.set(0.88, 1.25, 0.88);
  g.add(skull);
  g.add(mesh(new SphereGeometry(r * 0.45, 10, 8), mat, 0, cy + r * 0.85, -0.02));
  const face = new Mesh(new SphereGeometry(r * 0.7, 12, 10), mat);
  face.position.set(0, cy - 0.04, r * 0.45);
  face.scale.set(0.95, 1.1, 0.38);
  tipFace(face);
  g.add(face);
  g.add(mesh(new SphereGeometry(r * 0.2, 8, 6), mat, 0, cy - r * 0.9, r * 0.22));
  addNeck(g, mat, r);
}

// ─── 11. peanut — horizontal figure-8 (wide cheeks) ──────────────────────────
function headPeanut(g: Group, mat: Material, r: number, cy: number) {
  g.add(mesh(new SphereGeometry(r * 0.85, 14, 12), mat, -r * 0.35, cy, 0));
  g.add(mesh(new SphereGeometry(r * 0.85, 14, 12), mat, r * 0.35, cy, 0));
  g.add(mesh(new SphereGeometry(r * 0.7, 12, 10), mat, 0, cy + r * 0.35, -0.02));
  const face = new Mesh(new SphereGeometry(r * 0.7, 12, 10), mat);
  face.position.set(0, cy - 0.02, r * 0.5);
  face.scale.set(1.15, 1.0, 0.38);
  tipFace(face);
  g.add(face);
  g.add(mesh(new SphereGeometry(r * 0.2, 8, 6), mat, 0, cy - r * 0.75, r * 0.28));
  addNeck(g, mat, r);
}

// ─── 12. disc — face is a tipped disc; skull is a shallow back cap ───────────
function headDisc(g: Group, mat: Material, r: number, cy: number) {
  const back = new Mesh(new SphereGeometry(r * 0.9, 14, 12), mat);
  back.position.set(0, cy, -r * 0.25);
  back.scale.set(0.95, 1.0, 0.7);
  g.add(back);
  const disc = new Mesh(new CylinderGeometry(r * 0.95, r * 0.95, r * 0.22, 16), mat);
  disc.rotation.x = Math.PI / 2 + ISO_FACE_TILT;
  disc.position.set(0, cy, r * 0.35);
  g.add(disc);
  g.add(mesh(new SphereGeometry(r * 0.18, 8, 6), mat, 0, cy - r * 0.7, r * 0.4));
  addNeck(g, mat, r);
}

export function generateHead(opts: {
  skin: string;
  scale?: number;
  shape?: HeadShape;
}): Group {
  const g = new Group();
  g.name = "head";
  const s = opts.scale ?? 1;
  const shape = opts.shape ?? DEFAULT_HEAD_SHAPE;
  const mat = toon(opts.skin);
  const cy = LAYOUT.headCenterY;
  const r = CHIBI.skullR * s;

  switch (shape) {
    case "capsule":
      headCapsule(g, mat, r, cy);
      break;
    case "onion":
      headOnion(g, mat, r, cy);
      break;
    case "apple":
      headApple(g, mat, r, cy);
      break;
    case "teardrop":
      headTeardrop(g, mat, r, cy);
      break;
    case "boxy":
      headBoxy(g, mat, r, cy);
      break;
    case "gourd":
      headGourd(g, mat, r, cy);
      break;
    case "wedge":
      headWedge(g, mat, r, cy);
      break;
    case "pancake":
      headPancake(g, mat, r, cy);
      break;
    case "lozenge":
      headLozenge(g, mat, r, cy);
      break;
    case "peanut":
      headPeanut(g, mat, r, cy);
      break;
    case "disc":
      headDisc(g, mat, r, cy);
      break;
    case "sphere":
    default:
      headSphere(g, mat, r, cy);
      break;
  }

  return g;
}

export function generateFace(opts: {
  eyeColor?: string;
  nose?: boolean;
  skin: string;
  scale?: number;
  shape?: HeadShape;
}): Group {
  const g = new Group();
  g.name = "face";
  g.rotation.x = ISO_FACE_TILT;
  const hs = opts.scale ?? 1;
  const shape = opts.shape ?? DEFAULT_HEAD_SHAPE;
  const t = FACE_BY_SHAPE[shape];
  const irisMat = toonDetail(opts.eyeColor ?? "#1a1c2c");
  const white = toon("#f7f4ec");
  const lid = toonDetail("#211a2c");
  const shine = toonDetail("#ffffff");
  const y = LAYOUT.headCenterY - 0.02 * hs + t.eyeLift * hs;
  const z = t.eyeZ * hs;
  const ex = t.eyeSpacing * hs;
  const d = t.eyeDepth * hs;
  const eyeW = t.eyeW * hs;
  const eyeH = t.eyeH * hs;
  const irisW = t.irisW * hs;
  const irisH = t.irisH * hs;

  for (const s of [-1, 1] as const) {
    const eye = new Group();
    eye.name = s < 0 ? "eye-left" : "eye-right";
    eye.position.set(s * ex, y, z);

    eye.add(mesh(new BoxGeometry(eyeW, eyeH * 0.48, d), white, 0, -eyeH * 0.18, 0));
    eye.add(
      mesh(
        new BoxGeometry(eyeW * t.eyeTopWiden, eyeH * 0.55, d),
        white,
        0,
        eyeH * 0.2,
        0,
      ),
    );
    eye.add(
      mesh(
        new BoxGeometry(irisW, irisH, d * 0.7),
        irisMat,
        0,
        -0.004 * hs,
        d * 0.15,
      ),
    );
    eye.add(
      mesh(
        new BoxGeometry(eyeW * t.eyeTopWiden * 1.02, 0.016 * hs, d * 0.8),
        lid,
        0,
        eyeH * 0.44,
        d * 0.1,
      ),
    );
    eye.add(
      mesh(
        new BoxGeometry(0.024 * hs, 0.024 * hs, d * 0.5),
        shine,
        -irisW * 0.22,
        irisH * 0.2,
        d * 0.35,
      ),
    );
    eye.add(
      mesh(
        new BoxGeometry(t.browW * hs, t.browH * hs, t.browDepth * hs),
        lid,
        0,
        eyeH * 0.7,
        -0.002 * hs,
      ),
    );
    g.add(eye);
  }

  if (opts.nose) {
    g.add(
      mesh(
        new SphereGeometry(0.02 * hs, 8, 6),
        toon(opts.skin),
        0,
        y - t.mouthDrop * hs * 0.45,
        z - 0.01 * hs,
      ),
    );
  }

  const mouth = new Mesh(
    new BoxGeometry(t.mouthWidth * hs, 0.014 * hs, 0.012 * hs),
    lid,
  );
  mouth.name = "mouth";
  mouth.position.set(0, y - t.mouthDrop * hs, z - 0.03 * hs);
  g.add(mouth);

  return g;
}
