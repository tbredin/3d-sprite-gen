import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { BakeCanvas, saveSprite } from "./components/BakeCanvas";
import { fetchStatus, type StatusResponse } from "./api";
import {
  DEFAULT_FACING,
  FACING_PRESETS,
  getFacing,
  type FacingId,
} from "./lib/facing";
import {
  getPreset,
  PRESET_IDS,
  randomCharacter,
  type CharacterSpec,
  type PresetId,
} from "./lib/chibi";
import { loadPalette, type Palette, type SpriteSize } from "./lib/palette";
import "./App.css";

const PITCH_LIMIT = Math.PI / 2 - 0.05;

function clampPitch(rad: number) {
  return Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, rad));
}

export default function App() {
  const [facing, setFacing] = useState<FacingId>(DEFAULT_FACING);
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(getFacing(DEFAULT_FACING).rotationY);
  const [size, setSize] = useState<SpriteSize>(64);
  const [zoom, setZoom] = useState(1);
  const [presetId, setPresetId] = useState<PresetId | "random">("mage");
  const [spec, setSpec] = useState<CharacterSpec>(() => getPreset("mage"));
  const [charKey, setCharKey] = useState(0);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [captureRequest, setCaptureRequest] = useState(0);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [bakeBusy, setBakeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    rotX: number;
    rotY: number;
  } | null>(null);

  const displayPx = size * 4;

  const applyFacing = (id: FacingId) => {
    setFacing(id);
    setRotationX(0);
    setRotationY(getFacing(id).rotationY);
  };

  const applyPreset = (id: PresetId) => {
    setPresetId(id);
    setSpec(getPreset(id));
    setCharKey((k) => k + 1);
  };

  const applyRandom = () => {
    setPresetId("random");
    setSpec(randomCharacter());
    setCharKey((k) => k + 1);
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
    setRotationY(drag.rotY + dx * 0.012);
    setRotationX(clampPitch(drag.rotX + dy * 0.012));
  };

  const onPreviewPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
    }
  };

  useEffect(() => {
    loadPalette("endesga-64")
      .then(setPalette)
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

  const onCaptured = (dataUrl: string) => {
    setPreview(dataUrl);
    setBakeBusy(false);
  };

  const bake = () => {
    if (!palette) return;
    setBakeBusy(true);
    setError(null);
    setCaptureRequest((n) => n + 1);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>3d Sprite Gen</h1>
        <p className="tagline">
          Low-poly chibi from primitives → locked iso bake at{" "}
          {size}×{size}px. Free / local only.
        </p>
      </header>

      <main className="layout">
        <section className="panel mesh-panel">
          <h2 className="panel-title">1. Character</h2>
          <p className="hint tight">
            Procedural chibi from box/sphere/cone parts. An LLM will later call
            generators like <code>generateHair(&quot;spiky&quot;, …)</code> — presets
            exercise the same assembly API now.
          </p>
          <p className="meta">
            Backend: chibi-primitives
            {status ? ` · ${status.mesh_backend}` : ""}
          </p>

          <div className="char-picker">
            <label>
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
            <button type="button" onClick={applyRandom}>
              Random character
            </button>
          </div>

          <div className="spec-summary">
            <div className="stage-label">Active spec</div>
            <pre className="spec-pre">{JSON.stringify(spec, null, 2)}</pre>
          </div>

          {error ? <p className="error">{error}</p> : null}
        </section>

        <section className="panel stage">
          <h2 className="panel-title">2. Iso preview ({size}×{size} native)</h2>

          <div className="row stage-controls">
            <label>
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
              </select>
            </label>
            <label>
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
          </div>

          <label className="zoom-label">
            Zoom
            <input
              type="range"
              min={0.7}
              max={1.6}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>

          {palette ? (
            <>
              <div
                className="canvas-wrap"
                style={{ width: displayPx, height: displayPx }}
                onPointerDown={onPreviewPointerDown}
                onPointerMove={onPreviewPointerMove}
                onPointerUp={onPreviewPointerUp}
                onPointerCancel={onPreviewPointerUp}
              >
                <BakeCanvas
                  key={`${presetId}-${charKey}-${size}`}
                  size={size}
                  colors={palette.colors}
                  zoom={zoom}
                  rotationX={rotationX}
                  rotationY={rotationY}
                  spec={spec}
                  displayPx={displayPx}
                  captureRequest={captureRequest}
                  onCaptured={onCaptured}
                />
              </div>
              <p className="meta drag-hint">
                Drag to rotate · render buffer is {size}×{size} NN-upscaled to{" "}
                {displayPx}px
              </p>
            </>
          ) : (
            <p>Loading palette…</p>
          )}

          <div className="preview-block">
            <div className="bake-header">
              <h2 className="panel-title">3. Baked PNG ({size}×{size})</h2>
              <div className="inline-actions">
                <button
                  type="button"
                  onClick={bake}
                  disabled={!palette || bakeBusy}
                >
                  {bakeBusy ? "Baking…" : "Bake frame"}
                </button>
                <button
                  type="button"
                  onClick={() => preview && saveSprite(preview, size)}
                  disabled={!preview}
                >
                  Download PNG
                </button>
              </div>
            </div>
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
                Bake a frame
              </div>
            )}
            <p className="meta">
              Palette: {palette?.name ?? "…"} · 1px outline · Endesga lock
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
