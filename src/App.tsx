import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  BakeCanvas,
  saveSprite,
  DEFAULT_EDGE_OUTLINE_SETTINGS,
  EDGE_DEPTH_MAX,
  EDGE_DEPTH_MIN,
  EDGE_DEPTH_STEP,
  EDGE_NORMAL_MAX,
  EDGE_NORMAL_MIN,
  EDGE_NORMAL_STEP,
  loadEdgeOutlineSettings,
  saveEdgeOutlineSettings,
  type EdgeOutlineSettings,
} from "./components/BakeCanvas";
import { CollapseSection } from "./components/CollapseSection";
import { OutlineSwatchSelect } from "./components/OutlineSwatchSelect";
import { fetchStatus, type StatusResponse } from "./api";
import {
  FACING_PRESETS,
  getFacing,
  loadFacingPersist,
  saveFacingPersist,
  type FacingId,
} from "./lib/facing";
import {
  EMPTY_LOCKS,
  getPreset,
  PART_IDS,
  PRESET_IDS,
  randomCharacter,
  rerollPart,
  rerollPartColors,
  type CharacterSpec,
  type PartId,
  type PartLocks,
  type PresetId,
} from "./lib/chibi";
import {
  DEFAULT_OUTLINE_COLORS,
  DEFAULT_OUTLINE_PASS,
  loadOutlineColors,
  loadOutlinePassSettings,
  loadPalette,
  saveOutlineColors,
  saveOutlinePassSettings,
  type OutlineColors,
  type OutlinePassSettings,
  type Palette,
  type SpriteSize,
} from "./lib/palette";
import {
  DEFAULT_RIM_LIGHTS,
  loadRimLightSettings,
  saveRimLightSettings,
  type RimLightSettings,
} from "./lib/rimLights";
import {
  DEFAULT_CAMERA_HEIGHT,
  loadCameraHeight,
  saveCameraHeight,
} from "./lib/isoCamera";
import "./App.css";

const PITCH_LIMIT = Math.PI / 2 - 0.05;

const LIGHT_ROWS = [
  { key: "keyBrightness", label: "Key", min: 0, max: 4, step: 0.05, tone: "" },
  { key: "ambientBrightness", label: "Amb", min: 0, max: 1.2, step: 0.02, tone: "" },
  { key: "redBrightness", label: "R bri", min: 0, max: 8, step: 0.05, tone: "light-red" },
  { key: "blueBrightness", label: "B bri", min: 0, max: 8, step: 0.05, tone: "light-blue" },
  { key: "redBehind", label: "R beh", min: -1, max: 6, step: 0.05, tone: "light-red" },
  { key: "blueBehind", label: "B beh", min: -1, max: 6, step: 0.05, tone: "light-blue" },
  { key: "redSide", label: "R side", min: 0, max: 5, step: 0.05, tone: "light-red" },
  { key: "blueSide", label: "B side", min: 0, max: 5, step: 0.05, tone: "light-blue" },
  { key: "redHeight", label: "R hgt", min: -180, max: 180, step: 1, tone: "light-red" },
  { key: "blueHeight", label: "B hgt", min: -180, max: 180, step: 1, tone: "light-blue" },
] as const;

function clampPitch(rad: number) {
  return Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, rad));
}

export default function App() {
  const [facingPersist] = useState(() => loadFacingPersist());
  const [facing, setFacing] = useState<FacingId>(facingPersist.facing);
  const [rotationX, setRotationX] = useState(facingPersist.rotationX);
  const [rotationY, setRotationY] = useState(facingPersist.rotationY);
  const [size, setSize] = useState<SpriteSize>(48);
  const [zoom, setZoom] = useState(1);
  const [cameraHeight, setCameraHeight] = useState(() => loadCameraHeight());
  const [presetId, setPresetId] = useState<PresetId | "random">("mage");
  const [spec, setSpec] = useState<CharacterSpec>(() => getPreset("mage"));
  const [charKey, setCharKey] = useState(0);
  const [locks, setLocks] = useState<PartLocks>({ ...EMPTY_LOCKS });
  const [rimLights, setRimLights] = useState<RimLightSettings>(() =>
    loadRimLightSettings(),
  );
  const [outlineColors, setOutlineColors] = useState<OutlineColors>(() =>
    loadOutlineColors(),
  );
  const [outlinePass, setOutlinePass] = useState<OutlinePassSettings>(() =>
    loadOutlinePassSettings(),
  );
  const [edgeOutline, setEdgeOutline] = useState<EdgeOutlineSettings>(
    () => loadEdgeOutlineSettings(),
  );
  const [palette, setPalette] = useState<Palette | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [specOpen, setSpecOpen] = useState(false);
  const [lightsOpen, setLightsOpen] = useState(false);
  const [outlinesOpen, setOutlinesOpen] = useState(true);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    rotX: number;
    rotY: number;
  } | null>(null);

  const displayPx = size * 4;

  const applyFacing = (id: FacingId) => {
    if (id === "custom") return;
    setFacing(id);
    setRotationX(0);
    setRotationY(getFacing(id).rotationY);
  };

  useEffect(() => {
    saveFacingPersist({ facing, rotationX, rotationY });
  }, [facing, rotationX, rotationY]);

  const applyPreset = (id: PresetId) => {
    setPresetId(id);
    setSpec(getPreset(id));
    setCharKey((k) => k + 1);
  };

  const applyRandom = () => {
    setPresetId("random");
    setSpec((prev) => randomCharacter(locks, prev));
    setCharKey((k) => k + 1);
  };

  const toggleLock = (part: PartId) => {
    setLocks((prev) => ({ ...prev, [part]: !prev[part] }));
  };

  const applyRerollPart = (part: PartId) => {
    setPresetId("random");
    setSpec((prev) => rerollPart(prev, part));
    setCharKey((k) => k + 1);
  };

  const applyRerollColors = (part: PartId) => {
    setPresetId("random");
    setSpec((prev) => rerollPartColors(prev, part));
    setCharKey((k) => k + 1);
  };

  const patchRimLights = (patch: Partial<RimLightSettings>) => {
    setRimLights((prev) => {
      const next = { ...prev, ...patch };
      saveRimLightSettings(next);
      return next;
    });
  };

  const resetRimLights = () => {
    const next = { ...DEFAULT_RIM_LIGHTS };
    saveRimLightSettings(next);
    setRimLights(next);
  };

  const onPreviewPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      rotX: rotationX,
      rotY: rotationY,
    };
  };

  const onPreviewPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (dx === 0 && dy === 0) return;
    setFacing("custom");
    setRotationY(drag.rotY + dx * 0.012);
    setRotationX(clampPitch(drag.rotX + dy * 0.012));
  };

  const onPreviewPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
    }
  };

  const patchOutlineColor = (patch: Partial<OutlineColors>) => {
    setOutlineColors((prev) => {
      const next = { ...prev, ...patch };
      saveOutlineColors(next);
      return next;
    });
  };

  const patchOutlinePass = (patch: Partial<OutlinePassSettings>) => {
    setOutlinePass((prev) => {
      const next = { ...prev, ...patch };
      saveOutlinePassSettings(next);
      return next;
    });
  };

  const patchEdgeOutline = (patch: Partial<EdgeOutlineSettings>) => {
    setEdgeOutline((prev) => {
      const next = { ...prev, ...patch };
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
  };

  useEffect(() => {
    loadPalette("endesga-64")
      .then((p) => {
        setPalette(p);
        setOutlineColors(loadOutlineColors(p.colors));
        setEdgeOutline(loadEdgeOutlineSettings(p.colors));
      })
      .catch((e) => setError(String(e)));
    fetchStatus()
      .then(setStatus)
      .catch(() =>
        setStatus({
          mesh_backend: "chibi-primitives",
          mesh_ready: true,
          message: "Local chibi primitive builder (no upload required).",
          sizes: [32, 48, 64],
          default_palette: "endesga-64",
        }),
      );
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>3d Sprite Gen</h1>
        <p className="tagline">
          Procedural chibi → iso bake at {size}×{size}px · free / local
          {status ? ` · ${status.mesh_backend}` : ""}
        </p>
        <p className="tagline feature-boost-note">
          Main: readable FF eyes, ¾ fighting stance, outline/edge controls.
        </p>
      </header>

      <main className="layout">
        <section className="panel panel-character">
          <h2 className="panel-title">Character</h2>

          <div className="preview-row">
            <div className="preview-main">
              {palette ? (
                <div
                  className="canvas-wrap preview-bg-checker"
                  style={{ width: displayPx, height: displayPx }}
                  onPointerDown={onPreviewPointerDown}
                  onPointerMove={onPreviewPointerMove}
                  onPointerUp={onPreviewPointerUp}
                  onPointerCancel={onPreviewPointerUp}
                  title="Drag to rotate"
                >
                  <BakeCanvas
                    key={`${presetId}-${charKey}-${size}`}
                    size={size}
                    colors={palette.colors}
                    silhouetteOutlineHex={outlineColors.silhouette}
                    partSeamsOutlineHex={outlineColors.partSeams}
                    outlinePass={outlinePass}
                    zoom={zoom}
                    cameraHeight={cameraHeight}
                    rotationX={rotationX}
                    rotationY={rotationY}
                    spec={spec}
                    rimLights={rimLights}
                    edgeOutline={edgeOutline}
                    displayPx={displayPx}
                    onCaptured={setPreview}
                  />
                </div>
              ) : (
                <div
                  className="pixel-empty"
                  style={{ width: displayPx, height: displayPx }}
                >
                  Loading…
                </div>
              )}
              <p className="meta drag-hint">Drag to rotate · NN preview · iso checker</p>
            </div>

            <div className="preview-side">
              <label className="field">
                Iso facing
                <select
                  value={facing}
                  onChange={(e) => applyFacing(e.target.value as FacingId)}
                >
                  {FACING_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
              </label>
              <label className="field">
                Sprite size
                <select
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value) as SpriteSize)}
                >
                  <option value={32}>32</option>
                  <option value={48}>48</option>
                  <option value={64}>64</option>
                </select>
              </label>
              <div className="field">
                <div className="field-heading">
                  <span>Zoom</span>
                  <button
                    type="button"
                    className="field-reset"
                    onClick={() => setZoom(1)}
                  >
                    Reset
                  </button>
                </div>
                <input
                  type="range"
                  min={0.7}
                  max={1.6}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </div>
              <div className="field">
                <div className="field-heading">
                  <span>Cam height</span>
                  <button
                    type="button"
                    className="field-reset"
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
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setCameraHeight(v);
                    saveCameraHeight(v);
                  }}
                  title="Iso camera elevation (1 = classic)"
                />
              </div>
            </div>
          </div>

          <div className="char-picker">
            <label className="field">
              Preset
              <select
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
                    {id}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="field-matched" onClick={applyRandom}>
              Random
            </button>
          </div>

          <div className="part-controls">
            <div className="stage-label">Parts</div>
            <div className="part-grid">
              {PART_IDS.map((part) => (
                <div key={part} className="part-row">
                  <span className="part-name">{part}</span>
                  <div className="part-actions">
                    <label className="part-lock">
                      <input
                        type="checkbox"
                        checked={locks[part]}
                        onChange={() => toggleLock(part)}
                      />
                      Lock
                    </label>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => applyRerollPart(part)}
                      disabled={locks[part]}
                      title={
                        locks[part]
                          ? "Unlock to reroll this part"
                          : "Reroll this part"
                      }
                    >
                      Reroll
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => applyRerollColors(part)}
                    >
                      Colors
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
            <div className="light-grid">
              {LIGHT_ROWS.map((row) => (
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

          {preview ? (
            <img
              className="pixel-preview"
              src={preview}
              alt="baked sprite"
              width={displayPx}
              height={displayPx}
            />
          ) : (
            <div
              className="pixel-empty"
              style={{ width: displayPx, height: displayPx }}
            >
              Preparing…
            </div>
          )}

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
                  const nextColors = { ...DEFAULT_OUTLINE_COLORS };
                  saveOutlinePassSettings(nextPass);
                  saveOutlineColors(nextColors);
                  setOutlinePass(nextPass);
                  setOutlineColors(nextColors);
                  resetEdgeOutline();
                }}
              >
                Reset
              </button>
            }
          >
            <div className="part-grid">
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
                  {palette ? (
                    <OutlineSwatchSelect
                      colors={palette.colors}
                      value={outlineColors.silhouette}
                      onChange={(hex) => patchOutlineColor({ silhouette: hex })}
                      disabled={!outlinePass.silhouette}
                    />
                  ) : (
                    <span className="hint">…</span>
                  )}
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
                  {palette ? (
                    <OutlineSwatchSelect
                      colors={palette.colors}
                      value={outlineColors.partSeams}
                      onChange={(hex) => patchOutlineColor({ partSeams: hex })}
                      disabled={!outlinePass.partSeams}
                    />
                  ) : (
                    <span className="hint">…</span>
                  )}
                </div>
              </div>
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
                  {palette ? (
                    <OutlineSwatchSelect
                      colors={palette.colors}
                      value={edgeOutline.color}
                      onChange={setEdgeColor}
                      disabled={!edgeOutline.enabled}
                    />
                  ) : (
                    <span className="hint">…</span>
                  )}
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
            </div>
            <p className="hint">
              Silhouette and part seams each pick their own outline colour.
              Edges draw internal creases from depth/normal discontinuities;
              seams outline tagged part boundaries after the Endesga lock.
            </p>
          </CollapseSection>

          <div className="bake-tools">
            <button
              type="button"
              className="download-btn"
              onClick={() => preview && saveSprite(preview, size)}
              disabled={!preview}
            >
              Download PNG
            </button>
          </div>
          <p className="meta">
            {palette?.name ?? "…"} · sil #{outlineColors.silhouette} · seams #
            {outlineColors.partSeams} · Endesga · live bake
          </p>

          <CollapseSection
            title="Active spec"
            open={specOpen}
            onToggle={() => setSpecOpen((v) => !v)}
          >
            <pre className="spec-pre">{JSON.stringify(spec, null, 2)}</pre>
          </CollapseSection>
        </section>
      </main>
    </div>
  );
}
