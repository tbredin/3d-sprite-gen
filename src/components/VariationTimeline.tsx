import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import {
  clearUnlockedVariations,
  deleteVariation,
  fetchVariationStatus,
  generateVariation,
  listVariations,
  setVariationLocked,
  warmupVariations,
  type VariationMeta,
  type VariationStatus,
} from "../api";
import { downloadDataUrl } from "../lib/capture";

const CONCURRENCY = 3;
const PREVIEW_GAP = 8;
const IDLE_REROLL_MS = 60 * 60 * 1000;
const IDLE_REROLL_TICK_MS = 30 * 1000;

type StreamMode = "stopped" | "playing" | "idleReroll";

type HoverPreview = {
  src: string;
  alt: string;
  left: number;
  top: number;
};

type Props = {
  sourceDataUrl: string | null;
  size: number;
  paletteSlug: string;
  outlineHex: string;
  /** Receives current steer text from the timeline field. */
  buildPrompt: (steer: string) => string;
};

export function VariationTimeline({
  sourceDataUrl,
  size,
  paletteSlug,
  outlineHex,
  buildPrompt,
}: Props) {
  const [mode, setMode] = useState<StreamMode>("stopped");
  const [items, setItems] = useState<VariationMeta[]>([]);
  const [status, setStatus] = useState<VariationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steer, setSteer] = useState("");
  const [inflight, setInflight] = useState(0);
  const [warming, setWarming] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);

  const modeRef = useRef<StreamMode>("stopped");
  const sourceRef = useRef(sourceDataUrl);
  const itemsRef = useRef(items);
  const steerRef = useRef(steer);
  const buildPromptRef = useRef(buildPrompt);
  const workersRef = useRef(0);
  const runJobRef = useRef<() => void>(() => {});
  const warmupPromiseRef = useRef<Promise<void> | null>(null);
  const idleDeadlineRef = useRef<number | null>(null);

  sourceRef.current = sourceDataUrl;
  itemsRef.current = items;
  steerRef.current = steer;
  buildPromptRef.current = buildPrompt;
  modeRef.current = mode;

  useEffect(() => {
    void listVariations()
      .then(setItems)
      .catch(() => setItems([]));
    void fetchVariationStatus()
      .then(setStatus)
      .catch(() =>
        setStatus({
          ready: false,
          loaded: false,
          message: "Variation API unreachable — start the server.",
        }),
      );
  }, []);

  const refreshStatus = () => {
    void fetchVariationStatus()
      .then(setStatus)
      .catch(() => undefined);
  };

  const ensureWarm = async () => {
    const current = await fetchVariationStatus().catch(() => null);
    if (current) setStatus(current);
    if (current?.loaded) return;
    if (!warmupPromiseRef.current) {
      setWarming(true);
      setPhase("Loading SDXL + pixel-art-xl + ControlNet (first time downloads weights)…");
      warmupPromiseRef.current = warmupVariations()
        .then((s) => {
          setStatus(s);
          setPhase(null);
        })
        .catch((err) => {
          warmupPromiseRef.current = null;
          throw err;
        })
        .finally(() => setWarming(false));
    }
    await warmupPromiseRef.current;
  };

  const stopStream = (message?: string) => {
    idleDeadlineRef.current = null;
    modeRef.current = "stopped";
    setMode("stopped");
    if (message) setPhase(message);
  };

  const startIdleReroll = () => {
    const lockedCount = itemsRef.current.filter((item) => item.locked).length;
    if (lockedCount === 0) {
      stopStream("Paused — lock at least one timeline image to idle-reroll.");
      return;
    }
    idleDeadlineRef.current = Date.now() + IDLE_REROLL_MS;
    modeRef.current = "idleReroll";
    setMode("idleReroll");
    setError(null);
    setPhase(null);
  };

  const getIdleRemainingMs = () => {
    if (modeRef.current !== "idleReroll" || !idleDeadlineRef.current) return null;
    return Math.max(0, idleDeadlineRef.current - Date.now());
  };

  const stopExpiredIdleReroll = () => {
    const remaining = getIdleRemainingMs();
    if (remaining === null || remaining > 0) return false;
    stopStream("Idle reroll stopped after 60 minutes.");
    return true;
  };

  const resolveSource = () => {
    if (modeRef.current === "playing") return sourceRef.current;
    if (modeRef.current !== "idleReroll") return null;
    if (stopExpiredIdleReroll()) return null;

    const lockedItems = itemsRef.current.filter((item) => item.locked);
    if (lockedItems.length === 0) {
      stopStream("Idle reroll stopped — no locked timeline images remain.");
      return null;
    }

    return lockedItems[Math.floor(Math.random() * lockedItems.length)].image;
  };

  const runJob = async () => {
    const src = resolveSource();
    if (!src) return;
    if (workersRef.current >= CONCURRENCY) return;

    workersRef.current += 1;
    setInflight(workersRef.current);
    setError(null);

    try {
      await ensureWarm();
      if (modeRef.current === "stopped") return;
      setPhase(null);
      const prompt = buildPromptRef.current(steerRef.current);
      const meta = await generateVariation({
        sourceDataUrl: src,
        size,
        paletteSlug,
        prompt,
        outlineHex,
      });
      setItems((prev) => [meta, ...prev.filter((x) => x.id !== meta.id)]);
      refreshStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setPhase(null);
      if (/503|Missing ML|RuntimeError|CUDA out of memory|warmup/i.test(msg)) {
        stopStream();
      }
    } finally {
      workersRef.current = Math.max(0, workersRef.current - 1);
      setInflight(workersRef.current);
      if (modeRef.current !== "stopped") {
        queueMicrotask(() => runJobRef.current());
      }
    }
  };

  runJobRef.current = () => {
    void runJob();
  };

  useEffect(() => {
    if (mode === "stopped") return;
    for (let i = workersRef.current; i < CONCURRENCY; i++) {
      void runJob();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mode edge only
  }, [mode]);

  useEffect(() => {
    if (mode !== "idleReroll") return;
    const timer = window.setInterval(() => {
      stopExpiredIdleReroll();
    }, IDLE_REROLL_TICK_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idle deadline only
  }, [mode]);

  const onPlayPause = () => {
    if (mode === "playing") {
      startIdleReroll();
      return;
    }
    if (!sourceDataUrl) {
      setError("Waiting for pre-quantize bake…");
      return;
    }
    setError(null);
    setPhase(null);
    idleDeadlineRef.current = null;
    modeRef.current = "playing";
    setMode("playing");
  };

  const onClear = async () => {
    try {
      await clearUnlockedVariations();
      setItems(await listVariations());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const onLock = async (id: string, locked: boolean) => {
    try {
      const meta = await setVariationLocked(id, locked);
      setItems((prev) => prev.map((x) => (x.id === id ? meta : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteVariation(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const onDownload = async (item: VariationMeta) => {
    const res = await fetch(item.image);
    const blob = await res.blob();
    downloadDataUrl(
      await blobToDataUrl(blob),
      `variation-${item.id}-${item.size}.png`,
    );
  };

  const thumbPx = Math.min(96, size * 2);
  const previewPx = thumbPx * 2;
  const pendingSlots = Math.max(0, inflight);
  const playing = mode === "playing";
  const idleRerolling = mode === "idleReroll";
  const lockedCount = items.filter((item) => item.locked).length;
  const idleRemainingMs = getIdleRemainingMs();
  const idleRemainingMinutes =
    idleRemainingMs === null ? null : Math.ceil(idleRemainingMs / 60000);

  const showThumbPreview = (
    e: MouseEvent<HTMLImageElement>,
    item: VariationMeta,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - previewPx / 2;
    let top = rect.top - previewPx - PREVIEW_GAP;
    if (top < PREVIEW_GAP) {
      top = rect.bottom + PREVIEW_GAP;
    }
    left = Math.max(
      PREVIEW_GAP,
      Math.min(left, window.innerWidth - previewPx - PREVIEW_GAP),
    );
    setHoverPreview({
      src: item.image,
      alt: item.freedom,
      left,
      top,
    });
  };

  return (
    <section className="panel panel-timeline">
      <div className="timeline-header">
        <h2 className="panel-title">AI variations</h2>
        <div className="timeline-controls">
          <button
            type="button"
            className={`timeline-play${mode !== "stopped" ? " is-playing" : ""}`}
            onClick={onPlayPause}
            title={
              playing
                ? "Pause to idle-reroll from locked timeline images"
                : idleRerolling
                  ? "Resume stream from 3D bake"
                  : "Play stream"
            }
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => void onClear()}
          >
            Clear unlocked
          </button>
          <span className="meta timeline-status">
            {inflight}/{CONCURRENCY} in flight
            {playing ? " · 3D source" : ""}
            {idleRerolling
              ? ` · idle reroll from ${lockedCount} lock${
                  lockedCount === 1 ? "" : "s"
                }${
                  idleRemainingMinutes === null
                    ? ""
                    : ` · ${idleRemainingMinutes}m left`
                }`
              : ""}
            {warming ? " · warming up" : ""}
            {status
              ? ` · ${
                  status.loaded
                    ? status.device ?? "loaded"
                    : status.ready
                      ? "weights not loaded"
                      : "deps missing"
                }`
              : ""}
          </span>
        </div>
      </div>

      <div className="timeline-steer-block">
        <div className="timeline-steer-head">
          <label className="timeline-steer-label" htmlFor="timeline-steer">
            Steer prompt
          </label>
          <span className="meta timeline-steer-hint">
            Appended to house style + facing + character parts (camera/lights
            come from the bake)
          </span>
        </div>
        <textarea
          id="timeline-steer"
          className="timeline-steer-input"
          value={steer}
          rows={3}
          spellCheck={false}
          onChange={(e) => setSteer(e.target.value)}
          placeholder="e.g. cuter eyes, mage robes with a gold trim, soft cheek blush…"
        />
        {status && !status.ready ? (
          <p className="meta timeline-hint">
            {status.message} See{" "}
            <code>server/requirements-variations.txt</code>.
          </p>
        ) : null}
      </div>

      {phase ? <p className="timeline-phase">{phase}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div
        className="timeline-scroll"
        onScroll={() => setHoverPreview(null)}
      >
        {items.length === 0 && pendingSlots === 0 ? (
          <p className="meta">No generations yet — hit Play.</p>
        ) : (
          <ul className="timeline-grid">
            {Array.from({ length: pendingSlots }, (_, i) => (
              <li key={`pending-${i}`} className="timeline-tile is-pending">
                <div
                  className="pixel-empty timeline-pending"
                  style={{ width: thumbPx, height: thumbPx }}
                >
                  …
                </div>
                <span className="meta">…</span>
              </li>
            ))}
            {items.map((item) => (
              <li key={item.id} className="timeline-tile">
                <img
                  className="pixel-preview timeline-thumb"
                  src={item.image}
                  alt={item.freedom}
                  width={thumbPx}
                  height={thumbPx}
                  onMouseEnter={(e) => showThumbPreview(e, item)}
                  onMouseLeave={() => setHoverPreview(null)}
                />
                <div className="timeline-tile-meta">
                  <span className="timeline-tag">{item.freedom}</span>
                  <span className="meta">
                    {item.elapsed_s}s · {item.seed}
                  </span>
                </div>
                <div className="timeline-tile-actions">
                  <button
                    type="button"
                    className="timeline-micro-btn"
                    title="Download PNG"
                    onClick={() => void onDownload(item)}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className={`timeline-micro-btn${item.locked ? " is-locked" : ""}`}
                    title={item.locked ? "Unlock" : "Lock"}
                    onClick={() => void onLock(item.id, !item.locked)}
                  >
                    {item.locked ? "Unlock" : "Lock"}
                  </button>
                  <button
                    type="button"
                    className="timeline-micro-btn timeline-delete"
                    disabled={item.locked}
                    title={
                      item.locked ? "Unlock before deleting" : "Delete from disk"
                    }
                    onClick={() => void onDelete(item.id)}
                  >
                    Del
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {hoverPreview
        ? createPortal(
            <div
              className="timeline-thumb-tooltip"
              style={{ left: hoverPreview.left, top: hoverPreview.top }}
              role="tooltip"
            >
              <img
                className="pixel-preview"
                src={hoverPreview.src}
                alt={hoverPreview.alt}
                width={previewPx}
                height={previewPx}
              />
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
