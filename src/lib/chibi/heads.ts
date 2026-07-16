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
    eyeW: 0.2,
    eyeH: 0.155,
    eyeDepth: 0.028,
    eyeTopWiden: 1.08,
    irisW: 0.13,
    irisH: 0.115,
    eyeSpacing: 0.155,
    eyeZ: CHIBI.skullR * 1.02,
    eyeLift: 0.02,
    browW: 0.2,
    browH: 0.04,
    browDepth: 0.022,
    mouthWidth: 0.06,
    mouthDrop: 0.2,
  },
  mochi: {
    eyeW: 0.185,
    eyeH: 0.14,
    eyeDepth: 0.026,
    eyeTopWiden: 1.1,
    irisW: 0.118,
    irisH: 0.1,
    eyeSpacing: 0.148,
    eyeZ: CHIBI.skullR * 0.98,
    eyeLift: 0.01,
    browW: 0.19,
    browH: 0.038,
    browDepth: 0.022,
    mouthWidth: 0.065,
    mouthDrop: 0.2,
  },
  cheeky: {
    eyeW: 0.195,
    eyeH: 0.15,
    eyeDepth: 0.028,
    eyeTopWiden: 1.06,
    irisW: 0.125,
    irisH: 0.11,
    eyeSpacing: 0.165,
    eyeZ: CHIBI.skullR * 1.05,
    eyeLift: 0.025,
    browW: 0.185,
    browH: 0.036,
    browDepth: 0.02,
    mouthWidth: 0.055,
    mouthDrop: 0.22,
  },
  solemn: {
    eyeW: 0.17,
    eyeH: 0.125,
    eyeDepth: 0.024,
    eyeTopWiden: 1.05,
    irisW: 0.105,
    irisH: 0.09,
    eyeSpacing: 0.14,
    eyeZ: CHIBI.skullR * 0.95,
    eyeLift: -0.01,
    browW: 0.2,
    browH: 0.042,
    browDepth: 0.024,
    mouthWidth: 0.055,
    mouthDrop: 0.22,
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
  const skull = new Mesh(new SphereGeometry(r * 1.05, 16, 14), mat);
  skull.position.set(0, cy + 0.02, 0);
  skull.scale.set(1.02, 0.98, 0.96);
  g.add(skull);

  // Face plane — shallow front pad
  const face = new Mesh(new SphereGeometry(r * 0.9, 14, 12), mat);
  face.position.set(0, cy - 0.02, r * 0.48);
  face.scale.set(1.0, 1.05, 0.42);
  g.add(face);

  // Cheeks
  g.add(mesh(new SphereGeometry(r * 0.42, 12, 10), mat, -r * 0.72, cy - 0.06, r * 0.28));
  g.add(mesh(new SphereGeometry(r * 0.42, 12, 10), mat, r * 0.72, cy - 0.06, r * 0.28));

  // Tiny chin nub (no long stack)
  g.add(mesh(new SphereGeometry(r * 0.28, 10, 8), mat, 0, cy - r * 0.85, r * 0.32));

  // Soft crown
  g.add(mesh(new SphereGeometry(r * 0.55, 12, 8), mat, 0, cy + r * 0.72, -0.02));

  addNeck(g, mat, r, cy);
}

/**
 * B · mochi — tall soft SD egg. Sea of Stars / Octopath overworld read.
 */
function headMochi(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r, 16, 14), mat);
  skull.position.set(0, cy + 0.04, -0.02);
  skull.scale.set(0.94, 1.18, 0.9);
  g.add(skull);

  const crown = new Mesh(new SphereGeometry(r * 0.7, 12, 10), mat);
  crown.position.set(0, cy + r * 0.85, -0.04);
  crown.scale.set(1.05, 0.55, 1.0);
  g.add(crown);

  const face = new Mesh(new SphereGeometry(r * 0.82, 14, 12), mat);
  face.position.set(0, cy - 0.04, r * 0.46);
  face.scale.set(1.0, 1.15, 0.45);
  g.add(face);

  // Soft temples
  g.add(mesh(new SphereGeometry(r * 0.32, 10, 8), mat, -r * 0.82, cy + 0.02, 0.04));
  g.add(mesh(new SphereGeometry(r * 0.32, 10, 8), mat, r * 0.82, cy + 0.02, 0.04));

  // Soft cheeks + single chin (no triple stack)
  g.add(mesh(new SphereGeometry(r * 0.36, 10, 8), mat, -r * 0.5, cy - 0.16, r * 0.38));
  g.add(mesh(new SphereGeometry(r * 0.36, 10, 8), mat, r * 0.5, cy - 0.16, r * 0.38));
  g.add(mesh(new SphereGeometry(r * 0.32, 10, 8), mat, 0, cy - r * 1.05, r * 0.28));

  addNeck(g, mat, r, cy);
}

/**
 * C · cheeky — exaggerated puff cheeks, tiny features. Moe / animal-crossing cute
 * in a grimdark wardrobe.
 */
function headCheeky(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r * 0.95, 16, 14), mat);
  skull.position.set(0, cy + 0.06, -0.02);
  skull.scale.set(0.95, 1.0, 0.92);
  g.add(skull);

  // Oversized cheek balloons — the silhouette signature
  const cheekL = new Mesh(new SphereGeometry(r * 0.55, 14, 12), mat);
  cheekL.position.set(-r * 0.78, cy - 0.08, r * 0.22);
  cheekL.scale.set(1.05, 1.0, 0.95);
  g.add(cheekL);
  const cheekR = new Mesh(new SphereGeometry(r * 0.55, 14, 12), mat);
  cheekR.position.set(r * 0.78, cy - 0.08, r * 0.22);
  cheekR.scale.set(1.05, 1.0, 0.95);
  g.add(cheekR);

  const face = new Mesh(new SphereGeometry(r * 0.78, 12, 10), mat);
  face.position.set(0, cy + 0.02, r * 0.5);
  face.scale.set(0.95, 0.95, 0.4);
  g.add(face);

  // Almost no chin — just a soft tuck
  g.add(mesh(new SphereGeometry(r * 0.22, 8, 6), mat, 0, cy - r * 0.7, r * 0.35));

  g.add(mesh(new SphereGeometry(r * 0.5, 12, 8), mat, 0, cy + r * 0.7, -0.02));

  addNeck(g, mat, r, cy);
}

/**
 * D · solemn — quieter, slightly longer face for medieval grit.
 * Still soft chibi (no adult jaw / long chin stack).
 */
function headSolemn(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r, 16, 14), mat);
  skull.position.set(0, cy + 0.02, -0.04);
  skull.scale.set(0.9, 1.22, 0.88);
  g.add(skull);

  // Soft brow shelf
  g.add(mesh(new SphereGeometry(r * 0.7, 12, 10), mat, 0, cy + r * 0.28, r * 0.42));

  const face = new Mesh(new SphereGeometry(r * 0.78, 14, 12), mat);
  face.position.set(0, cy - 0.1, r * 0.44);
  face.scale.set(0.95, 1.25, 0.42);
  g.add(face);

  // Quieter cheeks
  g.add(mesh(new SphereGeometry(r * 0.3, 10, 8), mat, -r * 0.55, cy - 0.12, r * 0.3));
  g.add(mesh(new SphereGeometry(r * 0.3, 10, 8), mat, r * 0.55, cy - 0.12, r * 0.3));

  // Soft tapered jaw — one volume, not a stack
  const jaw = new Mesh(new SphereGeometry(r * 0.4, 12, 10), mat);
  jaw.position.set(0, cy - r * 1.05, r * 0.2);
  jaw.scale.set(0.95, 0.75, 0.85);
  g.add(jaw);

  g.add(mesh(new SphereGeometry(r * 0.55, 12, 8), mat, 0, cy + r * 0.88, -0.05));
  g.add(mesh(new SphereGeometry(r * 0.4, 10, 8), mat, 0, cy - r * 0.2, -r * 0.6));

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
