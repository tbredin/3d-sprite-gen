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
 * Locked soft-diamond skull — mid-point between classic and slim.
 * Character shapes build *on top of* this language with archetype extras.
 */
export const DEFAULT_HEAD_SHAPE: HeadShape = "lozenge";

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
  eyeW: 0.21,
  eyeH: 0.165,
  eyeDepth: 0.03,
  eyeTopWiden: 1.06,
  irisW: 0.135,
  irisH: 0.12,
  eyeSpacing: 0.155,
  eyeZ: CHIBI.skullR * 0.95,
  eyeLift: 0.055,
  browW: 0.21,
  browH: 0.036,
  browDepth: 0.024,
  mouthWidth: 0.06,
  mouthDrop: 0.28,
};

export const FACE_BY_SHAPE: Record<HeadShape, FaceLayout> = {
  lozenge: { ...BASE_FACE },
  mage: {
    ...BASE_FACE,
    eyeLift: 0.08,
    eyeSpacing: 0.15,
    mouthDrop: 0.3,
    eyeH: 0.175,
  },
  knight: {
    ...BASE_FACE,
    eyeLift: 0.04,
    eyeW: 0.19,
    eyeH: 0.14,
    eyeTopWiden: 1.0,
    browH: 0.045,
    mouthDrop: 0.26,
  },
  soldier: {
    ...BASE_FACE,
    eyeLift: 0.03,
    eyeW: 0.18,
    eyeH: 0.14,
    eyeSpacing: 0.15,
    mouthDrop: 0.25,
  },
  rogue: {
    ...BASE_FACE,
    eyeLift: 0.06,
    eyeSpacing: 0.16,
    eyeW: 0.2,
    mouthWidth: 0.055,
    mouthDrop: 0.27,
  },
  scientist: {
    ...BASE_FACE,
    eyeLift: 0.02,
    eyeSpacing: 0.17,
    eyeW: 0.24,
    eyeH: 0.18,
    irisW: 0.15,
    mouthDrop: 0.26,
  },
  cleric: {
    ...BASE_FACE,
    eyeLift: 0.05,
    eyeSpacing: 0.16,
    eyeH: 0.17,
    mouthDrop: 0.26,
    mouthWidth: 0.07,
  },
  ranger: {
    ...BASE_FACE,
    eyeLift: 0.055,
    eyeSpacing: 0.15,
    eyeW: 0.2,
    mouthDrop: 0.28,
  },
  barbarian: {
    ...BASE_FACE,
    eyeLift: 0.03,
    eyeSpacing: 0.17,
    eyeW: 0.2,
    browH: 0.05,
    mouthWidth: 0.08,
    mouthDrop: 0.3,
  },
  acolyte: {
    ...BASE_FACE,
    eyeLift: 0.04,
    eyeSpacing: 0.165,
    eyeW: 0.23,
    eyeH: 0.18,
    irisW: 0.15,
    mouthDrop: 0.25,
    mouthWidth: 0.05,
  },
  pirate: {
    ...BASE_FACE,
    eyeLift: 0.04,
    eyeSpacing: 0.16,
    eyeW: 0.2,
    browH: 0.042,
    mouthDrop: 0.29,
    mouthWidth: 0.075,
  },
  goatman: {
    ...BASE_FACE,
    eyeLift: 0.05,
    eyeSpacing: 0.17,
    eyeZ: CHIBI.skullR * 1.05,
    eyeW: 0.18,
    eyeH: 0.14,
    mouthDrop: 0.32,
  },
};

export const FACE_READABILITY = FACE_BY_SHAPE.lozenge;

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
