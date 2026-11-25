"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { brDate } from "@/platform/br/date";
import { formatBrPhone } from "@/platform/br/phone";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { ConfirmSheet } from "@/ui/confirm-sheet";
import { EmptyState } from "@/ui/empty-state";
import { decidePartnershipAction } from "../actions";
import type { StoreNetwork } from "../service";

type Decision = "approve" | "decline" | "end";

/**
 * Vendedores [7f] (RCL-FR-004..007, RCL-SEC-004): pedidos do mais antigo com Aprovar e
 * Recusar; parceiros com celular e chave Pix (para pagar a comissão), vendas e
 * Encerrar parceria. Nada de CPF.
 */
export function PartnersView({
  pending,
  partners,
}: Pick<StoreNetwork, "pending" | "partners">) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ending, setEnding] = useState<{ id: string; name: string } | null>(
    null,
  );

  async function decide(partnershipId: string, decision: Decision) {
    setBusy(partnershipId);
    const r = await decidePartnershipAction({ partnershipId, decision });
    setBusy(null);
    setMessage(r.ok ? null : r.message);
    if (r.ok) router.refresh();
    return r.ok;
  }

  return (
    <div className="flex flex-col gap-6">
      {message && (
        <p role="alert" className="text-sm text-caju-deep">
          {message}
        </p>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-extrabold">
          Pedidos de parceria ({pending.length})
        </h2>
        {pending.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {pending.map((p) => (
              <li
                key={p.partnershipId}
                data-testid="partner-request"
                className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
              >
                <p className="font-bold">{p.sellerName}</p>
                <p className="text-sm text-text-2">
                  {p.city} · pediu em {brDate.format(p.requestedAt)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="ghost"
                    disabled={busy === p.partnershipId}
                    onClick={() => decide(p.partnershipId, "decline")}
                  >
                    Recusar
                  </Button>
                  <Button
                    disabled={busy === p.partnershipId}
                    onClick={() => decide(p.partnershipId, "approve")}
                  >
                    Aprovar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-2">Nenhum pedido esperando.</p>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-extrabold">
          Parceiros ({partners.length})
        </h2>
        {partners.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {partners.map((p) => (
              <li
                key={p.partnershipId}
                data-testid="partner"
                className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{p.sellerName}</p>
                  {p.blocked && (
                    <Badge tone="warn">Bloqueado pela CajuGo</Badge>
                  )}
                </div>
                <p className="text-sm text-text-2">
                  {p.city}
                  {p.phone && ` · ${formatBrPhone(p.phone)}`}
                </p>
                {p.pixKey && (
                  <p className="text-sm text-text-2">Pix: {p.pixKey}</p>
                )}
                <p className="text-sm text-text-2">
                  {p.sales} {p.sales === 1 ? "venda" : "vendas"} com a loja
                </p>
                <Button
                  variant="ghost"
                  disabled={busy === p.partnershipId}
                  onClick={() =>
                    setEnding({ id: p.partnershipId, name: p.sellerName })
                  }
                >
                  Encerrar parceria
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhum parceiro ainda">
            Quando um vendedor pedir parceria, o pedido aparece aqui.
          </EmptyState>
        )}
      </section>
      <ConfirmSheet
        open={ending !== null}
        title={`Encerrar parceria com ${ending?.name ?? ""}?`}
        confirmLabel="Encerrar parceria"
        confirmVariant="dark"
        busy={busy !== null}
        onClose={() => setEnding(null)}
        onConfirm={async () => {
          if (ending && (await decide(ending.id, "end"))) setEnding(null);
        }}
      >
        Os contatos novos pelo link dele deixam de ser marcados e ele não ganha
        comissão de vendas novas da loja.
      </ConfirmSheet>
    </div>
  );
}
