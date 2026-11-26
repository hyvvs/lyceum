export interface SegmentOption<Value extends string = string> {
  value: Value;
  label: string;
  disabled?: boolean;
}

/** Controlled native radio selection. The consumer owns form submission and the selected value. */
export interface SegmentedControlProps<Value extends string = string> {
  groupLabel: string;
  name: string;
  value: Value;
  options: readonly SegmentOption<Value>[];
  onValueChange: (nextValue: Value) => void;
  /** Localized message displayed when no options are supplied. */
  emptyLabel?: string;
  disabled?: boolean;
  required?: boolean;
  lang?: string;
  dir?: "ltr" | "rtl";
  className?: string;
}

/** Native radio keys, form ownership and focus belong to the browser. */
export function SegmentedControl<Value extends string>({
  groupLabel,
  name,
  value,
  options,
  onValueChange,
  emptyLabel = "No choices available",
  disabled = false,
  required = false,
  lang,
  dir,
  className,
}: SegmentedControlProps<Value>) {
  if (!groupLabel.trim() || !name.trim()) {
    throw new Error("SegmentedControl requires a nonempty group label and form name.");
  }
  if (!emptyLabel.trim()) {
    throw new Error("SegmentedControl empty label needs meaningful wording.");
  }
  const values = options.map((option) => option.value);
  if (new Set(values).size !== values.length) {
    throw new Error("SegmentedControl options contain duplicate values.");
  }
  if (options.some((option) => !option.label.trim())) {
    throw new Error("SegmentedControl options need visible accessible labels.");
  }
  if (options.length > 0 && !values.includes(value)) {
    throw new Error("SegmentedControl selected value must exist in its options.");
  }
  return (
    <fieldset
      className={["lyceum-segmented-control", className].filter(Boolean).join(" ")}
      disabled={disabled}
      lang={lang}
      dir={dir}
    >
      <legend className="lyceum-segmented-control__legend">{groupLabel}</legend>
      {options.length === 0 ? (
        <p className="lyceum-segmented-control__empty">{emptyLabel}</p>
      ) : (
        <div className="lyceum-segmented-control__options">
          {options.map((option) => (
            <label className="lyceum-segmented-control__option" key={option.value}>
              <input
                className="lyceum-segmented-control__input"
                type="radio"
                name={name}
                value={option.value}
                checked={option.value === value}
                onChange={() => onValueChange(option.value)}
                disabled={option.disabled}
                required={required}
              />
              <span className="lyceum-segmented-control__label">
                <span className="lyceum-segmented-control__check" aria-hidden="true">
                  ✓
                </span>
                {option.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
