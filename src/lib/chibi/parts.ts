import {
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  type Material,
} from "three";
import { toon, toonDetail } from "./materials";
import { capsuleCylinderLength, CHIBI, LAYOUT } from "./units";
import { armJointsForPose } from "./armPoses";
import { legJointsForPose } from "./legPoses";
import type { ArmPose, HairStyle, HemStyle, LegPose, TorsoStyle, WeaponType } from "./types";

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

/** Vertical capsule / cylinder helpers (Y-up). */
function limbCylinder(radius: number, height: number, radial = 8) {
  return new CylinderGeometry(radius, radius, height, radial);
}

/** Lift a hex color toward white for JRPG hair shine volumes. */
function lightenHex(hex: string, amount = 0.35): string {
  const n = hex.replace("#", "");
  const v =
    n.length === 3
      ? n.split("").map((c) => parseInt(c + c, 16))
      : [n.slice(0, 2), n.slice(2, 4), n.slice(4, 6)].map((c) => parseInt(c, 16));
  const lift = (c: number) =>
    Math.min(255, Math.round(c + (255 - c) * amount));
  return `#${v.map((c) => lift(c).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Slim JRPG head from stacked volumes — taper jaw so bald ≠ bulb.
 * ~10% taller than the old skull scale so the head still reads from a high
 * iso camera; chin is pushed down + slightly forward so it isn't lost under
 * the camera.
 */
export function generateHead(opts: {
  skin: string;
  scale?: number;
}): Group {
  const g = new Group();
  g.name = "head";
  const s = opts.scale ?? 1;
  const mat = toon(opts.skin);
  const cy = LAYOUT.headCenterY;
  const r = CHIBI.skullR * s;
  /** Extra vertical stretch (~10%) for SNES SD proportions under high iso. */
  const tall = 1.1;

  const skull = new Mesh(new SphereGeometry(r, 14, 12), mat);
  skull.position.set(0, cy + 0.08 * tall, -0.04);
  skull.scale.set(0.92, 1.05 * tall, 0.86);
  g.add(skull);

  const crown = new Mesh(new SphereGeometry(r * 0.72, 12, 8), mat);
  crown.position.set(0, cy + r * 0.8 * tall, -0.04);
  crown.scale.set(1.05, 0.5 * tall, 1.0);
  g.add(crown);

  const facePad = new Mesh(new SphereGeometry(r * 0.85, 12, 10), mat);
  // Lower + taller face plane so cheek/chin silhouette survives top-down iso.
  facePad.position.set(0, cy - 0.06 * tall, r * 0.5);
  facePad.scale.set(1.0, 1.2 * tall, 0.5);
  g.add(facePad);

  g.add(mesh(new SphereGeometry(r * 0.35, 8, 6), mat, -r * 0.78, cy + 0.02, 0.05));
  g.add(mesh(new SphereGeometry(r * 0.35, 8, 6), mat, r * 0.78, cy + 0.02, 0.05));

  // Jaw cheeks — dropped so the face isn't all forehead from above.
  g.add(
    mesh(new SphereGeometry(r * 0.42, 10, 8), mat, -r * 0.55, cy - 0.14 * tall, r * 0.42),
  );
  g.add(
    mesh(new SphereGeometry(r * 0.42, 10, 8), mat, r * 0.55, cy - 0.14 * tall, r * 0.42),
  );

  // Chin stack — longer + proud so it clears foreshortening at high elevation.
  g.add(
    mesh(new SphereGeometry(r * 0.38, 10, 8), mat, 0, cy - r * 0.95 * tall, r * 0.36),
  );
  g.add(
    mesh(new SphereGeometry(r * 0.3, 8, 6), mat, 0, cy - r * 1.22 * tall, r * 0.26),
  );
  g.add(
    mesh(new SphereGeometry(r * 0.2, 8, 6), mat, 0, cy - r * 1.38 * tall, r * 0.18),
  );

  g.add(mesh(new SphereGeometry(r * 0.5, 10, 8), mat, 0, cy + r * 0.24 * tall, r * 0.58));

  g.add(mesh(new SphereGeometry(r * 0.22, 8, 6), mat, -r * 1.05, cy - 0.02, 0));
  g.add(mesh(new SphereGeometry(r * 0.22, 8, 6), mat, r * 1.05, cy - 0.02, 0));

  g.add(
    mesh(
      new CylinderGeometry(r * 0.34, r * 0.48, 0.2, 10),
      mat,
      0,
      LAYOUT.shoulderY + 0.1,
      0.02,
    ),
  );
  return g;
}

/**
 * Face readability — SNES / anime SD eyes as flat *rects*, not ovals.
 *
 * Separate `eye-left` / `eye-right` groups. Sit flush with the face pad
 * (barely proud), spaced wide, with a thick brow bar. See faceCheat + SPIKE.
 */
export const FACE_READABILITY = {
  /** Sclera width / height / depth (rectangular anime eye). +20% vs prior. */
  eyeW: 0.18,
  eyeH: 0.132,
  eyeDepth: 0.026,
  /** Top tier slightly wider than bottom (classic anime eye). */
  eyeTopWiden: 1.12,
  /** Iris box size — fills most of the white. +20% vs prior. */
  irisW: 0.114,
  irisH: 0.094,
  /** Half-distance between eye centres — wider than the old oval pair. */
  eyeSpacing: 0.145,
  /**
   * World Z for the eye plate. Barely proud of the facePad front
   * (was skullR*0.92 ≈ flush / invisible; nudge out a hair).
   */
  eyeZ: CHIBI.skullR * 0.98,
  eyeLift: 0.01,
  /** Thick brow bar (width, height, depth). +20% vs prior. */
  browW: 0.204,
  browH: 0.046,
  browDepth: 0.024,
  mouthWidth: 0.07,
} as const;

/**
 * Separate left/right rectangular FF-style eyes + shared mouth/nose.
 * Per-eye visibility is applied later by `applySpriteFaceCheat`.
 */
export function generateFace(opts: {
  eyeColor?: string;
  nose?: boolean;
  skin: string;
}): Group {
  const g = new Group();
  g.name = "face";
  const t = FACE_READABILITY;
  const irisMat = toonDetail(opts.eyeColor ?? "#1a1c2c");
  const white = toon("#f7f4ec");
  const lid = toonDetail("#211a2c");
  const shine = toonDetail("#ffffff");
  const y = LAYOUT.headCenterY - 0.02 + t.eyeLift;
  const z = t.eyeZ;
  const ex = t.eyeSpacing;
  const d = t.eyeDepth;

  for (const s of [-1, 1] as const) {
    const eye = new Group();
    eye.name = s < 0 ? "eye-left" : "eye-right";
    eye.position.set(s * ex, y, z);
    eye.rotation.y = 0;

    // Bottom rect of the sclera.
    const botH = t.eyeH * 0.48;
    eye.add(
      mesh(new BoxGeometry(t.eyeW, botH, d), white, 0, -t.eyeH * 0.2, 0),
    );
    // Top rect — slightly wider (anime “larger at the top”).
    const topH = t.eyeH * 0.52;
    eye.add(
      mesh(
        new BoxGeometry(t.eyeW * t.eyeTopWiden, topH, d),
        white,
        0,
        t.eyeH * 0.18,
        0,
      ),
    );

    // Iris — flat dark rectangle, sits low in the white.
    eye.add(
      mesh(
        new BoxGeometry(t.irisW, t.irisH, d * 0.7),
        irisMat,
        0,
        -0.008,
        d * 0.15,
      ),
    );

    // Thick upper lid line under the brow.
    eye.add(
      mesh(
        new BoxGeometry(t.eyeW * t.eyeTopWiden * 1.02, 0.018, d * 0.8),
        lid,
        0,
        t.eyeH * 0.42,
        d * 0.1,
      ),
    );

    // Catchlight fleck.
    eye.add(
      mesh(
        new BoxGeometry(0.022, 0.022, d * 0.5),
        shine,
        -t.irisW * 0.22,
        t.irisH * 0.18,
        d * 0.35,
      ),
    );

    // Thick eyebrow bar — heavy anime brow, not a thin capsule slash.
    eye.add(
      mesh(
        new BoxGeometry(t.browW, t.browH, t.browDepth),
        lid,
        0,
        t.eyeH * 0.72,
        -0.002,
      ),
    );

    g.add(eye);
  }

  if (opts.nose) {
    g.add(
      mesh(new SphereGeometry(0.028, 8, 6), toon(opts.skin), 0, y - 0.12, z - 0.02),
    );
  }

  const mouth = new Mesh(new BoxGeometry(t.mouthWidth, 0.018, 0.016), lid);
  mouth.name = "mouth";
  mouth.position.set(0, y - 0.19, z - 0.03);
  g.add(mouth);

  return g;
}

/**
 * Shared scalp shell + bangs + side locks so hair always owns the silhouette.
 */
function addHairFrame(
  g: Group,
  mat: Material,
  hi: Material,
  opts: {
    shellR?: number;
    bangs?: boolean;
    sides?: boolean;
    back?: boolean;
    coverForehead?: boolean;
  } = {},
) {
  const cy = LAYOUT.headCenterY;
  const shellR = opts.shellR ?? 0.46;
  const bangs = opts.bangs !== false;
  const sides = opts.sides !== false;
  const back = opts.back !== false;
  const coverForehead = opts.coverForehead !== false;

  const cap = new Mesh(
    new SphereGeometry(shellR, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
    mat,
  );
  cap.position.set(0, cy + 0.08, -0.04);
  cap.scale.set(1.04, 1.02, 1.0);
  g.add(cap);

  g.add(mesh(new SphereGeometry(shellR * 0.38, 10, 8), hi, 0, cy + 0.22, -0.02));

  if (coverForehead || bangs) {
    g.add(mesh(new SphereGeometry(0.16, 10, 8), mat, -0.12, cy + 0.04, 0.34));
    g.add(mesh(new SphereGeometry(0.18, 10, 8), mat, 0.02, cy + 0.08, 0.36));
    g.add(mesh(new SphereGeometry(0.16, 10, 8), mat, 0.14, cy + 0.04, 0.34));
    g.add(mesh(new SphereGeometry(0.1, 8, 6), hi, 0, cy + 0.1, 0.35));
  }

  if (sides) {
    g.add(mesh(new SphereGeometry(0.16, 10, 8), mat, -0.4, cy - 0.02, 0.1));
    g.add(mesh(new SphereGeometry(0.16, 10, 8), mat, 0.4, cy - 0.02, 0.1));
    g.add(mesh(new SphereGeometry(0.13, 8, 6), mat, -0.36, cy - 0.14, 0.04));
    g.add(mesh(new SphereGeometry(0.13, 8, 6), mat, 0.36, cy - 0.14, 0.04));
  }

  if (back) {
    g.add(mesh(new SphereGeometry(0.22, 10, 8), mat, 0, cy - 0.04, -0.34));
  }
}

function addSpikeTuft(
  g: Group,
  mat: Material,
  hi: Material,
  x: number,
  y: number,
  z: number,
  h: number,
  leanX = 0,
  leanZ = 0,
) {
  const spike = new Mesh(new ConeGeometry(0.11, h, 5), mat);
  spike.position.set(x, y, z);
  spike.rotation.z = leanX;
  spike.rotation.x = leanZ;
  g.add(spike);
  g.add(mesh(new SphereGeometry(0.07, 6, 5), hi, x, y + h * 0.35, z));
}

/**
 * Hair owns silhouette — bowl/bangs/side mass + style-specific chunks.
 * Complexity (1–8) controls spike/volume count.
 */
export function generateHair(opts: {
  style: HairStyle;
  color: string;
  complexity?: number;
}): Group {
  const g = new Group();
  g.name = "hair";
  if (opts.style === "bald") return g;

  const mat = toon(opts.color);
  const hi = toon(lightenHex(opts.color, 0.4));
  const n = Math.max(1, Math.min(8, opts.complexity ?? 5));
  const top = LAYOUT.headTopY - 0.02;
  const cy = LAYOUT.headCenterY;

  if (opts.style === "bowl") {
    // Classic SNES bowl: deep helmet of hair, tiny face window
    addHairFrame(g, mat, hi, { shellR: 0.42, coverForehead: true });
    const deep = new Mesh(
      new SphereGeometry(0.48, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.72),
      mat,
    );
    deep.position.set(0, cy + 0.02, -0.02);
    g.add(deep);
    g.add(mesh(new SphereGeometry(0.16, 8, 6), mat, -0.36, cy - 0.18, 0.12));
    g.add(mesh(new SphereGeometry(0.16, 8, 6), mat, 0.36, cy - 0.18, 0.12));
  }

  if (opts.style === "bob") {
    addHairFrame(g, mat, hi, { shellR: 0.48 });
    g.add(mesh(new SphereGeometry(0.24, 10, 8), mat, -0.34, cy - 0.1, 0.06));
    g.add(mesh(new SphereGeometry(0.24, 10, 8), mat, 0.34, cy - 0.1, 0.06));
    g.add(mesh(new SphereGeometry(0.28, 10, 8), mat, 0, cy - 0.14, -0.32));
    g.add(mesh(new SphereGeometry(0.2, 8, 6), hi, -0.35, cy + 0.05, 0.2));
  }

  if (opts.style === "spiky") {
    // Zale / BoF warrior: jagged clumps break the sphere
    addHairFrame(g, mat, hi, { shellR: 0.44, bangs: true });
    for (let i = 0; i < n + 2; i++) {
      const t = (i / Math.max(n + 1, 1)) * 2 - 1;
      addSpikeTuft(
        g,
        mat,
        hi,
        t * 0.28,
        top + 0.02,
        -0.08 + (i % 3) * 0.1,
        0.32 + (i % 3) * 0.08,
        t * 0.25,
        -0.2 + (i % 2) * 0.15,
      );
    }
    // Forward fringe spikes over brow
    addSpikeTuft(g, mat, hi, -0.12, cy + 0.22, 0.32, 0.26, -0.2, 0.85);
    addSpikeTuft(g, mat, hi, 0.1, cy + 0.24, 0.34, 0.28, 0.15, 0.9);
  }

  if (opts.style === "mohawk") {
    addHairFrame(g, mat, hi, {
      shellR: 0.4,
      bangs: false,
      sides: false,
      coverForehead: false,
    });
    // Short temples so the ridge reads
    g.add(mesh(new SphereGeometry(0.2, 8, 6), mat, -0.35, cy + 0.05, 0));
    g.add(mesh(new SphereGeometry(0.2, 8, 6), mat, 0.35, cy + 0.05, 0));
    for (let i = 0; i < n + 1; i++) {
      addSpikeTuft(
        g,
        mat,
        hi,
        0,
        top - 0.02,
        -0.28 + i * 0.1,
        0.38 + (i % 2) * 0.06,
        0,
        0.15,
      );
    }
  }

  if (opts.style === "ponytail") {
    addHairFrame(g, mat, hi);
    const tail = new Mesh(new CapsuleGeometry(0.12, 0.48, 4, 8), mat);
    tail.position.set(0, cy - 0.22, -0.55);
    tail.rotation.x = 0.45;
    g.add(tail);
    g.add(mesh(new SphereGeometry(0.16, 8, 6), mat, 0, cy + 0.05, -0.48));
    g.add(mesh(new SphereGeometry(0.1, 6, 5), hi, 0, cy - 0.05, -0.58));
  }

  if (opts.style === "long") {
    addHairFrame(g, mat, hi, { shellR: 0.48 });
    for (const s of [-1, 1] as const) {
      const lock = new Mesh(new CapsuleGeometry(0.15, 0.55, 4, 8), mat);
      lock.position.set(s * 0.4, cy - 0.28, 0.05);
      lock.rotation.z = s * 0.12;
      g.add(lock);
    }
    const back = new Mesh(new CapsuleGeometry(0.2, 0.45, 4, 8), mat);
    back.position.set(0, cy - 0.3, -0.42);
    back.rotation.x = 0.4;
    g.add(back);
  }

  if (opts.style === "afro") {
    const R = 0.5 + n * 0.02;
    g.add(mesh(new SphereGeometry(R, 12, 10), mat, 0, cy + 0.12, -0.02));
    g.add(mesh(new SphereGeometry(R * 0.35, 8, 6), hi, -0.15, cy + 0.35, 0.15));
    // Still need bangs so forehead isn't bare skin
    g.add(mesh(new SphereGeometry(0.2, 8, 6), mat, -0.12, cy + 0.02, 0.45));
    g.add(mesh(new SphereGeometry(0.22, 8, 6), mat, 0.12, cy + 0.04, 0.46));
  }

  if (opts.style === "bun") {
    addHairFrame(g, mat, hi);
    g.add(mesh(new SphereGeometry(0.26, 10, 8), mat, 0, top + 0.08, -0.12));
    g.add(mesh(new SphereGeometry(0.12, 8, 6), hi, 0, top + 0.18, -0.08));
  }

  if (opts.style === "braid") {
    addHairFrame(g, mat, hi);
    for (let i = 0; i < 5; i++) {
      g.add(
        mesh(
          new SphereGeometry(0.11 - i * 0.01, 8, 6),
          i % 2 === 0 ? mat : hi,
          0.06 * (i % 2 === 0 ? 1 : -1),
          cy - 0.05 - i * 0.13,
          -0.48 - i * 0.04,
        ),
      );
    }
  }

  if (opts.style === "undercut") {
    // Top mass + short sides — still covers crown fully
    addHairFrame(g, mat, hi, {
      shellR: 0.42,
      sides: false,
      coverForehead: true,
    });
    g.add(mesh(new SphereGeometry(0.28, 10, 8), mat, 0, cy + 0.22, 0.12));
    for (let i = 0; i < n; i++) {
      const t = (i / Math.max(n - 1, 1)) * 2 - 1;
      addSpikeTuft(g, mat, hi, t * 0.18, top + 0.02, 0.05, 0.22, t * 0.2, 0.3);
    }
  }

  if (opts.style === "curls") {
    addHairFrame(g, mat, hi, { shellR: 0.45 });
    for (let i = 0; i < n + 4; i++) {
      const a = (i / (n + 4)) * Math.PI * 2;
      g.add(
        mesh(
          new SphereGeometry(0.15, 8, 6),
          i % 2 === 0 ? mat : hi,
          Math.cos(a) * 0.45,
          cy - 0.02 + (i % 3) * 0.07,
          Math.sin(a) * 0.42,
        ),
      );
    }
  }

  if (opts.style === "topknot") {
    addHairFrame(g, mat, hi, { shellR: 0.45 });
    g.add(mesh(new SphereGeometry(0.16, 8, 6), mat, 0, top + 0.04, 0));
    addSpikeTuft(g, mat, hi, 0, top + 0.12, 0, 0.28, 0, 0);
  }

  if (opts.style === "fringe") {
    addHairFrame(g, mat, hi, { shellR: 0.48, coverForehead: true });
    // Heavy Valere-style fringe slab
    g.add(mesh(new SphereGeometry(0.3, 12, 10), mat, 0, cy + 0.02, 0.34));
    g.add(mesh(new SphereGeometry(0.2, 8, 6), hi, -0.1, cy + 0.08, 0.48));
    g.add(
      mesh(new CapsuleGeometry(0.13, 0.3, 4, 8), mat, -0.4, cy - 0.12, 0.12),
    );
    g.add(
      mesh(new CapsuleGeometry(0.13, 0.3, 4, 8), mat, 0.4, cy - 0.12, 0.12),
    );
  }

  if (opts.style === "twinTails") {
    addHairFrame(g, mat, hi);
    for (const s of [-1, 1] as const) {
      g.add(mesh(new SphereGeometry(0.14, 8, 6), mat, s * 0.48, cy + 0.08, -0.08));
      const t = new Mesh(new CapsuleGeometry(0.1, 0.48, 4, 8), mat);
      t.position.set(s * 0.48, cy - 0.2, -0.12);
      t.rotation.z = s * 0.4;
      g.add(t);
      g.add(mesh(new SphereGeometry(0.08, 6, 5), hi, s * 0.5, cy - 0.35, -0.1));
    }
  }

  return g;
}

export function generateHelmet(opts: {
  style: "none" | "knight" | "cap" | "sciFi" | "hood";
  color: string;
  visor?: string;
}): Group {
  const g = new Group();
  g.name = "helmet";
  if (opts.style === "none") return g;
  const mat = toon(opts.color);
  const cy = LAYOUT.headCenterY;
  const top = LAYOUT.headTopY;

  if (opts.style === "knight") {
    const slit = toon(opts.visor ?? "#2a2e3a");
    const dome = new Mesh(
      new SphereGeometry(0.52, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
      mat,
    );
    dome.position.set(0, cy + 0.14, 0);
    g.add(dome);
    g.add(mesh(new CylinderGeometry(0.48, 0.52, 0.44, 12), mat, 0, cy + 0.02, 0.02));
    g.add(mesh(new CylinderGeometry(0.56, 0.48, 0.22, 12), mat, 0, cy - 0.28, 0.03));
    g.add(mesh(new CylinderGeometry(0.52, 0.52, 0.07, 12), mat, 0, cy + 0.14, 0.04));
    g.add(mesh(new BoxGeometry(0.55, 0.06, 0.1), slit, 0, cy + 0.07, 0.5));
    g.add(mesh(new BoxGeometry(0.3, 0.045, 0.08), slit, 0, cy - 0.06, 0.52));
    g.add(mesh(new BoxGeometry(0.055, 0.32, 0.09), mat, 0, cy + 0.01, 0.52));
    g.add(mesh(new BoxGeometry(0.05, 0.1, 0.28), mat, 0, top - 0.04, -0.02));
  }

  if (opts.style === "cap") {
    const brim = new Mesh(new CylinderGeometry(0.58, 0.58, 0.06, 12), mat);
    brim.position.set(0, top - 0.08, 0.12);
    g.add(brim);
    g.add(
      mesh(
        new SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
        mat,
        0,
        cy + 0.14,
        0,
      ),
    );
  }

  if (opts.style === "sciFi") {
    g.add(mesh(new SphereGeometry(0.56, 12, 10), mat, 0, cy + 0.1, 0));
    g.add(
      mesh(
        new BoxGeometry(0.78, 0.22, 0.15),
        toon(opts.visor ?? "#5ad4a0"),
        0,
        cy + 0.08,
        0.5,
      ),
    );
  }

  if (opts.style === "hood") {
    // Deep cowl framing the face like a sprite hood window
    g.add(mesh(new SphereGeometry(0.62, 12, 10), mat, 0, cy + 0.14, -0.1));
    g.add(mesh(new SphereGeometry(0.32, 10, 8), mat, -0.45, cy + 0.02, 0.18));
    g.add(mesh(new SphereGeometry(0.32, 10, 8), mat, 0.45, cy + 0.02, 0.18));
    g.add(mesh(new SphereGeometry(0.24, 8, 6), mat, -0.28, cy + 0.18, 0.32));
    g.add(mesh(new SphereGeometry(0.24, 8, 6), mat, 0.28, cy + 0.18, 0.32));
    const drape = new Mesh(new CapsuleGeometry(0.24, 0.28, 4, 8), mat);
    drape.position.set(0, cy - 0.18, -0.38);
    drape.rotation.x = 0.5;
    g.add(drape);
  }

  return g;
}

export function generateTorso(opts: {
  style: TorsoStyle;
  color: string;
  trim?: string;
  skin: string;
}): Group {
  const g = new Group();
  g.name = "torso";
  const midY = LAYOUT.hipY + CHIBI.torso * 0.5;
  const body = toon(opts.color);
  const trim = opts.trim ? toon(opts.trim) : null;
  const metal = toon(opts.trim ?? "#6a7484");
  const skin = toon(opts.skin);
  const w = CHIBI.hipWidth * 0.58;
  const d = CHIBI.torsoDepth * 0.55;
  const H = CHIBI.torso;
  const cy = LAYOUT.headCenterY;
  const sw = CHIBI.shoulderWidth * 0.5;

  // Soft hip volume tying legs into torso
  g.add(
    mesh(new SphereGeometry(w * 1.05, 10, 8), body, 0, LAYOUT.hipY + 0.06, 0),
  );

  // Shoulder pads on every body — sell width vs giant head
  const addShoulders = (mat = body, radius = 0.18) => {
    g.add(
      mesh(
        new SphereGeometry(radius, 10, 8),
        mat,
        -sw,
        LAYOUT.shoulderY - 0.02,
        0.02,
      ),
    );
    g.add(
      mesh(
        new SphereGeometry(radius, 10, 8),
        mat,
        sw,
        LAYOUT.shoulderY - 0.02,
        0.02,
      ),
    );
  };

  // Chest plate / pec volume for non-robe bodies
  const addChest = (mat = body) => {
    g.add(
      mesh(
        new SphereGeometry(w * 0.85, 10, 8),
        mat,
        0,
        midY + H * 0.12,
        d * 0.55,
      ),
    );
  };

  // Waist belt detail
  const addBelt = (mat = trim ?? metal) => {
    g.add(mesh(limbCylinder(w * 1.05, 0.07, 12), mat, 0, LAYOUT.hipY + 0.12, 0));
  };

  if (opts.style === "tank") {
    const r = w * 0.9;
    const core = new Mesh(
      new CapsuleGeometry(r, capsuleCylinderLength(r, H * 0.9), 4, 10),
      body,
    );
    core.position.set(0, midY, 0);
    g.add(core);
    addChest(skin);
    addShoulders(skin, 0.13);
    addBelt(metal);
  } else if (opts.style === "robe") {
    const r = w * 1.1;
    const robe = new Mesh(
      new CapsuleGeometry(r, capsuleCylinderLength(r, H * 1.05), 4, 10),
      body,
    );
    robe.position.set(0, midY - 0.02, 0);
    g.add(robe);
    addShoulders(body, 0.15);
    if (trim) {
      g.add(mesh(limbCylinder(r, 0.07, 12), trim, 0, LAYOUT.hipY + 0.08, 0));
      g.add(
        mesh(new SphereGeometry(0.08, 8, 6), trim, 0, midY + H * 0.2, d * 0.9),
      );
    }
  } else if (opts.style === "hoodedRobe") {
    const r = w * 1.15;
    const robe = new Mesh(
      new CapsuleGeometry(r, capsuleCylinderLength(r, H * 1.15), 4, 12),
      body,
    );
    robe.position.set(0, midY - 0.04, 0);
    g.add(robe);
    g.add(mesh(new SphereGeometry(0.52, 12, 10), body, 0, cy + 0.08, -0.1));
    g.add(mesh(new SphereGeometry(0.24, 10, 8), body, -0.36, cy - 0.02, 0.1));
    g.add(mesh(new SphereGeometry(0.24, 10, 8), body, 0.36, cy - 0.02, 0.1));
    const cape = new Mesh(new CapsuleGeometry(0.24, 0.5, 4, 8), body);
    cape.position.set(0, midY - 0.1, -0.38);
    cape.rotation.x = 0.35;
    g.add(cape);
    for (const s of [-1, 1] as const) {
      const sleeve = new Mesh(new CapsuleGeometry(0.14, 0.32, 4, 8), body);
      sleeve.position.set(s * 0.44, midY + 0.05, 0.05);
      sleeve.rotation.z = s * 0.55;
      g.add(sleeve);
    }
    if (trim) {
      g.add(
        mesh(limbCylinder(r * 1.02, 0.08, 12), trim, 0, LAYOUT.hipY + 0.1, 0),
      );
    }
  } else if (opts.style === "chestplate") {
    addShoulders(metal, 0.16);
    g.add(
      mesh(
        new BoxGeometry(CHIBI.hipWidth * 1.15, H * 0.95, CHIBI.torsoDepth),
        metal,
        0,
        midY,
        0,
      ),
    );
    g.add(
      mesh(
        new BoxGeometry(CHIBI.hipWidth * 1.0, H * 0.32, CHIBI.torsoDepth * 1.12),
        body,
        0,
        midY + H * 0.18,
        0.02,
      ),
    );
    g.add(
      mesh(
        new BoxGeometry(CHIBI.hipWidth * 0.88, H * 0.28, CHIBI.torsoDepth * 1.08),
        body,
        0,
        midY - H * 0.18,
        0.02,
      ),
    );
    addBelt(body);
  } else if (opts.style === "fullPlate") {
    g.add(
      mesh(
        new CylinderGeometry(0.2, 0.3, 0.12, 10),
        metal,
        0,
        LAYOUT.shoulderY - 0.02,
        0,
      ),
    );
    g.add(
      mesh(
        new BoxGeometry(CHIBI.hipWidth * 1.2, H * 0.55, CHIBI.torsoDepth * 1.15),
        body,
        0,
        midY + H * 0.12,
        0.03,
      ),
    );
    g.add(
      mesh(
        new BoxGeometry(CHIBI.hipWidth * 1.1, H * 0.35, CHIBI.torsoDepth * 1.05),
        metal,
        0,
        midY - H * 0.12,
        0.01,
      ),
    );
    for (const s of [-1, 0, 1] as const) {
      g.add(
        mesh(
          new BoxGeometry(0.18, 0.2, 0.1),
          body,
          s * 0.2,
          LAYOUT.hipY + 0.12,
          0.18,
        ),
      );
    }
    for (const s of [-1, 1] as const) {
      g.add(
        mesh(
          new SphereGeometry(0.18, 10, 8),
          body,
          s * (CHIBI.hipWidth * 0.7),
          LAYOUT.shoulderY - 0.02,
          0.02,
        ),
      );
      g.add(
        mesh(
          new BoxGeometry(0.2, 0.1, 0.26),
          metal,
          s * (CHIBI.hipWidth * 0.68),
          LAYOUT.shoulderY - 0.08,
          0.06,
        ),
      );
    }
    g.add(
      mesh(
        new BoxGeometry(CHIBI.hipWidth * 1.05, H * 0.7, 0.12),
        metal,
        0,
        midY,
        -0.2,
      ),
    );
  } else if (opts.style === "jacket") {
    const r = w * 1.08;
    const jacket = new Mesh(
      new CapsuleGeometry(r, capsuleCylinderLength(r, H), 4, 10),
      body,
    );
    jacket.position.set(0, midY, 0);
    g.add(jacket);
    addShoulders(body, 0.15);
    addChest(body);
    g.add(
      mesh(
        new SphereGeometry(0.14, 8, 6),
        body,
        -0.12,
        LAYOUT.shoulderY - 0.02,
        0.12,
      ),
    );
    g.add(
      mesh(
        new SphereGeometry(0.14, 8, 6),
        body,
        0.12,
        LAYOUT.shoulderY - 0.02,
        0.12,
      ),
    );
    if (trim) {
      g.add(
        mesh(
          new CapsuleGeometry(0.04, capsuleCylinderLength(0.04, H * 0.9), 3, 6),
          trim,
          0,
          midY,
          d * 0.95,
        ),
      );
      addBelt(trim);
    } else {
      addBelt();
    }
  } else {
    const r = w;
    const plain = new Mesh(
      new CapsuleGeometry(r, capsuleCylinderLength(r, H), 4, 10),
      body,
    );
    plain.position.set(0, midY, 0);
    g.add(plain);
    addShoulders(body, 0.13);
    addChest(body);
    addBelt();
  }

  return g;
}

/**
 * Mitten hand — palm blob + thumb nub. No fingers.
 * Origin at wrist; palm hangs below / slightly forward.
 */
export function generateHand(opts: {
  color: string;
  /** Mirror thumb to the outside for left (-1) / right (+1). */
  side?: 1 | -1;
}): Group {
  const g = new Group();
  g.name = "hand";
  const mat = toon(opts.color);
  const side = opts.side ?? 1;
  const s = CHIBI.handSize;

  // Palm / mitt body
  const palm = new Mesh(new SphereGeometry(s * 0.78, 10, 8), mat);
  palm.position.set(0, -s * 0.35, s * 0.15);
  palm.scale.set(1.05, 0.95, 1.25);
  g.add(palm);

  // Rounded mitt tip (no finger splits)
  g.add(mesh(new SphereGeometry(s * 0.55, 8, 6), mat, 0, -s * 0.7, s * 0.45));

  // Thumb nub — outside of mitt
  const thumb = new Mesh(new SphereGeometry(s * 0.38, 8, 6), mat);
  thumb.position.set(side * s * 0.7, -s * 0.25, s * 0.2);
  thumb.scale.set(0.85, 1.1, 1.15);
  g.add(thumb);

  return g;
}

/**
 * Chunky readable foot / boot — wide sole, fat toe, short ankle.
 * Origin at ankle; sole sits toward -Y / +Z.
 */
export function generateFoot(opts: {
  color: string;
}): Group {
  const g = new Group();
  g.name = "foot";
  const mat = toon(opts.color);
  const L = CHIBI.footLength;
  const W = CHIBI.footWidth;

  // Ankle cuff
  g.add(mesh(new SphereGeometry(W * 0.55, 10, 8), mat, 0, -W * 0.15, 0));

  // Fat boot body
  const body = new Mesh(new SphereGeometry(W * 0.7, 10, 8), mat);
  body.position.set(0, -W * 0.45, L * 0.15);
  body.scale.set(1.15, 0.85, 1.35);
  g.add(body);

  // Wide sole plate
  const sole = new Mesh(new BoxGeometry(W * 1.35, W * 0.28, L * 1.15), mat);
  sole.position.set(0, -W * 0.75, L * 0.22);
  g.add(sole);

  // Rounded toe bulb (reads as a big foot at 48px)
  g.add(mesh(new SphereGeometry(W * 0.55, 8, 6), mat, 0, -W * 0.55, L * 0.7));

  return g;
}

/** Soft hem under a short torso — skirt ring or front loincloth panel. */
export function generateHem(opts: {
  style: HemStyle;
  color: string;
}): Group {
  const g = new Group();
  g.name = "hem";
  if (opts.style === "none") return g;
  const mat = toon(opts.color);
  const y = LAYOUT.hipY + 0.02;
  const r = CHIBI.hipWidth * 0.55;

  if (opts.style === "skirt") {
    // Flared cone skirt (inverted) as a squat capsule / spheres ring
    const flare = new Mesh(
      new CylinderGeometry(r * 1.35, r * 0.95, 0.28, 12),
      mat,
    );
    flare.position.set(0, y - 0.08, 0);
    g.add(flare);
    for (const a of [0, 1, 2, 3, 4, 5] as const) {
      const t = (a / 6) * Math.PI * 2;
      g.add(
        mesh(
          new SphereGeometry(0.12, 8, 6),
          mat,
          Math.cos(t) * r * 1.15,
          y - 0.2,
          Math.sin(t) * r * 1.15,
        ),
      );
    }
  }

  if (opts.style === "loincloth") {
    // Belt + front / back flaps
    g.add(mesh(limbCylinder(r * 1.05, 0.07, 12), mat, 0, y + 0.04, 0));
    const front = new Mesh(new BoxGeometry(0.28, 0.32, 0.08), mat);
    front.position.set(0, y - 0.14, r * 0.85);
    g.add(front);
    const back = new Mesh(new BoxGeometry(0.24, 0.28, 0.08), mat);
    back.position.set(0, y - 0.12, -r * 0.8);
    g.add(back);
    g.add(mesh(new SphereGeometry(0.1, 8, 6), mat, 0, y - 0.28, r * 0.9));
  }

  return g;
}

/** Soft cape / cloak drape behind the short torso. */
export function generateCape(opts: {
  color: string;
}): Group {
  const g = new Group();
  g.name = "cape";
  const mat = toon(opts.color);
  const midY = LAYOUT.hipY + CHIBI.torso * 0.35;

  // Shoulder clasp / collar
  g.add(
    mesh(new SphereGeometry(0.14, 8, 6), mat, -0.16, LAYOUT.shoulderY - 0.02, -0.08),
  );
  g.add(
    mesh(new SphereGeometry(0.14, 8, 6), mat, 0.16, LAYOUT.shoulderY - 0.02, -0.08),
  );

  const drape = new Mesh(new CapsuleGeometry(0.26, 0.55, 4, 8), mat);
  drape.position.set(0, midY - 0.05, -0.38);
  drape.rotation.x = 0.45;
  g.add(drape);

  const tip = new Mesh(new SphereGeometry(0.18, 8, 6), mat);
  tip.position.set(0, LAYOUT.hipY - 0.08, -0.42);
  g.add(tip);

  return g;
}

export function generateArms(opts: {
  pose: ArmPose;
  skin: string;
  sleeveColor?: string;
  sleeveLength?: number;
  handColor?: string;
  /** Ipsilateral fighting lead — default right. */
  leadSide?: "left" | "right";
}): {
  root: Group;
  leftHand: Group;
  rightHand: Group;
} {
  const root = new Group();
  root.name = "arms";
  const skin = toon(opts.skin);
  const sleeve = toon(opts.sleeveColor ?? opts.skin);
  const handColor = opts.handColor ?? opts.skin;
  const thick = CHIBI.armThick;
  const total = CHIBI.armLength;
  const upperLen = total * 0.48;
  const foreLen = total * 0.42;
  const sleeveFrac = opts.sleeveLength ?? 0.7;
  const shoulderX = CHIBI.shoulderWidth * 0.48;
  const sy = LAYOUT.shoulderY - 0.02;
  const lead = opts.leadSide ?? "right";

  let leftHand!: Group;
  let rightHand!: Group;

  for (const side of [-1, 1] as const) {
    const joints = armJointsForPose(opts.pose, side, lead);

    const shoulder = new Group();
    shoulder.name = side > 0 ? "armRight" : "armLeft";
    shoulder.position.set(side * shoulderX, sy, 0.04);
    shoulder.rotation.set(joints.shoulder.x, joints.shoulder.y, joints.shoulder.z);

    // Fat deltoid
    shoulder.add(mesh(new SphereGeometry(thick * 0.85, 10, 8), sleeve, 0, 0, 0));

    const upperSleeve = Math.min(1, sleeveFrac / 0.48);
    if (upperSleeve > 0.08) {
      const h = upperLen * Math.min(1, upperSleeve);
      shoulder.add(mesh(limbCylinder(thick * 0.78, h), sleeve, 0, -h * 0.5, 0));
      if (h < upperLen - 0.02) {
        const bare = upperLen - h;
        shoulder.add(
          mesh(limbCylinder(thick * 0.72, bare), skin, 0, -h - bare * 0.5, 0),
        );
      }
    } else {
      shoulder.add(
        mesh(limbCylinder(thick * 0.75, upperLen), skin, 0, -upperLen * 0.5, 0),
      );
    }

    const elbow = new Group();
    elbow.name = "elbow";
    elbow.position.set(0, -upperLen, 0);
    elbow.rotation.x = joints.elbow;
    elbow.add(
      mesh(
        new SphereGeometry(thick * 0.72, 10, 8),
        sleeveFrac > 0.45 ? sleeve : skin,
        0,
        0,
        0,
      ),
    );
    // Elbow pad for silhouette definition
    elbow.add(
      mesh(
        new SphereGeometry(thick * 0.38, 8, 6),
        sleeveFrac > 0.45 ? sleeve : skin,
        0,
        -0.02,
        thick * 0.35,
      ),
    );

    const foreCovered = Math.max(0, sleeveFrac - 0.48) / 0.48;
    if (foreCovered > 0.08) {
      const h = foreLen * Math.min(1, foreCovered);
      elbow.add(mesh(limbCylinder(thick * 0.7, h), sleeve, 0, -h * 0.5, 0));
      if (h < foreLen - 0.02) {
        const bare = foreLen - h;
        elbow.add(
          mesh(limbCylinder(thick * 0.65, bare), skin, 0, -h - bare * 0.5, 0),
        );
      }
    } else {
      elbow.add(
        mesh(limbCylinder(thick * 0.68, foreLen), skin, 0, -foreLen * 0.5, 0),
      );
    }

    const hand = generateHand({ color: handColor, side });
    hand.position.set(0, -foreLen, 0);
    if (joints.wrist) {
      hand.rotation.set(
        joints.wrist.x ?? 0,
        joints.wrist.y ?? 0,
        joints.wrist.z ?? 0,
      );
    }

    elbow.add(hand);
    shoulder.add(elbow);
    root.add(shoulder);

    if (side > 0) rightHand = hand;
    else leftHand = hand;
  }

  return { root, leftHand, rightHand };
}

export function generateLegs(opts: {
  pose: LegPose;
  pantColor: string;
  bootColor: string;
  /** Ipsilateral fighting lead — default right. */
  leadSide?: "left" | "right";
}): Group {
  const g = new Group();
  g.name = "legs";
  const pant = toon(opts.pantColor);
  const thick = CHIBI.legThick;
  const total = CHIBI.legs;
  const thighLen = total * 0.42;
  const shinLen = total * 0.36;
  // Wide hip sockets so planted feet clear the torso at 42–48px iso.
  const hipX = CHIBI.hipWidth * 0.52;
  const lead = opts.leadSide ?? "right";

  for (const side of [-1, 1] as const) {
    const joints = legJointsForPose(opts.pose, side, lead);

    const hip = new Group();
    hip.name = side > 0 ? "legRight" : "legLeft";
    hip.position.set(side * hipX, LAYOUT.hipY + (joints.hipY ?? 0), 0);
    hip.rotation.set(joints.hip.x, joints.hip.y, joints.hip.z);

    // Chubby thigh root
    hip.add(mesh(new SphereGeometry(thick * 0.72, 10, 8), pant, 0, 0, 0));
    hip.add(
      mesh(limbCylinder(thick * 0.78, thighLen), pant, 0, -thighLen * 0.5, 0),
    );

    const knee = new Group();
    knee.name = "knee";
    knee.position.set(0, -thighLen, 0);
    knee.rotation.x = joints.knee;
    knee.add(mesh(new SphereGeometry(thick * 0.65, 10, 8), pant, 0, 0, 0));
    // Knee pad
    knee.add(
      mesh(new SphereGeometry(thick * 0.35, 8, 6), pant, 0, -0.02, thick * 0.32),
    );
    knee.add(
      mesh(limbCylinder(thick * 0.72, shinLen), pant, 0, -shinLen * 0.5, 0),
    );

    const foot = generateFoot({ color: opts.bootColor });
    foot.position.set(0, -shinLen, 0);
    if (joints.foot) {
      foot.rotation.set(
        joints.foot.x ?? 0,
        joints.foot.y ?? 0,
        joints.foot.z ?? 0,
      );
    }

    knee.add(foot);
    hip.add(knee);
    g.add(hip);
  }

  return g;
}

/**
 * Weapon readability tuning — chunkier silhouettes + accent sizes so held
 * props read clearly against the hand/sleeve after bake + NN downscale.
 * See docs/SPIKE-feature-readability.md for before/after context.
 */
export const WEAPON_READABILITY = {
  /**
   * Sword blade radius — was 0.035. Kept as a radially-symmetric cylinder
   * (not a flat box): a thin flat blade can rotate edge-on to the camera
   * under some arm poses and shrink to a sub-pixel sliver. A fat hex-profile
   * cylinder guarantees a chunky silhouette from every rotation.
   */
  swordBladeR: 0.075,
  swordBladeLength: 0.42,
  /** Crossguard — was a 0.1-radius cylinder disc; now a wide flat box. */
  swordGuardWidth: 0.3,
  /** Staff orb — was 0.12. */
  staffOrbR: 0.17,
  /** Rifle barrel — was 0.05. */
  rifleBarrelR: 0.075,
  /** Shield face disc — was 0.3. */
  shieldDiscR: 0.36,
  /** Shield boss (center stud) — was 0.07. */
  shieldBossR: 0.1,
} as const;

/**
 * Held props in hand-local space: grip at origin.
 * Parent into the hand Group from generateArms so they track every pose.
 *
 * All parts use `toonDetail` (not `toon`) so dark accent colors stay near-black
 * instead of being lifted for large-surface readability — weapons are small
 * enough that crushing contrast toward the hand/sleeve matters more than
 * avoiding a "black blob" on a big torso panel.
 */
export function generateWeapon(opts: {
  type: WeaponType;
  color: string;
  /** Which hand holds the prop — mirrors lateral shield offsets. */
  hand?: "left" | "right";
}): Group {
  const g = new Group();
  g.name = "weapon";
  if (opts.type === "none") return g;
  const mat = toonDetail(opts.color);
  const accent = lightenHex(opts.color, 0.35);
  const t = WEAPON_READABILITY;
  /** +1 right hand (default), −1 left — lateral prop offsets. */
  const hx = opts.hand === "left" ? -1 : 1;

  if (opts.type === "sword") {
    // Grip + pommel — dark leather/metal, independent of blade color.
    // Blade along +Y extends the lead-hand silhouette past the mitt.
    g.add(mesh(limbCylinder(0.05, 0.16), toonDetail("#4a3626"), 0, -0.03, 0.05));
    g.add(mesh(new SphereGeometry(0.045, 8, 6), toonDetail("#2a1c14"), 0, -0.13, 0.05));
    // Flat crossguard — a hard box silhouette break, brighter than the grip
    // so the hand→weapon transition reads even before the blade starts.
    g.add(
      mesh(
        new BoxGeometry(t.swordGuardWidth, 0.06, 0.1),
        toonDetail("#eef2f5"),
        0,
        0.1,
        0.05,
      ),
    );
    // Fat hex-profile blade — radially symmetric so it reads as a chunky
    // silhouette from any hand/wrist rotation instead of only face-on.
    const blade = new Mesh(
      new CylinderGeometry(t.swordBladeR, t.swordBladeR * 0.85, t.swordBladeLength, 6),
      mat,
    );
    blade.position.set(0, 0.1 + 0.03 + t.swordBladeLength * 0.5, 0.05);
    g.add(blade);
    const tipY = 0.1 + 0.03 + t.swordBladeLength;
    const tip = new Mesh(new ConeGeometry(t.swordBladeR * 0.85, 0.12, 6), mat);
    tip.position.set(0, tipY + 0.06, 0.05);
    g.add(tip);
  } else if (opts.type === "staff") {
    g.add(mesh(limbCylinder(0.05, 0.8), mat, 0, 0.1, 0.05));
    // Claw prongs cradling the orb — extra silhouette beyond the mitt so
    // the staff head doesn't collapse into a plain stick + ball.
    for (const s of [-1, 1] as const) {
      const prong = new Mesh(new ConeGeometry(0.035, 0.16, 5), toonDetail(accent));
      prong.position.set(s * 0.08, 0.56, 0.05);
      prong.rotation.z = s * 0.5;
      g.add(prong);
    }
    // Pale crystal orb — near-white so it pops against any staff/shaft color.
    g.add(mesh(new SphereGeometry(t.staffOrbR, 10, 8), toonDetail("#f5f8ff"), 0, 0.68, 0.05));
  } else if (opts.type === "rifle") {
    const barrel = new Mesh(limbCylinder(t.rifleBarrelR, 0.6), mat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, 0.32);
    g.add(barrel);
    // Chunky receiver body behind the barrel.
    g.add(mesh(new BoxGeometry(0.15, 0.19, 0.24), mat, 0, -0.02, 0.04));
    // Stock — extends back past the mitt so the rifle silhouette reads long.
    g.add(mesh(new BoxGeometry(0.09, 0.12, 0.24), mat, 0, -0.05, -0.18));
    // Near-black sight + magazine accents break up the value against a
    // light-colored gun body.
    g.add(mesh(new BoxGeometry(0.032, 0.06, 0.032), toonDetail("#14151f"), 0, 0.12, 0.61));
    g.add(mesh(new BoxGeometry(0.065, 0.17, 0.055), toonDetail("#14151f"), 0, -0.17, 0.15));
  } else if (opts.type === "shield") {
    // Nest shield slightly outboard of the trail mitt (mirrored per hand).
    const disc = new Mesh(
      new CylinderGeometry(t.shieldDiscR, t.shieldDiscR, 0.08, 14),
      mat,
    );
    disc.rotation.z = Math.PI / 2;
    disc.position.set(hx * 0.1, 0.02, 0.06);
    g.add(disc);
    // Dark rim band behind the face — two-tone silhouette read at a glance.
    const rim = new Mesh(
      new CylinderGeometry(t.shieldDiscR * 1.1, t.shieldDiscR * 1.1, 0.03, 14),
      toonDetail("#2a2035"),
    );
    rim.rotation.z = Math.PI / 2;
    rim.position.set(hx * 0.085, 0.02, 0.06);
    g.add(rim);
    // Big bright boss so the shield reads distinctly from a plain disc.
    g.add(
      mesh(
        new SphereGeometry(t.shieldBossR, 8, 6),
        toonDetail("#eef2f5"),
        hx * 0.14,
        0.02,
        0.06,
      ),
    );
  }
  return g;
}

