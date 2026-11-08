"use client";

import { useRef, type ReactNode } from "react";

/**
 * Gaveta do DESIGN.md §3: 318 px pela direita, fundo escurecido; `<dialog>` nativo
 * (foco, Esc). Fecha no fundo, em "Fechar" ou ao tocar num link dentro dela.
 */
export function Drawer({
  label,
  triggerLabel,
  triggerClassName,
  children,
}: {
  label: string;
  triggerLabel: ReactNode;
  triggerClassName?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>
      <dialog
        ref={ref}
        aria-label={label}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target === e.currentTarget || target.closest("a"))
            ref.current?.close();
        }}
        className="m-0 ml-auto h-dvh max-h-none w-[318px] max-w-[85vw] bg-surface p-4 backdrop:bg-[rgba(28,27,32,.55)]"
      >
        <div className="flex items-center justify-between">
          <p className="text-[17px] font-extrabold">{label}</p>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="flex h-11 items-center px-2 text-sm font-semibold text-text-2"
          >
            Fechar
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}
