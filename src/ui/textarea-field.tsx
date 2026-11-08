import type { ComponentProps } from "react";

/** Texto longo com contador "N/máx" (PRD [2a]: descrição até 2.000). */
export function TextAreaField({
  id,
  label,
  max,
  error,
  value,
  ...props
}: {
  id: string;
  label: string;
  max: number;
  error?: string;
  value: string;
} & Omit<ComponentProps<"textarea">, "id" | "value" | "maxLength">) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        maxLength={max}
        rows={5}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-count`}
        className="rounded-input border border-field bg-surface p-3.5 text-[15px] outline-none focus:border-[1.5px] focus:border-ink"
        {...props}
      />
      <p id={`${id}-count`} className="self-end text-xs text-text-3">
        {value.length}/{max}
      </p>
      {error && <p className="text-xs text-caju-deep">{error}</p>}
    </div>
  );
}
