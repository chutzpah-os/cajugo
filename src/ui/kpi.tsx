import type { ReactNode } from "react";
import { cn } from "./cn";

const HINT = {
  ok: "text-ok",
  warn: "text-warn",
  caju: "text-caju-deep",
  muted: "text-text-3",
} as const;

/**
 * KPI do DESIGN.md §3.
 * - Celular: o número (22/800) e, embaixo, o rótulo (11–12).
 * - Desktop ([15b], [15c]): o rótulo em cima, o número (24/800) e a dica.
 * - `dark`: cartão `ink-2` no cabeçalho escuro do celular; a partir de 1024 px vira o
 *   cartão branco do desktop, porque lá o cabeçalho é claro.
 * - `light`: cartão branco com borda.
 */
export function Kpi({
  value,
  label,
  hint,
  hintTone = "ok",
  tone = "light",
  testId,
}: {
  value: ReactNode;
  label: string;
  hint?: ReactNode;
  hintTone?: keyof typeof HINT;
  tone?: "dark" | "light";
  testId?: string;
}) {
  const dark = tone === "dark";
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex min-w-0 flex-col gap-0.5",
        "lg:rounded-[14px] lg:border lg:border-line lg:bg-surface lg:px-3.5 lg:py-3 lg:text-ink",
        dark
          ? "rounded-xl bg-ink-2 px-3 py-2.5 text-white"
          : "rounded-[14px] border border-line bg-surface p-3",
      )}
    >
      <span className="text-[22px] leading-tight font-extrabold tracking-[-0.01em] lg:order-2 lg:text-[24px]">
        {value}
      </span>
      <span
        className={cn(
          "leading-tight lg:order-1 lg:text-xs lg:text-text-3",
          dark ? "text-[11px] text-on-dark-2" : "text-xs text-text-3",
        )}
      >
        {label}
      </span>
      {hint && (
        <span
          className={cn(
            "mt-0.5 text-[11px] font-bold lg:order-3",
            HINT[hintTone],
            dark && "hidden lg:block",
          )}
        >
          {hint}
        </span>
      )}
    </div>
  );
}
