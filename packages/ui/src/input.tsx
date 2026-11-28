import { type InputHTMLAttributes, forwardRef, useId } from "react";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "children"> {
  label: string;
  description?: string;
  error?: string;
  loading?: boolean;
}

/** A labeled native input with linked help and validation messages. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    description,
    error,
    loading,
    id,
    className,
    readOnly,
    "aria-describedby": describedBy,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const descriptions = [describedBy, description ? descriptionId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="ui-input-field">
      <label className="ui-input-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        ref={ref}
        className={["ui-input", className].filter(Boolean).join(" ")}
        readOnly={readOnly || loading}
        aria-busy={loading || undefined}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={descriptions || undefined}
      />
      {description && (
        <p className="ui-input-message" id={descriptionId}>
          {description}
        </p>
      )}
      {error && (
        <p className="ui-input-message" data-error="true" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
});
