import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearRefCaption,
  deleteRef,
  listRefs,
  rebuildHouseLora,
  saveRefCaption,
  type LoraStatus,
  type RefCaptionItem,
  type RefsCatalog,
} from "../api";
import {
  applyFacingClause,
  parseFacingId,
  REF_FACING_OPTIONS,
  type RefFacingId,
} from "../lib/refCaptionFacing";
import { CollapseSection } from "./CollapseSection";

const STYLE_HINT =
  "Prefer visual tags (hair, colours, outfit, pose) over character names. " +
  "Use the facing pad instead of typing direction. The style trigger is added " +
  "automatically at train time — you don’t need it in the text.";

const OPEN_STORAGE_KEY = "3d-sprite-gen:caption-refs-open-v1";

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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [filter, setFilter] = useState<"all" | "auto" | "custom">("all");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    const data = await listRefs();
    setCatalog(data);
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

  const dirtyDraft =
    current != null && draft.trim() !== current.caption.trim();

  const activeFacing = parseFacingId(draft);

  const go = (delta: number) => {
    if (items.length === 0) return;
    if (dirtyDraft) {
      const ok = window.confirm("Discard unsaved caption changes?");
      if (!ok) return;
    }
    setIndex((i) => (i + delta + items.length) % items.length);
  };

  const onSelectThumb = (name: string) => {
    const next = items.findIndex((i) => i.name === name);
    if (next < 0 || next === index) return;
    if (dirtyDraft) {
      const ok = window.confirm("Discard unsaved caption changes?");
      if (!ok) return;
    }
    setIndex(next);
  };

  const onFacing = (id: RefFacingId) => {
    setDraft((prev) => applyFacingClause(prev, id));
    textareaRef.current?.focus();
  };

  const patchCatalogItem = (updated: RefCaptionItem) => {
    setCatalog((prev) => {
      if (!prev) return prev;
      const nextItems = prev.items.map((i) =>
        i.name === updated.name ? { ...i, ...updated } : i,
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
          message: prev.lora.lora_exists
            ? "Captions or refs changed — rebuild LoRA to apply."
            : prev.lora.message,
        },
      };
    });
  };

  const onSave = async () => {
    if (!current) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await saveRefCaption(current.name, draft);
      patchCatalogItem(updated);
      setDraft(updated.caption);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const onResetAuto = async () => {
    if (!current) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await clearRefCaption(current.name);
      patchCatalogItem(updated);
      setDraft(updated.caption);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
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
    setDraft(next);
    textareaRef.current?.focus();
  };

  const onRebuild = async () => {
    setRebuilding(true);
    setError(null);
    try {
      await rebuildHouseLora(500);
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

  const saveRef = useRef(onSave);
  const goRef = useRef(go);
  saveRef.current = onSave;
  goRef.current = go;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          void saveRef.current();
        }
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
      {catalog ? (
        <p className="meta captions-path">{catalog.refs_dir}</p>
      ) : null}

      <div className="captions-filters">
        {(["all", "auto", "custom"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`ghost-btn${filter === f ? " is-active" : ""}`}
            onClick={() => {
              if (
                dirtyDraft &&
                !window.confirm("Discard unsaved caption changes?")
              ) {
                return;
              }
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
                  {current.has_custom ? "Custom sidecar" : "Auto from filename"}
                  {dirtyDraft ? " · unsaved" : ""}
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
                onChange={(e) => setDraft(e.target.value)}
                placeholder={current.auto_caption}
              />
              <p className="meta captions-auto-line">
                Auto: {current.auto_caption}
              </p>
              <div className="captions-actions">
                <button
                  type="button"
                  className="timeline-play"
                  disabled={saving || !dirtyDraft}
                  onClick={() => void onSave()}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={saving}
                  onClick={onFillAuto}
                >
                  Fill auto
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={saving || !current.has_custom}
                  onClick={() => void onResetAuto()}
                  title="Delete .txt sidecar"
                >
                  Reset to auto
                </button>
                <button
                  type="button"
                  className="ghost-btn captions-delete-btn"
                  disabled={saving || deleting}
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
                ⌘/Ctrl+Enter save · ←/→ or j/k next · sidecars save as{" "}
                <code>{current.stem}.txt</code>
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
