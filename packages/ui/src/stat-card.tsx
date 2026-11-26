import { type ReactNode, useId } from "react";

export interface StatDelta {
  /** Descriptive direction, never a judgment of improvement. */
  direction: "increase" | "decrease" | "unchanged";
  text: string;
  context: string;
}
export interface StatTrend {
  /** Consumer-supplied observations in chronological order. */
  samples: readonly number[];
  /** Textual equivalent for the trend rather than ornamental SVG alone. */
  description: string;
}
export interface StatCardProps {
  label: string;
  value?: string | number | null;
  /** Trusted decorative React content only; consumers must not render arbitrary HTML/media. */
  icon?: ReactNode;
  delta?: StatDelta;
  trend?: StatTrend;
  unavailableLabel?: string;
  /** BCP-47 locale for numeric values; explicit preformatted strings are never rewritten. */
  locale?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  delta,
  trend,
  unavailableLabel = "Not available",
  locale,
  className,
}: StatCardProps) {
  if (!label.trim() || !unavailableLabel.trim()) {
    throw new Error("StatCard requires meaningful label and unavailable wording.");
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("StatCard numeric values must be finite.");
  }
  if (delta && (!delta.text.trim() || !delta.context.trim())) {
    throw new Error("StatCard delta requires explicit text and comparison context.");
  }
  if (trend) {
    if (trend.samples.length < 2) {
      throw new Error("StatCard trend needs at least two actual observations.");
    }
    if (trend.samples.some((sample) => !Number.isFinite(sample))) {
      throw new Error("StatCard trend samples must be finite.");
    }
    if (!trend.description.trim()) {
      throw new Error("StatCard trend needs a textual equivalent.");
    }
  }
  const titleId = useId();
  const hasValue = value !== null && value !== undefined && value !== "";
  const displayedValue =
    typeof value === "number"
      ? new Intl.NumberFormat(locale ?? "en-US", { maximumSignificantDigits: 17 }).format(value)
      : value;
  const values = trend?.samples ?? [];
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const sample of values) {
    if (sample < low) low = sample;
    if (sample > high) high = sample;
  }
  // Normalize before subtracting: finite extrema can have an infinite raw difference.
  const magnitude = Math.max(Math.abs(low), Math.abs(high));
  const scaledLow = magnitude > 0 && Number.isFinite(magnitude) ? low / magnitude : 0;
  const scaledHigh = magnitude > 0 && Number.isFinite(magnitude) ? high / magnitude : 0;
  const points = values
    .map((sample, i) => {
      const x = (i / (values.length - 1)) * 120;
      const fraction =
        high === low ? 0.5 : (sample / magnitude - scaledLow) / (scaledHigh - scaledLow);
      const y = 24 - fraction * 20;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <article
      aria-labelledby={titleId}
      lang={locale}
      className={["glass-raised", "lyceum-stat-card", className].filter(Boolean).join(" ")}
    >
      <div className="lyceum-stat-card__heading">
        {icon !== undefined && (
          <span className="lyceum-stat-card__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <h3 id={titleId}>{label}</h3>
      </div>
      <p className="lyceum-stat-card__value" data-available={hasValue}>
        {hasValue ? displayedValue : unavailableLabel}
      </p>
      {delta && (
        <p className="lyceum-stat-card__delta" data-direction={delta.direction}>
          <span aria-hidden="true">
            {delta.direction === "increase" ? "↑" : delta.direction === "decrease" ? "↓" : "–"}
          </span>
          <span>{delta.text}</span>
          <span className="lyceum-stat-card__delta-context">{delta.context}</span>
        </p>
      )}
      {trend && (
        <div className="lyceum-stat-card__trend">
          <svg
            className="lyceum-stat-card__sparkline"
            viewBox="0 0 120 28"
            preserveAspectRatio="none"
            focusable="false"
            aria-hidden="true"
          >
            <polyline points={points} />
          </svg>
          <p>{trend.description}</p>
        </div>
      )}
    </article>
  );
}
