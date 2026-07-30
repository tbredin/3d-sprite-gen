import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  BakeCanvas,
  saveSprite,
  DEFAULT_EDGE_OUTLINE_SETTINGS,
  EDGE_BLUR_MAX,
  EDGE_BLUR_MIN,
  EDGE_BLUR_STEP,
  EDGE_DEPTH_MAX,
  EDGE_DEPTH_MIN,
  EDGE_DEPTH_STEP,
  EDGE_DILATE_MAX,
  EDGE_DILATE_MIN,
  EDGE_DILATE_STEP,
  EDGE_GAMMA_MAX,
  EDGE_GAMMA_MIN,
  EDGE_GAMMA_STEP,
  EDGE_NORMAL_MAX,
  EDGE_NORMAL_MIN,
  EDGE_NORMAL_STEP,
  EDGE_OPACITY_MAX,
  EDGE_OPACITY_MIN,
  EDGE_OPACITY_STEP,
  EDGE_SOFTNESS_MAX,
  EDGE_SOFTNESS_MIN,
  EDGE_SOFTNESS_STEP,
  EDGE_WEIGHT_MAX,
  EDGE_WEIGHT_MIN,
  EDGE_WEIGHT_STEP,
  loadEdgeOutlineSettings,
  saveEdgeOutlineSettings,
  type EdgeOutlineSettings,
} from "./components/BakeCanvas";
import {
  loadOutlineProfiles,
  saveOutlineProfiles,
  snapshotCurrentOutline,
  type OutlineProfile,
} from "./lib/outlineProfiles";
import { normalizeEdgeOutlineSettings } from "./lib/edgeOutline";
import { CollapseSection } from "./components/CollapseSection";
import { FreeformColorButton } from "./components/FreeformColorButton";
import { OutlineSwatchSelect } from "./components/OutlineSwatchSelect";
import { PartColorMenu } from "./components/PartColorMenu";
import { PaletteColorButton } from "./components/PaletteColorButton";
import { VariationTimeline } from "./components/VariationTimeline";
import { CaptionRefsPanel } from "./components/CaptionRefsPanel";
import { fetchStatus, type StatusResponse } from "./api";
import { buildVariationPrompt } from "./lib/variationPrompt";
import {
  DEFAULT_FACING,
  FACING_PAD,
  getFacing,
  loadFacingPersist,
  saveFacingPersist,
  shortestAngleDelta,
  ROTATE_FACING_SPEED,
  type FacingId,
  type NamedFacingId,
} from "./lib/facing";
import {
  EMPTY_LOCKS,
  EMPTY_FIELD_LOCKS,
  FIELD_LOCK_PART,
  getPreset,
  PART_IDS,
  PRESET_IDS,
  PRESET_LABELS,
  randomCharacter,
  randomBodyScale,
  randomCoupledProportions,
  rerollPart,
  rerollField,
  rerollPartColors,
  rerollEyes,
  applyBodyScale as setChibiBodyScale,
  BODY_SCALE_MIN,
  BODY_SCALE_MAX,
  BODY_SCALE_DEFAULT,
  BODY_Y_MIN,
  BODY_Y_MAX,
  BODY_Y_DEFAULT,
  DEFAULT_PART_VISIBILITY,
  type PartVisibility,
  loadBodyScale,
  saveBodyScale,
  loadBodyY,
  saveBodyY,
  loadCharacterPersist,
  saveCharacterPersist,
  HEAD_SHAPES,
  EYE_STYLES,
  BROW_STYLES,
  HAIR_STYLES,
  HELMET_STYLES,
  isMonsterHelmet,
  TORSO_STYLES,
  BODY_DETAIL_STYLES,
  HEM_STYLES,
  WEAPON_TYPES,
  OFFHAND_TYPES,
  OFFHAND_VARIANT_IDS,
  setOffhandVariant,
  getOffhandVariant,
  BACK_LOADOUTS,
  ARM_POSES,
  LEG_POSES,
  setHeadShape,
  setEyeStyle,
  setBrowStyle,
  setHairStyle,
  setHelmetStyle,
  setTorsoStyle,
  setBodyDetailStyle,
  setHemStyle,
  setCape,
  setPouches,
  setBackLoadout,
  setArmPose,
  setWeaponType,
  setOffhandType,
  setLegPose,
  setFaction,
  rerollFaction,
  isHeadReplacement,
  FACTION_IDS,
  FACTION_LABELS,
  type CharacterSpec,
  type PartId,
  type PartLocks,
  type FieldLockId,
  type FieldLocks,
  type PresetId,
  type HeadShape,
  type EyeStyle,
  type BrowStyle,
  type HairStyle,
  type HelmetStyle,
  type TorsoStyle,
  type BodyDetailStyle,
  type HemStyle,
  type BackLoadout,
  type ArmPose,
  type LegPose,
  type WeaponType,
  type FactionId,
} from "./lib/chibi";
import { remapSpecToPalette } from "./lib/chibi/paletteRemap";
import {
  BAYER_STRENGTH_MAX,
  BAYER_STRENGTH_MIN,
  BAYER_STRENGTH_STEP,
  DEFAULT_BAYER_DITHER,
  DEFAULT_OUTLINE_PASS,
  defaultOutlineColors,
  loadBayerDitherSettings,
  loadOutlineColors,
  loadOutlinePassSettings,
  loadPalette,
  saveBayerDitherSettings,
  saveOutlineColors,
  saveOutlinePassSettings,
  SPRITE_SIZE_MAX,
  SPRITE_SIZE_MIN,
  SPRITE_SIZE_STEP,
  SPRITE_SIZES,
  type BayerDitherSettings,
  type OutlineColors,
  type OutlinePassSettings,
  type Palette,
  type SpriteSize,
  normalizePaletteHex,
} from "./lib/palette";
import {
  DEFAULT_RIM_LIGHTS,
  loadRimLightSettings,
  normalizeRimLightSettings,
  saveRimLightSettings,
  type RimLightSettings,
} from "./lib/rimLights";
import {
  BUILTIN_LIGHTING_PRESETS,
  loadLightingProfiles,
  saveLightingProfiles,
  snapshotCurrentLighting,
  type LightingProfile,
} from "./lib/lightingProfiles";
import {
  DEFAULT_CAMERA_HEIGHT,
  loadCameraHeight,
  saveCameraHeight,
} from "./lib/isoCamera";
import { Sprite2DCanvas } from "./components/Sprite2DCanvas";
import {
  ISO_DIR_2D_CYCLE,
  isIsoDir2D,
  snapFacingToIsoDir2D,
  snapYawToIsoDir2D,
  type IsoDir2D,
} from "./lib/chibi2d";
import "./App.css";

type ViewMode = "3d" | "2d";

const PITCH_LIMIT = Math.PI / 2 - 0.05;

/** Soft global lights — Amb is the universal fill slider. */
const FILL_LIGHT_ROWS = [
  {
    key: "ambientBrightness" as const,
    label: "Amb",
    title: "Ambience",
    min: 0,
    max: 1.2,
    step: 0.02,
    colorKey: "ambientColor" as const,
    tone: "",
  },
  {
    key: "keyBrightness" as const,
    label: "Key",
    title: "Key fill",
    min: 0,
    max: 4,
    step: 0.05,
    colorKey: "keyColor" as const,
    tone: "",
  },
];

/** Harsh directional rims — parked behind the character (not ambient wash). */
const RIM_LIGHT_ROWS = [
  { key: "redBrightness", label: "L bri", min: 0, max: 8, step: 0.05, tone: "light-left" },
  { key: "blueBrightness", label: "R bri", min: 0, max: 8, step: 0.05, tone: "light-right" },
  { key: "redBehind", label: "L beh", min: -1, max: 6, step: 0.05, tone: "light-left" },
  { key: "blueBehind", label: "R beh", min: -1, max: 6, step: 0.05, tone: "light-right" },
  { key: "redSide", label: "L side", min: 0, max: 5, step: 0.05, tone: "light-left" },
  { key: "blueSide", label: "R side", min: 0, max: 5, step: 0.05, tone: "light-right" },
  { key: "redHeight", label: "L hgt", min: -180, max: 180, step: 1, tone: "light-left" },
  { key: "blueHeight", label: "R hgt", min: -180, max: 180, step: 1, tone: "light-right" },
] as const;

const RIM_COLOR_FIELDS = [
  { key: "redColor", label: "Left" },
  { key: "blueColor", label: "Right" },
] as const;

function clampPitch(rad: number) {
  return Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, rad));
}

/** "knightBarbute" → "knight barbute" for readable dropdown labels. */
function humanize(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

/** Compact unlabeled select for inline part rows. */
function CompactSelect<T extends string>({
  value,
  options,
  onPick,
  disabled,
  title,
}: {
  value: T;
  options: readonly T[];
  onPick: (v: T) => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <select
      className="part-inline-select"
      value={value}
      disabled={disabled}
      title={title}
      aria-label={title}
      onChange={(e) => onPick(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {humanize(o)}
        </option>
      ))}
    </select>
  );
}

/**
 * Wraps one part-row dropdown with stacked 🔒 (top) + 🎲 (bottom). A pinned
 * field keeps its value through Play random and both dice; the section lock
 * still pins everything.
 */
function FieldControlGroup({
  field,
  label,
  locked,
  pinned,
  onToggle,
  onReroll,
  children,
}: {
  field: FieldLockId;
  label: string;
  locked: boolean;
  pinned: boolean;
  onToggle: (field: FieldLockId) => void;
  onReroll: (field: FieldLockId) => void;
  children: ReactNode;
}) {
  const lockAction = locked ? `Unlock ${label}` : `Lock ${label}`;
  const rerollAction = pinned
    ? `Unlock to reroll ${label}`
    : `Reroll ${label}`;
  return (
    <div className={`part-field${locked ? " is-locked" : ""}`}>
      <div className="part-field-controls">
        <button
          type="button"
          className={`part-icon-btn part-field-lock${locked ? " is-locked" : ""}`}
          onClick={() => onToggle(field)}
          title={lockAction}
          aria-label={lockAction}
          aria-pressed={locked}
        >
          {locked ? "🔒" : "🔓"}
        </button>
        <button
          type="button"
          className="part-icon-btn part-field-reroll"
          onClick={() => onReroll(field)}
          disabled={pinned}
          title={rerollAction}
          aria-label={`Reroll ${label}`}
        >
          🎲
        </button>
      </div>
      {children}
    </div>
  );
}

/** Show/hide checkbox — no label, sits left of the row lock. */
function PartVisibilityToggle({
  part,
  checked,
  onToggle,
}: {
  part: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="part-visibility">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        title={checked ? `Hide ${part}` : `Show ${part}`}
        aria-label={checked ? `Hide ${part}` : `Show ${part}`}
      />
    </label>
  );
}

export default function App() {
  const [facingPersist] = useState(() => loadFacingPersist());
  const [facing, setFacing] = useState<FacingId>(facingPersist.facing);
  const [rotationX, setRotationX] = useState(facingPersist.rotationX);
  const [rotationY, setRotationY] = useState(facingPersist.rotationY);
  const [size, setSize] = useState<SpriteSize>(48);
  const [cameraHeight, setCameraHeight] = useState(() => loadCameraHeight());
  /** 3D low-poly bake vs pure Canvas2D isometric sprite drawer. */
  const [viewMode, setViewMode] = useState<ViewMode>("3d");
  const [autoRotate, setAutoRotate] = useState(false);
  /** -1 = hold left, 1 = hold right, 0 = none. Overrides auto-rotate direction while held. */
  const [holdDir, setHoldDir] = useState<-1 | 0 | 1>(0);
  /** Ping-pong mode: model sweeps back and forth between two picked facings. */
  const [oscillate, setOscillate] = useState(false);
  /** The two facings that bound the oscillation (order = selection order). */
  const [oscillateEndpoints, setOscillateEndpoints] = useState<NamedFacingId[]>([]);
  /** Last session's character, or null on a first / cleared visit. */
  const [characterPersist] = useState(() => loadCharacterPersist());
  const [presetId, setPresetId] = useState<PresetId | "random">(
    characterPersist?.presetId ?? "knight",
  );
  const [bodyScale, setBodyScale] = useState(() => loadBodyScale());
  const [bodyY, setBodyY] = useState(() => loadBodyY());
  const [spec, setSpec] = useState<CharacterSpec>(
    () => characterPersist?.spec ?? getPreset("knight"),
  );
  const [specText, setSpecText] = useState(() =>
    JSON.stringify(characterPersist?.spec ?? getPreset("knight"), null, 2),
  );
  const [specParseError, setSpecParseError] = useState<string | null>(null);
  const specFileRef = useRef<HTMLInputElement>(null);
  const specTextTimerRef = useRef<number | null>(null);
  const [locks, setLocks] = useState<PartLocks>(
    () => characterPersist?.locks ?? { ...EMPTY_LOCKS },
  );
  const [fieldLocks, setFieldLocks] = useState<FieldLocks>({
    ...EMPTY_FIELD_LOCKS,
  });
  /** Body scale is app-level (not part of the spec), so it locks on its own. */
  const [bodyScaleLocked, setBodyScaleLocked] = useState(
    () => characterPersist?.bodyScaleLocked ?? false,
  );
  const [mirror, setMirror] = useState(characterPersist?.mirror ?? false);
  const [partVisibility, setPartVisibility] = useState<PartVisibility>(
    () => characterPersist?.partVisibility ?? { ...DEFAULT_PART_VISIBILITY },
  );
  /** Session preference: closed helms in random rolls. Hats/crowns stay allowed. */
  const [allowHelmets, setAllowHelmets] = useState(
    characterPersist?.allowHelmets ?? false,
  );
  const [factionLocked, setFactionLocked] = useState(
    () => characterPersist?.factionLocked ?? false,
  );
  const [allowMonsters, setAllowMonsters] = useState(
    characterPersist?.allowMonsters ?? false,
  );
  const [rimLights, setRimLights] = useState<RimLightSettings>(() =>
    loadRimLightSettings(),
  );
  const [lightingProfiles, setLightingProfiles] = useState<LightingProfile[]>(
    () => loadLightingProfiles(),
  );
  const [profileName, setProfileName] = useState("");
  const [outlineColors, setOutlineColors] = useState<OutlineColors>(() =>
    loadOutlineColors(),
  );
  const [outlinePass, setOutlinePass] = useState<OutlinePassSettings>(() =>
    loadOutlinePassSettings(),
  );
  const [edgeOutline, setEdgeOutline] = useState<EdgeOutlineSettings>(
    () => loadEdgeOutlineSettings(),
  );
  const [outlineProfiles, setOutlineProfiles] = useState<OutlineProfile[]>(
    () => loadOutlineProfiles(),
  );
  const [outlineProfileId, setOutlineProfileId] = useState("");
  const [outlineProfileName, setOutlineProfileName] = useState("");
  const [bayerDither, setBayerDither] = useState<BayerDitherSettings>(() =>
    loadBayerDitherSettings(),
  );
  const [palette, setPalette] = useState<Palette | null>(null);
  const [paletteSlug, setPaletteSlug] = useState("endesga-64");
  const [paletteSlugDraft, setPaletteSlugDraft] = useState("endesga-64");
  const [preview, setPreview] = useState<string | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [specOpen, setSpecOpen] = useState(false);
  const [offhandVariant, setOffhandVariantState] = useState<string>(
    () => OFFHAND_VARIANT_IDS[getOffhandVariant()],
  );
  const [characterOpen, setCharacterOpen] = useState(true);
  const [lightsOpen, setLightsOpen] = useState(true);
  const [lightingProfileId, setLightingProfileId] = useState("");
  const [outlinesOpen, setOutlinesOpen] = useState(true);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    rotX: number;
    rotY: number;
  } | null>(null);
  const spinYawRef = useRef(facingPersist.rotationY);
  /** Skip remapping on the initial palette load so persisted specs stay intact. */
  const prevPaletteSlugRef = useRef<string | null>(null);

  // Sprite scales with bake size; frame stays at 64px-bake display to avoid CLS.
  const spritePx = size * 4;
  const framePx = 64 * 4;
  const spinSpeed =
    holdDir !== 0
      ? holdDir * ROTATE_FACING_SPEED
      : autoRotate
        ? ROTATE_FACING_SPEED
        : 0;
  // Oscillation needs exactly two distinct endpoints to sweep between.
  const oscillateActive = oscillate && oscillateEndpoints.length === 2;
  const oscillateFrom = oscillateActive
    ? getFacing(oscillateEndpoints[0]!).rotationY
    : 0;
  const oscillateDelta = oscillateActive
    ? shortestAngleDelta(
        oscillateFrom,
        getFacing(oscillateEndpoints[1]!).rotationY,
      )
    : 0;
  const spinning = spinSpeed !== 0 || oscillateActive;
  const rotateMode = spinning;

  const stopSpinAndCommit = () => {
    setAutoRotate(false);
    setHoldDir(0);
    setOscillate(false);
    const yaw = spinYawRef.current;
    setFacing("custom");
    setRotationY(yaw);
  };

  const applyFacing = (id: FacingId) => {
    if (id === "custom") return;
    const next = viewMode === "2d" ? snapFacingToIsoDir2D(id) : id;
    setAutoRotate(false);
    setHoldDir(0);
    setOscillate(false);
    setFacing(next);
    setRotationX(0);
    const yaw = getFacing(next).rotationY;
    setRotationY(yaw);
    spinYawRef.current = yaw;
  };

  const stepIsoDir2D = (dir: -1 | 1) => {
    const cur: IsoDir2D = isIsoDir2D(facing)
      ? facing
      : facing === "custom"
        ? snapYawToIsoDir2D(rotationY)
        : snapFacingToIsoDir2D(facing);
    const idx = ISO_DIR_2D_CYCLE.indexOf(cur);
    const next = ISO_DIR_2D_CYCLE[(idx + dir + ISO_DIR_2D_CYCLE.length) % ISO_DIR_2D_CYCLE.length]!;
    setFacing(next);
    setRotationX(0);
    const yaw = getFacing(next).rotationY;
    setRotationY(yaw);
    spinYawRef.current = yaw;
  };

  const switchViewMode = (mode: ViewMode) => {
    if (mode === viewMode) return;
    setAutoRotate(false);
    setHoldDir(0);
    setOscillate(false);
    setViewMode(mode);
    if (mode === "2d") {
      setRotationX(0);
      const next =
        facing === "custom"
          ? snapYawToIsoDir2D(rotationY)
          : snapFacingToIsoDir2D(facing);
      setFacing(next);
      const yaw = getFacing(next).rotationY;
      setRotationY(yaw);
      spinYawRef.current = yaw;
    }
  };

  const toggleAutoRotate = () => {
    if (autoRotate) {
      if (viewMode === "2d") {
        setAutoRotate(false);
        return;
      }
      stopSpinAndCommit();
      return;
    }
    setHoldDir(0);
    setOscillate(false);
    if (viewMode === "2d") {
      if (!isIsoDir2D(facing)) {
        const next =
          facing === "custom"
            ? snapYawToIsoDir2D(rotationY)
            : snapFacingToIsoDir2D(facing);
        setFacing(next);
        const yaw = getFacing(next).rotationY;
        setRotationY(yaw);
        spinYawRef.current = yaw;
      }
      setAutoRotate(true);
      return;
    }
    spinYawRef.current = rotationY;
    setFacing("custom");
    setAutoRotate(true);
  };

  /**
   * Center pad button toggles oscillate mode. Turning it on parks the model in
   * "custom" (live) yaw so the pivot drives the sweep; turning it off commits
   * the current live yaw so drag/other controls pick up seamlessly.
   * Disabled in 2D mode (discrete 4-way facings only).
   */
  const toggleOscillate = () => {
    if (viewMode === "2d") return;
    if (oscillate) {
      const yaw = spinYawRef.current;
      setOscillate(false);
      setFacing("custom");
      setRotationY(yaw);
      return;
    }
    setAutoRotate(false);
    setHoldDir(0);
    if (!spinning) spinYawRef.current = rotationY;
    setFacing("custom");
    setOscillate(true);
  };

  /** While oscillating, the 8 pad buttons pick the two sweep endpoints. */
  const toggleOscillateEndpoint = (id: NamedFacingId) => {
    setOscillateEndpoints((prev) => {
      if (prev.includes(id)) return prev.filter((e) => e !== id);
      // Keep a rolling window of the two most recent picks.
      return [...prev, id].slice(-2);
    });
  };

  const onFacingButton = (id: NamedFacingId) => {
    if (viewMode === "2d" && !isIsoDir2D(id)) return;
    if (oscillate) {
      toggleOscillateEndpoint(id);
      return;
    }
    applyFacing(id);
  };

  const onHoldRotateStart = (dir: -1 | 1) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setOscillate(false);
    if (viewMode === "2d") {
      setAutoRotate(false);
      setHoldDir(dir);
      return;
    }
    if (!spinning) spinYawRef.current = rotationY;
    setFacing("custom");
    setHoldDir(dir);
  };

  const onHoldRotateEnd = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setHoldDir(0);
    if (viewMode === "2d") return;
    if (!autoRotate) {
      const yaw = spinYawRef.current;
      setFacing("custom");
      setRotationY(yaw);
    }
  };

  /** Discrete 4-way spin while holding / auto-rotating in 2D mode. */
  useEffect(() => {
    if (viewMode !== "2d") return;
    if (!autoRotate && holdDir === 0) return;
    const dir: -1 | 1 = holdDir !== 0 ? holdDir : 1;
    const tick = () => {
      setFacing((prev) => {
        const cur: IsoDir2D = isIsoDir2D(prev)
          ? prev
          : snapYawToIsoDir2D(spinYawRef.current);
        const idx = ISO_DIR_2D_CYCLE.indexOf(cur);
        const next =
          ISO_DIR_2D_CYCLE[
            (idx + dir + ISO_DIR_2D_CYCLE.length) % ISO_DIR_2D_CYCLE.length
          ]!;
        const yaw = getFacing(next).rotationY;
        setRotationY(yaw);
        spinYawRef.current = yaw;
        setRotationX(0);
        return next;
      });
    };
    tick();
    const id = window.setInterval(tick, 420);
    return () => window.clearInterval(id);
  }, [viewMode, autoRotate, holdDir]);

  useEffect(() => {
    saveFacingPersist({ facing, rotationX, rotationY });
  }, [facing, rotationX, rotationY]);

  useEffect(() => {
    saveCharacterPersist({
      spec,
      locks,
      bodyScaleLocked,
      presetId,
      mirror,
      partVisibility,
      allowHelmets,
      factionLocked,
      allowMonsters,
    });
  }, [spec, locks, bodyScaleLocked, presetId, mirror, partVisibility, allowHelmets, factionLocked, allowMonsters]);

  const applyPreset = (id: PresetId) => {
    setPresetId(id);
    const next = getPreset(id);
    setSpec(next);
    setSpecText(JSON.stringify(next, null, 2));
    setSpecParseError(null);
  };

  /** Jump to a different built-in preset (never re-picks the current one). */
  const applyRandomPreset = () => {
    const options = PRESET_IDS.filter((id) => id !== presetId);
    const next =
      options[Math.floor(Math.random() * options.length)] ?? PRESET_IDS[0]!;
    applyPreset(next);
  };

  const onBodyScaleChange = (scale: number) => {
    setBodyScale(scale);
    setChibiBodyScale(scale);
    saveBodyScale(scale);
  };

  const onBodyYChange = (y: number) => {
    setBodyY(y);
    saveBodyY(y);
  };

  /** Knight preset + every Character-panel slider / lock back to defaults. */
  const resetCharacterPanel = () => {
    applyPreset("knight");
    onBodyScaleChange(BODY_SCALE_DEFAULT);
    onBodyYChange(BODY_Y_DEFAULT);
    setBodyScaleLocked(false);
    setLocks({ ...EMPTY_LOCKS });
    setFieldLocks({ ...EMPTY_FIELD_LOCKS });
    setMirror(false);
    setPartVisibility({ ...DEFAULT_PART_VISIBILITY });
    setAllowHelmets(false);
    setSize(48);
    setCameraHeight(DEFAULT_CAMERA_HEIGHT);
    saveCameraHeight(DEFAULT_CAMERA_HEIGHT);
    setAutoRotate(false);
    setHoldDir(0);
    setOscillate(false);
    setOscillateEndpoints([]);
    const yaw = getFacing(DEFAULT_FACING).rotationY;
    setFacing(DEFAULT_FACING);
    setRotationX(0);
    setRotationY(yaw);
    spinYawRef.current = yaw;
    const defaultOffhand = OFFHAND_VARIANT_IDS[0]!;
    setOffhandVariant(0);
    setOffhandVariantState(defaultOffhand);
  };

  const applyRandom = () => {
    setPresetId("random");

    const coupleBoth = !bodyScaleLocked && !locks.headSize;
    const coupled = coupleBoth ? randomCoupledProportions() : null;
    const nextBody = coupled
      ? coupled.bodyScale
      : !bodyScaleLocked
        ? randomBodyScale(spec.head?.size ?? 1)
        : null;

    setSpec((prev) => {
      const next = randomCharacter(
        locks,
        prev,
        {
          allowHelmets,
          keepFaction: factionLocked,
          allowMonsters,
          bodyScale: nextBody ?? bodyScale,
          headProportions: coupled
            ? { size: coupled.size, yScale: coupled.yScale }
            : undefined,
        },
        fieldLocks,
      );
      setSpecText(JSON.stringify(next, null, 2));
      setSpecParseError(null);
      return next;
    });

    if (nextBody != null) onBodyScaleChange(nextBody);
  };

  const toggleLock = (part: keyof PartLocks) => {
    setLocks((prev) => ({ ...prev, [part]: !prev[part] }));
  };

  const toggleFieldLock = (field: FieldLockId) => {
    setFieldLocks((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  /** Effective lock for one dropdown: its own pin or its section's. */
  const fieldPinned = (field: FieldLockId) =>
    fieldLocks[field] || Boolean(locks[FIELD_LOCK_PART[field]]);

  const applyRerollPart = (part: PartId) => {
    setPresetId("random");
    setSpec((prev) => {
      const next = rerollPart(
        prev,
        part,
        locks,
        { allowHelmets, allowMonsters, bodyScale },
        fieldLocks,
      );
      setSpecText(JSON.stringify(next, null, 2));
      setSpecParseError(null);
      return next;
    });
  };

  const applyRerollField = (field: FieldLockId) => {
    if (fieldPinned(field)) return;
    if (field === "offhandAngle") {
      const options = OFFHAND_VARIANT_IDS.filter((id) => id !== offhandVariant);
      const nextId =
        options[Math.floor(Math.random() * options.length)] ??
        OFFHAND_VARIANT_IDS[0]!;
      setOffhandVariant(OFFHAND_VARIANT_IDS.indexOf(nextId));
      setOffhandVariantState(nextId);
      applyPartEdit((s) => s);
      return;
    }
    setPresetId("random");
    setSpec((prev) => {
      const next = rerollField(prev, field, { allowHelmets, allowMonsters });
      setSpecText(JSON.stringify(next, null, 2));
      setSpecParseError(null);
      return next;
    });
  };

  const applyRerollColors = (part: PartId) => {
    setPresetId("random");
    setSpec((prev) => {
      const next = rerollPartColors(prev, part, locks, { allowMonsters });
      setSpecText(JSON.stringify(next, null, 2));
      setSpecParseError(null);
      return next;
    });
  };

  const applyRerollEyes = () => {
    setPresetId("random");
    setSpec((prev) => {
      const next = rerollEyes(prev, fieldLocks, locks);
      setSpecText(JSON.stringify(next, null, 2));
      setSpecParseError(null);
      return next;
    });
  };

  /** Apply a direct sub-part edit from a debug dropdown (keeps colours). */
  const applyPartEdit = (fn: (s: CharacterSpec) => CharacterSpec) => {
    setPresetId("random");
    setSpec((prev) => {
      const next = fn(prev);
      // Defer JSON panel sync so slider drags don't stringify every tick.
      if (specTextTimerRef.current != null) {
        window.clearTimeout(specTextTimerRef.current);
      }
      specTextTimerRef.current = window.setTimeout(() => {
        setSpecText(JSON.stringify(next, null, 2));
        specTextTimerRef.current = null;
      }, 120);
      setSpecParseError(null);
      return next;
    });
  };

  /** Dist / Size / Y are pinned by the eyes section lock or their own row lock. */
  const eyeSlidersDisabled =
    !partVisibility.eyes || locks.eyes || locks.eyeLayout;

  const togglePartVisible = (part: keyof PartVisibility) => {
    setPartVisibility((prev) => ({ ...prev, [part]: !prev[part] }));
  };

  const applySpecFromParsed = (parsed: unknown) => {
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Spec must be a JSON object");
    }
    const o = parsed as Partial<CharacterSpec>;
    if (typeof o.skin !== "string" || !o.torso || !o.arms || !o.legs) {
      throw new Error("Spec needs skin, torso, arms, and legs");
    }
    const next = structuredClone(parsed) as CharacterSpec;
    setPresetId("random");
    setSpec(next);
    return next;
  };

  const onSpecTextChange = (text: string) => {
    setSpecText(text);
    try {
      const parsed: unknown = JSON.parse(text);
      applySpecFromParsed(parsed);
      setSpecParseError(null);
    } catch (e) {
      setSpecParseError(e instanceof Error ? e.message : String(e));
    }
  };

  const downloadSpecJson = () => {
    const blob = new Blob([JSON.stringify(spec, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `character-spec-${presetId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySpecJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onLoadSpecFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const next = applySpecFromParsed(parsed);
      setSpecText(JSON.stringify(next, null, 2));
      setSpecParseError(null);
    } catch (e) {
      setSpecParseError(e instanceof Error ? e.message : String(e));
    }
  };

  const patchRimLights = (patch: Partial<RimLightSettings>) => {
    setLightingProfileId("");
    setRimLights((prev) => {
      const next = normalizeRimLightSettings({ ...prev, ...patch });
      saveRimLightSettings(next);
      return next;
    });
  };

  const resetRimLights = () => {
    const next = { ...DEFAULT_RIM_LIGHTS };
    saveRimLightSettings(next);
    setRimLights(next);
    setLightingProfileId("");
  };

  const persistProfiles = (next: LightingProfile[]) => {
    saveLightingProfiles(next);
    setLightingProfiles(next);
  };

  const saveLightingProfile = () => {
    const name = profileName.trim();
    if (!name) return;
    const settings = normalizeRimLightSettings(rimLights);
    const existing = lightingProfiles.find(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      const next = lightingProfiles.map((p) =>
        p.id === existing.id
          ? {
              ...p,
              name,
              settings,
              updatedAt: Date.now(),
            }
          : p,
      );
      persistProfiles(next);
      setLightingProfileId(existing.id);
    } else {
      const created = snapshotCurrentLighting(settings, name);
      persistProfiles([...lightingProfiles, created]);
      setLightingProfileId(created.id);
    }
    setProfileName("");
  };

  const findLightingProfile = (id: string): LightingProfile | undefined =>
    BUILTIN_LIGHTING_PRESETS.find((p) => p.id === id) ??
    lightingProfiles.find((p) => p.id === id);

  const loadLightingProfile = (id: string) => {
    const profile = findLightingProfile(id);
    if (!profile) return;
    const next = normalizeRimLightSettings(profile.settings);
    saveRimLightSettings(next);
    setRimLights(next);
    setLightingProfileId(id);
  };

  const deleteLightingProfile = (id: string) => {
    if (id.startsWith("builtin-")) return;
    persistProfiles(lightingProfiles.filter((p) => p.id !== id));
    if (lightingProfileId === id) setLightingProfileId("");
  };

  const onPreviewPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (viewMode === "2d") {
      setAutoRotate(false);
      setHoldDir(0);
      dragRef.current = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        rotX: 0,
        rotY: rotationY,
      };
      return;
    }
    // Snap off the turntable at the live yaw so drag doesn't jump.
    const rotY = spinning ? spinYawRef.current : rotationY;
    if (spinning) {
      setAutoRotate(false);
      setHoldDir(0);
      setOscillate(false);
      setFacing("custom");
      setRotationY(rotY);
    }
    dragRef.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      rotX: rotationX,
      rotY,
    };
  };

  const onPreviewPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (dx === 0 && dy === 0) return;
    if (viewMode === "2d") {
      const stepPx = 40;
      if (Math.abs(dx) < stepPx) return;
      const steps = Math.round(dx / stepPx);
      const dir: -1 | 1 = steps > 0 ? -1 : 1;
      for (let i = 0; i < Math.abs(steps); i++) stepIsoDir2D(dir);
      drag.x = e.clientX;
      drag.rotY = spinYawRef.current;
      return;
    }
    setFacing("custom");
    setRotationY(drag.rotY + dx * 0.012);
    setRotationX(clampPitch(drag.rotX + dy * 0.012));
  };

  const onPreviewPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
    }
  };

  useEffect(() => {
    saveFacingPersist({ facing, rotationX, rotationY });
  }, [facing, rotationX, rotationY]);

  const patchOutlineColor = (patch: Partial<OutlineColors>) => {
    setOutlineProfileId("");
    setOutlineColors((prev) => {
      const next = { ...prev, ...patch };
      saveOutlineColors(next);
      return next;
    });
  };

  const patchOutlinePass = (patch: Partial<OutlinePassSettings>) => {
    setOutlineProfileId("");
    setOutlinePass((prev) => {
      const next = { ...prev, ...patch };
      saveOutlinePassSettings(next);
      return next;
    });
  };

  const patchEdgeOutline = (patch: Partial<EdgeOutlineSettings>) => {
    setOutlineProfileId("");
    setEdgeOutline((prev) => {
      const next = normalizeEdgeOutlineSettings({ ...prev, ...patch });
      saveEdgeOutlineSettings(next);
      return next;
    });
  };

  const setEdgeColor = (hex: string) => {
    patchEdgeOutline({ color: hex });
  };

  const resetEdgeOutline = () => {
    const next = { ...DEFAULT_EDGE_OUTLINE_SETTINGS };
    saveEdgeOutlineSettings(next);
    setEdgeOutline(next);
    setOutlineProfileId("");
  };

  const patchBayerDither = (patch: Partial<BayerDitherSettings>) => {
    setBayerDither((prev) => {
      const next = { ...prev, ...patch };
      saveBayerDitherSettings(next);
      return next;
    });
  };

  const persistOutlineProfiles = (next: OutlineProfile[]) => {
    saveOutlineProfiles(next);
    setOutlineProfiles(next);
  };

  const saveOutlineProfile = () => {
    const name = outlineProfileName.trim();
    if (!name) return;
    const settings = {
      pass: outlinePass,
      colors: outlineColors,
      edge: normalizeEdgeOutlineSettings(edgeOutline),
    };
    const existing = outlineProfiles.find(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      persistOutlineProfiles(
        outlineProfiles.map((p) =>
          p.id === existing.id
            ? { ...p, name, settings, updatedAt: Date.now() }
            : p,
        ),
      );
      setOutlineProfileId(existing.id);
    } else {
      const created = snapshotCurrentOutline(
        settings,
        name,
        palette?.colors,
      );
      persistOutlineProfiles([...outlineProfiles, created]);
      setOutlineProfileId(created.id);
    }
    setOutlineProfileName("");
  };

  const loadOutlineProfile = (id: string) => {
    const profile = outlineProfiles.find((p) => p.id === id);
    if (!profile) return;
    const { pass, colors, edge } = profile.settings;
    saveOutlinePassSettings(pass);
    setOutlinePass(pass);
    saveOutlineColors(colors);
    setOutlineColors(colors);
    const nextEdge = normalizeEdgeOutlineSettings(edge, palette?.colors);
    saveEdgeOutlineSettings(nextEdge);
    setEdgeOutline(nextEdge);
    setOutlineProfileId(id);
  };

  const deleteOutlineProfile = (id: string) => {
    if (!id) return;
    persistOutlineProfiles(outlineProfiles.filter((p) => p.id !== id));
    if (outlineProfileId === id) setOutlineProfileId("");
  };

  useEffect(() => {
    loadPalette(paletteSlug)
      .then((p) => {
        setPalette(p);
        setOutlineColors(loadOutlineColors(p.colors));
        setEdgeOutline(loadEdgeOutlineSettings(p.colors));
        setOutlineProfiles(loadOutlineProfiles(p.colors));

        const prevSlug = prevPaletteSlugRef.current;
        prevPaletteSlugRef.current = paletteSlug;
        // Remap 3D material colours to nearest palette entries when the
        // user actually switches palettes (not on first mount / same slug).
        if (prevSlug !== null && prevSlug !== paletteSlug) {
          setSpec((prev) => {
            const next = remapSpecToPalette(prev, p.colors);
            setSpecText(JSON.stringify(next, null, 2));
            return next;
          });
        }
      })
      .catch((e) => setError(String(e)));
  }, [paletteSlug]);

  useEffect(() => {
    fetchStatus()
      .then(setStatus)
      .catch(() =>
        setStatus({
          mesh_backend: "chibi-primitives",
          mesh_ready: true,
          message: "Local chibi primitive builder (no upload required).",
          sizes: [...SPRITE_SIZES],
          default_palette: "endesga-64",
        }),
      );
  }, []);

  const applyPaletteSlug = () => {
    const next = paletteSlugDraft.trim().toLowerCase() || "endesga-64";
    setPaletteSlugDraft(next);
    setPaletteSlug(next);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <h1>3d Sprite Gen</h1>
          <p className="tagline">
            Procedural chibi → iso bake at {size}×{size}px · free / local
            {status ? ` · ${status.mesh_backend}` : ""}
          </p>
          <p
            className={`tagline feature-boost-note${
              __GIT_BRANCH__ !== "main" ? " branch-not-main" : ""
            }`}
          >
            {__GIT_BRANCH__}
          </p>
        </div>
        <div className="header-palette">
          <div className="palette-slug-row">
            <label className="field-label" htmlFor="palette-slug-input">
              Palette
            </label>
            <input
              id="palette-slug-input"
              type="text"
              value={paletteSlugDraft}
              onChange={(e) => setPaletteSlugDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyPaletteSlug();
              }}
              placeholder="endesga-64"
              spellCheck={false}
              title="Lospec palette slug (bake, model remap, AI)"
            />
            <button type="button" className="ghost-btn" onClick={applyPaletteSlug}>
              Apply
            </button>
            <a
              className="palette-lospec-link"
              href={`https://lospec.com/palette-list/${encodeURIComponent(paletteSlug)}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open ${paletteSlug} on Lospec`}
            >
              Lospec
            </a>
            <a
              className="palette-lospec-link"
              href="https://lospec.com/palette-list"
              target="_blank"
              rel="noopener noreferrer"
              title="Browse the Lospec palette index"
            >
              Browse all
            </a>
            <span className="meta">{palette?.name ?? "…"}</span>
          </div>
          {palette ? (
            <div
              className="header-palette-minis"
              role="img"
              aria-label={`${palette.name} palette colours`}
            >
              {palette.colors.map((c, i) => {
                const hex = normalizePaletteHex(c);
                return (
                  <span
                    key={`${hex}-${i}`}
                    className="part-color-mini"
                    style={{ background: `#${hex}` }}
                    title={`#${hex}`}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      </header>

      <main className="app-main">
      <div className="layout">
        <section className="panel panel-character">
          <div className="panel-title-row">
            <h2 className="panel-title">Character</h2>
            <div className="view-mode-tabs" role="tablist" aria-label="Render mode">
              <button
                type="button"
                role="tab"
                className={`view-mode-tab${viewMode === "3d" ? " is-active" : ""}`}
                aria-selected={viewMode === "3d"}
                onClick={() => switchViewMode("3d")}
              >
                3D
              </button>
              <button
                type="button"
                role="tab"
                className={`view-mode-tab${viewMode === "2d" ? " is-active" : ""}`}
                aria-selected={viewMode === "2d"}
                onClick={() => switchViewMode("2d")}
              >
                2D Sprite
              </button>
            </div>
          </div>

          <div className="preview-row">
            <div className="preview-main">
              {palette ? (
                <div
                  className="canvas-wrap preview-bg-checker"
                  style={{ width: framePx, height: framePx }}
                  onPointerDown={onPreviewPointerDown}
                  onPointerMove={onPreviewPointerMove}
                  onPointerUp={onPreviewPointerUp}
                  onPointerCancel={onPreviewPointerUp}
                  title={
                    viewMode === "2d"
                      ? "Drag to cycle 4 diagonal facings"
                      : "Drag to rotate"
                  }
                >
                  {viewMode === "3d" ? (
                    <BakeCanvas
                      key={String(size)}
                      size={size}
                      colors={palette.colors}
                      silhouetteOutlineHex={outlineColors.silhouette}
                      partSeamsOutlineHex={outlineColors.partSeams}
                      textureSeamsOutlineHex={outlineColors.textureSeams}
                      outlinePass={outlinePass}
                      zoom={1}
                      cameraHeight={cameraHeight}
                      rotationX={rotationX}
                      rotationY={rotationY}
                      spinning={spinning}
                      rotateMode={rotateMode}
                      spinSpeed={oscillateActive ? 0 : spinSpeed}
                      spinYawRef={spinYawRef}
                      oscillate={oscillateActive}
                      oscillateFrom={oscillateFrom}
                      oscillateDelta={oscillateDelta}
                      oscillateSpeed={ROTATE_FACING_SPEED}
                      spec={spec}
                      bodyScale={bodyScale}
                      bodyY={bodyY}
                      mirror={mirror}
                      partVisibility={partVisibility}
                      rimLights={rimLights}
                      edgeOutline={edgeOutline}
                      bayerDither={bayerDither}
                      displayPx={spritePx}
                      onCaptured={setPreview}
                      onSourceCaptured={setSourcePreview}
                    />
                  ) : (
                    <Sprite2DCanvas
                      size={size}
                      colors={palette.colors}
                      facing={
                        isIsoDir2D(facing)
                          ? facing
                          : snapYawToIsoDir2D(rotationY)
                      }
                      spec={spec}
                      bodyScale={bodyScale}
                      bodyY={bodyY}
                      mirror={mirror}
                      partVisibility={partVisibility}
                      displayPx={spritePx}
                      outlineColors={outlineColors}
                      outlinePass={outlinePass}
                      edgeOutline={edgeOutline}
                      rimLights={rimLights}
                      bayerDither={bayerDither}
                      onCaptured={setPreview}
                      onSourceCaptured={setSourcePreview}
                    />
                  )}
                </div>
              ) : (
                <div
                  className="pixel-empty"
                  style={{ width: framePx, height: framePx }}
                >
                  Loading…
                </div>
              )}
              <div className="spin-controls" style={{ width: framePx }}>
                <button
                  type="button"
                  className="spin-btn"
                  title={
                    viewMode === "2d"
                      ? "Hold to step facing left"
                      : "Hold to rotate left"
                  }
                  aria-label="Rotate left"
                  onPointerDown={onHoldRotateStart(-1)}
                  onPointerUp={onHoldRotateEnd}
                  onPointerCancel={onHoldRotateEnd}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  ←
                </button>
                <button
                  type="button"
                  className={`spin-btn spin-btn-main${autoRotate ? " is-active" : ""}`}
                  title={
                    viewMode === "2d"
                      ? autoRotate
                        ? "Pause 4-way facing cycle"
                        : "Cycle 4 diagonal facings"
                      : autoRotate
                        ? "Pause continuous rotate"
                        : "Continuous rotate"
                  }
                  aria-pressed={autoRotate}
                  onClick={toggleAutoRotate}
                >
                  {autoRotate ? "Pause" : "Rotate"}
                </button>
                <button
                  type="button"
                  className="spin-btn"
                  title={
                    viewMode === "2d"
                      ? "Hold to step facing right"
                      : "Hold to rotate right"
                  }
                  aria-label="Rotate right"
                  onPointerDown={onHoldRotateStart(1)}
                  onPointerUp={onHoldRotateEnd}
                  onPointerCancel={onHoldRotateEnd}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  →
                </button>
              </div>
              <p className="meta drag-hint">
                {viewMode === "2d"
                  ? "Drag to cycle diagonals · NN preview · iso checker"
                  : "Drag to rotate · NN preview · iso checker"}
              </p>
            </div>

            <div className="preview-side">
              <div className="iso-facing">
                <span className="iso-facing-label" id="iso-facing-label">
                  {viewMode === "2d" ? "Iso facing (4-way)" : "Iso facing"}
                </span>
                <div
                  className="iso-facing-pad"
                  role="group"
                  aria-labelledby="iso-facing-label"
                >
                  {FACING_PAD.map((cell) => {
                    const endpointIndex = oscillate
                      ? oscillateEndpoints.indexOf(cell.id)
                      : -1;
                    const isEndpoint = endpointIndex !== -1;
                    const isActive = oscillate
                      ? isEndpoint
                      : facing === cell.id;
                    const disabled2d =
                      viewMode === "2d" && !isIsoDir2D(cell.id);
                    return (
                      <button
                        key={cell.id}
                        type="button"
                        className={`iso-facing-btn${
                          isActive ? " is-active" : ""
                        }${isEndpoint ? " is-endpoint" : ""}${
                          disabled2d ? " is-disabled" : ""
                        }`}
                        style={{ gridRow: cell.row, gridColumn: cell.col }}
                        title={
                          disabled2d
                            ? `${cell.title} (3D only)`
                            : oscillate
                              ? `Oscillate endpoint — ${cell.title}`
                              : cell.title
                        }
                        aria-label={cell.title}
                        aria-pressed={isActive}
                        disabled={disabled2d}
                        onClick={() => onFacingButton(cell.id)}
                      >
                        {isEndpoint ? endpointIndex + 1 : cell.glyph}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className={`iso-facing-btn iso-facing-center${
                      oscillate ? " is-oscillate" : ""
                    }${!oscillate && facing === "custom" ? " is-custom" : ""}`}
                    title={
                      viewMode === "2d"
                        ? "Oscillate is 3D-only"
                        : oscillate
                          ? "Oscillate mode on — pick two directions to sweep between (click again to turn off)"
                          : "Oscillate: sweep between two directions"
                    }
                    aria-label="Toggle oscillate mode"
                    aria-pressed={oscillate}
                    disabled={viewMode === "2d"}
                    onClick={toggleOscillate}
                  >
                    ⇄
                  </button>
                </div>
                {viewMode === "2d" ? (
                  <span className="meta iso-facing-status">
                    4 diagonals · locked iso
                  </span>
                ) : oscillate ? (
                  <span className="meta iso-facing-status">
                    {oscillateActive
                      ? "Oscillating ⇄"
                      : `Pick ${2 - oscillateEndpoints.length} more direction${
                          oscillateEndpoints.length === 1 ? "" : "s"
                        }`}
                  </span>
                ) : facing === "custom" ? (
                  <span className="meta iso-facing-status">Custom</span>
                ) : null}
              </div>
              <div className="field">
                <div className="field-heading">
                  <span>Sprite size</span>
                  <span className="field-value">{size}px</span>
                </div>
                <input
                  type="range"
                  min={SPRITE_SIZE_MIN}
                  max={SPRITE_SIZE_MAX}
                  step={SPRITE_SIZE_STEP}
                  value={size}
                  onChange={(e) =>
                    setSize(Number(e.target.value) as SpriteSize)
                  }
                  title={`Bake resolution (${SPRITE_SIZE_MIN}–${SPRITE_SIZE_MAX} px, step ${SPRITE_SIZE_STEP})`}
                />
              </div>
              <div className={`field${viewMode === "2d" ? " is-disabled" : ""}`}>
                <div className="field-heading">
                  <span>Cam height</span>
                  <button
                    type="button"
                    className="field-reset"
                    disabled={viewMode === "2d"}
                    onClick={() => {
                      setCameraHeight(DEFAULT_CAMERA_HEIGHT);
                      saveCameraHeight(DEFAULT_CAMERA_HEIGHT);
                    }}
                  >
                    Reset
                  </button>
                </div>
                <input
                  type="range"
                  min={0.55}
                  max={1.55}
                  step={0.05}
                  value={cameraHeight}
                  disabled={viewMode === "2d"}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setCameraHeight(v);
                    saveCameraHeight(v);
                  }}
                  title={
                    viewMode === "2d"
                      ? "Camera height locked in 2D sprite mode"
                      : "Iso camera elevation (1 = classic)"
                  }
                />
              </div>
            </div>
          </div>

          <CollapseSection
            title="Character"
            open={characterOpen}
            onToggle={() => setCharacterOpen((v) => !v)}
            actions={
              <button
                type="button"
                className="ghost"
                onClick={resetCharacterPanel}
                title="Reset to the knight preset and default slider values"
              >
                Reset
              </button>
            }
          >
            <div className="char-toolbar">
              <div className="char-preset part-row">
                <div className="part-title">
                  <div className="part-row-controls">
                    <button
                      type="button"
                      className="part-icon-btn part-row-reroll"
                      onClick={applyRandomPreset}
                      title="Random preset"
                      aria-label="Random preset"
                    >
                      🎲
                    </button>
                  </div>
                  <span className="part-name">preset</span>
                </div>
                <select
                  aria-label="Preset"
                  value={presetId === "random" ? "" : presetId}
                  onChange={(e) => applyPreset(e.target.value as PresetId)}
                >
                  {presetId === "random" ? (
                    <option value="" disabled>
                      random
                    </option>
                  ) : null}
                  {PRESET_IDS.map((id) => (
                    <option key={id} value={id}>
                      {PRESET_LABELS[id]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="part-toggles">
                <div className={`part-field faction-control${factionLocked ? " is-locked" : ""}`}>
                  <div className="part-field-controls">
                    <button
                      type="button"
                      className={`part-icon-btn part-field-lock${factionLocked ? " is-locked" : ""}`}
                      onClick={() => setFactionLocked((v) => !v)}
                      title={factionLocked ? "Unlock faction" : "Lock faction"}
                      aria-label={factionLocked ? "Unlock faction" : "Lock faction"}
                      aria-pressed={factionLocked}
                    >
                      {factionLocked ? "🔒" : "🔓"}
                    </button>
                    <button
                      type="button"
                      className="part-icon-btn part-field-reroll"
                      onClick={() => {
                        if (factionLocked) return;
                        setPresetId("random");
                        setSpec((prev) => {
                          const next = rerollFaction(prev);
                          setSpecText(JSON.stringify(next, null, 2));
                          setSpecParseError(null);
                          return next;
                        });
                      }}
                      disabled={factionLocked}
                      title={
                        factionLocked
                          ? "Unlock to reroll faction"
                          : "Reroll faction"
                      }
                      aria-label="Reroll faction"
                    >
                      🎲
                    </button>
                  </div>
                  <select
                    className="part-inline-select faction-select"
                    aria-label="Faction"
                    title="Faction"
                    value={spec.faction ?? "none"}
                    disabled={factionLocked}
                    onChange={(e) =>
                      applyPartEdit((s) =>
                        setFaction(s, e.target.value as FactionId),
                      )
                    }
                  >
                    {FACTION_IDS.map((id) => (
                      <option key={id} value={id}>
                        {FACTION_LABELS[id]}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="part-chip">
                  <input
                    type="checkbox"
                    checked={mirror}
                    onChange={() => setMirror((v) => !v)}
                    title="Swap lead side (L↔R weapon / stance), same facing"
                  />
                  Mirror
                </label>
                <label className="part-chip">
                  <input
                    type="checkbox"
                    checked={allowHelmets}
                    onChange={() => {
                      const next = !allowHelmets;
                      setAllowHelmets(next);
                      // Drop a closed helm immediately when turning off so the
                      // live character matches the preference before the next roll.
                      if (
                        !next &&
                        isHeadReplacement(spec.helmet?.style) &&
                        !isMonsterHelmet(spec.helmet?.style)
                      ) {
                        applyPartEdit((s) => setHelmetStyle(s, "none"));
                      }
                    }}
                    title="Allow closed / face-covering helmets in random rolls. Hats, crowns, caps, and goggles stay available either way."
                  />
                  Helmets
                </label>
                <label className="part-chip">
                  <input
                    type="checkbox"
                    checked={allowMonsters}
                    onChange={() => {
                      const next = !allowMonsters;
                      setAllowMonsters(next);
                      if (!next && isMonsterHelmet(spec.helmet?.style)) {
                        applyPartEdit((s) => setHelmetStyle(s, "none"));
                      }
                    }}
                    title="Allow animal and goblin head replacements (goat, bird, horse, snake, triceratops, goblins) and monster skin tones in random rolls."
                  />
                  Monster
                </label>
                <button
                  type="button"
                  className="field-matched char-reroll"
                  onClick={applyRandom}
                  title="Random character"
                  aria-label="Random character"
                >
                  🎲
                </button>
              </div>
            </div>

            <div className="part-grid">
              <div
                className={`part-block${locks.eyes ? " is-locked" : ""}${!partVisibility.eyes ? " is-hidden" : ""}`}
              >
                <div className="part-row">
                  <div className="part-title">
                    <div className="part-row-controls">
                      <PartVisibilityToggle
                        part="eyes"
                        checked={partVisibility.eyes}
                        onToggle={() => togglePartVisible("eyes")}
                      />
                      <button
                        type="button"
                        className={`part-icon-btn part-row-lock${locks.eyes ? " is-locked" : ""}`}
                        onClick={() => toggleLock("eyes")}
                        title={locks.eyes ? "Unlock eyes" : "Lock eyes"}
                        aria-label={locks.eyes ? "Unlock eyes" : "Lock eyes"}
                        aria-pressed={locks.eyes}
                      >
                        {locks.eyes ? "🔒" : "🔓"}
                      </button>
                      <button
                        type="button"
                        className="part-icon-btn part-row-reroll"
                        onClick={applyRerollEyes}
                        disabled={!partVisibility.eyes || locks.eyes}
                        title={
                          locks.eyes
                            ? "Unlock to reroll eyes"
                            : "Reroll eyes"
                        }
                        aria-label="Reroll eyes"
                      >
                        🎲
                      </button>
                    </div>
                    <span className="part-name">eyes</span>
                  </div>
                  <FieldControlGroup
                    field="eyeStyle"
                    label="eye style"
                    locked={fieldLocks.eyeStyle}
                    pinned={fieldPinned("eyeStyle") || !partVisibility.eyes}
                    onToggle={toggleFieldLock}
                    onReroll={applyRerollField}
                  >
                    <CompactSelect<EyeStyle>
                      title="eye style"
                      value={spec.face?.style ?? "classic"}
                      options={EYE_STYLES}
                      disabled={!partVisibility.eyes || fieldPinned("eyeStyle")}
                      onPick={(v) => applyPartEdit((s) => setEyeStyle(s, v))}
                    />
                  </FieldControlGroup>
                  <FieldControlGroup
                    field="browStyle"
                    label="eyebrow style"
                    locked={fieldLocks.browStyle}
                    pinned={fieldPinned("browStyle") || !partVisibility.eyes}
                    onToggle={toggleFieldLock}
                    onReroll={applyRerollField}
                  >
                    <CompactSelect<BrowStyle>
                      title="eyebrow style"
                      value={spec.face?.browStyle ?? "none"}
                      options={BROW_STYLES}
                      disabled={!partVisibility.eyes || fieldPinned("browStyle")}
                      onPick={(v) => applyPartEdit((s) => setBrowStyle(s, v))}
                    />
                  </FieldControlGroup>
                  <div className="part-actions">
                    <PaletteColorButton
                      value={spec.face?.eyeColor ?? "#1a1c2c"}
                      paletteColors={palette?.colors ?? []}
                      title="Eye colour"
                      ariaLabel="Eye colour"
                      disabled={!partVisibility.eyes || locks.eyes}
                      onChange={(hex) =>
                        applyPartEdit((s) => ({
                          ...s,
                          face: { ...s.face, eyeColor: hex },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="part-sliders-lockable">
                  <button
                    type="button"
                    className={`part-icon-btn part-slider-lock${locks.eyeLayout ? " is-locked" : ""}`}
                    onClick={() => toggleLock("eyeLayout")}
                    title={
                      locks.eyeLayout
                        ? "Unlock eye distance, size & Y"
                        : "Lock eye distance, size & Y (kept when the eyes reroll)"
                    }
                    aria-label={
                      locks.eyeLayout
                        ? "Unlock eye distance, size and Y"
                        : "Lock eye distance, size and Y"
                    }
                    aria-pressed={locks.eyeLayout}
                  >
                    {locks.eyeLayout ? "🔒" : "🔓"}
                  </button>
                  <div
                    className={`light-grid part-eye-sliders${eyeSlidersDisabled ? " is-disabled" : ""}`}
                  >
                    <label className="light-slider">
                      <span
                        className="light-slider-label"
                        title="Distance between eyes"
                      >
                        Dist
                      </span>
                      <input
                        type="range"
                        min={0.6}
                        max={1.45}
                        step={0.05}
                        value={spec.face?.spacing ?? 1}
                        disabled={eyeSlidersDisabled}
                        onChange={(e) => {
                          const spacing = Number(e.target.value);
                          applyPartEdit((s) => ({
                            ...s,
                            face: { ...s.face, spacing },
                          }));
                        }}
                        title="Distance between eyes"
                      />
                      <span className="slider-val">
                        {(spec.face?.spacing ?? 1).toFixed(2)}
                      </span>
                    </label>
                    <label className="light-slider">
                      <span className="light-slider-label" title="Eye size">
                        Size
                      </span>
                      <input
                        type="range"
                        min={0.68}
                        max={1.4}
                        step={0.05}
                        value={Math.min(spec.face?.scale ?? 1, 1.4)}
                        disabled={eyeSlidersDisabled}
                        onChange={(e) => {
                          const scale = Number(e.target.value);
                          applyPartEdit((s) => ({
                            ...s,
                            face: { ...s.face, scale },
                          }));
                        }}
                        title="Eye size"
                      />
                      <span className="slider-val">
                        {Math.min(spec.face?.scale ?? 1, 1.4).toFixed(2)}
                      </span>
                    </label>
                    <label className="light-slider">
                      <span
                        className="light-slider-label"
                        title="Vertical eye position"
                      >
                        Y
                      </span>
                      <input
                        type="range"
                        min={-0.25}
                        max={0.25}
                        step={0.05}
                        value={spec.face?.y ?? 0}
                        disabled={eyeSlidersDisabled}
                        onChange={(e) => {
                          const y = Number(e.target.value);
                          applyPartEdit((s) => ({
                            ...s,
                            face: { ...s.face, y },
                          }));
                        }}
                        title="Vertical eye position"
                      />
                      <span className="slider-val">
                        {(spec.face?.y ?? 0).toFixed(2)}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {PART_IDS.map((part) => {
                const locked = locks[part];
                const visible = partVisibility[part];
                return (
                  <div
                    key={part}
                    className={`part-block${locked ? " is-locked" : ""}${!visible ? " is-hidden" : ""}`}
                  >
                    <div className="part-row">
                      <div className="part-title">
                        <div className="part-row-controls">
                          <PartVisibilityToggle
                            part={part}
                            checked={visible}
                            onToggle={() => togglePartVisible(part)}
                          />
                          <button
                            type="button"
                            className={`part-icon-btn part-row-lock${locked ? " is-locked" : ""}`}
                            onClick={() => toggleLock(part)}
                            title={locked ? `Unlock ${part}` : `Lock ${part}`}
                            aria-label={
                              locked ? `Unlock ${part}` : `Lock ${part}`
                            }
                            aria-pressed={locked}
                          >
                            {locked ? "🔒" : "🔓"}
                          </button>
                          <button
                            type="button"
                            className="part-icon-btn part-row-reroll"
                            onClick={() => applyRerollPart(part)}
                            disabled={locked || !visible}
                            title={
                              locked
                                ? "Unlock to reroll this part"
                                : "Reroll part"
                            }
                            aria-label={`Reroll ${part}`}
                          >
                            🎲
                          </button>
                        </div>
                        <span className="part-name">{part}</span>
                      </div>

                      <div className="part-inline-controls">
                        {part === "head" ? (
                          <>
                            <FieldControlGroup
                              field="headShape"
                              label="head shape"
                              locked={fieldLocks.headShape}
                              pinned={fieldPinned("headShape")}
                              onToggle={toggleFieldLock}
                              onReroll={applyRerollField}
                            >
                              <CompactSelect<HeadShape>
                                title="shape"
                                value={spec.head?.shape ?? "lozenge"}
                                options={HEAD_SHAPES}
                                disabled={fieldPinned("headShape")}
                                onPick={(v) =>
                                  applyPartEdit((s) => setHeadShape(s, v))
                                }
                              />
                            </FieldControlGroup>
                            <FieldControlGroup
                              field="hairStyle"
                              label="hair"
                              locked={fieldLocks.hairStyle}
                              pinned={fieldPinned("hairStyle")}
                              onToggle={toggleFieldLock}
                              onReroll={applyRerollField}
                            >
                              <CompactSelect<HairStyle>
                                title="hair"
                                value={spec.hair?.style ?? "bald"}
                                options={HAIR_STYLES}
                                disabled={fieldPinned("hairStyle")}
                                onPick={(v) =>
                                  applyPartEdit((s) => setHairStyle(s, v))
                                }
                              />
                            </FieldControlGroup>
                            <FieldControlGroup
                              field="helmetStyle"
                              label="helmet"
                              locked={fieldLocks.helmetStyle}
                              pinned={fieldPinned("helmetStyle")}
                              onToggle={toggleFieldLock}
                              onReroll={applyRerollField}
                            >
                              <CompactSelect<HelmetStyle>
                                title="helmet"
                                value={spec.helmet?.style ?? "none"}
                                options={HELMET_STYLES.filter((h) => {
                                  if (h === "none") return true;
                                  if (isMonsterHelmet(h)) return allowMonsters;
                                  if (isHeadReplacement(h)) return allowHelmets;
                                  return true;
                                })}
                                disabled={fieldPinned("helmetStyle")}
                                onPick={(v) =>
                                  applyPartEdit((s) => setHelmetStyle(s, v))
                                }
                              />
                            </FieldControlGroup>
                          </>
                        ) : null}
                        {part === "torso" ? (
                          <>
                            <FieldControlGroup
                              field="torsoStyle"
                              label="torso style"
                              locked={fieldLocks.torsoStyle}
                              pinned={fieldPinned("torsoStyle")}
                              onToggle={toggleFieldLock}
                              onReroll={applyRerollField}
                            >
                              <CompactSelect<TorsoStyle>
                                title="style"
                                value={spec.torso.style}
                                options={TORSO_STYLES}
                                disabled={fieldPinned("torsoStyle")}
                                onPick={(v) =>
                                  applyPartEdit((s) => setTorsoStyle(s, v))
                                }
                              />
                            </FieldControlGroup>
                            <FieldControlGroup
                              field="bodyDetails"
                              label="body details"
                              locked={fieldLocks.bodyDetails}
                              pinned={fieldPinned("bodyDetails")}
                              onToggle={toggleFieldLock}
                              onReroll={applyRerollField}
                            >
                              <CompactSelect<BodyDetailStyle>
                                title="details"
                                value={spec.torso.detailStyle ?? "classic"}
                                options={BODY_DETAIL_STYLES}
                                disabled={fieldPinned("bodyDetails")}
                                onPick={(v) =>
                                  applyPartEdit((s) =>
                                    setBodyDetailStyle(s, v),
                                  )
                                }
                              />
                            </FieldControlGroup>
                            <FieldControlGroup
                              field="hem"
                              label="hem"
                              locked={fieldLocks.hem}
                              pinned={fieldPinned("hem")}
                              onToggle={toggleFieldLock}
                              onReroll={applyRerollField}
                            >
                              <CompactSelect<HemStyle>
                                title="hem"
                                value={spec.accessories?.hem ?? "none"}
                                options={HEM_STYLES}
                                disabled={fieldPinned("hem")}
                                onPick={(v) =>
                                  applyPartEdit((s) => setHemStyle(s, v))
                                }
                              />
                            </FieldControlGroup>
                            <FieldControlGroup
                              field="cape"
                              label="cape"
                              locked={fieldLocks.cape}
                              pinned={fieldPinned("cape")}
                              onToggle={toggleFieldLock}
                              onReroll={applyRerollField}
                            >
                              <CompactSelect<"off" | "on">
                                title="cape"
                                value={spec.accessories?.cape ? "on" : "off"}
                                options={["off", "on"]}
                                disabled={fieldPinned("cape")}
                                onPick={(v) =>
                                  applyPartEdit((s) => setCape(s, v === "on"))
                                }
                              />
                            </FieldControlGroup>
                            <FieldControlGroup
                              field="pouches"
                              label="pouches"
                              locked={fieldLocks.pouches}
                              pinned={fieldPinned("pouches")}
                              onToggle={toggleFieldLock}
                              onReroll={applyRerollField}
                            >
                              <CompactSelect<"off" | "on">
                                title="pouches"
                                value={
                                  spec.accessories?.pouches ? "on" : "off"
                                }
                                options={["off", "on"]}
                                disabled={fieldPinned("pouches")}
                                onPick={(v) =>
                                  applyPartEdit((s) =>
                                    setPouches(s, v === "on"),
                                  )
                                }
                              />
                            </FieldControlGroup>
                            <FieldControlGroup
                              field="backLoadout"
                              label="back loadout"
                              locked={fieldLocks.backLoadout}
                              pinned={fieldPinned("backLoadout")}
                              onToggle={toggleFieldLock}
                              onReroll={applyRerollField}
                            >
                              <CompactSelect<BackLoadout>
                                title="back"
                                value={spec.accessories?.backLoadout ?? "none"}
                                options={BACK_LOADOUTS}
                                disabled={fieldPinned("backLoadout")}
                                onPick={(v) =>
                                  applyPartEdit((s) => setBackLoadout(s, v))
                                }
                              />
                            </FieldControlGroup>
                          </>
                        ) : null}
                        {part === "arms" ? (
                          <>
                            <FieldControlGroup
                              field="armPose"
                              label="arm pose"
                              locked={fieldLocks.armPose}
                              pinned={fieldPinned("armPose")}
                              onToggle={toggleFieldLock}
                              onReroll={applyRerollField}
                            >
                              <CompactSelect<ArmPose>
                                title="pose"
                                value={spec.arms.pose}
                                options={ARM_POSES}
                                disabled={fieldPinned("armPose")}
                                onPick={(v) =>
                                  applyPartEdit((s) => setArmPose(s, v))
                                }
                              />
                            </FieldControlGroup>
                            <FieldControlGroup
                              field="weapon"
                              label="weapon"
                              locked={fieldLocks.weapon}
                              pinned={fieldPinned("weapon")}
                              onToggle={toggleFieldLock}
                              onReroll={applyRerollField}
                            >
                              <CompactSelect<WeaponType>
                                title="weapon"
                                value={spec.weapon?.type ?? "none"}
                                options={WEAPON_TYPES}
                                disabled={fieldPinned("weapon")}
                                onPick={(v) =>
                                  applyPartEdit((s) => setWeaponType(s, v))
                                }
                              />
                            </FieldControlGroup>
                            <FieldControlGroup
                              field="offhand"
                              label="offhand"
                              locked={fieldLocks.offhand}
                              pinned={fieldPinned("offhand")}
                              onToggle={toggleFieldLock}
                              onReroll={applyRerollField}
                            >
                              <CompactSelect<WeaponType>
                                title="offhand"
                                value={spec.offhand?.type ?? "none"}
                                options={OFFHAND_TYPES}
                                disabled={fieldPinned("offhand")}
                                onPick={(v) =>
                                  applyPartEdit((s) => setOffhandType(s, v))
                                }
                              />
                            </FieldControlGroup>
                            {spec.offhand &&
                            spec.offhand.type !== "none" &&
                            spec.offhand.type !== "shield" ? (
                              <FieldControlGroup
                                field="offhandAngle"
                                label="offhand angle"
                                locked={fieldLocks.offhandAngle}
                                pinned={fieldPinned("offhandAngle")}
                                onToggle={toggleFieldLock}
                                onReroll={applyRerollField}
                              >
                                <CompactSelect<string>
                                  title="offhand angle"
                                  value={offhandVariant}
                                  options={OFFHAND_VARIANT_IDS}
                                  disabled={fieldPinned("offhandAngle")}
                                  onPick={(v) => {
                                    setOffhandVariant(
                                      OFFHAND_VARIANT_IDS.indexOf(v),
                                    );
                                    setOffhandVariantState(v);
                                    applyPartEdit((s) => s);
                                  }}
                                />
                              </FieldControlGroup>
                            ) : null}
                          </>
                        ) : null}
                        {part === "legs" ? (
                          <FieldControlGroup
                            field="legPose"
                            label="leg pose"
                            locked={fieldLocks.legPose}
                            pinned={fieldPinned("legPose")}
                            onToggle={toggleFieldLock}
                            onReroll={applyRerollField}
                          >
                            <CompactSelect<LegPose>
                              title="pose"
                              value={spec.legs.pose}
                              options={LEG_POSES}
                              disabled={fieldPinned("legPose")}
                              onPick={(v) =>
                                applyPartEdit((s) => setLegPose(s, v))
                              }
                            />
                          </FieldControlGroup>
                        ) : null}
                      </div>

                      <div className="part-actions">
                        <PartColorMenu
                          part={part}
                          spec={spec}
                          paletteColors={palette?.colors ?? []}
                          onEdit={applyPartEdit}
                          onReroll={() => applyRerollColors(part)}
                          disabled={locked}
                        />
                      </div>
                    </div>
                    {part === "head" ? (
                      <div className="part-sliders-lockable">
                        <button
                          type="button"
                          className={`part-icon-btn part-slider-lock${locks.headSize ? " is-locked" : ""}`}
                          onClick={() => toggleLock("headSize")}
                          title={
                            locks.headSize
                              ? "Unlock head size & height"
                              : "Lock head size & height (kept when the head rerolls)"
                          }
                          aria-label={
                            locks.headSize
                              ? "Unlock head size and height"
                              : "Lock head size and height"
                          }
                          aria-pressed={locks.headSize}
                        >
                          {locks.headSize ? "🔒" : "🔓"}
                        </button>
                        <div
                          className={`light-grid part-head-sliders${locks.headSize ? " is-disabled" : ""}`}
                        >
                          <label className="light-slider">
                            <span
                              className="light-slider-label"
                              title="Overall head size (pivots from neck)"
                            >
                              Size
                            </span>
                            <input
                              type="range"
                              min={0.92}
                              max={1.3}
                              step={0.01}
                              value={spec.head?.size ?? 1}
                              disabled={locks.headSize}
                              onChange={(e) => {
                                const size = Number(e.target.value);
                                applyPartEdit((s) => ({
                                  ...s,
                                  head: { ...s.head, size },
                                }));
                              }}
                              title="Overall head size"
                            />
                            <span className="slider-val">
                              {(spec.head?.size ?? 1).toFixed(2)}
                            </span>
                          </label>
                          <label className="light-slider">
                            <span
                              className="light-slider-label"
                              title="Vertical head stretch (pivots from neck)"
                            >
                              Height
                            </span>
                            <input
                              type="range"
                              min={0.91}
                              max={1.21}
                              step={0.01}
                              value={spec.head?.yScale ?? 1}
                              disabled={locks.headSize}
                              onChange={(e) => {
                                const yScale = Number(e.target.value);
                                applyPartEdit((s) => ({
                                  ...s,
                                  head: { ...s.head, yScale },
                                }));
                              }}
                              title="Vertical head scale"
                            />
                            <span className="slider-val">
                              {(spec.head?.yScale ?? 1).toFixed(2)}
                            </span>
                          </label>
                        </div>
                      </div>
                    ) : null}
                    {part === "torso" ? (
                      <div className="part-sliders-lockable">
                        <button
                          type="button"
                          className={`part-icon-btn part-slider-lock${bodyScaleLocked ? " is-locked" : ""}`}
                          onClick={() => setBodyScaleLocked((v) => !v)}
                          title={
                            bodyScaleLocked
                              ? "Unlock body scale"
                              : "Lock body scale"
                          }
                          aria-label={
                            bodyScaleLocked
                              ? "Unlock body scale"
                              : "Lock body scale"
                          }
                          aria-pressed={bodyScaleLocked}
                        >
                          {bodyScaleLocked ? "🔒" : "🔓"}
                        </button>
                        <div className="light-grid part-torso-sliders">
                          <label
                            className={`light-slider${bodyScaleLocked ? " is-disabled" : ""}`}
                          >
                            <span
                              className="light-slider-label"
                              title="Torso/legs scale from the neck — head, hands & feet stay fixed"
                            >
                              Size
                            </span>
                            <input
                              type="range"
                              min={BODY_SCALE_MIN}
                              max={BODY_SCALE_MAX}
                              step={0.01}
                              value={bodyScale}
                              disabled={bodyScaleLocked}
                              onChange={(e) =>
                                onBodyScaleChange(Number(e.target.value))
                              }
                              title="Body scale"
                              aria-label="Body scale"
                            />
                            <span className="slider-val">
                              {bodyScale.toFixed(2)}
                            </span>
                          </label>
                          <label className="light-slider">
                            <span
                              className="light-slider-label"
                              title="Shift torso, arms & legs vertically — head stays pinned (3D and 2D)"
                            >
                              Y
                            </span>
                            <input
                              type="range"
                              min={BODY_Y_MIN}
                              max={BODY_Y_MAX}
                              step={0.01}
                              value={bodyY}
                              onChange={(e) =>
                                onBodyYChange(Number(e.target.value))
                              }
                              title="Body Y — independent of head"
                              aria-label="Body Y position"
                            />
                            <span className="slider-val">
                              {bodyY.toFixed(2)}
                            </span>
                          </label>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CollapseSection>

          <CollapseSection
            title="Lighting"
            open={lightsOpen}
            onToggle={() => setLightsOpen((v) => !v)}
            actions={
              <button type="button" className="ghost" onClick={resetRimLights}>
                Reset
              </button>
            }
          >
            <div className="light-profiles">
              <label className="field light-profile-select">
                Profile
                <select
                  value={lightingProfileId}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) loadLightingProfile(id);
                    else setLightingProfileId("");
                  }}
                  aria-label="Lighting profile"
                >
                  <option value="">Custom / none</option>
                  <optgroup label="Built-in">
                    {BUILTIN_LIGHTING_PRESETS.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </optgroup>
                  {lightingProfiles.length > 0 ? (
                    <optgroup label="Saved">
                      {lightingProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>
              <div className="light-profile-save">
                <input
                  type="text"
                  className="light-profile-name"
                  placeholder="Save as…"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveLightingProfile();
                  }}
                  aria-label="Lighting profile name"
                />
                <button
                  type="button"
                  className="ghost"
                  onClick={saveLightingProfile}
                  disabled={!profileName.trim()}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => deleteLightingProfile(lightingProfileId)}
                  disabled={
                    !lightingProfileId ||
                    lightingProfileId.startsWith("builtin-")
                  }
                  title={
                    lightingProfileId.startsWith("builtin-")
                      ? "Built-in presets cannot be deleted"
                      : "Delete selected saved profile"
                  }
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="hint light-hint">
              Amb = soft fill; L/R = harsh rear rims (raise Behind to skim).
            </p>
            <div className="light-grid light-fill-grid">
              {FILL_LIGHT_ROWS.map((row) => (
                <div
                  key={row.key}
                  className={`light-slider light-fill-row${row.tone ? ` ${row.tone}` : ""}`}
                >
                  <span className="light-slider-label" title={row.title}>
                    {row.label}
                  </span>
                  <input
                    type="range"
                    min={row.min}
                    max={row.max}
                    step={row.step}
                    value={rimLights[row.key]}
                    onChange={(e) =>
                      patchRimLights({
                        [row.key]: Number(e.target.value),
                      })
                    }
                    title={row.title}
                    aria-label={row.title}
                  />
                  <span className="slider-val">
                    {rimLights[row.key].toFixed(2)}
                  </span>
                  <FreeformColorButton
                    value={rimLights[row.colorKey]}
                    onChange={(hex) =>
                      patchRimLights({ [row.colorKey]: hex })
                    }
                    title={`${row.title} colour`}
                    ariaLabel={`${row.title} colour`}
                  />
                </div>
              ))}
            </div>
            <div className="light-rim-head">
              <p className="light-subhead">Directional rims</p>
              <div className="light-colors">
                {RIM_COLOR_FIELDS.map((field) => (
                  <div key={field.key} className="light-color-field">
                    <span className="light-slider-label">{field.label}</span>
                    <FreeformColorButton
                      value={rimLights[field.key]}
                      onChange={(hex) => patchRimLights({ [field.key]: hex })}
                      title={`${field.label} colour`}
                      ariaLabel={`${field.label} colour`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="light-grid light-rim-grid">
              {RIM_LIGHT_ROWS.map((row) => (
                <label
                  key={row.key}
                  className={`light-slider${row.tone ? ` ${row.tone}` : ""}`}
                >
                  <span className="light-slider-label">{row.label}</span>
                  <input
                    type="range"
                    min={row.min}
                    max={row.max}
                    step={row.step}
                    value={rimLights[row.key]}
                    onChange={(e) =>
                      patchRimLights({
                        [row.key]: Number(e.target.value),
                      })
                    }
                    title={row.label}
                  />
                  <span className="slider-val">
                    {rimLights[row.key].toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
          </CollapseSection>

          {error ? <p className="error">{error}</p> : null}
        </section>

        <section className="panel panel-bake">
          <h2 className="panel-title">Baked PNG ({size}×{size})</h2>

          <div className="bake-preview-row">
            {preview ? (
              <div
                className="pixel-preview-frame preview-bg-checker"
                style={{ width: framePx, height: framePx }}
              >
                <img
                  className="pixel-preview"
                  src={preview}
                  alt="baked sprite"
                  width={spritePx}
                  height={spritePx}
                />
              </div>
            ) : (
              <div
                className="pixel-empty"
                style={{ width: framePx, height: framePx }}
              >
                Preparing…
              </div>
            )}
            <div className="bake-download-col">
              <button
                type="button"
                className="download-btn"
                onClick={() => preview && saveSprite(preview, size)}
                disabled={!preview}
              >
                Download PNG
              </button>
              <p className="meta bake-meta">
                {palette?.name ?? "…"} · sil #{outlineColors.silhouette} · seams #
                {outlineColors.partSeams}
                {bayerDither.enabled
                  ? ` · Bayer ${bayerDither.strength.toFixed(2)}`
                  : ""}{" "}
                · Endesga · live bake
              </p>
            </div>
          </div>

          <div className="bayer-row">
            <label className="part-lock bayer-toggle">
              <input
                type="checkbox"
                checked={bayerDither.enabled}
                onChange={(e) =>
                  patchBayerDither({ enabled: e.target.checked })
                }
              />
              Bayer dither
            </label>
            <label className="light-slider bayer-strength">
              <span className="light-slider-label">Strength</span>
              <input
                type="range"
                min={BAYER_STRENGTH_MIN}
                max={BAYER_STRENGTH_MAX}
                step={BAYER_STRENGTH_STEP}
                value={bayerDither.strength}
                disabled={!bayerDither.enabled}
                onChange={(e) =>
                  patchBayerDither({ strength: Number(e.target.value) })
                }
                title="Ordered dither strength before Endesga lock"
              />
              <span className="slider-val">
                {bayerDither.strength.toFixed(2)}
              </span>
            </label>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                const next = { ...DEFAULT_BAYER_DITHER };
                saveBayerDitherSettings(next);
                setBayerDither(next);
              }}
            >
              Reset
            </button>
          </div>

          <CollapseSection
            title="Outlines"
            open={outlinesOpen}
            onToggle={() => setOutlinesOpen((v) => !v)}
            actions={
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  const nextPass = { ...DEFAULT_OUTLINE_PASS };
                  const nextColors = defaultOutlineColors(palette?.colors);
                  saveOutlinePassSettings(nextPass);
                  saveOutlineColors(nextColors);
                  setOutlinePass(nextPass);
                  setOutlineColors(nextColors);
                  setOutlineProfileId("");
                  resetEdgeOutline();
                }}
              >
                Reset
              </button>
            }
          >
            <div className="light-profiles">
              <label className="field light-profile-select">
                Profile
                <select
                  value={outlineProfileId}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) loadOutlineProfile(id);
                    else setOutlineProfileId("");
                  }}
                  aria-label="Outlines profile"
                >
                  <option value="">Custom / none</option>
                  {outlineProfiles.length > 0 ? (
                    <optgroup label="Saved">
                      {outlineProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>
              <div className="light-profile-save">
                <input
                  type="text"
                  className="light-profile-name"
                  placeholder="Save as…"
                  value={outlineProfileName}
                  onChange={(e) => setOutlineProfileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveOutlineProfile();
                  }}
                  aria-label="Outlines profile name"
                />
                <button
                  type="button"
                  className="ghost"
                  onClick={saveOutlineProfile}
                  disabled={!outlineProfileName.trim()}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => deleteOutlineProfile(outlineProfileId)}
                  disabled={!outlineProfileId}
                  title="Delete selected saved profile"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="outline-pass-grid">
              <div className="part-row">
                <label className="part-lock">
                  <input
                    type="checkbox"
                    checked={outlinePass.silhouette}
                    onChange={(e) =>
                      patchOutlinePass({ silhouette: e.target.checked })
                    }
                  />
                  Silhouette
                </label>
                <div className="part-actions">
                  <OutlineSwatchSelect
                    colors={palette?.colors ?? []}
                    value={outlineColors.silhouette}
                    onChange={(hex) => patchOutlineColor({ silhouette: hex })}
                    disabled={!outlinePass.silhouette || !palette}
                  />
                </div>
              </div>
              <div className="part-row">
                <label className="part-lock">
                  <input
                    type="checkbox"
                    checked={outlinePass.partSeams}
                    onChange={(e) =>
                      patchOutlinePass({ partSeams: e.target.checked })
                    }
                  />
                  Part seams
                </label>
                <div className="part-actions">
                  <OutlineSwatchSelect
                    colors={palette?.colors ?? []}
                    value={outlineColors.partSeams}
                    onChange={(hex) => patchOutlineColor({ partSeams: hex })}
                    disabled={!outlinePass.partSeams || !palette}
                  />
                </div>
              </div>
              <div className="part-row">
                <label className="part-lock">
                  <input
                    type="checkbox"
                    checked={outlinePass.textureSeams}
                    onChange={(e) =>
                      patchOutlinePass({ textureSeams: e.target.checked })
                    }
                  />
                  Texture seams
                </label>
                <div className="part-actions">
                  <OutlineSwatchSelect
                    colors={palette?.colors ?? []}
                    value={outlineColors.textureSeams}
                    onChange={(hex) =>
                      patchOutlineColor({ textureSeams: hex })
                    }
                    disabled={!outlinePass.textureSeams || !palette}
                  />
                </div>
              </div>
            </div>
            <div className="part-grid">
              <div className="part-row">
                <label className="part-lock">
                  <input
                    type="checkbox"
                    checked={edgeOutline.enabled}
                    onChange={(e) =>
                      patchEdgeOutline({ enabled: e.target.checked })
                    }
                  />
                  Edge detection
                </label>
                <div className="part-actions">
                  <OutlineSwatchSelect
                    colors={palette?.colors ?? []}
                    value={edgeOutline.color}
                    onChange={setEdgeColor}
                    disabled={!edgeOutline.enabled || !palette}
                  />
                </div>
              </div>
            </div>
            <div className="light-grid outline-edge-sliders">
              <label className="light-slider">
                <span className="light-slider-label">Depth</span>
                <input
                  type="range"
                  min={EDGE_DEPTH_MIN}
                  max={EDGE_DEPTH_MAX}
                  step={EDGE_DEPTH_STEP}
                  value={edgeOutline.depthThreshold}
                  disabled={!edgeOutline.enabled}
                  onChange={(e) =>
                    patchEdgeOutline({ depthThreshold: Number(e.target.value) })
                  }
                  title="Depth delta threshold (world units). Higher = fewer edges."
                />
                <span className="slider-val">
                  {edgeOutline.depthThreshold.toFixed(2)}
                </span>
              </label>
              <label className="light-slider">
                <span className="light-slider-label">Normal°</span>
                <input
                  type="range"
                  min={EDGE_NORMAL_MIN}
                  max={EDGE_NORMAL_MAX}
                  step={EDGE_NORMAL_STEP}
                  value={edgeOutline.normalThresholdDeg}
                  disabled={!edgeOutline.enabled}
                  onChange={(e) =>
                    patchEdgeOutline({
                      normalThresholdDeg: Number(e.target.value),
                    })
                  }
                  title="Normal angle threshold (degrees). Higher = fewer edges."
                />
                <span className="slider-val">
                  {edgeOutline.normalThresholdDeg.toFixed(0)}
                </span>
              </label>
              <label className="light-slider">
                <span className="light-slider-label">D wgt</span>
                <input
                  type="range"
                  min={EDGE_WEIGHT_MIN}
                  max={EDGE_WEIGHT_MAX}
                  step={EDGE_WEIGHT_STEP}
                  value={edgeOutline.depthWeight}
                  disabled={!edgeOutline.enabled}
                  onChange={(e) =>
                    patchEdgeOutline({ depthWeight: Number(e.target.value) })
                  }
                  title="Depth channel weight"
                />
                <span className="slider-val">
                  {edgeOutline.depthWeight.toFixed(2)}
                </span>
              </label>
              <label className="light-slider">
                <span className="light-slider-label">N wgt</span>
                <input
                  type="range"
                  min={EDGE_WEIGHT_MIN}
                  max={EDGE_WEIGHT_MAX}
                  step={EDGE_WEIGHT_STEP}
                  value={edgeOutline.normalWeight}
                  disabled={!edgeOutline.enabled}
                  onChange={(e) =>
                    patchEdgeOutline({ normalWeight: Number(e.target.value) })
                  }
                  title="Normal channel weight"
                />
                <span className="slider-val">
                  {edgeOutline.normalWeight.toFixed(2)}
                </span>
              </label>
              <label className="light-slider">
                <span className="light-slider-label">Soft</span>
                <input
                  type="range"
                  min={EDGE_SOFTNESS_MIN}
                  max={EDGE_SOFTNESS_MAX}
                  step={EDGE_SOFTNESS_STEP}
                  value={edgeOutline.softness}
                  disabled={!edgeOutline.enabled}
                  onChange={(e) =>
                    patchEdgeOutline({ softness: Number(e.target.value) })
                  }
                  title="Soft response ramp width around thresholds"
                />
                <span className="slider-val">
                  {edgeOutline.softness.toFixed(2)}
                </span>
              </label>
              <label className="light-slider">
                <span className="light-slider-label">Gamma</span>
                <input
                  type="range"
                  min={EDGE_GAMMA_MIN}
                  max={EDGE_GAMMA_MAX}
                  step={EDGE_GAMMA_STEP}
                  value={edgeOutline.thresholdGamma}
                  disabled={!edgeOutline.enabled}
                  onChange={(e) =>
                    patchEdgeOutline({ thresholdGamma: Number(e.target.value) })
                  }
                  title="Gamma on soft threshold response (>1 = gentler mid-range)"
                />
                <span className="slider-val">
                  {edgeOutline.thresholdGamma.toFixed(2)}
                </span>
              </label>
              <label className="light-slider">
                <span className="light-slider-label">Opacity</span>
                <input
                  type="range"
                  min={EDGE_OPACITY_MIN}
                  max={EDGE_OPACITY_MAX}
                  step={EDGE_OPACITY_STEP}
                  value={edgeOutline.opacity}
                  disabled={!edgeOutline.enabled}
                  onChange={(e) =>
                    patchEdgeOutline({ opacity: Number(e.target.value) })
                  }
                  title="Edge paint opacity / strength"
                />
                <span className="slider-val">
                  {edgeOutline.opacity.toFixed(2)}
                </span>
              </label>
              <label className="light-slider">
                <span className="light-slider-label">Dilate</span>
                <input
                  type="range"
                  min={EDGE_DILATE_MIN}
                  max={EDGE_DILATE_MAX}
                  step={EDGE_DILATE_STEP}
                  value={edgeOutline.dilate}
                  disabled={!edgeOutline.enabled}
                  onChange={(e) =>
                    patchEdgeOutline({ dilate: Number(e.target.value) })
                  }
                  title="Expand edge mask by N pixels"
                />
                <span className="slider-val">
                  {edgeOutline.dilate.toFixed(0)}
                </span>
              </label>
              <label className="light-slider">
                <span className="light-slider-label">Blur</span>
                <input
                  type="range"
                  min={EDGE_BLUR_MIN}
                  max={EDGE_BLUR_MAX}
                  step={EDGE_BLUR_STEP}
                  value={edgeOutline.blur}
                  disabled={!edgeOutline.enabled}
                  onChange={(e) =>
                    patchEdgeOutline({ blur: Number(e.target.value) })
                  }
                  title="Box-blur passes on edge strength before paint"
                />
                <span className="slider-val">
                  {edgeOutline.blur.toFixed(0)}
                </span>
              </label>
            </div>
            <p className="hint">
              Profiles save the full Outlines panel (silhouette, seams, edges).
              Edges use a soft depth/normal response (weights, softness, gamma,
              opacity) so mid-slider settings stay gentle; dilate/blur thicken
              after detect.
            </p>
          </CollapseSection>

          <CollapseSection
            title="Active spec"
            open={specOpen}
            onToggle={() => setSpecOpen((v) => !v)}
            actions={
              <>
                <button type="button" className="ghost" onClick={downloadSpecJson}>
                  Download
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => void copySpecJson()}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => specFileRef.current?.click()}
                >
                  Load
                </button>
                <input
                  ref={specFileRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    void onLoadSpecFile(file);
                    e.target.value = "";
                  }}
                />
              </>
            }
          >
            <textarea
              className="spec-editor"
              value={specText}
              spellCheck={false}
              onChange={(e) => onSpecTextChange(e.target.value)}
              aria-label="CharacterSpec JSON"
              rows={10}
            />
            {specParseError ? (
              <p className="error spec-parse-error">{specParseError}</p>
            ) : (
              <p className="hint">Valid JSON · live bake updates on edit</p>
            )}
          </CollapseSection>
        </section>
      </div>

      <section className="panel panel-variations">
        <h2 className="panel-title">Variations</h2>
        <VariationTimeline
          sourceDataUrl={sourcePreview}
          size={size}
          paletteSlug={paletteSlug}
          outlineHex={outlineColors.silhouette}
          buildPrompt={(steer) =>
            buildVariationPrompt(spec, {
              facing,
              size,
              paletteSlug,
              paletteName: palette?.name,
              steer,
            })
          }
          onRollRandom={applyRandom}
        />
        <CaptionRefsPanel
          paletteSlug={paletteSlug}
          paletteName={palette?.name}
        />
      </section>
      </main>
    </div>
  );
}
