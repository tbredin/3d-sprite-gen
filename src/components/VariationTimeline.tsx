import { useEffect, useRef, useState } from "react";
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
  const [playing, setPlaying] = useState(false);
  const [items, setItems] = useState<VariationMeta[]>([]);
  const [status, setStatus] = useState<VariationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steer, setSteer] = useState("");
  const [inflight, setInflight] = useState(0);
  const [warming, setWarming] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);

  const playingRef = useRef(false);
  const sourceRef = useRef(sourceDataUrl);
  const steerRef = useRef(steer);
  const buildPromptRef = useRef(buildPrompt);
  const workersRef = useRef(0);
  const runJobRef = useRef<() => void>(() => {});
  const warmupPromiseRef = useRef<Promise<void> | null>(null);

  sourceRef.current = sourceDataUrl;
  steerRef.current = steer;
  buildPromptRef.current = buildPrompt;
  playingRef.current = playing;

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

  const runJob = async () => {
    const src = sourceRef.current;
    if (!src || !playingRef.current) return;
    if (workersRef.current >= CONCURRENCY) return;

    workersRef.current += 1;
    setInflight(workersRef.current);
    setError(null);

    try {
      await ensureWarm();
      if (!playingRef.current) return;
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
        playingRef.current = false;
        setPlaying(false);
      }
    } finally {
      workersRef.current = Math.max(0, workersRef.current - 1);
      setInflight(workersRef.current);
      if (playingRef.current) {
        queueMicrotask(() => runJobRef.current());
      }
    }
  };

  runJobRef.current = () => {
    void runJob();
  };

  useEffect(() => {
    if (!playing) return;
    for (let i = workersRef.current; i < CONCURRENCY; i++) {
      void runJob();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- play edge only
  }, [playing]);

  const onPlayPause = () => {
    if (playing) {
      setPlaying(false);
      playingRef.current = false;
      setPhase(null);
      return;
    }
    if (!sourceDataUrl) {
      setError("Waiting for pre-quantize bake…");
      return;
    }
    setError(null);
    setPlaying(true);
    playingRef.current = true;
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
  const pendingSlots = Math.max(0, inflight);

  return (
    <section className="panel panel-timeline">
      <div className="timeline-header">
        <h2 className="panel-title">AI variations</h2>
        <div className="timeline-controls">
          <button
            type="button"
            className={`timeline-play${playing ? " is-playing" : ""}`}
            onClick={onPlayPause}
            title={playing ? "Pause (drain in-flight)" : "Play stream"}
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

      <div className="timeline-scroll">
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
