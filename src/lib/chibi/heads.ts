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
 * Five lozenge-family heads — each rebuilt from scratch around its name.
 * Overall silhouette sits between the old classic and slim (user pick).
 */
export const DEFAULT_HEAD_SHAPE: HeadShape = "classic";

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
  eyeW: 0.21,
  eyeH: 0.165,
  eyeDepth: 0.03,
  eyeTopWiden: 1.06,
  irisW: 0.135,
  irisH: 0.12,
  eyeSpacing: 0.155,
  eyeZ: CHIBI.skullR * 0.95,
  eyeLift: 0.05,
  browW: 0.21,
  browH: 0.036,
  browDepth: 0.024,
  mouthWidth: 0.06,
  mouthDrop: 0.28,
};

export const FACE_BY_SHAPE: Record<HeadShape, FaceLayout> = {
  classic: { ...BASE_FACE },
  soft: {
    ...BASE_FACE,
    eyeSpacing: 0.16,
    eyeLift: 0.04,
    mouthDrop: 0.26,
    eyeW: 0.22,
    eyeH: 0.17,
  },
  cheek: {
    ...BASE_FACE,
    eyeSpacing: 0.18,
    eyeLift: 0.06,
    eyeW: 0.2,
    eyeH: 0.155,
  },
  brow: {
    ...BASE_FACE,
    eyeLift: 0.0,
    mouthDrop: 0.3,
    browH: 0.045,
    browW: 0.24,
  },
  slim: {
    ...BASE_FACE,
    eyeSpacing: 0.145,
    eyeW: 0.19,
    eyeH: 0.155,
    mouthDrop: 0.29,
  },
};

export const FACE_READABILITY = FACE_BY_SHAPE.classic;

function addNeck(g: Group, mat: Material, r: number) {
  g.add(
    mesh(
      new CylinderGeometry(r * 0.28, r * 0.38, 0.13, 10),
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

/**
 * 1 · classic — clean soft diamond at the classic↔slim midpoint.
 * Stretched egg + small crown tip + face pad + soft chin. No extras.
 */
function headClassic(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r, 16, 14), mat);
  skull.position.set(0, cy, 0);
  skull.scale.set(0.83, 1.26, 0.85);
  g.add(skull);

  const tip = new Mesh(new SphereGeometry(r * 0.42, 10, 8), mat);
  tip.position.set(0, cy + r * 0.86, -0.02);
  tip.scale.set(0.95, 0.85, 0.9);
  g.add(tip);

  const face = new Mesh(new SphereGeometry(r * 0.66, 12, 10), mat);
  face.position.set(0, cy - 0.04, r * 0.44);
  face.scale.set(0.92, 1.08, 0.36);
  tipFace(face);
  g.add(face);

  g.add(mesh(new SphereGeometry(r * 0.18, 8, 6), mat, 0, cy - r * 0.9, r * 0.2));
  addNeck(g, mat, r);
}

/**
 * 2 · soft — marshmallow diamond: stacked soft blobs, no hard tip.
 * Reads rounder and gentler while keeping the tall diamond silhouette.
 */
function headSoft(g: Group, mat: Material, r: number, cy: number) {
  const crown = new Mesh(new SphereGeometry(r * 0.78, 14, 12), mat);
  crown.position.set(0, cy + r * 0.42, -0.02);
  crown.scale.set(0.95, 0.9, 0.92);
  g.add(crown);

  const mid = new Mesh(new SphereGeometry(r * 0.92, 14, 12), mat);
  mid.position.set(0, cy, 0);
  mid.scale.set(0.9, 1.05, 0.9);
  g.add(mid);

  const jaw = new Mesh(new SphereGeometry(r * 0.62, 12, 10), mat);
  jaw.position.set(0, cy - r * 0.48, 0.04);
  jaw.scale.set(0.88, 0.95, 0.9);
  g.add(jaw);

  const face = new Mesh(new SphereGeometry(r * 0.7, 12, 10), mat);
  face.position.set(0, cy - 0.02, r * 0.46);
  face.scale.set(1.0, 1.0, 0.4);
  tipFace(face);
  g.add(face);

  g.add(mesh(new SphereGeometry(r * 0.22, 8, 6), mat, 0, cy - r * 0.82, r * 0.22));
  addNeck(g, mat, r);
}

/**
 * 3 · cheek — narrow diamond core; cheeks are the silhouette.
 * Side bulbs carry the width; crown stays pointed.
 */
function headCheek(g: Group, mat: Material, r: number, cy: number) {
  const core = new Mesh(new SphereGeometry(r * 0.88, 14, 12), mat);
  core.position.set(0, cy + 0.02, 0);
  core.scale.set(0.72, 1.22, 0.82);
  g.add(core);

  g.add(mesh(new SphereGeometry(r * 0.36, 10, 8), mat, 0, cy + r * 0.88, -0.02));

  for (const s of [-1, 1] as const) {
    const cheek = new Mesh(new SphereGeometry(r * 0.48, 12, 10), mat);
    cheek.position.set(s * r * 0.55, cy - r * 0.05, r * 0.1);
    cheek.scale.set(0.95, 1.05, 0.9);
    g.add(cheek);
  }

  const face = new Mesh(new SphereGeometry(r * 0.62, 12, 10), mat);
  face.position.set(0, cy - 0.02, r * 0.48);
  face.scale.set(1.15, 1.0, 0.35);
  tipFace(face);
  g.add(face);

  g.add(mesh(new SphereGeometry(r * 0.17, 8, 6), mat, 0, cy - r * 0.88, r * 0.22));
  addNeck(g, mat, r);
}

/**
 * 4 · brow — forehead shelf + recessed lower face.
 * Heavy brow ridge is the read; chin stays short under it.
 */
function headBrow(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r, 16, 14), mat);
  skull.position.set(0, cy + r * 0.06, -0.02);
  skull.scale.set(0.86, 1.18, 0.88);
  g.add(skull);

  // Forehead / brow shelf — proud of the face
  const shelf = new Mesh(new BoxGeometry(r * 1.55, r * 0.42, r * 0.55), mat);
  shelf.position.set(0, cy + r * 0.28, r * 0.22);
  shelf.rotation.x = -0.15;
  g.add(shelf);
  g.add(mesh(new SphereGeometry(r * 0.5, 10, 8), mat, 0, cy + r * 0.55, r * 0.15));
  g.add(mesh(new SphereGeometry(r * 0.4, 10, 8), mat, 0, cy + r * 0.82, -0.02));

  // Lower face sits slightly back under the shelf
  const face = new Mesh(new SphereGeometry(r * 0.6, 12, 10), mat);
  face.position.set(0, cy - r * 0.12, r * 0.38);
  face.scale.set(0.95, 1.05, 0.4);
  tipFace(face);
  g.add(face);

  g.add(mesh(new SphereGeometry(r * 0.16, 8, 6), mat, 0, cy - r * 0.78, r * 0.2));
  addNeck(g, mat, r);
}

/**
 * 5 · slim — elegant narrow diamond (slim end of the classic↔slim range).
 * Vertical capsule core + tight face; silhouette stays refined, not needle-thin.
 */
function headSlim(g: Group, mat: Material, r: number, cy: number) {
  const body = new Mesh(
    new CapsuleGeometry(
      r * 0.72,
      capsuleCylinderLength(r * 0.72, r * 2.15),
      4,
      12,
    ),
    mat,
  );
  body.position.set(0, cy, 0);
  body.scale.set(0.92, 1.0, 0.88);
  g.add(body);

  const tip = new Mesh(new SphereGeometry(r * 0.34, 10, 8), mat);
  tip.position.set(0, cy + r * 0.95, -0.02);
  tip.scale.set(0.9, 0.8, 0.85);
  g.add(tip);

  const face = new Mesh(new SphereGeometry(r * 0.58, 12, 10), mat);
  face.position.set(0, cy - 0.05, r * 0.4);
  face.scale.set(0.88, 1.12, 0.34);
  tipFace(face);
  g.add(face);

  g.add(mesh(new SphereGeometry(r * 0.15, 8, 6), mat, 0, cy - r * 0.92, r * 0.18));
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
    case "soft":
      headSoft(g, mat, r, cy);
      break;
    case "cheek":
      headCheek(g, mat, r, cy);
      break;
    case "brow":
      headBrow(g, mat, r, cy);
      break;
    case "slim":
      headSlim(g, mat, r, cy);
      break;
    case "classic":
    default:
      headClassic(g, mat, r, cy);
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
