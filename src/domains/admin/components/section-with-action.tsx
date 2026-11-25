"use client";

import { useState, type ReactNode } from "react";

/**
 * Título de seção com um botão à direita que abre o formulário logo abaixo, na
 * própria tela ([1d] "Lojas" + **Nova loja**; [4c] "Equipe CajuGo" + **Convidar**).
 * Sem botão quando `children` falta (o suporte só lê).
 */
export function SectionWithAction({
  title,
  action,
  closeLabel = "Fechar",
  testId,
  children,
}: {
  title: string;
  action: string;
  closeLabel?: string;
  testId?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3" data-testid={testId}>
      <div className="flex items-center justify-between gap-3 pt-2">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {children && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-11 flex-none items-center gap-1.5 rounded-[10px] bg-ink px-3.5 text-[13px] font-bold text-white"
          >
            {open ? (
              closeLabel
            ) : (
              <>
                <span aria-hidden className="text-base leading-none">
                  +
                </span>
                {action}
              </>
            )}
          </button>
        )}
      </div>
      {children && open && (
        <div className="rounded-card border border-line bg-surface p-4">
          {children}
        </div>
      )}
    </div>
  );
}
