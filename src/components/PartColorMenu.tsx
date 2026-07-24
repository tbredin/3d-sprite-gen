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
};

/** 🎨 — popover listing every colour slot for a part + Endesga swatches. */
export function PartColorMenu({
  part,
  spec,
  paletteColors,
  onEdit,
  onReroll,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const slots = listPartColorSlots(spec, part);

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
    <div className="part-color-menu" ref={rootRef}>
      <button
        type="button"
        className="part-icon-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        title="Colours"
        aria-label={`${part} colours`}
        onClick={() => setOpen((v) => !v)}
      >
        🎨
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
            >
              Reroll
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
