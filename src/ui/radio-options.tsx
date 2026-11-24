"use client";

import { cn } from "./cn";

/**
 * Opção de rádio em lista (DESIGN.md §3): 44 px, raio 10, borda 1,5 `field`;
 * selecionada com borda `ink`, fundo `bg` e ponto de 10 px. Rádio nativo, em grupo.
 */
export function RadioOptions({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  options: readonly (readonly [value: string, label: string])[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[13px] font-semibold">{legend}</legend>
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <label
            key={v}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-input border-[1.5px] px-3.5 text-sm",
              on ? "border-ink bg-bg" : "border-field bg-surface",
            )}
          >
            <input
              type="radio"
              name={name}
              value={v}
              checked={on}
              onChange={() => onChange(v)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "flex size-[18px] flex-none items-center justify-center rounded-full border-[1.5px] peer-focus-visible:outline-2 peer-focus-visible:outline-ink",
                on ? "border-ink" : "border-field-dash",
              )}
            >
              {on && <span className="size-2.5 rounded-full bg-ink" />}
            </span>
            {label}
          </label>
        );
      })}
    </fieldset>
  );
}
