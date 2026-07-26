import { useEffect, useId, useRef, useState } from "react";
import {
  listPartColorSlots,
  setPartColorSlot,
} from "../lib/chibi/partColors";
import type { CharacterSpec } from "../lib/chibi/types";
import type { PartId } from "../lib/chibi/random";
import { normalizePaletteHex } from "../lib/palette";

type Props = {
  part: PartId;
  spec: CharacterSpec;
  paletteColors: string[];
  onEdit: (fn: (s: CharacterSpec) => CharacterSpec) => void;
  onReroll: () => void;
  disabled?: boolean;
};

/** Compact painter-palette glyph for the part colour trigger. */
function PaletteGlyph() {
  return (
    <svg
      className="part-color-palette-icon"
      viewBox="0 0 16 16"
      width="12"
      height="12"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M8 1.2C4.3 1.2 1.4 4 1.4 7.5c0 2.6 1.7 4.8 4.2 5.5.4.1.8-.2.8-.6v-.7c0-1 .8-1.8 1.8-1.8h2.1c2.3 0 4.3-1.9 4.3-4.2C14.6 3.6 11.7 1.2 8 1.2zm-3.2 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm2-2.6a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm2.5-.2a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm2.4 2.4a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"
      />
    </svg>
  );
}

/** Palette icon + vertical mini-swatches — popover lists every colour slot. */
export function PartColorMenu({
  part,
  spec,
  paletteColors,
  onEdit,
  onReroll,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const slots = listPartColorSlots(spec, part);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) {
      setActiveSlot(null);
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="color-control part-color-menu" ref={rootRef}>
      <button
        type="button"
        className="color-control-swatch-trigger part-color-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        title="Colours"
        aria-label={`${part} colours`}
        onClick={() => setOpen((v) => !v)}
      >
        <PaletteGlyph />
        <span className="part-color-mini-stack" aria-hidden>
          {slots.length === 0 ? (
            <span className="part-color-mini part-color-mini-empty" />
          ) : (
            slots.map((slot) => {
              const hex = normalizePaletteHex(slot.value);
              return (
                <span
                  key={slot.id}
                  className="part-color-mini"
                  style={{ background: `#${hex}` }}
                />
              );
            })
          )}
        </span>
      </button>
      {open ? (
        <div
          id={menuId}
          className="part-color-popover"
          role="dialog"
          aria-label={`${part} colours`}
        >
          <div className="part-color-popover-head">
            <span className="part-color-popover-title">Colours</span>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                onReroll();
              }}
              title="Reroll all colours for this part"
              aria-label="Reroll all colours for this part"
            >
              🎲
            </button>
          </div>
          {slots.length === 0 ? (
            <p className="hint">No colour slots on this part.</p>
          ) : (
            <ul className="part-color-slot-list">
              {slots.map((slot) => {
                const hex = normalizePaletteHex(slot.value);
                const picking = activeSlot === slot.id;
                return (
                  <li key={slot.id} className="part-color-slot">
                    <button
                      type="button"
                      className={`part-color-slot-btn${picking ? " is-open" : ""}`}
                      onClick={() =>
                        setActiveSlot((id) => (id === slot.id ? null : slot.id))
                      }
                      title={`${slot.label} #${hex}`}
                    >
                      <span
                        className="swatch"
                        style={{ background: `#${hex}` }}
                        aria-hidden
                      />
                      <span className="part-color-slot-label">{slot.label}</span>
                      <span className="part-color-slot-hex">#{hex}</span>
                    </button>
                    {picking && paletteColors.length > 0 ? (
                      <div
                        className="swatches part-color-swatches"
                        role="listbox"
                        aria-label={`${slot.label} palette`}
                      >
                        {paletteColors.map((c) => {
                          const swatch = normalizePaletteHex(c);
                          const selected = swatch === hex;
                          return (
                            <button
                              key={swatch}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              className={`swatch swatch-btn${selected ? " is-selected" : ""}`}
                              style={{ background: `#${swatch}` }}
                              title={`#${swatch}`}
                              onClick={() => {
                                onEdit((s) =>
                                  setPartColorSlot(s, part, slot.id, swatch),
                                );
                                setActiveSlot(null);
                              }}
                            />
                          );
                        })}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
