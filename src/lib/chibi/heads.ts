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

/** Default: classic anime chibi (gallery lead — red hair). */
export const DEFAULT_HEAD_SHAPE: HeadShape = "anime";

/**
 * Tip the face plane up toward the iso camera (~35° elevation).
 */
export const ISO_FACE_TILT = -0.4;

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

/** Big soft anime eyes + vertical spacing for iso foreshortening. */
export const FACE_BY_SHAPE: Record<HeadShape, FaceLayout> = {
  anime: {
    eyeW: 0.25,
    eyeH: 0.2,
    eyeDepth: 0.034,
    eyeTopWiden: 1.1,
    irisW: 0.165,
    irisH: 0.15,
    eyeSpacing: 0.168,
    eyeZ: CHIBI.skullR * 0.94,
    eyeLift: 0.1,
    browW: 0.24,
    browH: 0.042,
    browDepth: 0.026,
    mouthWidth: 0.07,
    mouthDrop: 0.4,
  },
  round: {
    eyeW: 0.24,
    eyeH: 0.185,
    eyeDepth: 0.032,
    eyeTopWiden: 1.08,
    irisW: 0.155,
    irisH: 0.14,
    eyeSpacing: 0.17,
    eyeZ: CHIBI.skullR * 0.96,
    eyeLift: 0.08,
    browW: 0.23,
    browH: 0.04,
    browDepth: 0.024,
    mouthWidth: 0.072,
    mouthDrop: 0.36,
  },
  tall: {
    eyeW: 0.22,
    eyeH: 0.17,
    eyeDepth: 0.03,
    eyeTopWiden: 1.08,
    irisW: 0.14,
    irisH: 0.125,
    eyeSpacing: 0.155,
    eyeZ: CHIBI.skullR * 0.92,
    eyeLift: 0.12,
    browW: 0.22,
    browH: 0.042,
    browDepth: 0.024,
    mouthWidth: 0.068,
    mouthDrop: 0.42,
  },
  puff: {
    eyeW: 0.245,
    eyeH: 0.19,
    eyeDepth: 0.032,
    eyeTopWiden: 1.06,
    irisW: 0.16,
    irisH: 0.145,
    eyeSpacing: 0.18,
    eyeZ: CHIBI.skullR * 0.98,
    eyeLift: 0.1,
    browW: 0.22,
    browH: 0.038,
    browDepth: 0.022,
    mouthWidth: 0.06,
    mouthDrop: 0.38,
  },
  doll: {
    eyeW: 0.26,
    eyeH: 0.21,
    eyeDepth: 0.034,
    eyeTopWiden: 1.12,
    irisW: 0.17,
    irisH: 0.155,
    eyeSpacing: 0.175,
    eyeZ: CHIBI.skullR * 0.95,
    eyeLift: 0.06,
    browW: 0.25,
    browH: 0.04,
    browDepth: 0.024,
    mouthWidth: 0.055,
    mouthDrop: 0.42,
  },
  bean: {
    eyeW: 0.23,
    eyeH: 0.175,
    eyeDepth: 0.03,
    eyeTopWiden: 1.06,
    irisW: 0.148,
    irisH: 0.132,
    eyeSpacing: 0.175,
    eyeZ: CHIBI.skullR * 0.97,
    eyeLift: 0.07,
    browW: 0.23,
    browH: 0.04,
    browDepth: 0.024,
    mouthWidth: 0.075,
    mouthDrop: 0.34,
  },
  sharp: {
    eyeW: 0.215,
    eyeH: 0.165,
    eyeDepth: 0.028,
    eyeTopWiden: 1.04,
    irisW: 0.138,
    irisH: 0.12,
    eyeSpacing: 0.15,
    eyeZ: CHIBI.skullR * 0.9,
    eyeLift: 0.11,
    browW: 0.23,
    browH: 0.046,
    browDepth: 0.026,
    mouthWidth: 0.06,
    mouthDrop: 0.4,
  },
  baby: {
    eyeW: 0.255,
    eyeH: 0.2,
    eyeDepth: 0.034,
    eyeTopWiden: 1.1,
    irisW: 0.168,
    irisH: 0.152,
    eyeSpacing: 0.172,
    eyeZ: CHIBI.skullR * 0.96,
    eyeLift: 0.05,
    browW: 0.24,
    browH: 0.036,
    browDepth: 0.022,
    mouthWidth: 0.05,
    mouthDrop: 0.36,
  },
};

export const FACE_READABILITY = FACE_BY_SHAPE.anime;

function addNeck(g: Group, mat: Material, r: number, cy: number) {
  g.add(
    mesh(
      new CylinderGeometry(r * 0.28, r * 0.38, 0.14, 10),
      mat,
      0,
      LAYOUT.shoulderY + 0.1,
      0.02,
    ),
  );
  g.add(mesh(new SphereGeometry(r * 0.34, 10, 8), mat, 0, cy - r * 0.5, -r * 0.48));
}

function addIsoFacePad(
  g: Group,
  mat: Material,
  r: number,
  cy: number,
  opts: { y?: number; z?: number; sx?: number; sy?: number } = {},
) {
  const face = new Mesh(new SphereGeometry(r * 0.8, 14, 12), mat);
  face.position.set(0, cy + (opts.y ?? -0.06), r * (opts.z ?? 0.42));
  face.scale.set(opts.sx ?? 0.98, opts.sy ?? 1.45, 0.36);
  face.rotation.x = ISO_FACE_TILT;
  g.add(face);
}

/**
 * Classic anime chibi — tall soft egg, big eye window, tiny chin.
 * Lead model for the red-hair gallery presets.
 */
function headAnime(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r, 16, 14), mat);
  skull.position.set(0, cy + 0.06, -0.02);
  skull.scale.set(0.9, 1.68, 0.88);
  g.add(skull);

  // Soft crown
  g.add(mesh(new SphereGeometry(r * 0.58, 12, 10), mat, 0, cy + r * 1.05, -0.04));

  addIsoFacePad(g, mat, r, cy, { y: -0.08, z: 0.42, sy: 1.5 });

  // Soft temples (not hanging over eyes)
  g.add(mesh(new SphereGeometry(r * 0.28, 10, 8), mat, -r * 0.78, cy + 0.06, 0.02));
  g.add(mesh(new SphereGeometry(r * 0.28, 10, 8), mat, r * 0.78, cy + 0.06, 0.02));

  // Light cheeks
  g.add(mesh(new SphereGeometry(r * 0.32, 10, 8), mat, -r * 0.48, cy - 0.18, r * 0.3));
  g.add(mesh(new SphereGeometry(r * 0.32, 10, 8), mat, r * 0.48, cy - 0.18, r * 0.3));

  // Tiny chin below the mouth line
  g.add(mesh(new SphereGeometry(r * 0.3, 10, 8), mat, 0, cy - r * 1.35, r * 0.26));

  addNeck(g, mat, r, cy);
}

function headRound(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r * 1.02, 16, 14), mat);
  skull.position.set(0, cy + 0.05, 0);
  skull.scale.set(0.98, 1.55, 0.94);
  g.add(skull);
  addIsoFacePad(g, mat, r, cy, { y: -0.04, z: 0.44, sy: 1.35 });
  g.add(mesh(new SphereGeometry(r * 0.36, 12, 10), mat, -r * 0.68, cy - 0.1, r * 0.2));
  g.add(mesh(new SphereGeometry(r * 0.36, 12, 10), mat, r * 0.68, cy - 0.1, r * 0.2));
  g.add(mesh(new SphereGeometry(r * 0.28, 10, 8), mat, 0, cy - r * 1.25, r * 0.28));
  g.add(mesh(new SphereGeometry(r * 0.48, 12, 8), mat, 0, cy + r * 1.0, -0.02));
  addNeck(g, mat, r, cy);
}

function headTall(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r, 16, 14), mat);
  skull.position.set(0, cy + 0.08, -0.02);
  skull.scale.set(0.84, 1.82, 0.84);
  g.add(skull);
  g.add(mesh(new SphereGeometry(r * 0.6, 12, 10), mat, 0, cy + r * 1.2, -0.04));
  addIsoFacePad(g, mat, r, cy, { y: -0.12, z: 0.4, sy: 1.6 });
  g.add(mesh(new SphereGeometry(r * 0.3, 10, 8), mat, -r * 0.45, cy - 0.24, r * 0.3));
  g.add(mesh(new SphereGeometry(r * 0.3, 10, 8), mat, r * 0.45, cy - 0.24, r * 0.3));
  g.add(mesh(new SphereGeometry(r * 0.34, 10, 8), mat, 0, cy - r * 1.5, r * 0.22));
  addNeck(g, mat, r, cy);
}

function headPuff(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r * 0.9, 16, 14), mat);
  skull.position.set(0, cy + 0.1, -0.02);
  skull.scale.set(0.88, 1.55, 0.86);
  g.add(skull);
  const cheekL = new Mesh(new SphereGeometry(r * 0.5, 14, 12), mat);
  cheekL.position.set(-r * 0.74, cy - 0.12, r * 0.16);
  cheekL.scale.set(1.05, 1.12, 0.95);
  g.add(cheekL);
  const cheekR = new Mesh(new SphereGeometry(r * 0.5, 14, 12), mat);
  cheekR.position.set(r * 0.74, cy - 0.12, r * 0.16);
  cheekR.scale.set(1.05, 1.12, 0.95);
  g.add(cheekR);
  addIsoFacePad(g, mat, r, cy, { y: -0.02, z: 0.46, sx: 0.92, sy: 1.35 });
  g.add(mesh(new SphereGeometry(r * 0.24, 8, 6), mat, 0, cy - r * 1.25, r * 0.28));
  g.add(mesh(new SphereGeometry(r * 0.44, 12, 8), mat, 0, cy + r * 1.0, -0.02));
  addNeck(g, mat, r, cy);
}

function headDoll(g: Group, mat: Material, r: number, cy: number) {
  // Big forehead / moe — cranial mass high, tiny jaw
  const skull = new Mesh(new SphereGeometry(r * 1.05, 16, 14), mat);
  skull.position.set(0, cy + 0.12, -0.02);
  skull.scale.set(0.95, 1.6, 0.9);
  g.add(skull);
  g.add(mesh(new SphereGeometry(r * 0.7, 12, 10), mat, 0, cy + r * 1.15, -0.02));
  addIsoFacePad(g, mat, r, cy, { y: -0.14, z: 0.44, sx: 0.9, sy: 1.35 });
  g.add(mesh(new SphereGeometry(r * 0.22, 8, 6), mat, 0, cy - r * 1.2, r * 0.24));
  addNeck(g, mat, r, cy);
}

function headBean(g: Group, mat: Material, r: number, cy: number) {
  // Wider, slightly shorter — still tall enough for iso
  const skull = new Mesh(new SphereGeometry(r * 1.05, 16, 14), mat);
  skull.position.set(0, cy + 0.04, 0);
  skull.scale.set(1.08, 1.42, 0.92);
  g.add(skull);
  addIsoFacePad(g, mat, r, cy, { y: -0.02, z: 0.44, sx: 1.05, sy: 1.25 });
  g.add(mesh(new SphereGeometry(r * 0.4, 12, 10), mat, -r * 0.72, cy - 0.06, r * 0.18));
  g.add(mesh(new SphereGeometry(r * 0.4, 12, 10), mat, r * 0.72, cy - 0.06, r * 0.18));
  g.add(mesh(new SphereGeometry(r * 0.28, 10, 8), mat, 0, cy - r * 1.15, r * 0.28));
  addNeck(g, mat, r, cy);
}

function headSharp(g: Group, mat: Material, r: number, cy: number) {
  // Soft-angular — quieter brow, tapered jaw (still chibi, not adult)
  const skull = new Mesh(new SphereGeometry(r, 16, 14), mat);
  skull.position.set(0, cy + 0.04, -0.04);
  skull.scale.set(0.86, 1.62, 0.84);
  g.add(skull);
  g.add(mesh(new SphereGeometry(r * 0.6, 12, 10), mat, 0, cy + r * 0.35, r * 0.34));
  addIsoFacePad(g, mat, r, cy, { y: -0.1, z: 0.38, sx: 0.92, sy: 1.4 });
  const jaw = new Mesh(new SphereGeometry(r * 0.36, 12, 10), mat);
  jaw.position.set(0, cy - r * 1.3, r * 0.14);
  jaw.scale.set(0.9, 0.75, 0.85);
  g.add(jaw);
  g.add(mesh(new SphereGeometry(r * 0.46, 12, 8), mat, 0, cy + r * 1.05, -0.05));
  addNeck(g, mat, r, cy);
}

function headBaby(g: Group, mat: Material, r: number, cy: number) {
  // Oversized cranium, features clustered mid-face
  const skull = new Mesh(new SphereGeometry(r * 1.08, 16, 14), mat);
  skull.position.set(0, cy + 0.14, -0.02);
  skull.scale.set(1.0, 1.5, 0.95);
  g.add(skull);
  g.add(mesh(new SphereGeometry(r * 0.72, 12, 10), mat, 0, cy + r * 1.1, 0));
  addIsoFacePad(g, mat, r, cy, { y: -0.16, z: 0.44, sx: 0.88, sy: 1.2 });
  g.add(mesh(new SphereGeometry(r * 0.2, 8, 6), mat, 0, cy - r * 1.05, r * 0.26));
  addNeck(g, mat, r, cy);
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
    case "round":
      headRound(g, mat, r, cy);
      break;
    case "tall":
      headTall(g, mat, r, cy);
      break;
    case "puff":
      headPuff(g, mat, r, cy);
      break;
    case "doll":
      headDoll(g, mat, r, cy);
      break;
    case "bean":
      headBean(g, mat, r, cy);
      break;
    case "sharp":
      headSharp(g, mat, r, cy);
      break;
    case "baby":
      headBaby(g, mat, r, cy);
      break;
    case "anime":
    default:
      headAnime(g, mat, r, cy);
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
  const browW = t.browW * hs;
  const browH = t.browH * hs;
  const browDepth = t.browDepth * hs;

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
        new BoxGeometry(eyeW * t.eyeTopWiden * 1.02, 0.018 * hs, d * 0.8),
        lid,
        0,
        eyeH * 0.44,
        d * 0.1,
      ),
    );
    eye.add(
      mesh(
        new BoxGeometry(0.028 * hs, 0.028 * hs, d * 0.5),
        shine,
        -irisW * 0.22,
        irisH * 0.22,
        d * 0.35,
      ),
    );
    eye.add(
      mesh(
        new BoxGeometry(browW, browH, browDepth),
        lid,
        0,
        eyeH * 0.72,
        -0.002 * hs,
      ),
    );
    g.add(eye);
  }

  if (opts.nose) {
    g.add(
      mesh(
        new SphereGeometry(0.022 * hs, 8, 6),
        toon(opts.skin),
        0,
        y - t.mouthDrop * hs * 0.45,
        z - 0.01 * hs,
      ),
    );
  }

  const mouth = new Mesh(
    new BoxGeometry(t.mouthWidth * hs, 0.016 * hs, 0.014 * hs),
    lid,
  );
  mouth.name = "mouth";
  mouth.position.set(0, y - t.mouthDrop * hs, z - 0.03 * hs);
  g.add(mouth);

  return g;
}
