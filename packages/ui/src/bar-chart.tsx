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
  className?: string;
}

export function BarChart({
  title,
  units,
  scaleMax,
  data,
  highlightedId,
  className,
}: BarChartProps) {
  if (!title.trim() || !units.trim()) {
    throw new Error("BarChart needs a meaningful title and explicit units.");
  }
  if (!Number.isFinite(scaleMax) || scaleMax <= 0) {
    throw new Error("BarChart scaleMax must be a finite positive scale.");
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
  return (
    <figure className={["glass", "lyceum-bar-chart", className].filter(Boolean).join(" ")}>
      <figcaption>{title}</figcaption>
      <p className="lyceum-bar-chart__scale">
        Scale: 0–{scaleMax} {units}
      </p>
      {data.length === 0 ? (
        <p className="lyceum-bar-chart__empty">No data available</p>
      ) : (
        <ul className="lyceum-bar-chart__bars">
          {data.map((datum) => {
            const highlighted = datum.id === highlightedId;
            return (
              <li
                className="lyceum-bar-chart__item"
                key={datum.id}
                data-highlighted={highlighted || undefined}
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
                    {datum.value} {units}
                  </span>
                  {highlighted && (
                    <span className="lyceum-bar-chart__highlight">★ Highlighted</span>
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
