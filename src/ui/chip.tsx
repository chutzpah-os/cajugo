import type { ComponentProps } from "react";
import { cn } from "./cn";

/** Chip de filtro em pílula; ativo = fundo ink (DESIGN.md §3). */
export function Chip({
  active = false,
  count,
  className,
  children,
  ...props
}: { active?: boolean; count?: number } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold",
        active
          ? "border-ink bg-ink text-white"
          : "border-field bg-surface text-ink",
        className,
      )}
      {...props}
    >
      {active && <span aria-hidden>✓</span>}
      {children}
      {count !== undefined && <span className="opacity-60">{count}</span>}
    </button>
  );
}
