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
  children,
}: {
  tone: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-badge px-2 py-1 text-[11px] leading-none font-bold tracking-[0.03em] uppercase",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
