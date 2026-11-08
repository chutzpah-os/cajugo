"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { brl, centsToReais, reaisToCents } from "@/platform/br/money";
import { Button, ButtonLink } from "@/ui/button";
import { TextField } from "@/ui/text-field";
import { confirmPaymentAction, rejectPaymentAction } from "../actions";
import type { QueueItem } from "../service";

const brDateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

/** Resultado da última conferência, com o `wa.me` para avisar a loja (PIX-FR-009). */
export type Done = { storeName: string; text: string; whatsappUrl?: string };

export function DoneBanner({ done }: { done: Done | null }) {
  if (!done) return null;
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-card bg-ok-soft p-4 text-sm text-ok"
    >
      <p className="font-bold">{done.text}</p>
      {done.whatsappUrl && (
        <ButtonLink
          variant="whatsapp"
          size="sm"
          href={done.whatsappUrl}
          target="_blank"
          rel="noopener"
          className="self-start"
        >
          Avisar {done.storeName} no WhatsApp
        </ButtonLink>
      )}
    </div>
  );
}

function QueueCard({
  item,
  canReview,
  onDone,
}: {
  item: QueueItem;
  canReview: boolean;
  onDone: (done: Done) => void;
}) {
  const [amount, setAmount] = useState(centsToReais(item.paidCents));
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();

  const corrected = () => {
    const cents = reaisToCents(amount);
    return Number.isFinite(cents) && cents !== item.paidCents
      ? cents
      : undefined;
  };

  const run = async (kind: "confirm" | "reject") => {
    setBusy(true);
    setErrors({});
    setMessage(undefined);
    const result =
      kind === "confirm"
        ? await confirmPaymentAction({
            paymentId: item.paymentId,
            amountCents: corrected(),
          })
        : await rejectPaymentAction({
            paymentId: item.paymentId,
            reason,
            amountCents: corrected(),
          });
    setBusy(false);
    if (!result.ok) {
      setErrors(result.errors);
      setMessage(result.message);
      return;
    }
    onDone({
      storeName: item.storeName,
      text:
        kind === "confirm"
          ? `Pagamento de ${item.storeName} confirmado. A loja está no ar.`
          : `Comprovante de ${item.storeName} recusado.`,
      whatsappUrl: kind === "confirm" ? result.whatsappUrl : undefined,
    });
  };

  return (
    <li className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{item.storeName}</p>
          <p className="text-sm text-text-3">
            {item.reference} · {brDateTime.format(item.submittedAt)}
          </p>
        </div>
        <p className="text-right font-extrabold">{brl(item.paidCents)}</p>
      </div>
      {item.differs && (
        <p
          role="alert"
          className="rounded-input bg-warn-soft px-3 py-2 text-sm font-bold text-warn"
        >
          Valor diferente do esperado ({brl(item.expectedCents)})
        </p>
      )}
      <ButtonLink
        variant="ghost"
        size="sm"
        href={`/api/v1/payments/${item.paymentId}/receipt`}
        target="_blank"
        rel="noopener"
        className="min-h-11 self-start"
      >
        Ver comprovante{item.format === "pdf" ? " (PDF)" : ""}
      </ButtonLink>

      {canReview && (
        <div className="flex flex-col gap-3">
          <TextField
            id={`amount-${item.paymentId}`}
            label="Valor que caiu na conta"
            prefix="R$"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={errors.amountCents}
          />
          {rejecting ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`reason-${item.paymentId}`}
                  className="text-[13px] font-semibold"
                >
                  Motivo da recusa
                </label>
                <textarea
                  id={`reason-${item.paymentId}`}
                  rows={2}
                  maxLength={300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-input border border-field bg-surface p-3 text-[15px]"
                />
                {errors.reason && (
                  <p className="text-xs text-caju-deep">{errors.reason}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setRejecting(false)}
                >
                  Voltar
                </Button>
                <Button disabled={busy} onClick={() => run("reject")}>
                  {busy ? "Recusando…" : "Recusar"}
                </Button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setRejecting(true)}
              >
                Recusar
              </Button>
              <Button disabled={busy} onClick={() => run("confirm")}>
                {busy ? "Confirmando…" : "Confirmar"}
              </Button>
            </div>
          )}
          {message && (
            <p role="alert" className="text-sm text-caju-deep">
              {message}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/** Fila de comprovantes [10b] (PIX-FR-007…010); o suporte vê sem os botões (PIX-SEC-003). */
export function ReviewQueue({
  items,
  canReview,
}: {
  items: QueueItem[];
  canReview: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState<Done | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <DoneBanner done={done} />
      {items.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-4 text-sm text-text-2">
          Nenhum comprovante aguardando conferência.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <QueueCard
              key={item.paymentId}
              item={item}
              canReview={canReview}
              onDone={(d) => {
                setDone(d);
                router.refresh();
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
