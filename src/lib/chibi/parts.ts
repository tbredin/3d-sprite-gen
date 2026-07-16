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
import type {
  ArmPose,
  BackLoadout,
  HairStyle,
  HelmetStyle,
  HemStyle,
  LegPose,
  TorsoStyle,
  WeaponType,
} from "./types";

export {
  DEFAULT_HEAD_SHAPE,
  FACE_BY_SHAPE,
  FACE_READABILITY,
  generateFace,
  generateHead,
} from "./heads";
export type { FaceLayout } from "./heads";

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
 * Shared scalp shell + bangs + side locks so hair always owns the silhouette.
 * Tuned for the new soft skulls (dumpling / mochi / cheeky / solemn).
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
  cap.position.set(0, cy + 0.06, -0.02);
  cap.scale.set(1.06, 1.0, 1.02);
  g.add(cap);

  g.add(mesh(new SphereGeometry(shellR * 0.35, 10, 8), hi, 0, cy + 0.2, 0));

  if (coverForehead || bangs) {
    g.add(mesh(new SphereGeometry(0.15, 10, 8), mat, -0.12, cy + 0.02, 0.36));
    g.add(mesh(new SphereGeometry(0.17, 10, 8), mat, 0.02, cy + 0.06, 0.38));
    g.add(mesh(new SphereGeometry(0.15, 10, 8), mat, 0.14, cy + 0.02, 0.36));
    g.add(mesh(new SphereGeometry(0.09, 8, 6), hi, 0, cy + 0.08, 0.37));
  }

  if (sides) {
    g.add(mesh(new SphereGeometry(0.15, 10, 8), mat, -0.42, cy - 0.02, 0.08));
    g.add(mesh(new SphereGeometry(0.15, 10, 8), mat, 0.42, cy - 0.02, 0.08));
    g.add(mesh(new SphereGeometry(0.12, 8, 6), mat, -0.38, cy - 0.14, 0.02));
    g.add(mesh(new SphereGeometry(0.12, 8, 6), mat, 0.38, cy - 0.14, 0.02));
  }

  if (back) {
    // Soft rear hair mass for away-¾ — one welded lump, not four blobs
    g.add(mesh(new SphereGeometry(0.26, 12, 10), mat, 0, cy - 0.02, -0.38));
    g.add(mesh(new SphereGeometry(0.16, 10, 8), mat, 0, cy - 0.16, -0.42));
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

  if (opts.style === "pixie") {
    // Short choppy crop — tight shell, irregular fringe tips
    addHairFrame(g, mat, hi, {
      shellR: 0.4,
      bangs: true,
      coverForehead: true,
      sides: true,
      back: false,
    });
    for (let i = 0; i < n + 1; i++) {
      const t = (i / Math.max(n, 1)) * 2 - 1;
      addSpikeTuft(
        g,
        mat,
        hi,
        t * 0.22,
        top - 0.04,
        0.05 + (i % 3) * 0.06,
        0.16 + (i % 2) * 0.05,
        t * 0.35,
        0.4,
      );
    }
    g.add(mesh(new SphereGeometry(0.12, 8, 6), mat, -0.28, cy - 0.12, 0.22));
    g.add(mesh(new SphereGeometry(0.12, 8, 6), mat, 0.28, cy - 0.12, 0.22));
  }

  if (opts.style === "messy") {
    addHairFrame(g, mat, hi, { shellR: 0.46, bangs: true });
    for (let i = 0; i < n + 3; i++) {
      const a = (i / (n + 3)) * Math.PI * 1.6 - 0.3;
      addSpikeTuft(
        g,
        mat,
        hi,
        Math.sin(a) * 0.28,
        top - 0.02 + (i % 3) * 0.03,
        Math.cos(a) * 0.2 - 0.05,
        0.2 + (i % 4) * 0.06,
        Math.sin(a) * 0.4,
        -0.15 + (i % 2) * 0.25,
      );
    }
  }

  if (opts.style === "dreads") {
    addHairFrame(g, mat, hi, { shellR: 0.44, bangs: true });
    for (let i = 0; i < n + 4; i++) {
      const a = (i / (n + 4)) * Math.PI * 1.8 + 0.2;
      const lock = new Mesh(new CapsuleGeometry(0.055, 0.38 + (i % 3) * 0.06, 3, 6), mat);
      lock.position.set(
        Math.sin(a) * 0.42,
        cy - 0.18 - (i % 3) * 0.04,
        Math.cos(a) * 0.28 - 0.15,
      );
      lock.rotation.x = 0.35 + (i % 2) * 0.15;
      lock.rotation.z = Math.sin(a) * 0.25;
      g.add(lock);
    }
  }

  if (opts.style === "mullet") {
    addHairFrame(g, mat, hi, {
      shellR: 0.42,
      bangs: true,
      coverForehead: true,
      back: false,
    });
    // Business front, party back
    g.add(mesh(new SphereGeometry(0.22, 10, 8), mat, 0, cy - 0.08, -0.38));
    for (const s of [-1, 1] as const) {
      const flap = new Mesh(new CapsuleGeometry(0.12, 0.42, 4, 8), mat);
      flap.position.set(s * 0.28, cy - 0.22, -0.32);
      flap.rotation.x = 0.5;
      flap.rotation.z = s * 0.15;
      g.add(flap);
    }
    const tail = new Mesh(new CapsuleGeometry(0.14, 0.4, 4, 8), mat);
    tail.position.set(0, cy - 0.28, -0.48);
    tail.rotation.x = 0.55;
    g.add(tail);
  }

  if (opts.style === "pompadour") {
    addHairFrame(g, mat, hi, { shellR: 0.42, bangs: false, coverForehead: false });
    // Forward-rolling volume — silhouette poke without a full afro balloon
    const pomp = new Mesh(new SphereGeometry(0.28, 12, 10), mat);
    pomp.position.set(0, cy + 0.28, 0.22);
    pomp.scale.set(1.05, 0.85, 0.9);
    g.add(pomp);
    g.add(mesh(new SphereGeometry(0.16, 8, 6), hi, -0.08, cy + 0.38, 0.3));
    g.add(mesh(new SphereGeometry(0.18, 8, 6), mat, 0, cy + 0.08, 0.4));
  }

  if (opts.style === "sidePart") {
    addHairFrame(g, mat, hi, { shellR: 0.45, bangs: false });
    // Swept mass to one side + thin parting gap on the left
    g.add(mesh(new SphereGeometry(0.22, 10, 8), mat, 0.22, cy + 0.18, 0.15));
    g.add(mesh(new SphereGeometry(0.18, 8, 6), hi, 0.28, cy + 0.22, 0.28));
    for (let i = 0; i < 3; i++) {
      g.add(
        mesh(
          new SphereGeometry(0.14, 8, 6),
          mat,
          0.1 + i * 0.08,
          cy + 0.02 - i * 0.04,
          0.38 - i * 0.04,
        ),
      );
    }
    g.add(mesh(new SphereGeometry(0.12, 8, 6), mat, -0.32, cy + 0.05, 0.1));
  }

  if (opts.style === "wavy") {
    addHairFrame(g, mat, hi, { shellR: 0.47 });
    for (const s of [-1, 1] as const) {
      for (let i = 0; i < 3; i++) {
        const wave = new Mesh(new CapsuleGeometry(0.11, 0.32, 4, 8), mat);
        wave.position.set(s * (0.36 + i * 0.04), cy - 0.12 - i * 0.14, 0.08 - i * 0.08);
        wave.rotation.z = s * (0.2 + i * 0.08);
        wave.rotation.x = 0.15 * i;
        g.add(wave);
      }
    }
    const back = new Mesh(new CapsuleGeometry(0.16, 0.4, 4, 8), mat);
    back.position.set(0, cy - 0.22, -0.4);
    back.rotation.x = 0.4;
    g.add(back);
  }

  return g;
}

/**
 * Helmet shells hug the egg skull from `generateHead`.
 * Shell ≈ skullR×0.96–1.00; egg axes match skin skull, slightly flatter on top.
 * Closed styles replace the skull; `cap` overlays the crown only.
 *
 * Why replacements keep reading tiny (do not "fix" by raising HELMET_SHELL
 * globally — that re-balloons knight):
 * 1. `r = skullR × head.scale` (presets ~0.9–0.92) then `shellR = r × 0.98`
 * 2. `shellEgg` already tighter than the skin egg (×0.98 / ×0.94 / ×0.98)
 * 3. Per-style dome squash (sciFi ×0.96/0.9, goat ×0.95/0.92) stacks on top
 * 4. Replace-mount hides the multi-volume skin head (skull+crown+cheeks), so a
 *    single shell has less silhouette mass than the skull it replaces
 * Style boosts (`REPLACE_HEAD_BOOST`, `KNIGHT_HEAD_BOOST`) undo that compound
 * shrink for mass-light closed heads — never raise HELMET_SHELL globally.
 */
const HEAD_TALL = 1.1;
/** Match `generateHead` skull squash before shell scale. */
const SKULL_EGG = { x: 0.92, y: 1.05, z: 0.86 } as const;
/**
 * Shell radius = skullR × HELMET_SHELL. ~6% under prior 1.04 so replacements
 * sit at/under the skin egg (user feedback: still ~5–10% too big).
 */
const HELMET_SHELL = 0.98;
/** SciFi / goat closed heads — undo HELMET_SHELL + egg-squash compound shrink. */
const REPLACE_HEAD_BOOST = 1.3;
/** Knight kettle only — still reads small after Elite Knight rebuild. */
const KNIGHT_HEAD_BOOST = 1.2;

/**
 * Head gear. Closed styles (`knight`, `sciFi`, `goat`) and deep cowls (`hood`)
 * are sized as *head replacements* matching `generateHead` egg proportions —
 * assembly hides the skin skull (and usually face/hair). Cap-like styles
 * (`cap`, `crown`, `wizard`, `bandana`) overlay the crown only.
 */
export function generateHelmet(opts: {
  style: HelmetStyle;
  color: string;
  visor?: string;
  /** Match CharacterSpec.head.scale so replacements align with body. */
  scale?: number;
}): Group {
  const g = new Group();
  g.name = "helmet";
  if (opts.style === "none") return g;
  const mat = toon(opts.color);
  const cy = LAYOUT.headCenterY;
  const top = LAYOUT.headTopY;
  const s = opts.scale ?? 1;
  const r = CHIBI.skullR * s;
  const tall = HEAD_TALL;
  const shellR = r * HELMET_SHELL;
  /** Flatter / slightly tighter than skin egg so closed helms stay compact. */
  const shellEgg = {
    x: SKULL_EGG.x * 0.98,
    y: SKULL_EGG.y * 0.94 * tall,
    z: SKULL_EGG.z * 0.98,
  };
  const skullPos = { x: 0, y: cy + 0.08 * tall, z: -0.04 };

  if (opts.style === "knight") {
    // Dark Souls Elite Knight–inspired flat-top kettle (closed head replacement).
    // ×1.2 knight-only boost (like sciFi REPLACE_HEAD_BOOST) — do not raise
    // shared HELMET_SHELL or overlay caps balloon.
    const r = CHIBI.skullR * s * KNIGHT_HEAD_BOOST;
    const shellR = r * HELMET_SHELL;
    const slit = toon(opts.visor ?? "#1a1c2c");

    // Main kettle body — egg with a flatter Y than other closed helms
    const dome = new Mesh(new SphereGeometry(shellR, 14, 12), mat);
    dome.position.set(skullPos.x, skullPos.y, skullPos.z);
    dome.scale.set(shellEgg.x * 1.02, shellEgg.y * 0.88, shellEgg.z * 1.0);
    g.add(dome);

    // Flat kettle lid / crown disc (Elite Knight silhouette, not a sphere blob)
    const lid = new Mesh(new CylinderGeometry(r * 0.72, r * 0.92, r * 0.22, 12), mat);
    lid.position.set(0, cy + r * 0.78 * tall, -0.02);
    g.add(lid);
    g.add(
      mesh(
        new CylinderGeometry(r * 0.55, r * 0.7, 0.05, 12),
        mat,
        0,
        cy + r * 0.92 * tall,
        -0.02,
      ),
    );

    // Broad brow band over the slits
    g.add(
      mesh(
        new BoxGeometry(r * 1.7, r * 0.18, r * 0.42),
        mat,
        0,
        cy + r * 0.22 * tall,
        r * 0.55,
      ),
    );

    // Jaw / bevor — fuller than the old tiny r×0.48 stub so the head reads solid
    const bevor = new Mesh(new SphereGeometry(r * 0.62, 12, 10), mat);
    bevor.position.set(0, cy - r * 0.55 * tall, r * 0.12);
    bevor.scale.set(1.05, 0.72 * tall, 0.88);
    g.add(bevor);
    g.add(
      mesh(
        new CylinderGeometry(r * 0.7, r * 0.82, 0.1, 12),
        mat,
        0,
        cy - r * 0.95 * tall,
        0.02,
      ),
    );

    // Dual horizontal eye slits + T-nasal (Cathedral / Elite Knight visor read)
    const faceZ = r * 0.95;
    const slitY = cy + r * 0.08 * tall;
    g.add(
      mesh(new BoxGeometry(r * 1.35, r * 0.1, 0.09), slit, 0, slitY + r * 0.12, faceZ),
    );
    g.add(
      mesh(new BoxGeometry(r * 1.15, r * 0.08, 0.08), slit, 0, slitY - r * 0.08, faceZ + 0.01),
    );
    g.add(
      mesh(
        new BoxGeometry(r * 0.1, r * 0.55, 0.08),
        mat,
        0,
        slitY + r * 0.02,
        faceZ + 0.02,
      ),
    );

    // Short center crest ridge — silhouette punctuation, stays within AABB
    g.add(
      mesh(new BoxGeometry(r * 0.08, r * 0.12, r * 0.55), mat, 0, top - r * 0.28, -0.04),
    );
  }

  if (opts.style === "cap") {
    // Overlay: small brim + shallow crown dome (does not replace skull)
    const brim = new Mesh(new CylinderGeometry(r * 1.12, r * 1.12, 0.042, 12), mat);
    brim.position.set(0, top - 0.1, 0.06);
    g.add(brim);
    const crown = new Mesh(
      new SphereGeometry(r * 0.85, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.48),
      mat,
    );
    crown.position.set(0, cy + r * 0.55 * tall, -0.02);
    crown.scale.set(1.0, 0.85, 0.95);
    g.add(crown);
  }

  if (opts.style === "sciFi") {
    // Practical sealed infantry helm — hug the egg; angular plates, not a bulb.
    // Soldier preset. Slightly flatter / narrower than knight kettle.
    // ×1.3 undoes HELMET_SHELL + shellEgg + dome squash (×1.2 was still tiny).
    const r = CHIBI.skullR * s * REPLACE_HEAD_BOOST;
    const shellR = r * HELMET_SHELL;
    const visorMat = toon(opts.visor ?? "#5ad4a0");
    const dark = toon("#1a1c2c");

    // Tight cranial shell — squash Y so it reads as armor hull, not balloon
    const dome = new Mesh(new SphereGeometry(shellR, 14, 12), mat);
    dome.position.set(skullPos.x, skullPos.y, skullPos.z);
    dome.scale.set(shellEgg.x * 0.96, shellEgg.y * 0.9, shellEgg.z * 0.96);
    g.add(dome);

    // Flattened crown cap (bucket lid) — breaks the sphere silhouette from iso
    const lid = new Mesh(new CylinderGeometry(r * 0.62, r * 0.78, r * 0.14, 10), mat);
    lid.position.set(0, cy + r * 0.72 * tall, -0.02);
    g.add(lid);

    // Angular brow / forehead plate proud of the egg
    g.add(
      mesh(
        new BoxGeometry(r * 1.55, r * 0.28, r * 0.38),
        mat,
        0,
        cy + r * 0.28 * tall,
        r * 0.48,
      ),
    );

    // Cheek cups — slim vertical plates hugging temples (silhouette wings)
    for (const side of [-1, 1] as const) {
      const cheek = new Mesh(new BoxGeometry(r * 0.22, r * 0.7, r * 0.55), mat);
      cheek.position.set(side * r * 0.82, cy - r * 0.05 * tall, r * 0.12);
      cheek.rotation.z = side * 0.12;
      g.add(cheek);
    }

    // Nape / rear collar — short plate into shoulders
    const nape = new Mesh(new BoxGeometry(r * 1.1, r * 0.35, r * 0.28), mat);
    nape.position.set(0, cy - r * 0.55 * tall, -r * 0.55);
    nape.rotation.x = 0.35;
    g.add(nape);

    // Tight jaw / chin cup — stays under egg, no second sphere blob
    const chin = new Mesh(new SphereGeometry(r * 0.48, 10, 8), mat);
    chin.position.set(0, cy - r * 0.7 * tall, r * 0.1);
    chin.scale.set(1.05, 0.55 * tall, 0.85);
    g.add(chin);

    // Thin horizontal visor band + darker inset slit (reads at 42–48px)
    const faceZ = r * 0.88;
    g.add(
      mesh(
        new BoxGeometry(r * 1.35, r * 0.22, 0.08),
        visorMat,
        0,
        cy + r * 0.05 * tall,
        faceZ,
      ),
    );
    g.add(
      mesh(
        new BoxGeometry(r * 1.15, r * 0.08, 0.06),
        dark,
        0,
        cy + r * 0.05 * tall,
        faceZ + 0.04,
      ),
    );

    // Short side antenna stubs — punctuation only
    g.add(
      mesh(
        new CylinderGeometry(0.02, 0.028, 0.12, 6),
        mat,
        r * 0.55,
        top - 0.12,
        -0.08,
      ),
    );
  }

  if (opts.style === "hood") {
    // Soft replacement cowl — open face window, rounded medieval cloak hood.
    // Sized to the new cute skulls (not a balloon over dumpling/mochi).
    const cowl = new Mesh(new SphereGeometry(shellR * 1.02, 14, 12), mat);
    cowl.position.set(0, skullPos.y, -0.06);
    cowl.scale.set(shellEgg.x * 1.05, shellEgg.y * 0.95, shellEgg.z * 1.08);
    g.add(cowl);

    // Soft crown fold
    const crown = new Mesh(new SphereGeometry(r * 0.65, 12, 8), mat);
    crown.position.set(0, cy + r * 0.68 * tall, -0.08);
    crown.scale.set(1.08, 0.4 * tall, 1.0);
    g.add(crown);

    // Cheek wings frame the face window
    for (const sSign of [-1, 1] as const) {
      const flap = new Mesh(new SphereGeometry(r * 0.28, 10, 8), mat);
      flap.position.set(sSign * r * 0.85, cy + 0.02, r * 0.12);
      flap.scale.set(0.65, 1.1 * tall, 0.8);
      g.add(flap);
    }

    // Short rear drape into shoulders — flat panel, not a capsule sausage
    g.add(
      mesh(new BoxGeometry(r * 1.0, r * 0.55, r * 0.22), mat, 0, cy - r * 0.45 * tall, -r * 0.7),
    );
  }

  if (opts.style === "crown") {
    // Overlay circlet + short spikes — does not replace skull
    const band = new Mesh(new CylinderGeometry(r * 0.95, r * 0.98, 0.08, 12), mat);
    band.position.set(0, top - 0.14, 0);
    g.add(band);
    const gem = toon(opts.visor ?? "#f5e07a");
    g.add(mesh(new SphereGeometry(0.06, 8, 6), gem, 0, top - 0.08, r * 0.85));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI * 0.5;
      const spike = new Mesh(new ConeGeometry(0.05, 0.16, 5), mat);
      spike.position.set(Math.cos(a) * r * 0.9, top - 0.02, Math.sin(a) * r * 0.9);
      g.add(spike);
    }
  }

  if (opts.style === "wizard") {
    // Overlay pointed hat — moderate cone so AABB stays readable, not a tower
    const brim = new Mesh(new CylinderGeometry(r * 1.2, r * 1.2, 0.04, 12), mat);
    brim.position.set(0, top - 0.12, 0);
    g.add(brim);
    const cone = new Mesh(new ConeGeometry(r * 0.72, r * 1.15, 10), mat);
    cone.position.set(0, top + r * 0.35, -0.02);
    cone.rotation.z = 0.12;
    cone.rotation.x = -0.08;
    g.add(cone);
    const trim = toon(opts.visor ?? "#f5e07a");
    g.add(mesh(new SphereGeometry(0.055, 8, 6), trim, 0.04, top + r * 0.88, -0.02));
  }

  if (opts.style === "bandana") {
    // Overlay kerchief wrap + rear knot
    const wrap = new Mesh(
      new SphereGeometry(r * 0.88, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42),
      mat,
    );
    wrap.position.set(0, cy + r * 0.5 * tall, -0.02);
    wrap.scale.set(1.05, 0.7, 1.0);
    g.add(wrap);
    g.add(
      mesh(new BoxGeometry(r * 1.5, r * 0.14, r * 0.2), mat, 0, cy + r * 0.35 * tall, r * 0.55),
    );
    // Knot / tails aft
    g.add(mesh(new SphereGeometry(0.1, 8, 6), mat, 0, cy + r * 0.25 * tall, -r * 0.75));
    for (const side of [-1, 1] as const) {
      const tail = new Mesh(new CapsuleGeometry(0.04, 0.18, 3, 6), mat);
      tail.position.set(side * 0.08, cy + r * 0.05 * tall, -r * 0.85);
      tail.rotation.x = 0.6;
      tail.rotation.z = side * 0.4;
      g.add(tail);
    }
  }

  if (opts.style === "goat") {
    // Full animal head replacement — one welded silhouette at 42–48px.
    // Same ×1.3 boost as sciFi (no boost left goat as tiny as pre-bump soldier).
    const r = CHIBI.skullR * s * REPLACE_HEAD_BOOST;
    const shellR = r * HELMET_SHELL;
    const fur = mat;
    const horn = toon(opts.visor ?? "#e8e4d8");
    const dark = toon("#2a2035");
    const eggX = shellEgg.x * 0.95;
    const eggY = shellEgg.y * 0.92;
    const eggZ = shellEgg.z * 0.95;

    const skull = new Mesh(new SphereGeometry(shellR, 14, 12), fur);
    skull.position.set(skullPos.x, skullPos.y, skullPos.z);
    skull.scale.set(eggX, eggY, eggZ);
    g.add(skull);

    // Connected muzzle — box/cone stack welded into face front (no floating nose oval).
    const muzzleY = cy - r * 0.18 * tall;
    const bridge = new Mesh(new BoxGeometry(r * 0.9, r * 0.58, r * 0.55), fur);
    bridge.position.set(0, muzzleY, r * 0.42);
    g.add(bridge);
    const mid = new Mesh(new BoxGeometry(r * 0.68, r * 0.44, r * 0.5), fur);
    mid.position.set(0, muzzleY - r * 0.06 * tall, r * 0.85);
    g.add(mid);
    // Tip points +Z (ConeGeometry apex is local +Y → rotX +π/2)
    const tip = new Mesh(new ConeGeometry(r * 0.3, r * 0.4, 7), fur);
    tip.position.set(0, muzzleY - r * 0.1 * tall, r * 1.18);
    tip.rotation.x = Math.PI / 2;
    g.add(tip);
    // Nostrils recessed into tip face — part of muzzle, not detached spheres ahead
    g.add(
      mesh(
        new SphereGeometry(r * 0.07, 6, 5),
        dark,
        -r * 0.1,
        muzzleY - r * 0.04 * tall,
        r * 1.32,
      ),
    );
    g.add(
      mesh(
        new SphereGeometry(r * 0.07, 6, 5),
        dark,
        r * 0.1,
        muzzleY - r * 0.04 * tall,
        r * 1.32,
      ),
    );

    // Goat horns — grow out of the skull sideways, then curl up + forward
    // (real goat arc). Prior upright cones read as floating sticks.
    // ConeGeometry apex is local +Y; rotZ ±π/2 aims tip along ±X.
    for (const side of [-1, 1] as const) {
      // Root plug sunk into upper temple / parietal bone
      const rootX = side * shellR * eggX * 0.78;
      const rootY = skullPos.y + shellR * eggY * 0.38;
      const rootZ = skullPos.z + shellR * eggZ * 0.08;
      g.add(mesh(new SphereGeometry(r * 0.28, 8, 6), horn, rootX, rootY, rootZ));

      // Stump — mostly lateral out of the skull (+ slight lift)
      const stump = new Mesh(new ConeGeometry(r * 0.3, r * 0.62, 7), horn);
      stump.position.set(side * r * 1.05, rootY + r * 0.06 * tall, rootZ + r * 0.06);
      stump.rotation.z = -side * (Math.PI / 2 - 0.28);
      stump.rotation.x = 0.2;
      g.add(stump);

      // Mid — continue outward, turn up and begin curling forward
      const midHorn = new Mesh(new ConeGeometry(r * 0.2, r * 0.72, 7), horn);
      midHorn.position.set(
        side * r * 1.48,
        rootY + r * 0.55 * tall,
        rootZ + r * 0.42,
      );
      midHorn.rotation.z = -side * 0.55;
      midHorn.rotation.x = 0.85;
      g.add(midHorn);

      // Tip — curl forward (and a touch inward) like a goat hook
      const hornTip = new Mesh(new ConeGeometry(r * 0.1, r * 0.52, 6), horn);
      hornTip.position.set(
        side * r * 1.38,
        rootY + r * 0.95 * tall,
        rootZ + r * 0.98,
      );
      hornTip.rotation.z = -side * 0.15;
      hornTip.rotation.x = Math.PI / 2 + 0.15;
      g.add(hornTip);
    }

    // Floppy / pointed goat ears
    for (const side of [-1, 1] as const) {
      const ear = new Mesh(new ConeGeometry(r * 0.18, r * 0.42, 5), fur);
      ear.position.set(side * r * 0.95, cy + r * 0.12 * tall, 0.05);
      ear.rotation.z = side * 1.1;
      ear.rotation.x = 0.2;
      g.add(ear);
    }

    // Dark eye pits for animal face read without human eyes
    g.add(mesh(new SphereGeometry(0.08, 8, 6), dark, -r * 0.34, cy + r * 0.08 * tall, r * 0.62));
    g.add(mesh(new SphereGeometry(0.08, 8, 6), dark, r * 0.34, cy + r * 0.08 * tall, r * 0.62));

    // Short beard tuft under chin
    g.add(
      mesh(new ConeGeometry(r * 0.12, r * 0.3, 5), fur, 0, cy - r * 0.82 * tall, r * 0.5),
    );
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

  /**
   * Angular spaulders — box/cylinder plates beat soft spheres from behind.
   * Extra rear lip so pads read when the camera sits on the character's back.
   */
  const addShoulders = (mat = body, radius = 0.18) => {
    for (const s of [-1, 1] as const) {
      g.add(
        mesh(
          new SphereGeometry(radius, 10, 8),
          mat,
          s * sw,
          LAYOUT.shoulderY - 0.02,
          0.02,
        ),
      );
      // Flat top plate
      g.add(
        mesh(
          new BoxGeometry(radius * 1.35, radius * 0.45, radius * 1.5),
          mat,
          s * sw,
          LAYOUT.shoulderY + radius * 0.15,
          -0.02,
        ),
      );
      // Rear lip / pauldron wing — silhouette poke from away facings
      g.add(
        mesh(
          new BoxGeometry(radius * 0.9, radius * 0.7, radius * 0.55),
          mat,
          s * (sw + 0.02),
          LAYOUT.shoulderY - 0.06,
          -radius * 0.85,
        ),
      );
    }
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

  /** Back plate + spine ridge — torsos were front-heavy; backs must carry detail. */
  const addBackDetail = (mat = body, accent = metal) => {
    g.add(
      mesh(
        new BoxGeometry(CHIBI.hipWidth * 0.95, H * 0.85, 0.1),
        mat,
        0,
        midY,
        -d * 0.95,
      ),
    );
    g.add(
      mesh(
        new BoxGeometry(0.08, H * 0.7, 0.06),
        accent,
        0,
        midY + 0.02,
        -d * 1.15,
      ),
    );
    // Cross straps
    for (const s of [-1, 1] as const) {
      const strap = new Mesh(
        new BoxGeometry(0.07, H * 0.75, 0.04),
        accent,
      );
      strap.position.set(s * 0.12, midY + 0.04, -d * 1.05);
      strap.rotation.z = s * 0.35;
      g.add(strap);
    }
  };

  // Waist belt + buckle
  const addBelt = (mat = trim ?? metal) => {
    g.add(mesh(limbCylinder(w * 1.05, 0.07, 12), mat, 0, LAYOUT.hipY + 0.12, 0));
    g.add(
      mesh(
        new BoxGeometry(0.12, 0.1, 0.08),
        toonDetail("#eef2f5"),
        0,
        LAYOUT.hipY + 0.12,
        d * 0.95,
      ),
    );
    // Rear belt knot / loop
    g.add(
      mesh(
        new BoxGeometry(0.14, 0.08, 0.06),
        mat,
        0,
        LAYOUT.hipY + 0.12,
        -d * 0.95,
      ),
    );
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
    addBackDetail(skin, metal);
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
    // Flat rear panel + soft hem scallops — not a hanging sausage fold
    g.add(
      mesh(
        new BoxGeometry(CHIBI.hipWidth * 1.05, H * 0.95, 0.08),
        body,
        0,
        midY - 0.04,
        -d * 1.05,
      ),
    );
    for (const s of [-1, 0, 1] as const) {
      g.add(
        mesh(
          new SphereGeometry(0.1, 8, 6),
          body,
          s * 0.16,
          LAYOUT.hipY + 0.02,
          -d * 1.1,
        ),
      );
    }
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
    // Soft shoulder cowl only — prefer `helmet: hood` for a full head cowl.
    // Keep this small so it doesn't balloon over the new cute skulls.
    const tall = HEAD_TALL;
    const skullR = CHIBI.skullR;
    g.add(
      mesh(
        new SphereGeometry(skullR * 0.55, 12, 10),
        body,
        0,
        LAYOUT.shoulderY + 0.08,
        -0.08,
      ),
    );
    for (const s of [-1, 1] as const) {
      g.add(
        mesh(
          new SphereGeometry(skullR * 0.22, 10, 8),
          body,
          s * skullR * 0.7,
          cy - 0.08 * tall,
          0.02,
        ),
      );
    }
    // Wide flat cloak panel down the back
    g.add(
      mesh(
        new BoxGeometry(CHIBI.hipWidth * 1.15, H * 1.15, 0.1),
        body,
        0,
        midY - 0.06,
        -0.4,
      ),
    );
    g.add(mesh(new SphereGeometry(0.18, 8, 6), body, 0, LAYOUT.hipY, -0.46));
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
    addShoulders(metal, 0.18);
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
    addBackDetail(metal, body);
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
          new SphereGeometry(0.2, 10, 8),
          body,
          s * (CHIBI.hipWidth * 0.7),
          LAYOUT.shoulderY - 0.02,
          0.02,
        ),
      );
      g.add(
        mesh(
          new BoxGeometry(0.22, 0.12, 0.3),
          metal,
          s * (CHIBI.hipWidth * 0.68),
          LAYOUT.shoulderY - 0.08,
          0.06,
        ),
      );
      // Rear pauldron wing
      g.add(
        mesh(
          new BoxGeometry(0.18, 0.14, 0.22),
          metal,
          s * (CHIBI.hipWidth * 0.65),
          LAYOUT.shoulderY - 0.06,
          -0.16,
        ),
      );
    }
    // Layered back cuirass — taller + prouder than the old thin slab
    g.add(
      mesh(
        new BoxGeometry(CHIBI.hipWidth * 1.1, H * 0.85, 0.14),
        metal,
        0,
        midY,
        -0.22,
      ),
    );
    g.add(
      mesh(
        new BoxGeometry(CHIBI.hipWidth * 0.7, H * 0.45, 0.1),
        body,
        0,
        midY + 0.05,
        -0.3,
      ),
    );
    addBelt(body);
  } else if (opts.style === "jacket") {
    const r = w * 1.08;
    const jacket = new Mesh(
      new CapsuleGeometry(r, capsuleCylinderLength(r, H), 4, 10),
      body,
    );
    jacket.position.set(0, midY, 0);
    g.add(jacket);
    addShoulders(body, 0.16);
    addChest(body);
    addBackDetail(body, trim ?? metal);
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
    // Collar stand — small rear neck break
    g.add(
      mesh(
        new BoxGeometry(0.28, 0.12, 0.1),
        body,
        0,
        LAYOUT.shoulderY + 0.04,
        -0.12,
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
    addShoulders(body, 0.14);
    addChest(body);
    addBackDetail(body, metal);
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

/** Soft cape / cloak — flat panels + soft hem, not a fat rear sausage. */
export function generateCape(opts: {
  color: string;
}): Group {
  const g = new Group();
  g.name = "cape";
  const mat = toon(opts.color);
  const hi = toon(lightenHex(opts.color, 0.22));
  const midY = LAYOUT.hipY + CHIBI.torso * 0.4;

  // Collar clasp
  g.add(
    mesh(new SphereGeometry(0.1, 8, 6), hi, -0.14, LAYOUT.shoulderY, -0.08),
  );
  g.add(
    mesh(new SphereGeometry(0.1, 8, 6), hi, 0.14, LAYOUT.shoulderY, -0.08),
  );
  g.add(
    mesh(new BoxGeometry(0.32, 0.06, 0.08), mat, 0, LAYOUT.shoulderY + 0.02, -0.1),
  );

  // Main cloak panel — thin depth, wide face
  g.add(
    mesh(
      new BoxGeometry(CHIBI.hipWidth * 1.25, CHIBI.torso * 1.35, 0.08),
      mat,
      0,
      midY - 0.06,
      -0.42,
    ),
  );
  // Soft outer flare
  for (const s of [-1, 1] as const) {
    g.add(
      mesh(
        new BoxGeometry(0.14, CHIBI.torso * 1.15, 0.06),
        mat,
        s * CHIBI.hipWidth * 0.55,
        midY - 0.04,
        -0.36,
      ),
    );
  }
  // Hem scallops
  for (const s of [-1, 0, 1] as const) {
    g.add(
      mesh(
        new SphereGeometry(0.12, 8, 6),
        mat,
        s * 0.18,
        LAYOUT.hipY - 0.06,
        -0.44,
      ),
    );
  }
  g.add(mesh(new SphereGeometry(0.08, 6, 5), hi, 0, midY + 0.12, -0.4));

  return g;
}

/** Hip / rear belt pouches — small bags that sell adventurer kit from behind. */
export function generatePouches(opts: {
  color: string;
}): Group {
  const g = new Group();
  g.name = "pouches";
  const mat = toon(opts.color);
  const dark = toonDetail("#2a2035");
  const y = LAYOUT.hipY + 0.1;

  for (const s of [-1, 1] as const) {
    // Side hip pouch
    g.add(mesh(new BoxGeometry(0.14, 0.16, 0.12), mat, s * 0.38, y, 0.08));
    g.add(mesh(new SphereGeometry(0.06, 6, 5), dark, s * 0.38, y + 0.06, 0.1));
    // Rear kidney pouch
    g.add(mesh(new BoxGeometry(0.12, 0.14, 0.1), mat, s * 0.22, y - 0.02, -0.28));
  }
  // Center rear bedroll / satchel lump
  g.add(mesh(new CapsuleGeometry(0.1, 0.2, 3, 6), mat, 0, y + 0.02, -0.32));
  g.add(mesh(new BoxGeometry(0.08, 0.06, 0.04), dark, 0, y + 0.08, -0.34));

  return g;
}

/**
 * Strapped back gear — always visible in the default away facing.
 * Lives on the upper body so it yaws with the ¾ torso.
 */
export function generateBackLoadout(opts: {
  style: BackLoadout;
  color: string;
}): Group {
  const g = new Group();
  g.name = "backLoadout";
  if (opts.style === "none") return g;
  const mat = toonDetail(opts.color);
  const accent = toonDetail(lightenHex(opts.color, 0.35));
  const metal = toonDetail("#c7cfcc");
  const leather = toonDetail("#4a3626");
  const midY = LAYOUT.hipY + CHIBI.torso * 0.45;
  const backZ = -0.38;

  if (opts.style === "scabbard") {
    // Sheathed blade angled across the back
    const sheath = new Mesh(limbCylinder(0.07, 0.55), leather);
    sheath.position.set(0.08, midY + 0.05, backZ);
    sheath.rotation.z = 0.45;
    sheath.rotation.x = 0.15;
    g.add(sheath);
    g.add(mesh(new SphereGeometry(0.06, 6, 5), metal, 0.22, midY + 0.28, backZ + 0.02));
    const hilt = new Mesh(limbCylinder(0.045, 0.16), metal);
    hilt.position.set(-0.1, midY - 0.2, backZ);
    hilt.rotation.z = 0.45;
    g.add(hilt);
    g.add(mesh(new BoxGeometry(0.16, 0.05, 0.06), accent, -0.06, midY - 0.12, backZ));
  } else if (opts.style === "greatsword") {
    // Huge blade rising past the shoulder — dominant back silhouette
    const blade = new Mesh(
      new CylinderGeometry(0.09, 0.07, 0.85, 6),
      mat,
    );
    blade.position.set(-0.06, midY + 0.35, backZ - 0.04);
    blade.rotation.z = 0.2;
    g.add(blade);
    g.add(
      mesh(new ConeGeometry(0.07, 0.16, 6), mat, -0.02, midY + 0.82, backZ - 0.04),
    );
    g.add(mesh(new BoxGeometry(0.28, 0.07, 0.1), metal, -0.12, midY - 0.05, backZ));
    g.add(mesh(limbCylinder(0.05, 0.2), leather, -0.16, midY - 0.22, backZ));
  } else if (opts.style === "quiver") {
    const tube = new Mesh(new CylinderGeometry(0.11, 0.13, 0.45, 10), leather);
    tube.position.set(0.18, midY + 0.08, backZ);
    tube.rotation.z = -0.25;
    g.add(tube);
    // Arrow fletching tips poking out the top
    for (let i = 0; i < 3; i++) {
      g.add(
        mesh(
          new ConeGeometry(0.035, 0.14, 5),
          accent,
          0.12 + i * 0.04,
          midY + 0.34,
          backZ - 0.02 + i * 0.02,
        ),
      );
    }
    g.add(mesh(new BoxGeometry(0.06, 0.35, 0.04), leather, 0.02, midY, backZ + 0.08));
  } else if (opts.style === "pack") {
    // Bedroll + pack frame
    g.add(mesh(new BoxGeometry(0.42, 0.36, 0.22), mat, 0, midY + 0.05, backZ - 0.02));
    g.add(mesh(new CapsuleGeometry(0.12, 0.32, 3, 8), accent, 0, midY + 0.28, backZ));
    for (const s of [-1, 1] as const) {
      g.add(mesh(new BoxGeometry(0.05, 0.4, 0.04), leather, s * 0.12, midY, -0.2));
    }
    g.add(mesh(new SphereGeometry(0.08, 6, 5), leather, 0.14, midY - 0.08, backZ));
  } else if (opts.style === "axe") {
    const haft = new Mesh(limbCylinder(0.05, 0.65), leather);
    haft.position.set(0.12, midY + 0.15, backZ);
    haft.rotation.z = -0.35;
    g.add(haft);
    const head = new Mesh(new BoxGeometry(0.28, 0.18, 0.1), mat);
    head.position.set(0.28, midY + 0.42, backZ);
    g.add(head);
    g.add(mesh(new SphereGeometry(0.06, 6, 5), metal, 0.28, midY + 0.42, backZ + 0.04));
  }

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
  // Ready hip sockets — clear torso in iso without reading as a split.
  const hipX = CHIBI.hipWidth * 0.38;
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
   * Sword blade radius — fat hex cylinder so it never rotates edge-on to a
   * sub-pixel sliver. Bumped again so held blades clear the mitt past the
   * torso in away-¾ (shields were winning the silhouette contest).
   */
  swordBladeR: 0.1,
  swordBladeLength: 0.58,
  /** Crossguard — wide flat box. */
  swordGuardWidth: 0.36,
  /** Staff orb. */
  staffOrbR: 0.2,
  /** Rifle barrel. */
  rifleBarrelR: 0.09,
  /** Shield face disc. */
  shieldDiscR: 0.4,
  /** Shield boss (center stud). */
  shieldBossR: 0.11,
} as const;

/**
 * Held props in hand-local space: grip at origin.
 * Parent into the hand Group from generateArms so they track every pose.
 *
 * All parts use `toonDetail` (not `toon`) so dark accent colors stay near-black
 * instead of being lifted for large-surface readability — weapons are small
 * enough that crushing contrast toward the hand/sleeve matters more than
 * avoiding a "black blob" on a big torso panel.
 *
 * Blade / barrel lean slightly forward (+Z) so they poke past the mitt into
 * the iso silhouette instead of collapsing into the forearm.
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
    // Tip the whole sword forward so the blade clears the mitt silhouette.
    g.rotation.x = -0.55;
    g.position.set(0, -0.02, 0.08);
    g.add(mesh(limbCylinder(0.055, 0.18), toonDetail("#4a3626"), 0, -0.03, 0.05));
    g.add(mesh(new SphereGeometry(0.05, 8, 6), toonDetail("#2a1c14"), 0, -0.14, 0.05));
    g.add(
      mesh(
        new BoxGeometry(t.swordGuardWidth, 0.07, 0.12),
        toonDetail("#eef2f5"),
        0,
        0.12,
        0.05,
      ),
    );
    const blade = new Mesh(
      new CylinderGeometry(t.swordBladeR, t.swordBladeR * 0.8, t.swordBladeLength, 6),
      mat,
    );
    blade.position.set(0, 0.12 + 0.04 + t.swordBladeLength * 0.5, 0.05);
    g.add(blade);
    const tipY = 0.12 + 0.04 + t.swordBladeLength;
    const tip = new Mesh(new ConeGeometry(t.swordBladeR * 0.8, 0.14, 6), mat);
    tip.position.set(0, tipY + 0.07, 0.05);
    g.add(tip);
  } else if (opts.type === "staff") {
    g.rotation.x = -0.35;
    g.position.set(0, 0, 0.06);
    g.add(mesh(limbCylinder(0.06, 0.95), mat, 0, 0.15, 0.05));
    for (const s of [-1, 1] as const) {
      const prong = new Mesh(new ConeGeometry(0.04, 0.18, 5), toonDetail(accent));
      prong.position.set(s * 0.1, 0.68, 0.05);
      prong.rotation.z = s * 0.5;
      g.add(prong);
    }
    g.add(mesh(new SphereGeometry(t.staffOrbR, 10, 8), toonDetail("#f5f8ff"), 0, 0.82, 0.05));
  } else if (opts.type === "rifle") {
    g.rotation.x = -0.2;
    g.position.set(0, 0.02, 0.1);
    const barrel = new Mesh(limbCylinder(t.rifleBarrelR, 0.72), mat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, 0.38);
    g.add(barrel);
    g.add(mesh(new BoxGeometry(0.17, 0.2, 0.28), mat, 0, -0.02, 0.04));
    g.add(mesh(new BoxGeometry(0.1, 0.13, 0.28), mat, 0, -0.05, -0.2));
    g.add(mesh(new BoxGeometry(0.036, 0.07, 0.036), toonDetail("#14151f"), 0, 0.14, 0.72));
    g.add(mesh(new BoxGeometry(0.07, 0.18, 0.06), toonDetail("#14151f"), 0, -0.18, 0.16));
  } else if (opts.type === "shield") {
    // Nest shield slightly outboard of the trail mitt (mirrored per hand).
    const disc = new Mesh(
      new CylinderGeometry(t.shieldDiscR, t.shieldDiscR, 0.09, 14),
      mat,
    );
    disc.rotation.z = Math.PI / 2;
    disc.position.set(hx * 0.14, 0.02, 0.08);
    g.add(disc);
    const rim = new Mesh(
      new CylinderGeometry(t.shieldDiscR * 1.12, t.shieldDiscR * 1.12, 0.035, 14),
      toonDetail("#2a2035"),
    );
    rim.rotation.z = Math.PI / 2;
    rim.position.set(hx * 0.12, 0.02, 0.08);
    g.add(rim);
    g.add(
      mesh(
        new SphereGeometry(t.shieldBossR, 8, 6),
        toonDetail("#eef2f5"),
        hx * 0.18,
        0.02,
        0.08,
      ),
    );
  }
  return g;
}

