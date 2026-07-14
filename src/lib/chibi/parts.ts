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
import { toon } from "./materials";
import { capsuleCylinderLength, CHIBI, HEAD, LAYOUT } from "./units";
import { armJointsForPose } from "./armPoses";
import { legJointsForPose } from "./legPoses";
import type { ArmPose, HairStyle, LegPose, TorsoStyle, WeaponType } from "./types";

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
 * JRPG egg head (BoF / Lufia / Sea of Stars): not a bald ball —
 * taller skull, flatter face plane, soft jaw, short neck.
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
  // Slightly smaller than hair shell so hair always reads outside the skull.
  const r = HEAD * 0.4 * s;

  const skull = new Mesh(new SphereGeometry(r, 14, 12), mat);
  skull.position.set(0, cy + 0.04, -0.02);
  skull.scale.set(0.94, 1.12, 0.88);
  g.add(skull);

  // Flattened face pad — readable front like pixel face windows.
  const facePad = new Mesh(new SphereGeometry(r * 0.78, 12, 10), mat);
  facePad.position.set(0, cy - 0.02, r * 0.42);
  facePad.scale.set(1.05, 1.05, 0.55);
  g.add(facePad);

  // Cheeks
  g.add(
    mesh(
      new SphereGeometry(r * 0.42, 10, 8),
      mat,
      -r * 0.58,
      cy - 0.08,
      r * 0.38,
    ),
  );
  g.add(
    mesh(
      new SphereGeometry(r * 0.42, 10, 8),
      mat,
      r * 0.58,
      cy - 0.08,
      r * 0.38,
    ),
  );
  // Soft jaw / chin taper (heart / egg silhouette)
  g.add(
    mesh(
      new SphereGeometry(r * 0.4, 10, 8),
      mat,
      0,
      cy - r * 0.72,
      r * 0.22,
    ),
  );
  // Brow shelf — casts forehead shadow like sprite shading
  g.add(
    mesh(
      new SphereGeometry(r * 0.55, 10, 8),
      mat,
      0,
      cy + r * 0.28,
      r * 0.55,
    ),
  );
  // Ears (often half-covered by hair/locks)
  g.add(mesh(new SphereGeometry(r * 0.2, 8, 6), mat, -r * 0.98, cy, 0.02));
  g.add(mesh(new SphereGeometry(r * 0.2, 8, 6), mat, r * 0.98, cy, 0.02));
  // Neck stub
  g.add(
    mesh(
      new CylinderGeometry(r * 0.32, r * 0.42, 0.16, 10),
      mat,
      0,
      LAYOUT.shoulderY + 0.07,
      0.02,
    ),
  );
  return g;
}

/**
 * Large low-set JRPG eyes with sclera + iris (+ optional nose / mouth).
 */
export function generateFace(opts: {
  eyeColor?: string;
  nose?: boolean;
  skin: string;
}): Group {
  const g = new Group();
  g.name = "face";
  const iris = toon(opts.eyeColor ?? "#1a1c2c");
  const white = toon("#f2efe6");
  const lid = toon("#2a2035");
  // Eyes sit in the lower face window under bangs (Sea of Stars / Lufia read).
  const y = LAYOUT.headCenterY - 0.02;
  const z = HEAD * 0.38;
  const ex = 0.125;

  for (const s of [-1, 1] as const) {
    g.add(mesh(new SphereGeometry(0.078, 10, 8), white, s * ex, y, z));
    g.add(mesh(new SphereGeometry(0.048, 8, 6), iris, s * ex, y - 0.005, z + 0.04));
    // Thick upper lid — classic anime-pixel cue
    const brow = new Mesh(new CapsuleGeometry(0.025, 0.1, 3, 6), lid);
    brow.position.set(s * ex, y + 0.07, z + 0.02);
    brow.rotation.z = s * 0.15;
    brow.rotation.x = -0.35;
    g.add(brow);
  }

  if (opts.nose) {
    g.add(
      mesh(
        new SphereGeometry(0.04, 8, 6),
        toon(opts.skin),
        0,
        y - 0.09,
        z + 0.06,
      ),
    );
  }
  // Tiny mouth dash
  g.add(mesh(new SphereGeometry(0.028, 6, 5), lid, 0, y - 0.18, z + 0.02));
  return g;
}

/**
 * Shared scalp shell + bangs + side locks so hair always owns the silhouette.
 * SNES / Sea of Stars heads read as hair first, face window second.
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
  const shellR = opts.shellR ?? 0.56;
  const bangs = opts.bangs !== false;
  const sides = opts.sides !== false;
  const back = opts.back !== false;
  const coverForehead = opts.coverForehead !== false;

  // Skull-covering bowl (larger than head mesh)
  const cap = new Mesh(
    new SphereGeometry(shellR, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
    mat,
  );
  cap.position.set(0, cy + 0.1, -0.04);
  cap.scale.set(1.05, 1.05, 1.02);
  g.add(cap);

  // Shine ridge on crown (pixel hair highlight analog)
  g.add(mesh(new SphereGeometry(shellR * 0.42, 10, 8), hi, 0, cy + 0.28, -0.02));

  if (coverForehead || bangs) {
    // Chunked bangs overhanging the face window
    g.add(mesh(new SphereGeometry(0.22, 10, 8), mat, -0.16, cy + 0.06, 0.4));
    g.add(mesh(new SphereGeometry(0.24, 10, 8), mat, 0.02, cy + 0.1, 0.44));
    g.add(mesh(new SphereGeometry(0.22, 10, 8), mat, 0.18, cy + 0.05, 0.4));
    g.add(mesh(new SphereGeometry(0.14, 8, 6), hi, 0, cy + 0.14, 0.42));
  }

  if (sides) {
    // Side locks covering temples / ears — widen silhouette
    g.add(mesh(new SphereGeometry(0.22, 10, 8), mat, -0.48, cy - 0.02, 0.12));
    g.add(mesh(new SphereGeometry(0.22, 10, 8), mat, 0.48, cy - 0.02, 0.12));
    g.add(mesh(new SphereGeometry(0.18, 8, 6), mat, -0.44, cy - 0.18, 0.05));
    g.add(mesh(new SphereGeometry(0.18, 8, 6), mat, 0.44, cy - 0.18, 0.05));
  }

  if (back) {
    g.add(mesh(new SphereGeometry(0.28, 10, 8), mat, 0, cy - 0.05, -0.42));
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
    addHairFrame(g, mat, hi, { shellR: 0.6, coverForehead: true });
    const deep = new Mesh(
      new SphereGeometry(0.58, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.72),
      mat,
    );
    deep.position.set(0, cy + 0.02, -0.02);
    g.add(deep);
    g.add(mesh(new SphereGeometry(0.2, 8, 6), mat, -0.42, cy - 0.22, 0.15));
    g.add(mesh(new SphereGeometry(0.2, 8, 6), mat, 0.42, cy - 0.22, 0.15));
  }

  if (opts.style === "bob") {
    addHairFrame(g, mat, hi, { shellR: 0.58 });
    g.add(mesh(new SphereGeometry(0.32, 10, 8), mat, -0.42, cy - 0.12, 0.08));
    g.add(mesh(new SphereGeometry(0.32, 10, 8), mat, 0.42, cy - 0.12, 0.08));
    g.add(mesh(new SphereGeometry(0.36, 10, 8), mat, 0, cy - 0.18, -0.4));
    g.add(mesh(new SphereGeometry(0.2, 8, 6), hi, -0.35, cy + 0.05, 0.2));
  }

  if (opts.style === "spiky") {
    // Zale / BoF warrior: jagged clumps break the sphere
    addHairFrame(g, mat, hi, { shellR: 0.52, bangs: true });
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
      shellR: 0.48,
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
    addHairFrame(g, mat, hi, { shellR: 0.58 });
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
    const R = 0.62 + n * 0.025;
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
      shellR: 0.5,
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
    addHairFrame(g, mat, hi, { shellR: 0.54 });
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
    addHairFrame(g, mat, hi, { shellR: 0.54 });
    g.add(mesh(new SphereGeometry(0.16, 8, 6), mat, 0, top + 0.04, 0));
    addSpikeTuft(g, mat, hi, 0, top + 0.12, 0, 0.28, 0, 0);
  }

  if (opts.style === "fringe") {
    addHairFrame(g, mat, hi, { shellR: 0.58, coverForehead: true });
    // Heavy Valere-style fringe slab
    g.add(mesh(new SphereGeometry(0.38, 12, 10), mat, 0, cy + 0.02, 0.42));
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
  const w = CHIBI.hipWidth * 0.52;
  const d = CHIBI.torsoDepth * 0.55;
  const H = CHIBI.torso;
  const cy = LAYOUT.headCenterY;

  // Soft hip volume tying legs into torso (cohesion)
  g.add(
    mesh(
      new SphereGeometry(w * 0.95, 10, 8),
      body,
      0,
      LAYOUT.hipY + 0.06,
      0,
    ),
  );

  if (opts.style === "tank") {
    const r = w * 0.9;
    const core = new Mesh(
      new CapsuleGeometry(r, capsuleCylinderLength(r, H * 0.9), 4, 10),
      body,
    );
    core.position.set(0, midY, 0);
    g.add(core);
    g.add(
      mesh(
        new SphereGeometry(0.15, 8, 6),
        toon(opts.skin),
        -w * 1.05,
        LAYOUT.shoulderY - 0.04,
        0,
      ),
    );
    g.add(
      mesh(
        new SphereGeometry(0.15, 8, 6),
        toon(opts.skin),
        w * 1.05,
        LAYOUT.shoulderY - 0.04,
        0,
      ),
    );
  } else if (opts.style === "robe") {
    const r = w * 1.1;
    const robe = new Mesh(
      new CapsuleGeometry(r, capsuleCylinderLength(r, H * 1.05), 4, 10),
      body,
    );
    robe.position.set(0, midY - 0.02, 0);
    g.add(robe);
    if (trim) {
      g.add(mesh(limbCylinder(r, 0.07, 12), trim, 0, LAYOUT.hipY + 0.08, 0));
    }
  } else if (opts.style === "hoodedRobe") {
    const r = w * 1.15;
    const robe = new Mesh(
      new CapsuleGeometry(r, capsuleCylinderLength(r, H * 1.15), 4, 12),
      body,
    );
    robe.position.set(0, midY - 0.04, 0);
    g.add(robe);
    // Deep hood
    g.add(mesh(new SphereGeometry(0.62, 12, 10), body, 0, cy + 0.1, -0.12));
    g.add(mesh(new SphereGeometry(0.3, 10, 8), body, -0.42, cy - 0.02, 0.12));
    g.add(mesh(new SphereGeometry(0.3, 10, 8), body, 0.42, cy - 0.02, 0.12));
    const cape = new Mesh(new CapsuleGeometry(0.28, 0.55, 4, 8), body);
    cape.position.set(0, midY - 0.1, -0.42);
    cape.rotation.x = 0.35;
    g.add(cape);
    // Bell sleeves resting at sides
    for (const s of [-1, 1] as const) {
      const sleeve = new Mesh(new CapsuleGeometry(0.16, 0.35, 4, 8), body);
      sleeve.position.set(s * 0.48, midY + 0.05, 0.05);
      sleeve.rotation.z = s * 0.55;
      g.add(sleeve);
    }
    if (trim) {
      g.add(mesh(limbCylinder(r * 1.02, 0.08, 12), trim, 0, LAYOUT.hipY + 0.1, 0));
    }
  } else if (opts.style === "chestplate") {
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
  } else if (opts.style === "fullPlate") {
    // Gorget
    g.add(
      mesh(
        new CylinderGeometry(0.22, 0.32, 0.12, 10),
        metal,
        0,
        LAYOUT.shoulderY - 0.02,
        0,
      ),
    );
    // Breastplate stack
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
    // Faulds / skirt plates
    for (const s of [-1, 0, 1] as const) {
      g.add(
        mesh(
          new BoxGeometry(0.2, 0.22, 0.12),
          body,
          s * 0.22,
          LAYOUT.hipY + 0.12,
          0.2,
        ),
      );
    }
    // Pauldrons
    for (const s of [-1, 1] as const) {
      g.add(
        mesh(
          new SphereGeometry(0.2, 10, 8),
          body,
          s * (CHIBI.hipWidth * 0.72),
          LAYOUT.shoulderY - 0.02,
          0.02,
        ),
      );
      g.add(
        mesh(
          new BoxGeometry(0.22, 0.12, 0.28),
          metal,
          s * (CHIBI.hipWidth * 0.7),
          LAYOUT.shoulderY - 0.08,
          0.06,
        ),
      );
    }
    // Back plate
    g.add(
      mesh(
        new BoxGeometry(CHIBI.hipWidth * 1.05, H * 0.7, 0.12),
        metal,
        0,
        midY,
        -0.22,
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
    // Collar
    g.add(
      mesh(
        new SphereGeometry(0.16, 8, 6),
        body,
        -0.14,
        LAYOUT.shoulderY - 0.02,
        0.12,
      ),
    );
    g.add(
      mesh(
        new SphereGeometry(0.16, 8, 6),
        body,
        0.14,
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
    }
  } else {
    const r = w;
    const plain = new Mesh(
      new CapsuleGeometry(r, capsuleCylinderLength(r, H), 4, 10),
      body,
    );
    plain.position.set(0, midY, 0);
    g.add(plain);
  }

  return g;
}

export function generateArms(opts: {
  pose: ArmPose;
  skin: string;
  sleeveColor?: string;
  sleeveLength?: number;
  handColor?: string;
}): {
  root: Group;
  leftHand: Group;
  rightHand: Group;
} {
  const root = new Group();
  root.name = "arms";
  const skin = toon(opts.skin);
  const sleeve = toon(opts.sleeveColor ?? opts.skin);
  const handMat = toon(opts.handColor ?? opts.skin);
  const thick = CHIBI.armThick;
  const total = CHIBI.armLength;
  const upperLen = total * 0.48;
  const foreLen = total * 0.48;
  const sleeveFrac = opts.sleeveLength ?? 0.7;
  const shoulderX = CHIBI.hipWidth * 0.58;
  const sy = LAYOUT.shoulderY - 0.02;

  let leftHand!: Group;
  let rightHand!: Group;

  for (const side of [-1, 1] as const) {
    const joints = armJointsForPose(opts.pose, side);

    const shoulder = new Group();
    shoulder.name = side > 0 ? "armRight" : "armLeft";
    shoulder.position.set(side * shoulderX, sy, 0.04);
    shoulder.rotation.set(joints.shoulder.x, joints.shoulder.y, joints.shoulder.z);

    shoulder.add(mesh(new SphereGeometry(thick * 0.72, 10, 8), sleeve, 0, 0, 0));

    const upperSleeve = Math.min(1, sleeveFrac / 0.48);
    if (upperSleeve > 0.08) {
      const h = upperLen * Math.min(1, upperSleeve);
      shoulder.add(mesh(limbCylinder(thick * 0.55, h), sleeve, 0, -h * 0.5, 0));
      if (h < upperLen - 0.02) {
        const bare = upperLen - h;
        shoulder.add(
          mesh(limbCylinder(thick * 0.48, bare), skin, 0, -h - bare * 0.5, 0),
        );
      }
    } else {
      shoulder.add(mesh(limbCylinder(thick * 0.5, upperLen), skin, 0, -upperLen * 0.5, 0));
    }

    const elbow = new Group();
    elbow.name = "elbow";
    elbow.position.set(0, -upperLen, 0);
    elbow.rotation.x = joints.elbow;
    elbow.add(
      mesh(
        new SphereGeometry(thick * 0.58, 10, 8),
        sleeveFrac > 0.45 ? sleeve : skin,
        0,
        0,
        0,
      ),
    );

    const foreCovered = Math.max(0, sleeveFrac - 0.48) / 0.48;
    if (foreCovered > 0.08) {
      const h = foreLen * Math.min(1, foreCovered);
      elbow.add(mesh(limbCylinder(thick * 0.48, h), sleeve, 0, -h * 0.5, 0));
      if (h < foreLen - 0.02) {
        const bare = foreLen - h;
        elbow.add(
          mesh(limbCylinder(thick * 0.42, bare), skin, 0, -h - bare * 0.5, 0),
        );
      }
    } else {
      elbow.add(mesh(limbCylinder(thick * 0.44, foreLen), skin, 0, -foreLen * 0.5, 0));
    }

    const hand = new Group();
    hand.name = "hand";
    hand.position.set(0, -foreLen, 0);
    if (joints.wrist) {
      hand.rotation.set(
        joints.wrist.x ?? 0,
        joints.wrist.y ?? 0,
        joints.wrist.z ?? 0,
      );
    }
    hand.add(mesh(new SphereGeometry(thick * 0.62, 10, 8), handMat, 0, 0, 0));

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
}): Group {
  const g = new Group();
  g.name = "legs";
  const pant = toon(opts.pantColor);
  const boot = toon(opts.bootColor);
  const thick = CHIBI.legThick;
  const total = CHIBI.legs;
  const thighLen = total * 0.48;
  const shinLen = total * 0.42;
  const hipX = CHIBI.hipWidth * 0.32;

  for (const side of [-1, 1] as const) {
    const joints = legJointsForPose(opts.pose, side);

    const hip = new Group();
    hip.name = side > 0 ? "legRight" : "legLeft";
    hip.position.set(side * hipX, LAYOUT.hipY + (joints.hipY ?? 0), 0);
    hip.rotation.set(joints.hip.x, joints.hip.y, joints.hip.z);

    hip.add(mesh(new SphereGeometry(thick * 0.55, 10, 8), pant, 0, 0, 0));
    hip.add(mesh(limbCylinder(thick * 0.55, thighLen), pant, 0, -thighLen * 0.5, 0));

    const knee = new Group();
    knee.name = "knee";
    knee.position.set(0, -thighLen, 0);
    knee.rotation.x = joints.knee;
    knee.add(mesh(new SphereGeometry(thick * 0.5, 10, 8), pant, 0, 0, 0));
    knee.add(mesh(limbCylinder(thick * 0.48, shinLen), pant, 0, -shinLen * 0.5, 0));

    const foot = new Group();
    foot.name = "foot";
    foot.position.set(0, -shinLen, 0);
    if (joints.foot) {
      foot.rotation.set(
        joints.foot.x ?? 0,
        joints.foot.y ?? 0,
        joints.foot.z ?? 0,
      );
    }
    const bootH = total * 0.22;
    foot.add(
      mesh(
        new CylinderGeometry(thick * 0.48, thick * 0.58, bootH, 8),
        boot,
        0,
        -bootH * 0.35,
        0.02,
      ),
    );
    foot.add(
      mesh(
        new SphereGeometry(thick * 0.42, 8, 6),
        boot,
        0,
        -bootH * 0.55,
        thick * 0.4,
      ),
    );

    knee.add(foot);
    hip.add(knee);
    g.add(hip);
  }

  return g;
}

/**
 * Held props in hand-local space: grip at origin.
 * Parent into the hand Group from generateArms so they track every pose.
 */
export function generateWeapon(opts: {
  type: WeaponType;
  color: string;
}): Group {
  const g = new Group();
  g.name = "weapon";
  if (opts.type === "none") return g;
  const mat = toon(opts.color);

  if (opts.type === "sword") {
    g.add(mesh(limbCylinder(0.035, 0.18), toon("#5a4030"), 0, 0.02, 0));
    g.add(mesh(limbCylinder(0.09, 0.05), toon("#c7cfcc"), 0, 0.12, 0));
    g.add(mesh(limbCylinder(0.03, 0.5), mat, 0, 0.4, 0));
  } else if (opts.type === "staff") {
    g.add(mesh(limbCylinder(0.032, 0.95), mat, 0, 0.15, 0));
    g.add(mesh(new SphereGeometry(0.11, 8, 6), toon("#f5e07a"), 0, 0.7, 0));
  } else if (opts.type === "rifle") {
    const barrel = new Mesh(limbCylinder(0.045, 0.65), mat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.28);
    g.add(barrel);
    g.add(mesh(new BoxGeometry(0.07, 0.16, 0.12), mat, 0, -0.06, 0.05));
  } else if (opts.type === "shield") {
    const disc = new Mesh(new CylinderGeometry(0.28, 0.28, 0.06, 12), mat);
    disc.rotation.z = Math.PI / 2;
    disc.position.set(0.02, 0.05, 0.12);
    g.add(disc);
    g.add(mesh(new SphereGeometry(0.06, 8, 6), toon("#c7cfcc"), 0.05, 0.05, 0.12));
  }
  return g;
}
