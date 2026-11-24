import { cn } from "./cn";

/** Sigla de 2 letras do nome ("Auto Center Silva" → "AS"; "Garagem 77" → "G7"). */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const SIZES = {
  sm: "size-[34px] rounded-[9px] text-xs",
  md: "size-[42px] rounded-[11px] text-sm",
  lg: "size-12 rounded-[12px] text-base",
} as const;

/** Sigla da loja em quadrado `ink` (card de loja e assinatura, DESIGN.md §3). */
export function Initials({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex flex-none items-center justify-center bg-ink font-extrabold text-white",
        SIZES[size],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Avatar redondo de pessoa (cabeçalhos e Usuários [1d]). */
export function Avatar({
  name,
  tone = "light",
  size = 40,
}: {
  name: string;
  /** `dark`: no cabeçalho escuro (`ink-3`); `light`: no claro (`bg`). */
  tone?: "dark" | "light";
  size?: 38 | 40;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex flex-none items-center justify-center rounded-full font-bold",
        size === 40 ? "size-10 text-sm" : "size-[38px] text-[13px]",
        tone === "dark" ? "bg-ink-3 text-white" : "bg-bg text-ink",
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
