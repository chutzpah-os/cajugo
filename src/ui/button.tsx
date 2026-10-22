import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "./cn";

const variants = {
  primary: "bg-caju text-white",
  dark: "bg-ink text-white",
  outline: "border-[1.5px] border-ink bg-transparent text-ink",
  whatsapp: "bg-whatsapp text-white",
  ghost: "border border-field bg-surface text-ink",
} as const;

const sizes = {
  md: "h-[50px] px-5 text-[15px]",
  sm: "h-10 px-3.5 text-sm",
} as const;

type Style = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  block?: boolean;
};

function classes(
  { variant = "primary", size = "md", block }: Style,
  extra?: string,
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-button font-bold transition-opacity",
    "disabled:pointer-events-none disabled:opacity-40",
    variants[variant],
    sizes[size],
    block && "w-full",
    extra,
  );
}

/** Botão do DESIGN.md §3: primário (caju), escuro, contorno, WhatsApp e pequeno. */
export function Button({
  variant,
  size,
  block,
  className,
  type = "button",
  ...props
}: Style & ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={classes({ variant, size, block }, className)}
      {...props}
    />
  );
}

/** Mesmo visual do Button, para navegação. */
export function ButtonLink({
  variant,
  size,
  block,
  className,
  ...props
}: Style & ComponentProps<typeof Link>) {
  return (
    <Link className={classes({ variant, size, block }, className)} {...props} />
  );
}
