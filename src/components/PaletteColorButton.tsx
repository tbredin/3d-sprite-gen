import { useEffect, useId, useRef, useState } from "react";
import { normalizePaletteHex } from "../lib/palette";

type Props = {
  value: string;
  paletteColors: string[];
  onChange: (hexWithHash: string) => void;
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
};

/** 🎨 — single-slot Endesga colour popover. */
export function PaletteColorButton({
  value,
  paletteColors,
  onChange,
  title = "Colour",
  ariaLabel,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const hex = normalizePaletteHex(value);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

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
    <div className="part-color-menu" ref={rootRef}>
      <button
        type="button"
        className="part-icon-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        title={`${title} #${hex}`}
        aria-label={ariaLabel ?? title}
        onClick={() => setOpen((v) => !v)}
      >
        🎨
      </button>
      {open && paletteColors.length > 0 ? (
        <div
          id={menuId}
          className="part-color-popover part-color-popover-swatches"
          role="listbox"
          aria-label={ariaLabel ?? title}
        >
          <div className="swatches part-color-swatches">
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
                    onChange(`#${swatch}`);
                    setOpen(false);
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
