"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { brl } from "@/platform/br/money";
import { Button } from "@/ui/button";
import { ConfirmSheet, SheetNote } from "@/ui/confirm-sheet";
import { RadioOptions } from "@/ui/radio-options";
import {
  cancelSubscriptionAction,
  resubscribeAction,
  undoCancelAction,
  type ReviewResult,
} from "../actions";
import type { AccountView } from "../service";

const brDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

function useRun() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const run = async (action: () => Promise<ReviewResult>) => {
    setBusy(true);
    const r = await action();
    setBusy(false);
    setMessage(r.ok ? null : (r.message ?? "Tente de novo."));
    if (r.ok) router.refresh();
    return r;
  };
  return { busy, message, run };
}

const Alert = ({ message }: { message: string | null }) =>
  message ? (
    <p role="alert" className="text-sm text-caju-deep">
      {message}
    </p>
  ) : null;

/** **Desfazer cancelamento** (CAN-FR-003): no aviso do painel e na Conta. */
export function UndoCancelButton() {
  const r = useRun();
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="dark"
        size="sm"
        disabled={r.busy}
        data-testid="undo-cancel"
        className="min-h-11 self-start"
        onClick={() => r.run(() => undoCancelAction())}
      >
        {r.busy ? "Aguarde…" : "Desfazer cancelamento"}
      </Button>
      <Alert message={r.message} />
    </div>
  );
}

type Cancel = NonNullable<AccountView["cancel"]>;

/** Texto do efeito em [12h] (DESIGN.md §6, "Confirmar cancelamento"). */
export function cancelEffect(
  c: Extract<Cancel, { kind: "available" }>,
): string {
  return c.until
    ? `Seu catálogo e seus veículos na vitrine ficam no ar até ${brDate.format(c.until)}, fim do mês já pago. Depois disso saem do ar. Não há multa.`
    : "Como a fatura está em aberto, seu catálogo e seus veículos na vitrine saem do ar agora, e as faturas em aberto são canceladas. Não há multa.";
}

/** Nota de [12h] (CAN-FR-001): retenção, crédito e desfazer. */
export function cancelConsequences(
  c: Extract<Cancel, { kind: "available" }>,
): string[] {
  return [
    `Seus dados ficam guardados por ${c.retentionDays} dias: dá para reassinar e voltar com tudo.`,
    c.creditCents
      ? `O crédito não usado (${brl(c.creditCents)}) expira.`
      : "O crédito Caju Indica não usado expira.",
    ...(c.until ? [`Você pode desfazer até ${brDate.format(c.until)}.`] : []),
  ];
}

/**
 * Cancelamento na Conta [3c] → [12h] (CAN-FR-001, 002, 003, 006): cancelar com o
 * motivo, o fim agendado com **Desfazer** e, cancelada, **Reassinar**.
 */
export function CancelSubscription({
  cancel,
  reasons,
}: {
  cancel: Cancel;
  reasons: readonly string[];
}) {
  const router = useRouter();
  const r = useRun();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (cancel.kind === "scheduled")
    return (
      <section
        aria-labelledby="cancelamento"
        className="flex flex-col gap-2 rounded-card bg-warn-soft p-4 text-sm text-warn"
      >
        <h2 id="cancelamento" className="text-[17px] font-extrabold">
          Sua assinatura termina em {brDate.format(cancel.until)}
        </h2>
        <p>
          A loja continua no ar e editável até lá. Depois, sai do ar.
          {cancel.reason && ` Motivo: ${cancel.reason}.`}
        </p>
        <UndoCancelButton />
      </section>
    );

  if (cancel.kind === "canceled")
    return (
      <section
        aria-labelledby="cancelamento"
        className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
      >
        <h2 id="cancelamento" className="text-[17px] font-extrabold">
          Assinatura cancelada em {brDate.format(cancel.at)}
        </h2>
        <p className="text-sm text-text-2">
          A loja está fora do ar. Para voltar com o mesmo endereço e os
          veículos, pague uma nova 1ª mensalidade.
        </p>
        <Button
          block
          disabled={r.busy}
          data-testid="resubscribe"
          onClick={async () => {
            const res = await r.run(() => resubscribeAction());
            if (res.ok) router.push("/lojistas/pagamento");
          }}
        >
          {r.busy ? "Aguarde…" : "Reassinar"}
        </Button>
        <Alert message={r.message} />
      </section>
    );

  return (
    <>
      <button
        type="button"
        data-testid="cancel-subscription"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center self-start text-sm font-bold text-caju-deep underline underline-offset-2"
      >
        Cancelar assinatura
      </button>
      <ConfirmSheet
        open={open}
        title="Cancelar assinatura?"
        kind="cancel"
        confirmLabel="Cancelar assinatura"
        cancelLabel="Manter assinatura"
        confirmVariant="danger"
        busy={r.busy}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          const res = await r.run(() =>
            cancelSubscriptionAction(reason ? { reason } : {}),
          );
          if (res.ok) setOpen(false);
        }}
        extra={
          <>
            <RadioOptions
              name="reason"
              legend="Por que você está cancelando? (opcional)"
              options={reasons.map((x) => [x, x] as const)}
              value={reason}
              onChange={setReason}
            />
            <SheetNote>
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {cancelConsequences(cancel).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </SheetNote>
            <Alert message={r.message} />
          </>
        }
      >
        {cancelEffect(cancel)}
      </ConfirmSheet>
    </>
  );
}
