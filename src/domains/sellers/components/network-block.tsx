import type { ReactNode } from "react";
import { Disclosure } from "@/ui/disclosure";

/**
 * Bloco **Rede Caju** da Conta [3c] (RCL-FR-014): Comissão [7e] e Vendedores [7f]
 * abrem aqui mesmo, sem outra página (012), com o número de pedidos pendentes.
 */
export function NetworkBlock({
  acceptsSellers,
  pending,
  commission,
  partners,
}: {
  acceptsSellers: boolean;
  pending: number;
  commission: ReactNode;
  partners: ReactNode;
}) {
  return (
    <section
      data-testid="network-block"
      className="flex flex-col rounded-card border border-line bg-surface"
    >
      <div className="flex flex-col gap-1 p-4 pb-2">
        <h2 className="text-[17px] font-extrabold">Rede Caju</h2>
        <p className="text-sm text-text-2">
          {acceptsSellers
            ? "Sua loja aceita vendedores independentes."
            : "Sua loja não está aceitando vendedores."}
        </p>
      </div>
      <div className="divide-y divide-line-2 border-t border-line-2">
        <Disclosure title="Comissão" testId="network-commission">
          {commission}
        </Disclosure>
        <Disclosure
          title="Vendedores"
          testId="network-partners"
          open={pending > 0}
          badge={
            pending > 0 && (
              <span
                data-testid="network-pending"
                className="rounded-full bg-caju px-2 py-0.5 text-xs font-bold text-white"
              >
                {pending}
              </span>
            )
          }
        >
          {!acceptsSellers && (
            <p className="rounded-card bg-info-soft p-3 text-sm text-info">
              Sua loja não está aceitando vendedores: os pedidos novos ficam
              bloqueados e as parcerias, suspensas. Ligue em Comissão.
            </p>
          )}
          {partners}
        </Disclosure>
      </div>
    </section>
  );
}
