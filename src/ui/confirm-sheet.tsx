"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./cn";

/** Ícone do [6f] pela natureza da ação (DESIGN.md §5 [6f]). */
const KINDS = {
  sold: { icon: "✓", className: "bg-ok-soft text-ok" },
  cancel: { icon: "!", className: "bg-caju-soft text-caju-deep" },
  suspend: { icon: "!", className: "bg-warn-soft text-warn" },
  hide: { icon: "–", className: "bg-neutral-soft text-text-2" },
  neutral: { icon: "?", className: "bg-neutral-soft text-text-2" },
} as const;

export type ConfirmKind = keyof typeof KINDS;

/**
 * Diálogo de confirmação [6f]: bottom sheet com alça, ícone de 48 px na cor do tipo,
 * título em pergunta (20/800), texto do efeito, nota/motivos e os botões empilhados —
 * confirmar (vermelho `caju-deep` só quando tira algo do ar por pagamento; escuro nos
 * demais) e, embaixo, o contorno para voltar. `<dialog>` nativo (foco, Esc).
 */
export function ConfirmSheet({
  open,
  title,
  children,
  extra,
  kind = "neutral",
  confirmLabel,
  cancelLabel = "Voltar",
  confirmVariant = "dark",
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  extra?: ReactNode;
  kind?: ConfirmKind;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "dark" | "danger";
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
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-sheet bg-surface px-5 pt-2 pb-8 backdrop:bg-[rgba(28,27,32,.55)] md:m-auto md:max-w-md md:rounded-sheet md:pt-5"
    >
      <div className="flex flex-col gap-4">
        <div aria-hidden className="flex justify-center md:hidden">
          <span className="h-1 w-10 rounded-full bg-field" />
        </div>
        <span
          aria-hidden
          className={cn(
            "flex size-12 items-center justify-center rounded-[14px] text-[22px] font-extrabold",
            KINDS[kind].className,
          )}
        >
          {KINDS[kind].icon}
        </span>
        <div className="flex flex-col gap-1.5">
          <h2
            id="confirm-title"
            className="text-xl font-extrabold tracking-[-0.01em]"
          >
            {title}
          </h2>
          <div className="text-[15px] leading-normal text-pretty text-text-2">
            {children}
          </div>
        </div>
        {extra}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            variant={confirmVariant}
            block
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Aguarde…" : confirmLabel}
          </Button>
          <Button variant="soft" block disabled={busy} onClick={onClose}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

/** Nota em fundo `bg` dentro da confirmação ([6f]: atraso, leads perdidos). */
export function SheetNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-bg px-3.5 py-3 text-[13px] leading-snug text-ink-2">
      {children}
    </div>
  );
}
