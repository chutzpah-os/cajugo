import type { ReactNode } from "react";

/** Aviso de tela só para leitura (ex.: suporte nas regras, CFG-SEC-001). */
export function ReadOnlyNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="note"
      className="rounded-card bg-neutral-soft p-3 text-sm text-text-2"
    >
      <strong className="text-ink">Somente leitura.</strong> {children}
    </p>
  );
}
