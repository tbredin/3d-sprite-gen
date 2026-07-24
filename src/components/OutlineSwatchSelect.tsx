import { useEffect, useId, useRef, useState } from "react";
import { normalizePaletteHex } from "../lib/palette";

type Props = {
  colors: string[];
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
};

/** Clickable swatch — Endesga outline colour popover (bare hex). */
export function OutlineSwatchSelect({
  colors,
  value,
  onChange,
  disabled = false,
  title = "Outline colour",
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = normalizePaletteHex(value);
  const empty = disabled || colors.length === 0;

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
    <div className="color-control part-color-menu" ref={rootRef}>
      <button
        type="button"
        className={`swatch color-control-swatch swatch-btn${empty ? " color-control-swatch-empty" : ""}`}
        style={empty ? undefined : { background: `#${selected}` }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled || colors.length === 0}
        title={empty ? title : `${title} #${selected}`}
        aria-label={ariaLabel ?? title}
        onClick={() => setOpen((v) => !v)}
      />
      {open && colors.length > 0 ? (
        <div
          id={listId}
          className="part-color-popover part-color-popover-swatches"
          role="listbox"
          aria-label={ariaLabel ?? title}
        >
          <div className="swatches part-color-swatches">
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
        </div>
      ) : null}
    </div>
  );
}
