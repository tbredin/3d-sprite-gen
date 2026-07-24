import { useId, useRef } from "react";

type Props = {
  value: string;
  onChange: (hexWithHash: string) => void;
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
};

/** Clickable swatch — freeform colour via native picker. */
export function FreeformColorButton({
  value,
  onChange,
  title = "Colour",
  ariaLabel,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  return (
    <div className="color-control">
      <button
        type="button"
        className={`swatch color-control-swatch swatch-btn${disabled ? " color-control-swatch-empty" : ""}`}
        style={disabled ? undefined : { background: value }}
        disabled={disabled}
        title={disabled ? title : `${title} ${value}`}
        aria-label={ariaLabel ?? title}
        aria-controls={inputId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const input = inputRef.current;
          if (!input) return;
          if (typeof input.showPicker === "function") {
            try {
              input.showPicker();
              return;
            } catch {
              /* fall through to click() */
            }
          }
          input.click();
        }}
      />
      <input
        ref={inputRef}
        id={inputId}
        type="color"
        className="color-control-native"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
