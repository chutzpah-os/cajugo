"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Linha que rola na horizontal sem barra de rolagem aparente, com o dedo ou pelas
 * setas redondas nas pontas, visíveis também no celular (pedido do dono: a primeira
 * vista precisa mostrar que dá para passar).
 */
export function ScrollRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const row = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) =>
    row.current?.scrollBy({
      left: dir * row.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  const arrow =
    "absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-lg font-bold text-ink shadow-md";
  return (
    <div className={cn("relative", className)}>
      <div
        ref={row}
        className="[scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        aria-label={`${label}: anteriores`}
        onClick={() => move(-1)}
        className={cn(arrow, "left-1 md:-left-3")}
      >
        ‹
      </button>
      <button
        type="button"
        aria-label={`${label}: próximos`}
        onClick={() => move(1)}
        className={cn(arrow, "right-1 md:-right-3")}
      >
        ›
      </button>
    </div>
  );
}
