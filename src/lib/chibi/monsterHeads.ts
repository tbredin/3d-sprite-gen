/**
 * Animal / goblin helmet meshes — welded replace-mount heads gated by Monster.
 * Called from `generateHelmet` for styles other than the legacy `goat` block.
 */

import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  type Material,
} from "three";
import { toon } from "./materials";
import type { HelmetStyle } from "./types";
import { isMonsterHelmet } from "./types";

function mesh(
  geo: ConstructorParameters<typeof Mesh>[0],
  mat: Material,
  x: number,
  y: number,
  z: number,
): Mesh {
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

export type MonsterHeadContext = {
  mat: Material;
  cy: number;
  tall: number;
  s: number;
  skullR: number;
  replaceBoost: number;
  helmetShell: number;
  shellEgg: { x: number; y: number; z: number };
  skullPos: { x: number; y: number; z: number };
  visor?: string;
};

const NEW_MONSTER_STYLES: readonly HelmetStyle[] = [
  "bird",
  "horse",
  "snake",
  "triceratops",
  "goblin",
  "goblinWide",
  "goblinPointy",
];

export function isNewMonsterHelmet(style: HelmetStyle): boolean {
  return (NEW_MONSTER_STYLES as readonly string[]).includes(style);
}

/** Returns true when the style was handled (caller should skip further branches). */
export function buildMonsterHelmet(
  g: Group,
  style: HelmetStyle,
  ctx: MonsterHeadContext,
): boolean {
  if (!isMonsterHelmet(style) || style === "goat") return false;
  if (!isNewMonsterHelmet(style)) return false;

  const r = ctx.skullR * ctx.s * ctx.replaceBoost;
  const shellR = r * ctx.helmetShell;
  const fur = ctx.mat;
  const horn = toon(ctx.visor ?? "#e8e4d8");
  const dark = toon("#2a2035");
  const { cy, tall, shellEgg, skullPos } = ctx;
  const eggX = shellEgg.x * 0.95;
  const eggY = shellEgg.y * 0.92;
  const eggZ = shellEgg.z * 0.95;

  if (style === "bird") {
    const skull = new Mesh(new SphereGeometry(shellR, 14, 12), fur);
    skull.position.set(skullPos.x, skullPos.y + r * 0.04 * tall, skullPos.z);
    skull.scale.set(eggX * 0.95, eggY * 0.9, eggZ * 0.95);
    g.add(skull);

    const beak = new Mesh(new ConeGeometry(r * 0.28, r * 0.85, 7), fur);
    beak.position.set(0, cy - r * 0.08 * tall, r * 0.95);
    beak.rotation.x = Math.PI / 2;
    g.add(beak);
    g.add(
      mesh(new ConeGeometry(r * 0.14, r * 0.35, 6), dark, 0, cy - r * 0.12 * tall, r * 1.35),
    );
    const tip = g.children[g.children.length - 1]!;
    tip.rotation.x = Math.PI / 2;

    for (const side of [-1, 1] as const) {
      g.add(
        mesh(
          new SphereGeometry(0.09, 8, 6),
          dark,
          side * r * 0.42,
          cy + r * 0.1 * tall,
          r * 0.55,
        ),
      );
    }

    // Crest tuft
    g.add(
      mesh(new ConeGeometry(r * 0.12, r * 0.45, 5), horn, 0, cy + r * 0.85 * tall, -r * 0.1),
    );
    return true;
  }

  if (style === "horse") {
    const skull = new Mesh(new SphereGeometry(shellR, 14, 12), fur);
    skull.position.set(skullPos.x, skullPos.y, skullPos.z);
    skull.scale.set(eggX * 0.9, eggY * 0.95, eggZ * 0.88);
    g.add(skull);

    const muzzle = new Mesh(new BoxGeometry(r * 0.7, r * 0.55, r * 1.35), fur);
    muzzle.position.set(0, cy - r * 0.15 * tall, r * 0.75);
    g.add(muzzle);
    g.add(
      mesh(new BoxGeometry(r * 0.55, r * 0.35, r * 0.4), fur, 0, cy - r * 0.22 * tall, r * 1.45),
    );
    g.add(
      mesh(new SphereGeometry(r * 0.06, 6, 5), dark, -r * 0.12, cy - r * 0.18 * tall, r * 1.62),
    );
    g.add(
      mesh(new SphereGeometry(r * 0.06, 6, 5), dark, r * 0.12, cy - r * 0.18 * tall, r * 1.62),
    );

    for (const side of [-1, 1] as const) {
      const ear = new Mesh(new ConeGeometry(r * 0.14, r * 0.48, 5), fur);
      ear.position.set(side * r * 0.55, cy + r * 0.75 * tall, -r * 0.05);
      ear.rotation.z = side * 0.25;
      g.add(ear);
      g.add(
        mesh(
          new SphereGeometry(0.08, 8, 6),
          dark,
          side * r * 0.38,
          cy + r * 0.12 * tall,
          r * 0.5,
        ),
      );
    }
    // Mane stump
    g.add(
      mesh(new BoxGeometry(r * 0.35, r * 0.55, r * 0.25), horn, 0, cy + r * 0.55 * tall, -r * 0.55),
    );
    return true;
  }

  if (style === "snake") {
    const skull = new Mesh(new SphereGeometry(shellR * 0.95, 14, 12), fur);
    skull.position.set(skullPos.x, skullPos.y - r * 0.05 * tall, skullPos.z);
    skull.scale.set(eggX * 1.05, eggY * 0.72, eggZ * 1.15);
    g.add(skull);

    const snout = new Mesh(new BoxGeometry(r * 0.85, r * 0.38, r * 1.1), fur);
    snout.position.set(0, cy - r * 0.05 * tall, r * 0.85);
    g.add(snout);
    g.add(
      mesh(new ConeGeometry(r * 0.22, r * 0.4, 6), fur, 0, cy - r * 0.08 * tall, r * 1.45),
    );
    const tip = g.children[g.children.length - 1]!;
    tip.rotation.x = Math.PI / 2;

    // Hood flares
    for (const side of [-1, 1] as const) {
      const hood = new Mesh(new BoxGeometry(r * 0.35, r * 0.7, r * 0.12), fur);
      hood.position.set(side * r * 0.85, cy + r * 0.15 * tall, -r * 0.1);
      hood.rotation.z = side * -0.35;
      g.add(hood);
    }

    for (const side of [-1, 1] as const) {
      g.add(
        mesh(
          new SphereGeometry(0.1, 8, 6),
          dark,
          side * r * 0.4,
          cy + r * 0.08 * tall,
          r * 0.55,
        ),
      );
    }
    return true;
  }

  if (style === "triceratops") {
    const skull = new Mesh(new SphereGeometry(shellR, 14, 12), fur);
    skull.position.set(skullPos.x, skullPos.y, skullPos.z);
    skull.scale.set(eggX * 1.05, eggY * 0.85, eggZ * 0.95);
    g.add(skull);

    // Frill
    const frill = new Mesh(new CylinderGeometry(r * 1.15, r * 0.95, r * 0.18, 12), fur);
    frill.position.set(0, cy + r * 0.35 * tall, -r * 0.55);
    frill.rotation.x = Math.PI / 2.4;
    g.add(frill);
    g.add(
      mesh(new CylinderGeometry(r * 1.25, r * 1.05, r * 0.08, 12), horn, 0, cy + r * 0.4 * tall, -r * 0.62),
    );
    const rim = g.children[g.children.length - 1]!;
    rim.rotation.x = Math.PI / 2.4;

    // Brow horns
    for (const side of [-1, 1] as const) {
      const brow = new Mesh(new ConeGeometry(r * 0.16, r * 0.85, 6), horn);
      brow.position.set(side * r * 0.45, cy + r * 0.55 * tall, r * 0.55);
      brow.rotation.x = -0.85;
      brow.rotation.z = side * 0.2;
      g.add(brow);
    }
    // Nasal horn
    const nasal = new Mesh(new ConeGeometry(r * 0.12, r * 0.55, 6), horn);
    nasal.position.set(0, cy + r * 0.05 * tall, r * 1.05);
    nasal.rotation.x = -0.55;
    g.add(nasal);

    // Beak
    g.add(
      mesh(new ConeGeometry(r * 0.28, r * 0.4, 6), fur, 0, cy - r * 0.25 * tall, r * 1.15),
    );
    const beak = g.children[g.children.length - 1]!;
    beak.rotation.x = Math.PI / 2;

    for (const side of [-1, 1] as const) {
      g.add(
        mesh(
          new SphereGeometry(0.08, 8, 6),
          dark,
          side * r * 0.4,
          cy + r * 0.05 * tall,
          r * 0.7,
        ),
      );
    }
    return true;
  }

  if (style === "goblin") {
    const skull = new Mesh(new SphereGeometry(shellR, 14, 12), fur);
    skull.position.set(skullPos.x, skullPos.y, skullPos.z);
    skull.scale.set(eggX * 0.95, eggY * 0.95, eggZ * 0.92);
    g.add(skull);

    const nose = new Mesh(new ConeGeometry(r * 0.18, r * 0.55, 6), fur);
    nose.position.set(0, cy - r * 0.05 * tall, r * 0.85);
    nose.rotation.x = Math.PI / 2 + 0.15;
    g.add(nose);

    for (const side of [-1, 1] as const) {
      const ear = new Mesh(new ConeGeometry(r * 0.16, r * 0.55, 5), fur);
      ear.position.set(side * r * 0.95, cy + r * 0.25 * tall, 0);
      ear.rotation.z = side * 1.15;
      ear.rotation.x = 0.15;
      g.add(ear);
      g.add(
        mesh(
          new SphereGeometry(0.07, 8, 6),
          dark,
          side * r * 0.32,
          cy + r * 0.12 * tall,
          r * 0.62,
        ),
      );
    }
    g.add(
      mesh(new ConeGeometry(r * 0.1, r * 0.25, 5), fur, 0, cy - r * 0.75 * tall, r * 0.35),
    );
    return true;
  }

  if (style === "goblinWide") {
    const skull = new Mesh(new SphereGeometry(shellR, 14, 12), fur);
    skull.position.set(skullPos.x, skullPos.y - r * 0.05 * tall, skullPos.z);
    skull.scale.set(eggX * 1.25, eggY * 0.78, eggZ * 0.95);
    g.add(skull);

    g.add(
      mesh(new BoxGeometry(r * 0.55, r * 0.28, r * 0.4), fur, 0, cy - r * 0.1 * tall, r * 0.75),
    );

    for (const side of [-1, 1] as const) {
      const ear = new Mesh(new ConeGeometry(r * 0.2, r * 0.4, 5), fur);
      ear.position.set(side * r * 1.15, cy + r * 0.1 * tall, 0.05);
      ear.rotation.z = side * 1.35;
      g.add(ear);
      g.add(
        mesh(
          new SphereGeometry(0.09, 8, 6),
          dark,
          side * r * 0.48,
          cy + r * 0.08 * tall,
          r * 0.55,
        ),
      );
    }
    return true;
  }

  if (style === "goblinPointy") {
    const skull = new Mesh(new SphereGeometry(shellR, 14, 12), fur);
    skull.position.set(skullPos.x, skullPos.y + r * 0.08 * tall, skullPos.z);
    skull.scale.set(eggX * 0.78, eggY * 1.2, eggZ * 0.85);
    g.add(skull);

    const nose = new Mesh(new ConeGeometry(r * 0.12, r * 0.7, 6), fur);
    nose.position.set(0, cy + r * 0.05 * tall, r * 0.9);
    nose.rotation.x = Math.PI / 2 + 0.25;
    g.add(nose);

    for (const side of [-1, 1] as const) {
      const ear = new Mesh(new ConeGeometry(r * 0.12, r * 0.75, 5), fur);
      ear.position.set(side * r * 0.75, cy + r * 0.45 * tall, -0.05);
      ear.rotation.z = side * 0.85;
      ear.rotation.x = -0.2;
      g.add(ear);
      g.add(
        mesh(
          new SphereGeometry(0.065, 8, 6),
          dark,
          side * r * 0.28,
          cy + r * 0.2 * tall,
          r * 0.55,
        ),
      );
    }
    // Pointed chin
    g.add(
      mesh(new ConeGeometry(r * 0.14, r * 0.4, 5), fur, 0, cy - r * 0.85 * tall, r * 0.25),
    );
    return true;
  }

  return false;
}
