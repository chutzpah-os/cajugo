import { cn } from "./cn";

/** "caju" em ink + "go" em caju e "veículos" embaixo; símbolo: caju com a castanha (DESIGN.md §3). */
export function Logo({
  className,
  tone = "light",
}: {
  className?: string;
  /** `dark`: "caju" em branco, sobre a sidebar escura [15b]/[15c]. */
  tone?: "light" | "dark";
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label="CajuGo Veículos"
      role="img"
    >
      <span
        aria-hidden
        className="relative inline-block size-5 rounded-full bg-caju"
      >
        <span className="absolute -top-0.5 right-0 size-2 rounded-full bg-castanha" />
      </span>
      <span aria-hidden className="flex flex-col">
        <span
          className={cn(
            "text-[21px] leading-none font-extrabold tracking-[-0.03em]",
            tone === "dark" && "text-white",
          )}
        >
          caju<span className="text-caju">go</span>
        </span>
        {/* "veículos" abaixo do nome, no formato e na cor do "go" (pedido do dono, 2026-11-24). */}
        <span
          className={cn(
            "mt-0.5 text-[15px] leading-none font-extrabold tracking-[-0.03em]",
            // Mesma cor do "go" (pedido do dono, 2026-11-24).
            "text-caju",
          )}
        >
          veículos
        </span>
      </span>
    </span>
  );
}
