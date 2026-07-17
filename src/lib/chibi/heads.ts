import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  SphereGeometry,
  type Material,
} from "three";
import { toon } from "./materials";
import { cartoonEyeMaterial, EYE_TEX_H, EYE_TEX_W } from "./faceTexture";
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
 * Locked soft-diamond skull — mid-point between classic and slim.
 * Character shapes build *on top of* this language with archetype extras.
 */
export const DEFAULT_HEAD_SHAPE: HeadShape = "lozenge";

/** Mild tip toward iso camera. */
export const ISO_FACE_TILT = -0.28;

/** Skin volumes used to seat eyes on the outermost head surface. */
type HeadSkin = {
  skull: [number, number, number];
  faceR: number;
  faceY: number;
  faceZ: number;
  faceScale: [number, number, number];
  cheeks?: { r: number; x: number; y: number; z: number };
};

const HEAD_SKIN_BY_SHAPE: Record<HeadShape, HeadSkin> = {
  lozenge: {
    skull: [0.83, 1.265, 0.85],
    faceR: 0.66,
    faceY: -0.1,
    faceZ: 0.435,
    faceScale: [0.925, 1.11, 0.37],
  },
  mage: {
    skull: [0.8, 1.34, 0.82],
    faceR: 0.64,
    faceY: -0.08,
    faceZ: 0.42,
    faceScale: [0.92, 1.15, 0.36],
  },
  knight: {
    skull: [0.86, 1.18, 0.88],
    faceR: 0.68,
    faceY: -0.06,
    faceZ: 0.46,
    faceScale: [1.0, 0.95, 0.4],
  },
  soldier: {
    skull: [0.88, 1.12, 0.9],
    faceR: 0.7,
    faceY: -0.04,
    faceZ: 0.48,
    faceScale: [1.02, 0.92, 0.4],
  },
  rogue: {
    skull: [0.78, 1.28, 0.8],
    faceR: 0.62,
    faceY: -0.1,
    faceZ: 0.44,
    faceScale: [0.95, 1.12, 0.35],
    cheeks: { r: 0.32, x: 0.5, y: -0.12, z: 0.18 },
  },
  scientist: {
    skull: [0.92, 1.22, 0.92],
    faceR: 0.75,
    faceY: -0.12,
    faceZ: 0.48,
    faceScale: [1.08, 1.0, 0.42],
  },
  cleric: {
    skull: [0.9, 1.2, 0.9],
    faceR: 0.7,
    faceY: -0.06,
    faceZ: 0.45,
    faceScale: [1.0, 1.02, 0.4],
    cheeks: { r: 0.3, x: 0.45, y: -0.05, z: 0.14 },
  },
  ranger: {
    skull: [0.8, 1.3, 0.84],
    faceR: 0.64,
    faceY: -0.1,
    faceZ: 0.43,
    faceScale: [0.92, 1.12, 0.36],
    cheeks: { r: 0.26, x: 0.46, y: -0.1, z: 0.1 },
  },
  barbarian: {
    skull: [1.0, 1.18, 0.95],
    faceR: 0.78,
    faceY: -0.08,
    faceZ: 0.48,
    faceScale: [1.1, 0.95, 0.42],
    cheeks: { r: 0.42, x: 0.55, y: -0.15, z: 0.15 },
  },
  acolyte: {
    skull: [0.92, 1.18, 0.92],
    faceR: 0.74,
    faceY: -0.04,
    faceZ: 0.48,
    faceScale: [1.05, 0.95, 0.42],
    cheeks: { r: 0.36, x: 0.48, y: -0.02, z: 0.16 },
  },
  pirate: {
    skull: [0.9, 1.2, 0.9],
    faceR: 0.72,
    faceY: -0.08,
    faceZ: 0.46,
    faceScale: [1.05, 1.0, 0.4],
    cheeks: { r: 0.34, x: 0.5, y: -0.18, z: 0.12 },
  },
  goatman: {
    skull: [0.82, 1.22, 0.95],
    faceR: 0.7,
    faceY: -0.15,
    faceZ: 0.55,
    faceScale: [0.95, 1.05, 0.55],
  },
};

/** Face-pad layout (spike / readability exports). */
export type FaceLayout = {
  faceR: number;
  faceY: number;
  faceZ: number;
  faceScale: [number, number, number];
};

export const FACE_BY_SHAPE: Record<HeadShape, FaceLayout> = Object.fromEntries(
  (Object.keys(HEAD_SKIN_BY_SHAPE) as HeadShape[]).map((k) => {
    const s = HEAD_SKIN_BY_SHAPE[k];
    return [
      k,
      {
        faceR: s.faceR,
        faceY: s.faceY,
        faceZ: s.faceZ,
        faceScale: s.faceScale,
      },
    ];
  }),
) as Record<HeadShape, FaceLayout>;

export const FACE_READABILITY = FACE_BY_SHAPE.lozenge;

/** Horizontal spacing tuning (preserves prior art-direction). */
const EYE_SEP_SCALE = 1.575 * 0.95 * 1.2 * 1.2 * 1.1 * 0.5;
/** Eye row as a fraction of face-pad height (negative = lower on face). */
const EYE_V_FRAC = -0.14;
/** Keep eyes inside the face-pad's lateral span. */
const EYE_SEP_FACE_FRAC = 0.72;
/**
 * Outward +Z puff: clears tipped-plane dig-in + multi-sphere seams.
 * (~plane half-height × sin|tilt| plus a skin epsilon.)
 */
const EYE_SURFACE_PUFF = 0.045;

type SkinEllipsoid = {
  cx: number;
  cy: number;
  cz: number;
  ax: number;
  ay: number;
  az: number;
  /** Mesh X-tilt (face pad). */
  tiltX?: number;
};

/** Front (+Z) surface of an axis-aligned or X-tilted ellipsoid at world (x,y). */
function frontZAt(
  e: SkinEllipsoid,
  x: number,
  y: number,
): { z: number; nx: number; ny: number; nz: number } | null {
  const tilt = e.tiltX ?? 0;
  const c = Math.cos(-tilt);
  const s = Math.sin(-tilt);
  const dx = x - e.cx;
  const dy0 = y - e.cy;

  // Ray x=const, y=const, z varies. Solve quadratic after undoing tilt.
  // local = R_{-tilt}(world - center):
  //   lx = dx
  //   ly = dy0*c - dz*s
  //   lz = dy0*s + dz*c
  // lx²/ax² + ly²/ay² + lz²/az² = 1
  const A =
    (s * s) / (e.ay * e.ay) + (c * c) / (e.az * e.az);
  const B =
    (-2 * dy0 * c * s) / (e.ay * e.ay) + (2 * dy0 * s * c) / (e.az * e.az);
  const C =
    (dx * dx) / (e.ax * e.ax) +
    (dy0 * dy0 * c * c) / (e.ay * e.ay) +
    (dy0 * dy0 * s * s) / (e.az * e.az) -
    1;

  const disc = B * B - 4 * A * C;
  if (disc < 0 || A < 1e-12) return null;
  const sqrtD = Math.sqrt(disc);
  const dz = Math.max((-B + sqrtD) / (2 * A), (-B - sqrtD) / (2 * A));
  const z = e.cz + dz;

  // Gradient in local, then rotate normal back by +tilt.
  const ly = dy0 * c - dz * s;
  const lz = dy0 * s + dz * c;
  const gx = (2 * dx) / (e.ax * e.ax);
  const gyL = (2 * ly) / (e.ay * e.ay);
  const gzL = (2 * lz) / (e.az * e.az);
  const rc = Math.cos(tilt);
  const rs = Math.sin(tilt);
  const gy = gyL * rc - gzL * rs;
  const gz = gyL * rs + gzL * rc;
  const nLen = Math.hypot(gx, gy, gz) || 1;
  return { z, nx: gx / nLen, ny: gy / nLen, nz: gz / nLen };
}

function skinEllipsoids(shape: HeadShape, r: number): SkinEllipsoid[] {
  const skin = HEAD_SKIN_BY_SHAPE[shape];
  const cy = LAYOUT.headCenterY;
  const out: SkinEllipsoid[] = [
    {
      cx: 0,
      cy,
      cz: 0,
      ax: r * skin.skull[0],
      ay: r * skin.skull[1],
      az: r * skin.skull[2],
    },
    {
      cx: 0,
      cy: cy + r * skin.faceY,
      cz: r * skin.faceZ,
      ax: r * skin.faceR * skin.faceScale[0],
      ay: r * skin.faceR * skin.faceScale[1],
      az: r * skin.faceR * skin.faceScale[2],
      tiltX: ISO_FACE_TILT,
    },
  ];
  if (skin.cheeks) {
    const cr = r * skin.cheeks.r;
    const cx = r * skin.cheeks.x;
    const cY = cy + r * skin.cheeks.y;
    const cz = r * skin.cheeks.z;
    out.push(
      { cx: -cx, cy: cY, cz, ax: cr, ay: cr, az: cr },
      { cx, cy: cY, cz, ax: cr, ay: cr, az: cr },
    );
  }
  return out;
}

/** World anchor on the outermost head skin for one eye. */
function faceEyeAnchor(opts: {
  shape: HeadShape;
  headScale: number;
  side: -1 | 1;
  halfSepWorld: number;
  eyeH: number;
}): { x: number; y: number; z: number } {
  const skin = HEAD_SKIN_BY_SHAPE[opts.shape];
  const r = CHIBI.skullR * opts.headScale;
  const faceAy = r * skin.faceR * skin.faceScale[1];
  const faceAx = r * skin.faceR * skin.faceScale[0];
  const faceCy = LAYOUT.headCenterY + r * skin.faceY;

  const halfSep = Math.min(
    opts.halfSepWorld,
    faceAx * EYE_SEP_FACE_FRAC,
  );
  const x = opts.side * halfSep;
  const y = faceCy + faceAy * EYE_V_FRAC;

  let bestZ = -Infinity;
  let bestN = { x: 0, y: 0, z: 1 };
  for (const e of skinEllipsoids(opts.shape, r)) {
    // Prefer the cheek on this eye's side when sampling cheeks.
    if (e.cx !== 0 && Math.sign(e.cx) !== opts.side) continue;
    const hit = frontZAt(e, x, y);
    if (!hit) continue;
    if (hit.z > bestZ) {
      bestZ = hit.z;
      bestN = { x: hit.nx, y: hit.ny, z: hit.nz };
    }
  }

  if (!Number.isFinite(bestZ)) {
    // Fallback: face-pad front at midline depth.
    bestZ = r * skin.faceZ + r * skin.faceR * skin.faceScale[2];
  }

  // Extra puff so a tipped plane's top edge doesn't dig into skin.
  const tiltClear = (opts.eyeH * 0.5) * Math.sin(Math.abs(ISO_FACE_TILT));
  const puff = r * EYE_SURFACE_PUFF + tiltClear;

  return {
    x: x + bestN.x * puff,
    y: y + bestN.y * puff,
    z: bestZ + bestN.z * puff,
  };
}

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
  skull: [number, number, number];
  crownR: number;
  crownY: number;
  faceR: number;
  faceY: number;
  faceZ: number;
  faceScale: [number, number, number];
  chinR: number;
  chinY: number;
  chinZ: number;
  cheeks?: boolean;
  cheekR?: number;
  cheekX?: number;
  cheekY?: number;
  cheekZ?: number;
  browMass?: boolean;
  browR?: number;
  browY?: number;
  browZ?: number;
  browScale?: [number, number, number];
};

/** Locked mid classic↔slim proportions. */
const LOCKED: LozengeBuild = {
  skull: [0.83, 1.265, 0.85],
  crownR: 0.425,
  crownY: 0.875,
  faceR: 0.66,
  faceY: -0.1,
  faceZ: 0.435,
  faceScale: [0.925, 1.11, 0.37],
  chinR: 0.185,
  chinY: -0.91,
  chinZ: 0.21,
};

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
    const brow = new Mesh(
      new SphereGeometry(r * (p.browR ?? 0.55), 12, 10),
      mat,
    );
    brow.position.set(0, cy + r * (p.browY ?? 0.35), r * (p.browZ ?? 0.2));
    brow.scale.set(...(p.browScale ?? ([1.1, 0.7, 0.55] as [number, number, number])));
    g.add(brow);
  }

  if (p.cheeks) {
    const cr = r * (p.cheekR ?? 0.38);
    const cx = r * (p.cheekX ?? 0.48);
    const cY = cy + r * (p.cheekY ?? -0.08);
    const cz = r * (p.cheekZ ?? 0.12);
    g.add(mesh(new SphereGeometry(cr, 10, 8), mat, -cx, cY, cz));
    g.add(mesh(new SphereGeometry(cr, 10, 8), mat, cx, cY, cz));
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

/** Locked skeleton — classic↔slim midpoint. */
function headLozenge(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, LOCKED);
}

/** Mage — tall mystic crown, soft hollows, pointed tip. */
function headMage(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.8, 1.34, 0.82],
    crownR: 0.5,
    crownY: 0.98,
    faceR: 0.64,
    faceY: -0.08,
    faceZ: 0.42,
    faceScale: [0.92, 1.15, 0.36],
    chinR: 0.17,
    chinY: -0.95,
    chinZ: 0.2,
  });
  // Arcane temple ridges
  g.add(mesh(new SphereGeometry(r * 0.18, 8, 6), mat, -r * 0.55, cy + r * 0.25, -0.05));
  g.add(mesh(new SphereGeometry(r * 0.18, 8, 6), mat, r * 0.55, cy + r * 0.25, -0.05));
}

/** Knight — helm-ready: square brow shelf, firm jaw, flatter sides. */
function headKnight(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.86, 1.18, 0.88],
    crownR: 0.32,
    crownY: 0.72,
    faceR: 0.68,
    faceY: -0.06,
    faceZ: 0.46,
    faceScale: [1.0, 0.95, 0.4],
    chinR: 0.22,
    chinY: -0.82,
    chinZ: 0.24,
    browMass: true,
    browR: 0.48,
    browY: 0.28,
    browZ: 0.28,
    browScale: [1.25, 0.45, 0.5],
  });
  // Jaw blocks
  g.add(mesh(new BoxGeometry(r * 0.55, r * 0.28, r * 0.35), mat, -r * 0.35, cy - r * 0.45, r * 0.15));
  g.add(mesh(new BoxGeometry(r * 0.55, r * 0.28, r * 0.35), mat, r * 0.35, cy - r * 0.45, r * 0.15));
}

/** Soldier — compact tough skull, short crown, hard brow. */
function headSoldier(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.88, 1.12, 0.9],
    crownR: 0.28,
    crownY: 0.65,
    faceR: 0.7,
    faceY: -0.04,
    faceZ: 0.48,
    faceScale: [1.02, 0.92, 0.4],
    chinR: 0.2,
    chinY: -0.75,
    chinZ: 0.26,
    browMass: true,
    browR: 0.42,
    browY: 0.22,
    browZ: 0.32,
    browScale: [1.2, 0.4, 0.45],
  });
}

/** Rogue — lean diamond, sly cheek bulbs, sharp chin. */
function headRogue(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.78, 1.28, 0.8],
    crownR: 0.38,
    crownY: 0.88,
    faceR: 0.62,
    faceY: -0.1,
    faceZ: 0.44,
    faceScale: [0.95, 1.12, 0.35],
    chinR: 0.16,
    chinY: -0.95,
    chinZ: 0.22,
    cheeks: true,
    cheekR: 0.32,
    cheekX: 0.5,
    cheekY: -0.12,
    cheekZ: 0.18,
  });
}

/** Scientist — oversized forehead dome, rounder face. */
function headScientist(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.92, 1.22, 0.92],
    crownR: 0.58,
    crownY: 0.82,
    faceR: 0.75,
    faceY: -0.12,
    faceZ: 0.48,
    faceScale: [1.08, 1.0, 0.42],
    chinR: 0.2,
    chinY: -0.85,
    chinZ: 0.22,
    browMass: true,
    browR: 0.62,
    browY: 0.4,
    browZ: 0.15,
    browScale: [1.15, 0.85, 0.7],
  });
}

/** Cleric — gentle soft diamond, mild cheeks, short serene chin. */
function headCleric(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.9, 1.2, 0.9],
    crownR: 0.4,
    crownY: 0.78,
    faceR: 0.7,
    faceY: -0.06,
    faceZ: 0.45,
    faceScale: [1.0, 1.02, 0.4],
    chinR: 0.2,
    chinY: -0.8,
    chinZ: 0.22,
    cheeks: true,
    cheekR: 0.3,
    cheekX: 0.45,
    cheekY: -0.05,
    cheekZ: 0.14,
  });
}

/** Ranger — weather-lean lozenge, modest length, quiet cheeks. */
function headRanger(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.8, 1.3, 0.84],
    crownR: 0.4,
    crownY: 0.9,
    faceR: 0.64,
    faceY: -0.1,
    faceZ: 0.43,
    faceScale: [0.92, 1.12, 0.36],
    chinR: 0.18,
    chinY: -0.92,
    chinZ: 0.2,
    cheeks: true,
    cheekR: 0.26,
    cheekX: 0.46,
    cheekY: -0.1,
    cheekZ: 0.1,
  });
}

/** Barbarian — wide brutal skull, heavy brow, thick jaw. */
function headBarbarian(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [1.0, 1.18, 0.95],
    crownR: 0.36,
    crownY: 0.7,
    faceR: 0.78,
    faceY: -0.08,
    faceZ: 0.48,
    faceScale: [1.1, 0.95, 0.42],
    chinR: 0.28,
    chinY: -0.82,
    chinZ: 0.28,
    browMass: true,
    browR: 0.55,
    browY: 0.25,
    browZ: 0.3,
    browScale: [1.35, 0.5, 0.55],
    cheeks: true,
    cheekR: 0.42,
    cheekX: 0.55,
    cheekY: -0.15,
    cheekZ: 0.15,
  });
}

/** Acolyte — youthful soft, big forehead, tiny chin. */
function headAcolyte(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.92, 1.18, 0.92],
    crownR: 0.48,
    crownY: 0.8,
    faceR: 0.74,
    faceY: -0.04,
    faceZ: 0.48,
    faceScale: [1.05, 0.95, 0.42],
    chinR: 0.16,
    chinY: -0.72,
    chinZ: 0.22,
    cheeks: true,
    cheekR: 0.36,
    cheekX: 0.48,
    cheekY: -0.02,
    cheekZ: 0.16,
  });
}

/** Pirate — rugged wider jaw, square chin, weathered brow. */
function headPirate(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.9, 1.2, 0.9],
    crownR: 0.36,
    crownY: 0.75,
    faceR: 0.72,
    faceY: -0.08,
    faceZ: 0.46,
    faceScale: [1.05, 1.0, 0.4],
    chinR: 0.26,
    chinY: -0.85,
    chinZ: 0.28,
    browMass: true,
    browR: 0.45,
    browY: 0.28,
    browZ: 0.28,
    browScale: [1.2, 0.42, 0.5],
    cheeks: true,
    cheekR: 0.34,
    cheekX: 0.5,
    cheekY: -0.18,
    cheekZ: 0.12,
  });
  // Squarer chin block
  g.add(
    mesh(new BoxGeometry(r * 0.4, r * 0.22, r * 0.3), mat, 0, cy - r * 0.88, r * 0.25),
  );
}

/** Goatman — muzzle-ready: longer face pad, flatter sides for horns. */
function headGoatman(g: Group, mat: Material, r: number, cy: number) {
  buildLozenge(g, mat, r, cy, {
    skull: [0.82, 1.22, 0.95],
    crownR: 0.35,
    crownY: 0.78,
    faceR: 0.7,
    faceY: -0.15,
    faceZ: 0.55,
    faceScale: [0.95, 1.05, 0.55],
    chinR: 0.22,
    chinY: -0.95,
    chinZ: 0.4,
  });
  // Snout stub (helmet adds the rest)
  const snout = new Mesh(new SphereGeometry(r * 0.35, 10, 8), mat);
  snout.position.set(0, cy - r * 0.25, r * 0.75);
  snout.scale.set(0.85, 0.7, 1.1);
  tipFace(snout);
  g.add(snout);
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
    case "mage":
      headMage(g, mat, r, cy);
      break;
    case "knight":
      headKnight(g, mat, r, cy);
      break;
    case "soldier":
      headSoldier(g, mat, r, cy);
      break;
    case "rogue":
      headRogue(g, mat, r, cy);
      break;
    case "scientist":
      headScientist(g, mat, r, cy);
      break;
    case "cleric":
      headCleric(g, mat, r, cy);
      break;
    case "ranger":
      headRanger(g, mat, r, cy);
      break;
    case "barbarian":
      headBarbarian(g, mat, r, cy);
      break;
    case "acolyte":
      headAcolyte(g, mat, r, cy);
      break;
    case "pirate":
      headPirate(g, mat, r, cy);
      break;
    case "goatman":
      headGoatman(g, mat, r, cy);
      break;
    case "lozenge":
    default:
      headLozenge(g, mat, r, cy);
      break;
  }

  return g;
}

/**
 * Cartoon face = two tiny eye plates; face-cheat shows only the nearer one.
 * Each eye is 2-wide × 25% taller; colour half faces gaze, white faces away.
 */
export function generateFace(opts: {
  eyeColor?: string;
  scale?: number;
  headScale?: number;
  shape?: HeadShape;
}): Group {
  const g = new Group();
  g.name = "face";
  const faceScale = opts.scale ?? 1;
  const headScale = opts.headScale ?? 1;
  const shape = opts.shape ?? DEFAULT_HEAD_SHAPE;
  const eyeW = 0.33 * faceScale * (2 / 5);
  const eyeH = eyeW * (EYE_TEX_H / EYE_TEX_W);
  const halfSep = eyeW * EYE_SEP_SCALE;
  const eyeColor = opts.eyeColor ?? "#1a1c2c";

  for (const side of [-1, 1] as const) {
    const eyeSide = side < 0 ? "left" : "right";
    const anchor = faceEyeAnchor({
      shape,
      headScale,
      side,
      halfSepWorld: halfSep,
      eyeH,
    });
    const eye = new Mesh(
      new PlaneGeometry(eyeW, eyeH),
      cartoonEyeMaterial(eyeColor, eyeSide),
    );
    eye.name = side < 0 ? "eye-left" : "eye-right";
    eye.position.set(anchor.x, anchor.y, anchor.z);
    tipFace(eye);
    eye.renderOrder = 2;
    g.add(eye);
  }

  return g;
}
