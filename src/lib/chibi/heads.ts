import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  type Material,
} from "three";
import { toon, toonDetail } from "./materials";
import { CHIBI, LAYOUT } from "./units";
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
 * Lozenge family only — soft diamond skull (pointed crown + soft chin).
 * Five tune variants of the same construction; pick one to hone further.
 */
export const DEFAULT_HEAD_SHAPE: HeadShape = "classic";

/** Mild tip toward iso camera. */
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
  eyeLift: 0.06,
  browW: 0.22,
  browH: 0.038,
  browDepth: 0.024,
  mouthWidth: 0.065,
  mouthDrop: 0.29,
};

export const FACE_BY_SHAPE: Record<HeadShape, FaceLayout> = {
  classic: { ...BASE_FACE },
  soft: { ...BASE_FACE, eyeLift: 0.04, eyeSpacing: 0.165, mouthDrop: 0.27 },
  cheek: { ...BASE_FACE, eyeSpacing: 0.175, eyeLift: 0.05 },
  brow: { ...BASE_FACE, eyeLift: 0.02, mouthDrop: 0.26 },
  slim: { ...BASE_FACE, eyeSpacing: 0.15, eyeW: 0.2, eyeH: 0.16 },
};

export const FACE_READABILITY = FACE_BY_SHAPE.classic;

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

type LozengeBuild = {
  /** Main skull squash (x, y, z). */
  skull: [number, number, number];
  /** Crown tip blob. */
  crownR: number;
  crownY: number;
  /** Face pad. */
  faceR: number;
  faceY: number;
  faceZ: number;
  faceScale: [number, number, number];
  /** Soft chin. */
  chinR: number;
  chinY: number;
  chinZ: number;
  /** Optional mid-cheek bulbs. */
  cheeks?: boolean;
  cheekR?: number;
  cheekX?: number;
  cheekY?: number;
  /** Optional forehead mass (brow variant). */
  browMass?: boolean;
};

/**
 * Shared lozenge construction — pointed crown + diamond body + soft chin.
 * Variants only change proportions / cheek / brow mass.
 */
function buildLozenge(
  g: Group,
  mat: Material,
  r: number,
  cy: number,
  p: LozengeBuild,
) {
  const skull = new Mesh(new SphereGeometry(r, 16, 14), mat);
  skull.position.set(0, cy, 0);
  skull.scale.set(...p.skull);
  g.add(skull);

  g.add(
    mesh(
      new SphereGeometry(r * p.crownR, 10, 8),
      mat,
      0,
      cy + r * p.crownY,
      -0.02,
    ),
  );

  if (p.browMass) {
    const brow = new Mesh(new SphereGeometry(r * 0.55, 12, 10), mat);
    brow.position.set(0, cy + r * 0.35, r * 0.2);
    brow.scale.set(1.1, 0.7, 0.55);
    g.add(brow);
  }

  if (p.cheeks) {
    const cr = r * (p.cheekR ?? 0.38);
    const cx = r * (p.cheekX ?? 0.48);
    const cY = cy + r * (p.cheekY ?? -0.08);
    g.add(mesh(new SphereGeometry(cr, 10, 8), mat, -cx, cY, r * 0.12));
    g.add(mesh(new SphereGeometry(cr, 10, 8), mat, cx, cY, r * 0.12));
  }

  const face = new Mesh(new SphereGeometry(r * p.faceR, 12, 10), mat);
  face.position.set(0, cy + r * p.faceY, r * p.faceZ);
  face.scale.set(...p.faceScale);
  tipFace(face);
  g.add(face);

  g.add(
    mesh(
      new SphereGeometry(r * p.chinR, 8, 6),
      mat,
      0,
      cy + r * p.chinY,
      r * p.chinZ,
    ),
  );
  addNeck(g, mat, r);
}

/** 1 · classic — the winning soft diamond. */
function headClassic(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.88, 1.25, 0.88],
    crownR: 0.45,
    crownY: 0.85,
    faceR: 0.7,
    faceY: -0.1,
    faceZ: 0.45,
    faceScale: [0.95, 1.1, 0.38],
    chinR: 0.2,
    chinY: -0.9,
    chinZ: 0.22,
  });
}

/** 2 · soft — rounder diamond, less pointed, slightly wider. */
function headSoft(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.98, 1.12, 0.95],
    crownR: 0.38,
    crownY: 0.72,
    faceR: 0.74,
    faceY: -0.06,
    faceZ: 0.48,
    faceScale: [1.02, 1.0, 0.4],
    chinR: 0.24,
    chinY: -0.78,
    chinZ: 0.24,
  });
}

/** 3 · cheek — classic diamond + mid cheek bulbs. */
function headCheek(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.86, 1.22, 0.88],
    crownR: 0.42,
    crownY: 0.82,
    faceR: 0.68,
    faceY: -0.08,
    faceZ: 0.44,
    faceScale: [1.05, 1.05, 0.38],
    chinR: 0.2,
    chinY: -0.88,
    chinZ: 0.22,
    cheeks: true,
    cheekR: 0.4,
    cheekX: 0.52,
    cheekY: -0.05,
  });
}

/** 4 · brow — bigger forehead mass, shorter chin (moe read). */
function headBrow(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.9, 1.2, 0.9],
    crownR: 0.52,
    crownY: 0.88,
    faceR: 0.72,
    faceY: -0.02,
    faceZ: 0.46,
    faceScale: [0.98, 0.95, 0.4],
    chinR: 0.18,
    chinY: -0.78,
    chinZ: 0.2,
    browMass: true,
  });
}

/** 5 · slim — narrower diamond, cleaner silhouette. */
function headSlim(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.78, 1.28, 0.82],
    crownR: 0.4,
    crownY: 0.9,
    faceR: 0.62,
    faceY: -0.1,
    faceZ: 0.42,
    faceScale: [0.9, 1.12, 0.36],
    chinR: 0.17,
    chinY: -0.92,
    chinZ: 0.2,
  });
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
