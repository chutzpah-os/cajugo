import type { ComponentProps } from "react";
import { cn } from "./cn";

/** Seleção com rótulo, ajuda e erro (DESIGN.md §3); alvo de 50 px. */
export function SelectField({
  id,
  label,
  options,
  placeholder,
  help,
  error,
  className,
  ...props
}: {
  id: string;
  label: string;
  options: readonly (readonly [value: string, label: string])[];
  placeholder?: string;
  help?: string;
  error?: string;
} & Omit<ComponentProps<"select">, "id">) {
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-[50px] rounded-input border bg-surface px-3 text-[15px] disabled:opacity-60",
          error ? "border-caju-deep" : "border-field",
          className,
        )}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-caju-deep">
          {error}
        </p>
      ) : (
        help && (
          <p id={`${id}-help`} className="text-xs text-text-3">
            {help}
          </p>
        )
      )}
    </div>
  );
}
