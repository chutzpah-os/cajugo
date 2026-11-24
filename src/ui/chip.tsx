import type { ComponentProps } from "react";
import { cn } from "./cn";

/**
 * Chip de filtro em pílula; ativo = fundo `ink` (DESIGN.md §3). O botão tem 44 px de
 * altura (alvo de toque, §4) e a pílula visível tem o tamanho do design: 36 px (`md`,
 * folha e celular [1a]) ou 30 px (`sm`, coluna de filtros do desktop [15a]).
 */
export function Chip({
  active = false,
  count,
  size = "md",
  className,
  children,
  ...props
}: {
  active?: boolean;
  count?: number;
  size?: "sm" | "md";
} & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn("inline-flex h-11 shrink-0 items-center", className)}
      {...props}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border font-semibold",
          size === "sm" ? "h-[30px] px-3 text-xs" : "h-9 px-3.5 text-sm",
          active
            ? "border-ink bg-ink text-white"
            : "border-field bg-surface text-ink",
        )}
      >
        {active && size === "md" && <span aria-hidden>✓</span>}
        {children}
        {count !== undefined && <span className="opacity-60">{count}</span>}
      </span>
    </button>
  );
}
