import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import {
  clearUnlockedVariations,
  deleteVariation,
  fetchLockedVariationsZip,
  fetchVariationStatus,
  generateVariation,
  listVariations,
  setVariationLocked,
  warmupVariations,
  type VariationFreedom,
  type VariationMeta,
  type VariationStatus,
} from "../api";
import { downloadBlob, downloadDataUrl } from "../lib/capture";
import {
  loadVariationSettings,
  saveVariationSettings,
  VARIATION_GUIDANCE_MAX,
  VARIATION_GUIDANCE_MIN,
  VARIATION_GUIDANCE_STEP,
  VARIATION_STEPS_MAX,
  VARIATION_STEPS_MIN,
} from "../lib/variationSettings";
import { CollapseSection } from "./CollapseSection";

const CONCURRENCY = 3;
const PREVIEW_GAP = 8;
const IDLE_REROLL_TICK_MS = 30 * 1000;
const SELECTED_IDS_STORAGE_KEY = "3d-sprite-gen:variation-selected-ids-v1";
const OPEN_STORAGE_KEY = "3d-sprite-gen:ai-variations-open-v1";

const DEFAULT_STEPS = 30;
const DEFAULT_GUIDANCE = 7;
/** Default auto-stop for idle reroll / Remix (hours). */
const DEFAULT_MAX_HOURS = 4;
const MIN_MAX_HOURS = 0.25;
const MAX_MAX_HOURS = 24;
/** UI slider max — Remix always uses this. */
const MAX_STEPS = VARIATION_STEPS_MAX;
const GUIDANCE_MIN = VARIATION_GUIDANCE_MIN;
const GUIDANCE_MAX = VARIATION_GUIDANCE_MAX;
const GUIDANCE_STEP = VARIATION_GUIDANCE_STEP;

function loadOpen(): boolean {
  try {
    const raw = localStorage.getItem(OPEN_STORAGE_KEY);
    if (raw === null) return true;
    return raw === "1" || raw === "true";
  } catch {
    return true;
  }
}

function loadSelectedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SELECTED_IDS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((id): id is string => typeof id === "string"),
    );
  } catch {
    return new Set();
  }
}

function saveSelectedIds(ids: Set<string>) {
  try {
    localStorage.setItem(
      SELECTED_IDS_STORAGE_KEY,
      JSON.stringify([...ids]),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

function clampMaxHours(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MAX_HOURS;
  return Math.min(MAX_MAX_HOURS, Math.max(MIN_MAX_HOURS, value));
}

function formatHoursLabel(hours: number): string {
  if (hours === 1) return "1 hour";
  if (Number.isInteger(hours)) return `${hours} hours`;
  return `${hours} hours`;
}

function hoursToMs(hours: number): number {
  return clampMaxHours(hours) * 60 * 60 * 1000;
}

type StreamMode =
  | "stopped"
  | "playing"
  | "playRandom"
  | "idleReroll"
  | "remixing";
type FreedomChoice = "auto" | VariationFreedom;
type VisibilityFilter = "all" | "locked" | "unlocked";
type SortMode = "newest" | "oldest" | "lockedFirst";

function randomGuidance(): number {
  const steps = Math.round((GUIDANCE_MAX - GUIDANCE_MIN) / GUIDANCE_STEP);
  return GUIDANCE_MIN + Math.floor(Math.random() * (steps + 1)) * GUIDANCE_STEP;
}

type HoverPreview = {
  src: string;
  alt: string;
  left: number;
  top: number;
};

function filterAndSortItems(
  items: VariationMeta[],
  visibility: VisibilityFilter,
  sort: SortMode,
): VariationMeta[] {
  const filtered =
    visibility === "all"
      ? items
      : visibility === "locked"
        ? items.filter((item) => item.locked)
        : items.filter((item) => !item.locked);

  const sorted = [...filtered];
  if (sort === "newest") {
    sorted.sort((a, b) => b.created_at - a.created_at);
  } else if (sort === "oldest") {
    sorted.sort((a, b) => a.created_at - b.created_at);
  } else {
    sorted.sort((a, b) => {
      if (a.locked !== b.locked) return a.locked ? -1 : 1;
      return b.created_at - a.created_at;
    });
  }
  return sorted;
}

type Props = {
  sourceDataUrl: string | null;
  size: number;
  paletteSlug: string;
  outlineHex: string;
  /** Receives current steer text from the timeline field. */
  buildPrompt: (steer: string) => string;
  /**
   * "Play random" hook: fired as soon as a generation starts (current bake
   * already snapped for the AI). Rolls the next character so lights/outlines
   * can be tweaked while the in-flight job runs.
   */
  onRollRandom?: () => void;
};

export function VariationTimeline({
  sourceDataUrl,
  size,
  paletteSlug,
  outlineHex,
  buildPrompt,
  onRollRandom,
}: Props) {
  const [open, setOpen] = useState(loadOpen);
  const [mode, setMode] = useState<StreamMode>("stopped");
  const [items, setItems] = useState<VariationMeta[]>([]);
  const [status, setStatus] = useState<VariationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steer, setSteer] = useState("");
  const [freedom, setFreedom] = useState<FreedomChoice>("auto");
  const [steps, setSteps] = useState(
    () => loadVariationSettings()?.steps ?? DEFAULT_STEPS,
  );
  const [guidance, setGuidance] = useState(
    () => loadVariationSettings()?.guidance ?? DEFAULT_GUIDANCE,
  );
  const [inflight, setInflight] = useState(0);
  const [warming, setWarming] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(loadSelectedIds);
  const [maxHours, setMaxHours] = useState(DEFAULT_MAX_HOURS);
  const [zipping, setZipping] = useState(false);

  const modeRef = useRef<StreamMode>("stopped");
  const sourceRef = useRef(sourceDataUrl);
  const itemsRef = useRef(items);
  const selectedIdsRef = useRef(selectedIds);
  const steerRef = useRef(steer);
  const freedomRef = useRef(freedom);
  const stepsRef = useRef(steps);
  const guidanceRef = useRef(guidance);
  const maxHoursRef = useRef(maxHours);
  const runMaxHoursRef = useRef(DEFAULT_MAX_HOURS);
  const buildPromptRef = useRef(buildPrompt);
  const onRollRandomRef = useRef(onRollRandom);
  const workersRef = useRef(0);
  const runJobRef = useRef<() => void>(() => {});
  const warmupPromiseRef = useRef<Promise<void> | null>(null);
  const idleDeadlineRef = useRef<number | null>(null);
  const remixCursorRef = useRef(0);
  /** Next action for "Random remix": alternates Remix ↔ Play random. */
  const [randomRemixNext, setRandomRemixNext] = useState<"remix" | "playRandom">(
    "remix",
  );
  /** Persisted Steps/CFG win over server defaults on first status fetch. */
  const hadPersistedSettingsRef = useRef(loadVariationSettings() != null);

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_STORAGE_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open]);

  sourceRef.current = sourceDataUrl;
  itemsRef.current = items;
  selectedIdsRef.current = selectedIds;
  steerRef.current = steer;
  freedomRef.current = freedom;
  stepsRef.current = steps;
  guidanceRef.current = guidance;
  maxHoursRef.current = maxHours;
  buildPromptRef.current = buildPrompt;
  onRollRandomRef.current = onRollRandom;
  modeRef.current = mode;

  useEffect(() => {
    saveVariationSettings({ steps, guidance });
  }, [steps, guidance]);

  useEffect(() => {
    void listVariations()
      .then((next) => {
        setItems(next);
        const keep = new Set(next.map((item) => item.id));
        setSelectedIds((prev) => {
          let changed = false;
          const pruned = new Set<string>();
          for (const id of prev) {
            if (keep.has(id)) pruned.add(id);
            else changed = true;
          }
          return changed ? pruned : prev;
        });
      })
      .catch(() => setItems([]));
    void fetchVariationStatus()
      .then((s) => {
        setStatus(s);
        if (hadPersistedSettingsRef.current) return;
        if (typeof s.default_steps === "number") setSteps(s.default_steps);
        if (typeof s.default_guidance === "number") {
          setGuidance(s.default_guidance);
        }
      })
      .catch(() =>
        setStatus({
          ready: false,
          loaded: false,
          message: "Variation API unreachable — start the server.",
        }),
      );
  }, []);

  useEffect(() => {
    saveSelectedIds(selectedIds);
  }, [selectedIds]);

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

  const beginTimedRun = (nextMode: "idleReroll" | "remixing") => {
    const hours = clampMaxHours(maxHoursRef.current);
    runMaxHoursRef.current = hours;
    idleDeadlineRef.current = Date.now() + hoursToMs(hours);
    modeRef.current = nextMode;
    setMode(nextMode);
    setError(null);
    setPhase(null);
  };

  const startIdleReroll = () => {
    const lockedCount = itemsRef.current.filter((item) => item.locked).length;
    if (lockedCount === 0) {
      stopStream("Paused — lock at least one timeline image to idle-reroll.");
      return;
    }
    beginTimedRun("idleReroll");
  };

  const getDeadlineRemainingMs = (modes: StreamMode[]) => {
    if (!modes.includes(modeRef.current) || !idleDeadlineRef.current) {
      return null;
    }
    return Math.max(0, idleDeadlineRef.current - Date.now());
  };

  const stopExpiredDeadline = () => {
    if (modeRef.current === "idleReroll") {
      const remaining = getDeadlineRemainingMs(["idleReroll"]);
      if (remaining === null || remaining > 0) return false;
      stopStream(
        `Idle reroll stopped after ${formatHoursLabel(runMaxHoursRef.current)}.`,
      );
      return true;
    }
    if (modeRef.current === "remixing") {
      const remaining = getDeadlineRemainingMs(["remixing"]);
      if (remaining === null || remaining > 0) return false;
      stopStream(
        `Remix stopped after ${formatHoursLabel(runMaxHoursRef.current)}.`,
      );
      return true;
    }
    return false;
  };

  const resolveRemixSource = () => {
    if (stopExpiredDeadline()) return null;

    const selected = itemsRef.current.filter((item) =>
      selectedIdsRef.current.has(item.id),
    );
    if (selected.length === 0) {
      stopStream("Remix stopped — no selected timeline images remain.");
      return null;
    }

    const index = remixCursorRef.current % selected.length;
    remixCursorRef.current = index + 1;
    return selected[index].image;
  };

  const resolveSource = () => {
    if (
      modeRef.current === "playing" ||
      modeRef.current === "playRandom"
    ) {
      return sourceRef.current;
    }
    if (modeRef.current === "remixing") {
      return resolveRemixSource();
    }
    if (modeRef.current !== "idleReroll") return null;
    if (stopExpiredDeadline()) return null;

    const lockedItems = itemsRef.current.filter((item) => item.locked);
    if (lockedItems.length === 0) {
      stopStream("Idle reroll stopped — no locked timeline images remain.");
      return null;
    }

    return lockedItems[Math.floor(Math.random() * lockedItems.length)].image;
  };

  // Read via a function call so TS doesn't narrow modeRef.current across the
  // awaits in runJob — the mode can flip to "stopped" mid-flight.
  const isStopped = () => modeRef.current === "stopped";

  // "Play random" snaps the current bake, then rolls the next character so the
  // user can tweak lights/outlines while the AI job runs. Serialize to one
  // worker so each generation maps to one on-screen character.
  const effectiveConcurrency = () =>
    modeRef.current === "playRandom" ? 1 : CONCURRENCY;

  const runJob = async () => {
    if (isStopped()) return;
    if (workersRef.current >= effectiveConcurrency()) return;
    // Bail early if no source is available yet (live bake or idle-reroll).
    if (!resolveSource()) return;

    workersRef.current += 1;
    setInflight(workersRef.current);
    setError(null);

    try {
      await ensureWarm();
      if (isStopped()) return;
      setPhase(null);

      // Re-read the bake now so any light/outline tweaks during warmup land
      // in the snapshot we send.
      const src = resolveSource();
      if (!src) return;

      // Capture prompt against the character whose bake we are sending.
      const prompt = buildPromptRef.current(steerRef.current);
      const remixing = modeRef.current === "remixing";
      const genPromise = generateVariation({
        sourceDataUrl: src,
        size,
        paletteSlug,
        prompt,
        outlineHex,
        freedom: freedomRef.current,
        steps: remixing ? MAX_STEPS : stepsRef.current,
        guidanceScale: remixing ? randomGuidance() : guidanceRef.current,
      });

      // Roll the next character immediately so lights/outlines can be tweaked
      // while this snapshot is in flight.
      if (modeRef.current === "playRandom") {
        onRollRandomRef.current?.();
      }

      const meta = await genPromise;
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
      if (!isStopped()) {
        queueMicrotask(() => runJobRef.current());
      }
    }
  };

  runJobRef.current = () => {
    void runJob();
  };

  useEffect(() => {
    if (mode === "stopped") return;
    const target = mode === "playRandom" ? 1 : CONCURRENCY;
    for (let i = workersRef.current; i < target; i++) {
      void runJob();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mode edge only
  }, [mode]);

  useEffect(() => {
    if (mode !== "idleReroll" && mode !== "remixing") return;
    const timer = window.setInterval(() => {
      stopExpiredDeadline();
    }, IDLE_REROLL_TICK_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deadline modes only
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

  const onPlayRandom = () => {
    if (mode === "playRandom") {
      stopStream();
      return;
    }
    if (!sourceDataUrl) {
      setError("Waiting for pre-quantize bake…");
      return;
    }
    setError(null);
    setPhase(null);
    idleDeadlineRef.current = null;
    modeRef.current = "playRandom";
    setMode("playRandom");
  };

  const onRemix = () => {
    if (mode === "remixing") {
      stopStream();
      return;
    }
    if (selectedIds.size === 0) {
      setError("Select at least one variation to remix.");
      return;
    }
    remixCursorRef.current = 0;
    beginTimedRun("remixing");
  };

  const onRandomRemix = () => {
    if (randomRemixNext === "remix") onRemix();
    else onPlayRandom();
    setRandomRemixNext((prev) => (prev === "remix" ? "playRandom" : "remix"));
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  };

  const selectAllLocked = () => {
    setSelectedIds(
      new Set(items.filter((item) => item.locked).map((item) => item.id)),
    );
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const pruneSelection = (ids: Iterable<string>) => {
    const keep = new Set(ids);
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (keep.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  };

  const onClear = async () => {
    try {
      await clearUnlockedVariations();
      const next = await listVariations();
      setItems(next);
      pruneSelection(next.map((item) => item.id));
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
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const onDownloadLocked = async () => {
    setZipping(true);
    try {
      const { blob, filename } = await fetchLockedVariationsZip();
      downloadBlob(blob, filename);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setZipping(false);
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
  const playingRandom = mode === "playRandom";
  const idleRerolling = mode === "idleReroll";
  const remixing = mode === "remixing";
  const maxConcurrency = playingRandom ? 1 : CONCURRENCY;
  const lockedCount = items.filter((item) => item.locked).length;
  const unlockedCount = items.length - lockedCount;
  const selectedCount = selectedIds.size;
  const allSelected =
    items.length > 0 && items.every((item) => selectedIds.has(item.id));
  const allLockedSelected =
    lockedCount > 0 &&
    items.every((item) => !item.locked || selectedIds.has(item.id));
  const visibleItems = filterAndSortItems(items, visibility, sort);
  const deadlineRemainingMs = getDeadlineRemainingMs(
    idleRerolling ? ["idleReroll"] : remixing ? ["remixing"] : [],
  );
  const deadlineRemainingMinutes =
    deadlineRemainingMs === null
      ? null
      : Math.ceil(deadlineRemainingMs / 60000);

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
    <div className="panel-timeline">
      <CollapseSection
        title="AI variations"
        open={open}
        onToggle={() => setOpen((v) => !v)}
        actions={
          <div className="timeline-controls">
            <button
              type="button"
              className={`timeline-play${remixing ? " is-playing" : ""}`}
              onClick={onRemix}
              disabled={!remixing && selectedCount === 0}
              title={
                remixing
                  ? "Stop remixing selected variations"
                  : selectedCount === 0
                    ? "Select variations to remix"
                    : `Remix ${selectedCount} selected (max steps, random CFG, up to ${formatHoursLabel(maxHours)})`
              }
            >
              Remix{selectedCount > 0 ? ` (${selectedCount})` : ""}
            </button>
            <button
              type="button"
              className={`timeline-play${playing || idleRerolling ? " is-playing" : ""}`}
              onClick={onPlayPause}
              title={
                playing
                  ? `Pause to idle-reroll from locked timeline images (up to ${formatHoursLabel(maxHours)})`
                  : idleRerolling
                    ? "Resume stream from 3D bake"
                    : "Play stream"
              }
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className={`timeline-play${playingRandom ? " is-playing" : ""}`}
              onClick={onPlayRandom}
              title={
                playingRandom
                  ? "Stop rolling random characters"
                  : "Snap current bake, then roll a new character to tweak while AI runs"
              }
            >
              Play random
            </button>
            <button
              type="button"
              className={`timeline-play${
                remixing || playingRandom ? " is-playing" : ""
              }`}
              onClick={onRandomRemix}
              title={
                randomRemixNext === "remix"
                  ? `Next: Remix${
                      selectedCount > 0 ? ` (${selectedCount})` : ""
                    } — then Play random`
                  : "Next: Play random — then Remix"
              }
            >
              Random remix
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => stopStream()}
              disabled={mode === "stopped"}
              title="Stop queuing new generations (in-flight jobs still finish)"
            >
              Stop all
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => void onDownloadLocked()}
              disabled={lockedCount === 0 || zipping}
              title={
                lockedCount === 0
                  ? "Lock the sprites you want to keep first"
                  : `Download a zip of all ${lockedCount} locked sprite${
                      lockedCount === 1 ? "" : "s"
                    }`
              }
            >
              {zipping
                ? "Zipping…"
                : `Download locked${lockedCount > 0 ? ` (${lockedCount})` : ""}`}
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => void onClear()}
            >
              Clear unlocked
            </button>
            <span className="meta timeline-status">
              {inflight}/{maxConcurrency} in flight
              {playing ? " · 3D source" : ""}
              {playingRandom ? " · random characters" : ""}
              {idleRerolling
                ? ` · idle reroll from ${lockedCount} lock${
                    lockedCount === 1 ? "" : "s"
                  }${
                    deadlineRemainingMinutes === null
                      ? ""
                      : ` · ${deadlineRemainingMinutes}m left`
                  }`
                : ""}
              {remixing
                ? ` · remixing ${selectedCount} · steps ${MAX_STEPS} · random CFG${
                    deadlineRemainingMinutes === null
                      ? ""
                      : ` · ${deadlineRemainingMinutes}m left`
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
        }
      >
      <div className="timeline-steer-block">
        <div className="timeline-steer-row">
          <label className="timeline-setting timeline-steer-field" htmlFor="timeline-steer">
            <span>Steer</span>
            <textarea
              id="timeline-steer"
              className="timeline-steer-input"
              value={steer}
              rows={1}
              spellCheck={false}
              onChange={(e) => setSteer(e.target.value)}
              placeholder="e.g. cuter eyes, mage robes with a gold trim…"
              title="Appended to house style + facing + character parts (camera/lights come from the bake)"
            />
          </label>
          <label className="timeline-setting" htmlFor="timeline-freedom">
            <span>Freedom</span>
            <select
              id="timeline-freedom"
              value={freedom}
              onChange={(e) => setFreedom(e.target.value as FreedomChoice)}
            >
              <option value="auto">Auto</option>
              <option value="polish">Polish</option>
              <option value="costume">Costume</option>
              <option value="soft">Soft</option>
            </select>
          </label>
          <label className="timeline-setting" htmlFor="timeline-steps">
            <span>Steps {steps}</span>
            <input
              id="timeline-steps"
              type="range"
              min={VARIATION_STEPS_MIN}
              max={MAX_STEPS}
              step={1}
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
            />
          </label>
          <label className="timeline-setting" htmlFor="timeline-guidance">
            <span>CFG {guidance.toFixed(1)}</span>
            <input
              id="timeline-guidance"
              type="range"
              min={GUIDANCE_MIN}
              max={GUIDANCE_MAX}
              step={GUIDANCE_STEP}
              value={guidance}
              onChange={(e) => setGuidance(Number(e.target.value))}
            />
          </label>
          <label
            className="timeline-setting timeline-hours"
            htmlFor="timeline-max-hours"
            title="Auto-stop for idle reroll and Remix"
          >
            <span>Max hours</span>
            <input
              id="timeline-max-hours"
              type="number"
              min={MIN_MAX_HOURS}
              max={MAX_MAX_HOURS}
              step={0.25}
              value={maxHours}
              onChange={(e) => setMaxHours(Number(e.target.value))}
              onBlur={() => setMaxHours((h) => clampMaxHours(h))}
            />
          </label>
        </div>
        {status && !status.ready ? (
          <p className="meta timeline-hint">
            {status.message} See{" "}
            <code>server/requirements-variations.txt</code>.
          </p>
        ) : null}
      </div>

      {phase ? <p className="timeline-phase">{phase}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="timeline-browse">
        <div className="timeline-visibility" role="group" aria-label="Visibility">
          {(
            [
              ["all", `All (${items.length})`],
              ["locked", `Locked (${lockedCount})`],
              ["unlocked", `Unlocked (${unlockedCount})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`ghost-btn${visibility === value ? " is-active" : ""}`}
              onClick={() => setVisibility(value)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className="ghost-btn"
            onClick={selectAll}
            disabled={items.length === 0 || allSelected}
            title="Select all variations for remix"
          >
            Select all{items.length > 0 ? ` (${items.length})` : ""}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={selectAllLocked}
            disabled={lockedCount === 0 || allLockedSelected}
            title="Select all locked variations for remix"
          >
            Select all locked
            {lockedCount > 0 ? ` (${lockedCount})` : ""}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={deselectAll}
            disabled={selectedCount === 0}
            title="Clear remix selection"
          >
            Deselect all{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>
        </div>
        <label className="timeline-setting timeline-sort" htmlFor="timeline-sort">
          <span>Sort</span>
          <select
            id="timeline-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="lockedFirst">Locked first</option>
          </select>
        </label>
      </div>

      <div
        className="timeline-scroll"
        style={{ ["--timeline-thumb" as string]: `${thumbPx}px` }}
        onScroll={() => setHoverPreview(null)}
      >
        {items.length === 0 && pendingSlots === 0 ? (
          <p className="meta">No generations yet — hit Play.</p>
        ) : visibleItems.length === 0 && pendingSlots === 0 ? (
          <p className="meta">No generations match this filter.</p>
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
              </li>
            ))}
            {visibleItems.map((item) => {
              const selected = selectedIds.has(item.id);
              return (
                <li
                  key={item.id}
                  className={`timeline-tile${selected ? " is-selected" : ""}`}
                >
                  <button
                    type="button"
                    className="timeline-select-hit"
                    aria-pressed={selected}
                    title={selected ? "Deselect" : "Select for Remix"}
                    onClick={() => toggleSelected(item.id)}
                  >
                    <img
                      className="pixel-preview timeline-thumb"
                      src={item.image}
                      alt={item.freedom}
                      width={thumbPx}
                      height={thumbPx}
                      draggable={false}
                      onMouseEnter={(e) => showThumbPreview(e, item)}
                      onMouseLeave={() => setHoverPreview(null)}
                    />
                  </button>
                  <div className="timeline-tile-meta">
                    <span className="timeline-tag">{item.freedom}</span>
                    <span className="meta">
                      {item.elapsed_s}s · cfg{" "}
                      {item.guidance != null ? item.guidance : "—"}
                    </span>
                    {item.prompt ? (
                      <p
                        className="timeline-prompt"
                        title={item.prompt}
                      >
                        <span
                          className="timeline-prompt-scroll"
                          style={{
                            animationDuration: `${Math.max(
                              28,
                              Math.min(120, item.prompt.length * 0.22),
                            )}s`,
                          }}
                        >
                          {item.prompt}
                        </span>
                      </p>
                    ) : null}
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
              );
            })}
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
      </CollapseSection>
    </div>
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
