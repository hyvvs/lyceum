export interface BarChartDatum {
  id: string;
  label: string;
  /** Nonnegative finite consumer-provided quantity; not a mastery estimate. */
  value: number;
}
export interface BarChartProps {
  title: string;
  units: string;
  /** Explicit positive upper bound. Negative quantities and autoscaling are unsupported. */
  scaleMax: number;
  data: readonly BarChartDatum[];
  highlightedId?: string;
  /** Caller-owned visible wording; defaults preserve existing English presentations. */
  scaleLabel?: string;
  emptyLabel?: string;
  highlightLabel?: string;
  /** BCP-47 locale for displayed numbers; defaults to en-US, independent of direction. */
  locale?: string;
  className?: string;
}

export function BarChart({
  title,
  units,
  scaleMax,
  data,
  highlightedId,
  scaleLabel = "Scale",
  emptyLabel = "No data available",
  highlightLabel = "Highlighted",
  locale,
  className,
}: BarChartProps) {
  if (!title.trim() || !units.trim()) {
    throw new Error("BarChart needs a meaningful title and explicit units.");
  }
  if (!Number.isFinite(scaleMax) || scaleMax <= 0) {
    throw new Error("BarChart scaleMax must be a finite positive scale.");
  }
  if (![scaleLabel, emptyLabel, highlightLabel].every((label) => label.trim())) {
    throw new Error("BarChart presentation labels must be meaningful.");
  }
  const ids = new Set<string>();
  for (const datum of data) {
    if (!datum.id.trim() || !datum.label.trim()) {
      throw new Error("BarChart requires nonblank ids and readable labels.");
    }
    if (ids.has(datum.id)) {
      throw new Error("BarChart data contains duplicate ids.");
    }
    ids.add(datum.id);
    if (!Number.isFinite(datum.value) || datum.value < 0 || datum.value > scaleMax) {
      throw new Error("BarChart values must be finite, nonnegative and within scaleMax.");
    }
  }
  if (highlightedId !== undefined && !ids.has(highlightedId)) {
    throw new Error("BarChart highlighted id must reference an actual bar.");
  }
  const formatNumber = new Intl.NumberFormat(locale ?? "en-US");
  return (
    <figure
      lang={locale}
      className={["glass", "lyceum-bar-chart", className].filter(Boolean).join(" ")}
    >
      <figcaption>{title}</figcaption>
      <p className="lyceum-bar-chart__scale">
        {scaleLabel}: {formatNumber.format(0)}–{formatNumber.format(scaleMax)} {units}
      </p>
      {data.length === 0 ? (
        <p className="lyceum-bar-chart__empty">{emptyLabel}</p>
      ) : (
        <ul className="lyceum-bar-chart__bars">
          {data.map((datum) => {
            const highlighted = datum.id === highlightedId;
            return (
              <li
                className="lyceum-bar-chart__item"
                key={datum.id}
                data-highlighted={highlighted || undefined}
                data-zero={datum.value === 0 || undefined}
              >
                <div className="lyceum-bar-chart__track" aria-hidden="true">
                  <span
                    className="lyceum-bar-chart__bar"
                    style={{ height: `${(datum.value / scaleMax) * 100}%` }}
                  />
                </div>
                <p className="lyceum-bar-chart__datum">
                  <strong>{datum.label}</strong>
                  <span>
                    {formatNumber.format(datum.value)} {units}
                  </span>
                  {highlighted && (
                    <span className="lyceum-bar-chart__highlight">★ {highlightLabel}</span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </figure>
  );
}
