import { cn } from "./cn";

/** Bloco de carregamento no formato do conteúdo (DESIGN.md §4: nunca spinner de tela cheia). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-lg bg-line", className)}
    />
  );
}
