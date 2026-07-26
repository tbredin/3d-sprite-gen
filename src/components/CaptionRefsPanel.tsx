import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  browseRefsDir,
  deleteRef,
  flipRefHorizontal,
  listRefs,
  rebuildHouseLora,
  removeRefBackground,
  setRefsDir,
  type LoraStatus,
  type RefCaptionItem,
  type RefsCatalog,
} from "../api";
import {
  applyFacingClause,
  mirrorFacingInCaption,
  parseFacingId,
  REF_FACING_OPTIONS,
  type RefFacingId,
} from "../lib/refCaptionFacing";
import { CollapseSection } from "./CollapseSection";

const STYLE_HINT =
  "Prefer visual tags (hair, colours, outfit, pose) over character names. " +
  "Use the facing pad instead of typing direction. Captions and facing " +
  "auto-save in this browser for each source filepath.";

const OPEN_STORAGE_KEY = "3d-sprite-gen:caption-refs-open-v1";
const DIR_STORAGE_KEY = "3d-sprite-gen:caption-refs-dir-v1";
const CAPTION_STORAGE_PREFIX = "3d-sprite-gen:ref-caption:";

function captionStorageKey(dir: string, name: string): string {
  return `${CAPTION_STORAGE_PREFIX}${dir.replace(/\/+$/, "")}/${name}`;
}

function readLocalCaption(dir: string, name: string): string | null {
  try {
    return localStorage.getItem(captionStorageKey(dir, name));
  } catch {
    return null;
  }
}

function writeLocalCaption(dir: string, name: string, caption: string): void {
  try {
    localStorage.setItem(captionStorageKey(dir, name), caption);
  } catch {
    /* ignore quota / private mode */
  }
}

function clearLocalCaption(dir: string, name: string): void {
  try {
    localStorage.removeItem(captionStorageKey(dir, name));
  } catch {
    /* ignore */
  }
}

function applyLocalCaptions(data: RefsCatalog): RefsCatalog {
  const items = data.items.map((item) => {
    const stored = readLocalCaption(data.refs_dir, item.name);
    if (stored === null) {
      return { ...item, has_custom: false };
    }
    return {
      ...item,
      caption: stored,
      facing: parseFacingId(stored),
      has_custom: true,
    };
  });
  const custom = items.filter((item) => item.has_custom).length;
  return {
    ...data,
    items,
    custom_count: custom,
    auto_count: items.length - custom,
  };
}

function loadOpen(): boolean {
  try {
    const raw = localStorage.getItem(OPEN_STORAGE_KEY);
    if (raw === null) return false;
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function CaptionRefsPanel() {
  const [open, setOpen] = useState(loadOpen);
  const [catalog, setCatalog] = useState<RefsCatalog | null>(null);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [pathDraft, setPathDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [loadingDir, setLoadingDir] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [filter, setFilter] = useState<"all" | "auto" | "custom">("all");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    let data: RefsCatalog;
    try {
      const storedDir = localStorage.getItem(DIR_STORAGE_KEY);
      data = storedDir ? await setRefsDir(storedDir) : await listRefs();
    } catch {
      data = await listRefs();
    }
    data = applyLocalCaptions(data);
    setCatalog(data);
    setPathDraft(data.refs_dir);
    return data;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_STORAGE_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void refresh().catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }, [open, refresh]);

  const items = useMemo(() => {
    if (!catalog) return [];
    if (filter === "auto") return catalog.items.filter((i) => !i.has_custom);
    if (filter === "custom") return catalog.items.filter((i) => i.has_custom);
    return catalog.items;
  }, [catalog, filter]);

  const current: RefCaptionItem | null =
    items.length > 0 ? items[Math.min(index, items.length - 1)] ?? null : null;

  useEffect(() => {
    if (items.length === 0) {
      setIndex(0);
      return;
    }
    if (index >= items.length) setIndex(items.length - 1);
  }, [items, index]);

  useEffect(() => {
    if (!current) {
      setDraft("");
      return;
    }
    setDraft(current.caption);
    setError(null);
  }, [current?.name, current?.caption]);

  const activeFacing = parseFacingId(draft);

  const go = (delta: number) => {
    if (items.length === 0) return;
    setIndex((i) => (i + delta + items.length) % items.length);
  };

  const onSelectThumb = (name: string) => {
    const next = items.findIndex((i) => i.name === name);
    if (next < 0 || next === index) return;
    setIndex(next);
  };

  const saveLocally = (caption: string) => {
    if (!current || !catalog) return;
    writeLocalCaption(catalog.refs_dir, current.name, caption);
    setDraft(caption);
    setCatalog((prev) => {
      if (!prev) return prev;
      const nextItems = prev.items.map((i) =>
        i.name === current.name
          ? {
              ...i,
              caption,
              facing: parseFacingId(caption),
              has_custom: true,
            }
          : i,
      );
      return {
        ...prev,
        items: nextItems,
        custom_count: nextItems.filter((i) => i.has_custom).length,
        auto_count: nextItems.filter((i) => !i.has_custom).length,
        lora: {
          ...prev.lora,
          dirty: true,
          state: prev.lora.lora_exists ? "dirty" : prev.lora.state,
          message: "Local captions changed — rebuild LoRA to apply.",
        },
      };
    });
  };

  const onFacing = (id: RefFacingId) => {
    if (!current) return;
    saveLocally(applyFacingClause(draft, id));
    textareaRef.current?.focus();
  };

  const onResetAuto = () => {
    if (!current || !catalog) return;
    clearLocalCaption(catalog.refs_dir, current.name);
    const caption = current.auto_caption;
    setDraft(caption);
    setCatalog((prev) => {
      if (!prev) return prev;
      const nextItems = prev.items.map((item) =>
        item.name === current.name
          ? {
              ...item,
              caption,
              facing: parseFacingId(caption),
              has_custom: false,
            }
          : item,
      );
      return {
        ...prev,
        items: nextItems,
        custom_count: nextItems.filter((item) => item.has_custom).length,
        auto_count: nextItems.filter((item) => !item.has_custom).length,
        lora: {
          ...prev.lora,
          dirty: true,
          state: prev.lora.lora_exists ? "dirty" : prev.lora.state,
          message: "Local captions changed — rebuild LoRA to apply.",
        },
      };
    });
  };

  const onRemoveBackground = async () => {
    if (!current) return;
    setRemovingBg(true);
    setError(null);
    try {
      const updated = await removeRefBackground(current.name);
      setCatalog((prev) => {
        if (!prev) return prev;
        const nextItems = prev.items.map((item) =>
          item.name === updated.name || item.name === current.name
            ? { ...item, ...updated }
            : item,
        );
        return {
          ...prev,
          items: nextItems,
          lora: {
            ...prev.lora,
            dirty: true,
            state: prev.lora.lora_exists ? "dirty" : prev.lora.state,
            message: "Refs changed — rebuild LoRA to apply.",
          },
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRemovingBg(false);
    }
  };

  const onFlipHorizontal = async () => {
    if (!current) return;
    setFlipping(true);
    setError(null);
    try {
      const updated = await flipRefHorizontal(current.name);
      const flippedCaption = mirrorFacingInCaption(draft);
      if (catalog) {
        writeLocalCaption(catalog.refs_dir, updated.name, flippedCaption);
      }
      setDraft(flippedCaption);
      setCatalog((prev) => {
        if (!prev) return prev;
        const nextItems = prev.items.map((item) => {
          if (item.name !== updated.name && item.name !== current.name) {
            return item;
          }
          return {
            ...item,
            ...updated,
            caption: flippedCaption,
            facing: parseFacingId(flippedCaption),
            has_custom: true,
          };
        });
        return {
          ...prev,
          items: nextItems,
          custom_count: nextItems.filter((item) => item.has_custom).length,
          auto_count: nextItems.filter((item) => !item.has_custom).length,
          lora: {
            ...prev.lora,
            dirty: true,
            state: prev.lora.lora_exists ? "dirty" : prev.lora.state,
            message: "Refs changed — rebuild LoRA to apply.",
          },
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFlipping(false);
    }
  };

  const onDeleteRef = async () => {
    if (!current) return;
    const ok = window.confirm(
      `Permanently delete “${current.name}” from the training folder?\n\n` +
        `This removes the image and its caption sidecar from disk. It cannot be undone.`,
    );
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      const name = current.name;
      if (catalog) clearLocalCaption(catalog.refs_dir, name);
      await deleteRef(name);
      const data = await refresh();
      const filtered =
        filter === "auto"
          ? data.items.filter((i) => !i.has_custom)
          : filter === "custom"
            ? data.items.filter((i) => i.has_custom)
            : data.items;
      setIndex((i) => {
        if (filtered.length === 0) return 0;
        return Math.min(i, filtered.length - 1);
      });
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const onFillAuto = () => {
    if (!current) return;
    const facing = parseFacingId(draft);
    let next = current.auto_caption;
    if (facing) next = applyFacingClause(next, facing);
    saveLocally(next);
    textareaRef.current?.focus();
  };

  const applyDirectory = (data: RefsCatalog) => {
    const hydrated = applyLocalCaptions(data);
    setCatalog(hydrated);
    setPathDraft(hydrated.refs_dir);
    setFilter("all");
    setIndex(0);
    try {
      localStorage.setItem(DIR_STORAGE_KEY, hydrated.refs_dir);
    } catch {
      /* ignore */
    }
  };

  const onLoadPath = async () => {
    const path = pathDraft.trim();
    if (!path) return;
    setLoadingDir(true);
    setError(null);
    try {
      applyDirectory(await setRefsDir(path));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingDir(false);
    }
  };

  const onBrowse = async () => {
    setBrowsing(true);
    setError(null);
    try {
      applyDirectory(await browseRefsDir());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/cancel/i.test(message)) setError(message);
    } finally {
      setBrowsing(false);
    }
  };

  const onRebuild = async () => {
    setRebuilding(true);
    setError(null);
    try {
      const captions = Object.fromEntries(
        (catalog?.items ?? []).map((item) => [item.name, item.caption]),
      );
      await rebuildHouseLora(500, captions);
      const poll = async () => {
        const data = await refresh();
        const state = data.lora.state;
        if (state === "training") {
          window.setTimeout(() => void poll(), 4000);
          return;
        }
        setRebuilding(false);
        if (state === "error") {
          setError(data.lora.last_error || data.lora.message);
        }
      };
      window.setTimeout(() => void poll(), 2000);
    } catch (err) {
      setRebuilding(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const goRef = useRef(go);
  goRef.current = go;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") {
        if ((e.metaKey || e.ctrlKey) && e.key === "ArrowRight") {
          e.preventDefault();
          goRef.current(1);
        }
        if ((e.metaKey || e.ctrlKey) && e.key === "ArrowLeft") {
          e.preventDefault();
          goRef.current(-1);
        }
        return;
      }
      if (e.key === "ArrowRight" || e.key === "j") goRef.current(1);
      if (e.key === "ArrowLeft" || e.key === "k") goRef.current(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const lora: LoraStatus | null = catalog?.lora ?? null;
  const progressPct = lora
    ? Math.round(Math.min(1, Math.max(0, lora.progress)) * 100)
    : 0;

  const statusLabel = catalog
    ? `${catalog.custom_count}/${catalog.count} custom`
    : open
      ? "Loading…"
      : "";
  const loraLabel = lora
    ? ` · LoRA ${lora.state}${
        lora.state === "training" ? ` ${progressPct}%` : ""
      }`
    : "";

  return (
    <section className="panel panel-captions">
      <CollapseSection
        title="Caption training refs"
        open={open}
        onToggle={() => setOpen((v) => !v)}
        actions={
          <>
            <span className="meta timeline-status">
              {statusLabel}
              {loraLabel}
            </span>
            <button
              type="button"
              className="ghost-btn"
              disabled={
                !open ||
                rebuilding ||
                lora?.state === "training" ||
                (!lora?.dirty && lora?.state !== "missing")
              }
              onClick={() => void onRebuild()}
              title="Rebuild SDXL house LoRA from current captions"
            >
              {rebuilding || lora?.state === "training"
                ? "Rebuilding…"
                : "Rebuild LoRA"}
            </button>
          </>
        }
      >
      <p className="hint captions-hint">{STYLE_HINT}</p>
      <div className="captions-dir-row">
        <label className="captions-label" htmlFor="refs-dir-path">
          Source folder
        </label>
        <div className="captions-dir-controls">
          <input
            id="refs-dir-path"
            className="captions-dir-input"
            value={pathDraft}
            spellCheck={false}
            onChange={(e) => setPathDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void onLoadPath();
              }
            }}
            placeholder="/path/to/sprites"
          />
          <button
            type="button"
            className="ghost-btn"
            disabled={loadingDir || !pathDraft.trim()}
            onClick={() => void onLoadPath()}
          >
            {loadingDir ? "Loading…" : "Load"}
          </button>
          <button
            type="button"
            className="timeline-play"
            disabled={browsing}
            onClick={() => void onBrowse()}
          >
            {browsing ? "Browsing…" : "Browse…"}
          </button>
        </div>
        {catalog ? (
          <p className="meta captions-path">
            Captions auto-save locally under {catalog.refs_dir}
          </p>
        ) : null}
      </div>

      <div className="captions-filters">
        {(["all", "auto", "custom"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`ghost-btn${filter === f ? " is-active" : ""}`}
            onClick={() => {
              setFilter(f);
              setIndex(0);
            }}
          >
            {f === "all"
              ? `All (${catalog?.count ?? 0})`
              : f === "auto"
                ? `Auto (${catalog?.auto_count ?? 0})`
                : `Custom (${catalog?.custom_count ?? 0})`}
          </button>
        ))}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="captions-layout">
        <div className="captions-thumbs" role="list">
          {items.map((item, i) => (
            <button
              key={item.name}
              type="button"
              role="listitem"
              className={`captions-thumb${i === index ? " is-active" : ""}${
                item.has_custom ? " is-custom" : ""
              }`}
              onClick={() => onSelectThumb(item.name)}
              title={item.name}
            >
              <img
                src={item.image}
                alt=""
                className="captions-thumb-img"
                loading="lazy"
              />
              <span className="captions-thumb-label">{item.stem}</span>
            </button>
          ))}
          {items.length === 0 ? (
            <p className="meta">No refs in this filter.</p>
          ) : null}
        </div>

        <div className="captions-editor">
          {current ? (
            <>
              <div className="captions-preview-row">
                <div className="captions-preview-wrap preview-bg-checker">
                  <img
                    src={current.image}
                    alt={current.name}
                    className="captions-preview"
                  />
                </div>
                <div className="captions-facing">
                  <span className="captions-label">Facing</span>
                  <div
                    className="captions-facing-pad"
                    role="group"
                    aria-label="Eight-way facing"
                  >
                    {REF_FACING_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`captions-facing-btn${
                          activeFacing === opt.id ? " is-active" : ""
                        }`}
                        style={{ gridRow: opt.row, gridColumn: opt.col }}
                        title={opt.title}
                        aria-label={opt.title}
                        aria-pressed={activeFacing === opt.id}
                        onClick={() => onFacing(opt.id)}
                      >
                        {opt.glyph}
                      </button>
                    ))}
                    <span className="captions-facing-center" aria-hidden>
                      {activeFacing
                        ? REF_FACING_OPTIONS.find((o) => o.id === activeFacing)
                            ?.title
                        : "—"}
                    </span>
                  </div>
                  <p className="meta captions-facing-hint">
                    Appends e.g. “facing bottom-right”
                  </p>
                </div>
              </div>
              <div className="captions-editor-meta">
                <strong>{current.name}</strong>
                <span className="meta">
                  {current.has_custom ? "Locally saved" : "Auto from filename"}
                  {" · auto-saved"}
                  {` · ${index + 1}/${items.length}`}
                </span>
              </div>
              <label className="captions-label" htmlFor="ref-caption">
                Caption
              </label>
              <textarea
                id="ref-caption"
                ref={textareaRef}
                className="captions-input"
                value={draft}
                rows={5}
                spellCheck={false}
                onChange={(e) => saveLocally(e.target.value)}
                placeholder={current.auto_caption}
              />
              <p className="meta captions-auto-line">
                Auto: {current.auto_caption}
              </p>
              <div className="captions-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={onFillAuto}
                >
                  Fill auto
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={!current.has_custom}
                  onClick={onResetAuto}
                  title="Remove the locally saved caption"
                >
                  Reset to auto
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={removingBg || deleting}
                  onClick={() => void onRemoveBackground()}
                  title="Detect the solid edge backdrop colour and make it transparent"
                >
                  {removingBg ? "Removing…" : "Remove background"}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={flipping || deleting}
                  onClick={() => void onFlipHorizontal()}
                  title="Mirror the image left/right and update the facing caption"
                >
                  {flipping ? "Flipping…" : "Flip L/R"}
                </button>
                <button
                  type="button"
                  className="ghost-btn captions-delete-btn"
                  disabled={deleting || removingBg || flipping}
                  onClick={() => void onDeleteRef()}
                  title="Permanently delete this image from the training folder"
                >
                  {deleting ? "Deleting…" : "Delete image"}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => go(-1)}
                  disabled={items.length < 2}
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => go(1)}
                  disabled={items.length < 2}
                >
                  Next →
                </button>
              </div>
              <p className="meta">
                Auto-saved in browser storage by full filepath · ←/→ or j/k next
              </p>
            </>
          ) : (
            <p className="meta">Select a ref to caption.</p>
          )}
        </div>
      </div>
      </CollapseSection>
    </section>
  );
}
