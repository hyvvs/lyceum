import { type MouseEventHandler, type ReactNode, forwardRef } from "react";

export type ListRowMode = "review" | "learn" | "practice" | "repair";
export interface ListRowProps {
  title: string;
  detail?: string;
  meta?: ReactNode;
  mode?: ListRowMode;
  modeLabel?: string;
  onActivate?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  loading?: boolean;
  selected?: boolean;
  className?: string;
}

/** Display a task or, with an activation handler, a native button. Mode is always named in text. */
export const ListRow = forwardRef<HTMLButtonElement, ListRowProps>(function ListRow(
  { title, detail, meta, mode, modeLabel, onActivate, disabled, loading, selected, className },
  ref,
) {
  const classes = ["ui-list-row", className].filter(Boolean).join(" ");
  const content = (
    <>
      {mode && <span className="ui-list-row__marker" data-mode={mode} aria-hidden="true" />}
      <span className="ui-list-row__content">
        <span className="ui-list-row__title">{title}</span>
        {(mode || detail) && (
          <span className="ui-list-row__detail">
            {mode ? (modeLabel ?? mode) : null}
            {mode && detail ? " · " : null}
            {detail}
          </span>
        )}
      </span>
      {meta != null && <span className="ui-list-row__meta">{meta}</span>}
    </>
  );
  if (!onActivate) return <div className={classes}>{content}</div>;
  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      aria-pressed={selected}
      data-loading={loading || undefined}
      data-selected={selected || undefined}
      onClick={(event) => {
        if (loading) return;
        onActivate(event);
      }}
    >
      {content}
    </button>
  );
});
