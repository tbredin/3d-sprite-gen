import type { NamedFacingId } from "../facing";
import type { CharacterSpec, PartVisibility } from "../chibi";
import type {
  BayerDitherSettings,
  OutlineColors,
  OutlinePassSettings,
  SpriteSize,
} from "../palette";
import type { EdgeOutlineSettings } from "../edgeOutline";
import type { RimLightSettings } from "../rimLights";

/**
 * Phase-1 isometric sprite facings — four screen-diagonal quarters.
 * Cardinals (`up`/`down`/`left`/`right`) snap to the nearest of these in 2D mode.
 */
export type IsoDir2D = "toward-br" | "toward-bl" | "away-tr" | "away-tl";

export const ISO_DIRS_2D: readonly IsoDir2D[] = [
  "toward-br",
  "toward-bl",
  "away-tr",
  "away-tl",
] as const;

export const ISO_DIR_2D_SET: ReadonlySet<string> = new Set(ISO_DIRS_2D);

export function isIsoDir2D(id: string): id is IsoDir2D {
  return ISO_DIR_2D_SET.has(id);
}

/** Clockwise cycle used by hold/continuous rotate in 2D mode. */
export const ISO_DIR_2D_CYCLE: readonly IsoDir2D[] = [
  "toward-br",
  "toward-bl",
  "away-tl",
  "away-tr",
] as const;

export type DrawCharacterOptions = {
  facing: IsoDir2D;
  size: SpriteSize;
  bodyScale: number;
  /** Vertical offset for torso/arms/legs only — head stays pinned (head-units). */
  bodyY?: number;
  mirror?: boolean;
  partVisibility?: PartVisibility;
};

export type Sprite2DBakeOptions = DrawCharacterOptions & {
  colors: string[];
  outlineColors: OutlineColors;
  outlinePass: OutlinePassSettings;
  edgeOutline?: EdgeOutlineSettings;
  rimLights: RimLightSettings;
  bayerDither?: BayerDitherSettings | null;
};

/** Shared paint state for every 2D part drawer. */
export type DrawCtx = {
  ctx: CanvasRenderingContext2D;
  size: number;
  facing: IsoDir2D;
  /** Pixels per world head-unit. */
  scale: number;
  /** Screen origin (character pivot projected). */
  ox: number;
  oy: number;
  /** Character root yaw matching `getFacing(facing).rotationY`. */
  yaw: number;
  /**
   * Body-only vertical offset (head-units). Applied inside `project` so torso /
   * limbs / accessories shift without moving the head stack. Zero while drawing
   * neck/head/hair/face/helmet.
   */
  bodyY: number;
  /** Face/eyes visible (toward-* facings). */
  showFace: boolean;
  /** Screen-X flip for left-side diagonals (toward-bl / away-tl). */
  flipX: number;
  spec: CharacterSpec;
  lead: "left" | "right";
};

export type Pt = { x: number; y: number };

/** Map any named facing (incl. cardinals) onto the nearest phase-1 diagonal. */
export function snapFacingToIsoDir2D(id: NamedFacingId | "custom"): IsoDir2D {
  switch (id) {
    case "toward-br":
    case "toward-bl":
    case "away-tr":
    case "away-tl":
      return id;
    case "down":
      return "toward-br";
    case "right":
      return "toward-br";
    case "up":
      return "away-tr";
    case "left":
      return "toward-bl";
    default:
      return "toward-br";
  }
}

/** Snap a free yaw (radians) onto the nearest of the four diagonals. */
export function snapYawToIsoDir2D(yaw: number): IsoDir2D {
  const dirs: { id: IsoDir2D; yaw: number }[] = [
    { id: "toward-bl", yaw: 0 },
    { id: "toward-br", yaw: Math.PI / 2 },
    { id: "away-tr", yaw: Math.PI },
    { id: "away-tl", yaw: -Math.PI / 2 },
  ];
  let best = dirs[0]!;
  let bestDist = Infinity;
  for (const d of dirs) {
    let delta = ((yaw - d.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const dist = Math.abs(delta);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best.id;
}
