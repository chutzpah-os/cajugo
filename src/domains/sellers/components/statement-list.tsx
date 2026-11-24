"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { brl } from "@/platform/br/money";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { ConfirmSheet } from "@/ui/confirm-sheet";
import { LoadMoreButton, useLoadMore } from "@/ui/load-more";
import {
  loadMoreStatementAction,
  setCommissionReceivedAction,
} from "../actions";
import type { StatementItem } from "../service";

const brDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});
const brTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Uma venda do extrato [7d] (EXT-FR-001, 003, 009). */
export function StatementCard({
  item,
  busy,
  onReceived,
  onUndo,
}: {
  item: StatementItem;
  busy: boolean;
  onReceived?: () => void;
  onUndo?: () => void;
}) {
  return (
    <li
      data-testid="statement-sale"
      className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{item.vehicle}</p>
          <p className="text-sm text-text-2">
            {item.store} · {brDate.format(new Date(item.date))}
          </p>
        </div>
        <Badge tone={item.status === "paid" ? "ok" : "warn"}>
          {item.status === "paid" ? "Paga" : "A receber"}
        </Badge>
      </header>
      <p className="text-sm text-text-2">
        Vendido por {brl(item.finalPriceCents)}
      </p>
      <p className="text-[17px] font-extrabold">
        Comissão {brl(item.commissionCents)}
      </p>
      {item.status === "to_receive" && onReceived && (
        <Button block disabled={busy} onClick={onReceived}>
          Recebi
        </Button>
      )}
      {item.canUndoUntil && onUndo && (
        <div className="flex flex-col gap-1">
          <Button variant="ghost" block disabled={busy} onClick={onUndo}>
            Desfazer
          </Button>
          <p className="text-xs text-text-3">
            Dá para desfazer até {brTime.format(new Date(item.canUndoUntil))}.
          </p>
        </div>
      )}
    </li>
  );
}

/** Lista do extrato com **Recebi**, **Desfazer** e **Carregar mais** (EXT-NFR-002). */
export function StatementList({
  initial,
  nextCursor,
  filter,
}: {
  initial: StatementItem[];
  nextCursor: string | null;
  filter: string;
}) {
  const router = useRouter();
  const list = useLoadMore<StatementItem>({
    initial,
    nextCursor,
    idOf: (i) => i.saleId,
    fetchPage: (cursor) => loadMoreStatementAction({ filtro: filter, cursor }),
  });
  const [confirming, setConfirming] = useState<StatementItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(saleId: string, received: boolean) {
    setBusy(true);
    setMessage(null);
    const r = await setCommissionReceivedAction({ saleId, received });
    setBusy(false);
    if (!r.ok) setMessage(r.message);
    setConfirming(null);
    router.refresh();
    await list.reload();
  }

  return (
    <>
      {message && (
        <p role="alert" className="text-sm text-caju-deep">
          {message}
        </p>
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {list.items.map((item) => (
          <StatementCard
            key={item.saleId}
            item={item}
            busy={busy}
            onReceived={() => setConfirming(item)}
            onUndo={() => save(item.saleId, false)}
          />
        ))}
      </ul>
      {list.hasMore && (
        <LoadMoreButton
          busy={list.busy}
          failed={list.failed}
          onClick={list.load}
          noun="vendas"
        />
      )}
      <ConfirmSheet
        open={!!confirming}
        title="Recebeu a comissão?"
        confirmLabel="Sim, recebi"
        kind="sold"
        busy={busy}
        onClose={() => setConfirming(null)}
        onConfirm={() => confirming && save(confirming.saleId, true)}
      >
        {confirming &&
          `${confirming.vehicle} na ${confirming.store} · ${brl(confirming.commissionCents)}. A comissão passa a Paga e a loja recebe o aviso. Dá para desfazer por 24 horas.`}
      </ConfirmSheet>
    </>
  );
}
