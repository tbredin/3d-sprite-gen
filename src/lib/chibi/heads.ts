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

export const DEFAULT_HEAD_SHAPE: HeadShape = "mochi";

/** Shared face layout keyed by skull language — eyes sit on the face pad. */
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

/**
 * Soft anime eyes tuned per skull. Bigger whites + heavy upper lid read as
 * cute at 42–48px without the harsh FF-rectangle look.
 */
export const FACE_BY_SHAPE: Record<HeadShape, FaceLayout> = {
  dumpling: {
    eyeW: 0.22,
    eyeH: 0.17,
    eyeDepth: 0.03,
    eyeTopWiden: 1.08,
    irisW: 0.14,
    irisH: 0.125,
    eyeSpacing: 0.165,
    eyeZ: CHIBI.skullR * 1.0,
    eyeLift: 0.04,
    browW: 0.22,
    browH: 0.042,
    browDepth: 0.024,
    mouthWidth: 0.07,
    mouthDrop: 0.24,
  },
  mochi: {
    eyeW: 0.205,
    eyeH: 0.155,
    eyeDepth: 0.028,
    eyeTopWiden: 1.1,
    irisW: 0.13,
    irisH: 0.112,
    eyeSpacing: 0.155,
    eyeZ: CHIBI.skullR * 0.96,
    eyeLift: 0.03,
    browW: 0.21,
    browH: 0.04,
    browDepth: 0.024,
    mouthWidth: 0.072,
    mouthDrop: 0.25,
  },
  cheeky: {
    eyeW: 0.215,
    eyeH: 0.165,
    eyeDepth: 0.03,
    eyeTopWiden: 1.06,
    irisW: 0.135,
    irisH: 0.12,
    eyeSpacing: 0.175,
    eyeZ: CHIBI.skullR * 1.02,
    eyeLift: 0.05,
    browW: 0.2,
    browH: 0.038,
    browDepth: 0.022,
    mouthWidth: 0.06,
    mouthDrop: 0.26,
  },
  solemn: {
    eyeW: 0.19,
    eyeH: 0.14,
    eyeDepth: 0.026,
    eyeTopWiden: 1.05,
    irisW: 0.118,
    irisH: 0.1,
    eyeSpacing: 0.148,
    eyeZ: CHIBI.skullR * 0.94,
    eyeLift: 0.02,
    browW: 0.22,
    browH: 0.044,
    browDepth: 0.026,
    mouthWidth: 0.06,
    mouthDrop: 0.27,
  },
};

/** @deprecated Prefer FACE_BY_SHAPE — kept for older imports. */
export const FACE_READABILITY = FACE_BY_SHAPE.mochi;

function addNeck(g: Group, mat: Material, r: number, cy: number) {
  g.add(
    mesh(
      new CylinderGeometry(r * 0.32, r * 0.42, 0.16, 10),
      mat,
      0,
      LAYOUT.shoulderY + 0.12,
      0.02,
    ),
  );
  // Soft nape tuck so bald heads aren't flat from behind
  g.add(mesh(new SphereGeometry(r * 0.38, 10, 8), mat, 0, cy - r * 0.35, -r * 0.55));
}

/**
 * A · dumpling — soft ball head. Ultra-cute chibi; big cheeks, tiny chin.
 * Few volumes so the silhouette reads as one dumpling, not a sphere salad.
 */
function headDumpling(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r * 1.02, 16, 14), mat);
  skull.position.set(0, cy + 0.04, 0);
  // Tall soft ball — vertical room for eyes → mouth → chin at 32–64px
  skull.scale.set(0.98, 1.18, 0.94);
  g.add(skull);

  const face = new Mesh(new SphereGeometry(r * 0.88, 14, 12), mat);
  face.position.set(0, cy - 0.04, r * 0.46);
  face.scale.set(1.0, 1.2, 0.4);
  g.add(face);

  g.add(mesh(new SphereGeometry(r * 0.4, 12, 10), mat, -r * 0.7, cy - 0.08, r * 0.26));
  g.add(mesh(new SphereGeometry(r * 0.4, 12, 10), mat, r * 0.7, cy - 0.08, r * 0.26));

  // Chin sits clearly below the mouth line
  g.add(mesh(new SphereGeometry(r * 0.3, 10, 8), mat, 0, cy - r * 1.05, r * 0.3));

  g.add(mesh(new SphereGeometry(r * 0.52, 12, 8), mat, 0, cy + r * 0.85, -0.02));

  addNeck(g, mat, r, cy);
}

/**
 * B · mochi — tall soft SD egg. Sea of Stars / Octopath overworld read.
 */
function headMochi(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r, 16, 14), mat);
  skull.position.set(0, cy + 0.05, -0.02);
  skull.scale.set(0.9, 1.32, 0.88);
  g.add(skull);

  const crown = new Mesh(new SphereGeometry(r * 0.68, 12, 10), mat);
  crown.position.set(0, cy + r * 0.95, -0.04);
  crown.scale.set(1.05, 0.5, 1.0);
  g.add(crown);

  const face = new Mesh(new SphereGeometry(r * 0.8, 14, 12), mat);
  face.position.set(0, cy - 0.06, r * 0.44);
  face.scale.set(1.0, 1.3, 0.42);
  g.add(face);

  g.add(mesh(new SphereGeometry(r * 0.3, 10, 8), mat, -r * 0.8, cy + 0.02, 0.04));
  g.add(mesh(new SphereGeometry(r * 0.3, 10, 8), mat, r * 0.8, cy + 0.02, 0.04));

  g.add(mesh(new SphereGeometry(r * 0.34, 10, 8), mat, -r * 0.48, cy - 0.2, r * 0.36));
  g.add(mesh(new SphereGeometry(r * 0.34, 10, 8), mat, r * 0.48, cy - 0.2, r * 0.36));
  g.add(mesh(new SphereGeometry(r * 0.34, 10, 8), mat, 0, cy - r * 1.2, r * 0.26));

  addNeck(g, mat, r, cy);
}

/**
 * C · cheeky — exaggerated puff cheeks, tiny features. Moe / animal-crossing cute
 * in a grimdark wardrobe.
 */
function headCheeky(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r * 0.92, 16, 14), mat);
  skull.position.set(0, cy + 0.08, -0.02);
  skull.scale.set(0.92, 1.2, 0.9);
  g.add(skull);

  const cheekL = new Mesh(new SphereGeometry(r * 0.52, 14, 12), mat);
  cheekL.position.set(-r * 0.78, cy - 0.1, r * 0.2);
  cheekL.scale.set(1.05, 1.05, 0.95);
  g.add(cheekL);
  const cheekR = new Mesh(new SphereGeometry(r * 0.52, 14, 12), mat);
  cheekR.position.set(r * 0.78, cy - 0.1, r * 0.2);
  cheekR.scale.set(1.05, 1.05, 0.95);
  g.add(cheekR);

  const face = new Mesh(new SphereGeometry(r * 0.76, 12, 10), mat);
  face.position.set(0, cy + 0.0, r * 0.48);
  face.scale.set(0.95, 1.15, 0.38);
  g.add(face);

  g.add(mesh(new SphereGeometry(r * 0.24, 8, 6), mat, 0, cy - r * 0.85, r * 0.32));

  g.add(mesh(new SphereGeometry(r * 0.48, 12, 8), mat, 0, cy + r * 0.82, -0.02));

  addNeck(g, mat, r, cy);
}

/**
 * D · solemn — quieter, slightly longer face for medieval grit.
 * Still soft chibi (no adult jaw / long chin stack).
 */
function headSolemn(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r, 16, 14), mat);
  skull.position.set(0, cy + 0.02, -0.04);
  skull.scale.set(0.88, 1.38, 0.86);
  g.add(skull);

  g.add(mesh(new SphereGeometry(r * 0.68, 12, 10), mat, 0, cy + r * 0.32, r * 0.4));

  const face = new Mesh(new SphereGeometry(r * 0.76, 14, 12), mat);
  face.position.set(0, cy - 0.12, r * 0.42);
  face.scale.set(0.95, 1.4, 0.4);
  g.add(face);

  g.add(mesh(new SphereGeometry(r * 0.28, 10, 8), mat, -r * 0.52, cy - 0.14, r * 0.28));
  g.add(mesh(new SphereGeometry(r * 0.28, 10, 8), mat, r * 0.52, cy - 0.14, r * 0.28));

  const jaw = new Mesh(new SphereGeometry(r * 0.42, 12, 10), mat);
  jaw.position.set(0, cy - r * 1.2, r * 0.18);
  jaw.scale.set(0.95, 0.8, 0.85);
  g.add(jaw);

  g.add(mesh(new SphereGeometry(r * 0.52, 12, 8), mat, 0, cy + r * 0.98, -0.05));
  g.add(mesh(new SphereGeometry(r * 0.38, 10, 8), mat, 0, cy - r * 0.25, -r * 0.58));

  addNeck(g, mat, r, cy);
}

/**
 * Cute grimdark-chibi head — few welded volumes, no sphere salad.
 */
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
    case "dumpling":
      headDumpling(g, mat, r, cy);
      break;
    case "cheeky":
      headCheeky(g, mat, r, cy);
      break;
    case "solemn":
      headSolemn(g, mat, r, cy);
      break;
    case "mochi":
    default:
      headMochi(g, mat, r, cy);
      break;
  }

  return g;
}

/**
 * Soft anime eyes + tiny mouth. Layout follows `shape` so eyes sit on the pad.
 */
export function generateFace(opts: {
  eyeColor?: string;
  nose?: boolean;
  skin: string;
  scale?: number;
  shape?: HeadShape;
}): Group {
  const g = new Group();
  g.name = "face";
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

    // Soft two-tier white (slightly rounder proportions than hard FF rects)
    const botH = eyeH * 0.48;
    eye.add(mesh(new BoxGeometry(eyeW, botH, d), white, 0, -eyeH * 0.18, 0));
    const topH = eyeH * 0.55;
    eye.add(
      mesh(
        new BoxGeometry(eyeW * t.eyeTopWiden, topH, d),
        white,
        0,
        eyeH * 0.2,
        0,
      ),
    );

    // Large iris — cute anime read
    eye.add(
      mesh(
        new BoxGeometry(irisW, irisH, d * 0.7),
        irisMat,
        0,
        -0.004 * hs,
        d * 0.15,
      ),
    );

    // Soft upper lid
    eye.add(
      mesh(
        new BoxGeometry(eyeW * t.eyeTopWiden * 1.02, 0.016 * hs, d * 0.8),
        lid,
        0,
        eyeH * 0.44,
        d * 0.1,
      ),
    );

    // Catchlight
    eye.add(
      mesh(
        new BoxGeometry(0.024 * hs, 0.024 * hs, d * 0.5),
        shine,
        -irisW * 0.22,
        irisH * 0.2,
        d * 0.35,
      ),
    );

    // Soft brow
    eye.add(
      mesh(
        new BoxGeometry(browW, browH, browDepth),
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
        new SphereGeometry(0.022 * hs, 8, 6),
        toon(opts.skin),
        0,
        y - 0.1 * hs,
        z - 0.01 * hs,
      ),
    );
  }

  const mouth = new Mesh(
    new BoxGeometry(t.mouthWidth * hs, 0.014 * hs, 0.014 * hs),
    lid,
  );
  mouth.name = "mouth";
  mouth.position.set(0, y - t.mouthDrop * hs, z - 0.03 * hs);
  g.add(mouth);

  return g;
}
