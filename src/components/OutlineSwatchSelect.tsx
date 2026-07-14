import { useEffect, useId, useRef, useState } from "react";
import { normalizePaletteHex } from "../lib/palette";

type Props = {
  colors: string[];
  value: string;
  onChange: (hex: string) => void;
};

/** Dropdown that picks an Endesga swatch for the baked 1px outline. */
export function OutlineSwatchSelect({ colors, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = normalizePaletteHex(value);

  useEffect(() => {
    if (!open) return;
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
    <div className="outline-swatch-select" ref={rootRef}>
      <button
        type="button"
        className="outline-swatch-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="swatch"
          style={{ background: `#${selected}` }}
          aria-hidden
        />
        <span className="outline-swatch-hex">#{selected}</span>
        <span className="outline-swatch-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          id={listId}
          className="swatches outline-swatch-menu"
          role="listbox"
          aria-label="Endesga outline colour"
        >
          {colors.map((c) => {
            const hex = normalizePaletteHex(c);
            const isSelected = hex === selected;
            return (
              <button
                key={hex}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`swatch swatch-btn${isSelected ? " is-selected" : ""}`}
                style={{ background: `#${hex}` }}
                title={`#${hex}`}
                onClick={() => {
                  onChange(hex);
                  setOpen(false);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
