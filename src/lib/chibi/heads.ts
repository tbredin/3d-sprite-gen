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

/**
 * Tip the face plane up toward the iso camera (~35° elevation).
 * Negative X = face normal (+Z) leans toward +Y so eyes/mouth aren't
 * foreshortened into a flat strip when looking down.
 */
export const ISO_FACE_TILT = -0.42;

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
  /** Eyes sit high on the tall skull so mouth/chin clear below under iso. */
  eyeLift: number;
  browW: number;
  browH: number;
  browDepth: number;
  mouthWidth: number;
  /** Large drop — vertical separation is the whole point under iso crush. */
  mouthDrop: number;
};

/**
 * Soft anime eyes with *wide vertical spacing* for isometric foreshortening.
 * Features that look correct in an orthographic front view collapse from above;
 * these numbers overshoot on purpose.
 */
export const FACE_BY_SHAPE: Record<HeadShape, FaceLayout> = {
  dumpling: {
    eyeW: 0.24,
    eyeH: 0.19,
    eyeDepth: 0.032,
    eyeTopWiden: 1.08,
    irisW: 0.155,
    irisH: 0.14,
    eyeSpacing: 0.17,
    eyeZ: CHIBI.skullR * 0.95,
    eyeLift: 0.1,
    browW: 0.24,
    browH: 0.045,
    browDepth: 0.026,
    mouthWidth: 0.075,
    mouthDrop: 0.38,
  },
  mochi: {
    eyeW: 0.225,
    eyeH: 0.175,
    eyeDepth: 0.03,
    eyeTopWiden: 1.1,
    irisW: 0.145,
    irisH: 0.128,
    eyeSpacing: 0.16,
    eyeZ: CHIBI.skullR * 0.92,
    eyeLift: 0.12,
    browW: 0.23,
    browH: 0.044,
    browDepth: 0.026,
    mouthWidth: 0.078,
    mouthDrop: 0.42,
  },
  cheeky: {
    eyeW: 0.235,
    eyeH: 0.185,
    eyeDepth: 0.032,
    eyeTopWiden: 1.06,
    irisW: 0.15,
    irisH: 0.135,
    eyeSpacing: 0.18,
    eyeZ: CHIBI.skullR * 0.98,
    eyeLift: 0.11,
    browW: 0.22,
    browH: 0.04,
    browDepth: 0.024,
    mouthWidth: 0.065,
    mouthDrop: 0.4,
  },
  solemn: {
    eyeW: 0.21,
    eyeH: 0.16,
    eyeDepth: 0.028,
    eyeTopWiden: 1.05,
    irisW: 0.132,
    irisH: 0.115,
    eyeSpacing: 0.152,
    eyeZ: CHIBI.skullR * 0.9,
    eyeLift: 0.08,
    browW: 0.24,
    browH: 0.048,
    browDepth: 0.028,
    mouthWidth: 0.065,
    mouthDrop: 0.36,
  },
};

/** @deprecated Prefer FACE_BY_SHAPE — kept for older imports. */
export const FACE_READABILITY = FACE_BY_SHAPE.mochi;

function addNeck(g: Group, mat: Material, r: number, cy: number) {
  g.add(
    mesh(
      new CylinderGeometry(r * 0.3, r * 0.4, 0.14, 10),
      mat,
      0,
      LAYOUT.shoulderY + 0.1,
      0.02,
    ),
  );
  g.add(mesh(new SphereGeometry(r * 0.36, 10, 8), mat, 0, cy - r * 0.55, -r * 0.5));
}

/**
 * Shared tall-skull recipe for iso: extreme Y scale, face pad tipped up,
 * chin pushed far below the eye line so foreshortening still leaves gaps.
 */
function addIsoFacePad(
  g: Group,
  mat: Material,
  r: number,
  cy: number,
  opts: { y?: number; z?: number; sx?: number; sy?: number },
) {
  const face = new Mesh(new SphereGeometry(r * 0.82, 14, 12), mat);
  face.position.set(0, cy + (opts.y ?? -0.08), r * (opts.z ?? 0.42));
  face.scale.set(opts.sx ?? 0.98, opts.sy ?? 1.55, 0.38);
  face.rotation.x = ISO_FACE_TILT;
  g.add(face);
}

/**
 * A · dumpling — tall soft ball. Extreme Y for iso; cute cheeks.
 */
function headDumpling(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r, 16, 14), mat);
  skull.position.set(0, cy + 0.06, 0);
  skull.scale.set(0.92, 1.7, 0.88);
  g.add(skull);

  addIsoFacePad(g, mat, r, cy, { y: -0.06, z: 0.44, sy: 1.5 });

  g.add(mesh(new SphereGeometry(r * 0.38, 12, 10), mat, -r * 0.68, cy - 0.12, r * 0.22));
  g.add(mesh(new SphereGeometry(r * 0.38, 12, 10), mat, r * 0.68, cy - 0.12, r * 0.22));

  // Chin well below eyes — must survive iso crush
  g.add(mesh(new SphereGeometry(r * 0.32, 10, 8), mat, 0, cy - r * 1.45, r * 0.28));

  g.add(mesh(new SphereGeometry(r * 0.5, 12, 8), mat, 0, cy + r * 1.15, -0.02));

  addNeck(g, mat, r, cy);
}

/**
 * B · mochi — very tall soft SD egg (default). Built for high iso.
 */
function headMochi(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r, 16, 14), mat);
  skull.position.set(0, cy + 0.08, -0.02);
  skull.scale.set(0.85, 1.85, 0.84);
  g.add(skull);

  const crown = new Mesh(new SphereGeometry(r * 0.62, 12, 10), mat);
  crown.position.set(0, cy + r * 1.25, -0.04);
  crown.scale.set(1.05, 0.45, 1.0);
  g.add(crown);

  addIsoFacePad(g, mat, r, cy, { y: -0.1, z: 0.4, sy: 1.65 });

  g.add(mesh(new SphereGeometry(r * 0.28, 10, 8), mat, -r * 0.78, cy + 0.04, 0.02));
  g.add(mesh(new SphereGeometry(r * 0.28, 10, 8), mat, r * 0.78, cy + 0.04, 0.02));

  g.add(mesh(new SphereGeometry(r * 0.32, 10, 8), mat, -r * 0.45, cy - 0.28, r * 0.32));
  g.add(mesh(new SphereGeometry(r * 0.32, 10, 8), mat, r * 0.45, cy - 0.28, r * 0.32));
  g.add(mesh(new SphereGeometry(r * 0.36, 10, 8), mat, 0, cy - r * 1.55, r * 0.24));

  addNeck(g, mat, r, cy);
}

/**
 * C · cheeky — tall skull + puff cheeks.
 */
function headCheeky(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r * 0.9, 16, 14), mat);
  skull.position.set(0, cy + 0.1, -0.02);
  skull.scale.set(0.88, 1.65, 0.86);
  g.add(skull);

  const cheekL = new Mesh(new SphereGeometry(r * 0.5, 14, 12), mat);
  cheekL.position.set(-r * 0.75, cy - 0.14, r * 0.18);
  cheekL.scale.set(1.05, 1.15, 0.95);
  g.add(cheekL);
  const cheekR = new Mesh(new SphereGeometry(r * 0.5, 14, 12), mat);
  cheekR.position.set(r * 0.75, cy - 0.14, r * 0.18);
  cheekR.scale.set(1.05, 1.15, 0.95);
  g.add(cheekR);

  addIsoFacePad(g, mat, r, cy, { y: -0.02, z: 0.46, sx: 0.92, sy: 1.45 });

  g.add(mesh(new SphereGeometry(r * 0.26, 8, 6), mat, 0, cy - r * 1.35, r * 0.3));

  g.add(mesh(new SphereGeometry(r * 0.46, 12, 8), mat, 0, cy + r * 1.1, -0.02));

  addNeck(g, mat, r, cy);
}

/**
 * D · solemn — quieter medieval face; tall for iso but not a tower.
 */
function headSolemn(g: Group, mat: Material, r: number, cy: number) {
  const skull = new Mesh(new SphereGeometry(r, 16, 14), mat);
  skull.position.set(0, cy + 0.04, -0.04);
  // Was 2.0 — read as a stretched tower under iso; sit between mochi and old.
  skull.scale.set(0.86, 1.65, 0.84);
  g.add(skull);

  g.add(mesh(new SphereGeometry(r * 0.62, 12, 10), mat, 0, cy + r * 0.32, r * 0.36));

  addIsoFacePad(g, mat, r, cy, { y: -0.1, z: 0.38, sx: 0.92, sy: 1.45 });

  g.add(mesh(new SphereGeometry(r * 0.26, 10, 8), mat, -r * 0.5, cy - 0.14, r * 0.26));
  g.add(mesh(new SphereGeometry(r * 0.26, 10, 8), mat, r * 0.5, cy - 0.14, r * 0.26));

  const jaw = new Mesh(new SphereGeometry(r * 0.38, 12, 10), mat);
  jaw.position.set(0, cy - r * 1.35, r * 0.16);
  jaw.scale.set(0.95, 0.8, 0.85);
  g.add(jaw);

  g.add(mesh(new SphereGeometry(r * 0.48, 12, 8), mat, 0, cy + r * 1.05, -0.05));
  g.add(mesh(new SphereGeometry(r * 0.34, 10, 8), mat, 0, cy - r * 0.28, -r * 0.55));

  addNeck(g, mat, r, cy);
}

/**
 * Cute grimdark-chibi head — tall for isometric foreshortening.
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
 * Soft anime eyes + mouth. Layout overshoots vertical spacing for iso;
 * whole face group tips up toward the camera.
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
        new BoxGeometry(0.026 * hs, 0.026 * hs, d * 0.5),
        shine,
        -irisW * 0.22,
        irisH * 0.2,
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
        new SphereGeometry(0.024 * hs, 8, 6),
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
