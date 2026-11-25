import type { ComponentProps } from "react";
import { cn } from "./cn";

type Props = {
  title: string;
  caption?: string;
  /** Opção dentro de um grupo (ex.: "Quem pode indicar"): texto normal, sem negrito. */
  option?: boolean;
} & Omit<ComponentProps<"input">, "type" | "role">;

/**
 * Toggle com título e legenda; a linha inteira é clicável (DESIGN.md §3).
 * É um checkbox nativo com role="switch": funciona em formulário sem JavaScript.
 */
export function Toggle({
  title,
  caption,
  option,
  className,
  disabled,
  ...props
}: Props) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center justify-between gap-3",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <span className="flex flex-col">
        <span
          className={cn(
            "text-[15px]",
            option ? "font-medium text-text-2" : "font-bold",
          )}
        >
          {title}
        </span>
        {caption && <span className="text-xs text-text-3">{caption}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        disabled={disabled}
        {...props}
      />
      <span
        aria-hidden
        className="relative h-[26px] w-11 shrink-0 rounded-full bg-field transition-colors duration-200 peer-checked:bg-caju peer-checked:[&>span]:translate-x-[18px]"
      >
        <span className="absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow transition-transform duration-200" />
      </span>
    </label>
  );
}
