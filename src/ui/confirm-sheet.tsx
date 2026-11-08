"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./button";

/**
 * Diálogo de confirmação [6f] (PRD): folha de baixo com título, efeito, conteúdo
 * opcional e 2 botões. `<dialog>` nativo (foco, Esc); controlado por `open`.
 */
export function ConfirmSheet({
  open,
  title,
  children,
  extra,
  confirmLabel,
  confirmVariant = "dark",
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  extra?: ReactNode;
  confirmLabel: string;
  confirmVariant?: "dark" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-0 mt-auto w-full max-w-none rounded-t-[20px] bg-surface p-5 backdrop:bg-[rgba(28,27,32,.55)] md:m-auto md:max-w-md md:rounded-card"
    >
      <div className="flex flex-col gap-3">
        <h2 id="confirm-title" className="text-[19px] font-extrabold">
          {title}
        </h2>
        <p className="text-sm text-text-2">{children}</p>
        {extra}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Voltar
          </Button>
          <Button variant={confirmVariant} disabled={busy} onClick={onConfirm}>
            {busy ? "Aguarde…" : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
