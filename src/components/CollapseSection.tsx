import type { ReactNode } from "react";

type Props = {
  title: string;
  open: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
};

/** Shared expand/collapse chrome for Lighting, Active spec, etc. */
export function CollapseSection({
  title,
  open,
  onToggle,
  actions,
  children,
}: Props) {
  return (
    <div className={`collapse${open ? " is-open" : ""}`}>
      <div className="collapse-header">
        <button
          type="button"
          className="collapse-toggle"
          aria-expanded={open}
          onClick={onToggle}
        >
          <span className="collapse-caret" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
          {title}
        </button>
        {actions ? <div className="collapse-actions">{actions}</div> : null}
      </div>
      {open ? <div className="collapse-body">{children}</div> : null}
    </div>
  );
}
