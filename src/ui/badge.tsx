import type { ReactNode } from "react";
import { cn } from "./cn";

const tones = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  info: "bg-info-soft text-info",
  neutral: "bg-neutral-soft text-text-2",
  caju: "bg-caju-soft text-caju-deep",
  dark: "bg-ink text-white",
} as const;

export type BadgeTone = keyof typeof tones;

/** Selo de status: sempre com texto, nunca só cor (DESIGN.md §7). */
export function Badge({
  tone,
  size = "md",
  className,
  children,
}: {
  tone: BadgeTone;
  /** `sm`: selo dentro de card (10 px); `md`: cabeçalho e telas (11 px). */
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        // Largura do texto, nunca esticado pelo container (DSG-FR-013).
        "inline-flex w-fit flex-none items-center rounded-badge leading-none font-bold tracking-[0.03em] whitespace-nowrap uppercase",
        size === "sm"
          ? "px-[7px] py-[4px] text-[10px]"
          : "px-2 py-[5px] text-[11px]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
