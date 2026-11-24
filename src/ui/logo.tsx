import { cn } from "./cn";

/** "caju" em ink + "go" em caju; símbolo: caju com a castanha (DESIGN.md §3). */
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
      aria-label="CajuGo"
      role="img"
    >
      <span
        aria-hidden
        className="relative inline-block size-5 rounded-full bg-caju"
      >
        <span className="absolute -top-0.5 right-0 size-2 rounded-full bg-castanha" />
      </span>
      <span
        aria-hidden
        className={cn(
          "text-[21px] font-extrabold tracking-[-0.03em]",
          tone === "dark" && "text-white",
        )}
      >
        caju<span className="text-caju">go</span>
      </span>
    </span>
  );
}
