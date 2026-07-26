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

/** Circular swatch trigger — popover lists every colour slot for the part. */
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
  const primary = slots[0];
  const hex = primary ? normalizePaletteHex(primary.value) : null;
  const empty = disabled || !hex;

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
        className={`swatch color-control-swatch swatch-btn${empty ? " color-control-swatch-empty" : ""}`}
        style={empty || !hex ? undefined : { background: `#${hex}` }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        title={hex ? `Colours #${hex}` : "Colours"}
        aria-label={`${part} colours`}
        onClick={() => setOpen((v) => !v)}
      />
      {open ? (
        <div
          id={menuId}
          className="part-color-popover part-color-popover-start"
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
                const slotHex = normalizePaletteHex(slot.value);
                const picking = activeSlot === slot.id;
                return (
                  <li key={slot.id} className="part-color-slot">
                    <button
                      type="button"
                      className={`part-color-slot-btn${picking ? " is-open" : ""}`}
                      onClick={() =>
                        setActiveSlot((id) => (id === slot.id ? null : slot.id))
                      }
                      title={`${slot.label} #${slotHex}`}
                    >
                      <span
                        className="swatch"
                        style={{ background: `#${slotHex}` }}
                        aria-hidden
                      />
                      <span className="part-color-slot-label">{slot.label}</span>
                      <span className="part-color-slot-hex">#{slotHex}</span>
                    </button>
                    {picking && paletteColors.length > 0 ? (
                      <div
                        className="swatches part-color-swatches"
                        role="listbox"
                        aria-label={`${slot.label} palette`}
                      >
                        {paletteColors.map((c) => {
                          const swatch = normalizePaletteHex(c);
                          const selected = swatch === slotHex;
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
