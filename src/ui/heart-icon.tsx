import { cn } from "./cn";

/** Coração de favoritos (DESIGN.md): contorno; `filled` em caju. */
export function HeartIcon({
  filled = false,
  className,
}: {
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn(
        "size-6",
        filled ? "fill-caju stroke-caju" : "fill-none stroke-current",
        className,
      )}
      strokeWidth={2}
      strokeLinejoin="round"
    >
      <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
    </svg>
  );
}
