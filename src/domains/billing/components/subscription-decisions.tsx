"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/ui/button";
import { ConfirmSheet } from "@/ui/confirm-sheet";
import { TextField } from "@/ui/text-field";
import {
  reactivateStoreAction,
  suspendStoreAction,
  type ReviewResult,
} from "../actions";

function useDecision() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const run = async (action: () => Promise<ReviewResult>) => {
    setBusy(true);
    const r = await action();
    setBusy(false);
    setMessage(r.ok ? null : (r.message ?? null));
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

/** **Suspender** com a confirmação de [6f] (SUB-FR-013): só o admin. */
export function SuspendButton({
  storeId,
  name,
  days,
  amount,
}: {
  storeId: string;
  name: string;
  days: number;
  amount: string;
}) {
  const d = useDecision();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        block
        data-testid="subscription-suspend"
        onClick={() => setOpen(true)}
      >
        Suspender
      </Button>
      <ConfirmSheet
        open={open}
        title={`Suspender ${name}?`}
        confirmLabel="Suspender loja"
        confirmVariant="primary"
        busy={d.busy}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          const r = await d.run(() => suspendStoreAction({ storeId }));
          if (r.ok) setOpen(false);
        }}
        extra={<Alert message={d.message} />}
      >
        Em atraso há {days} {days === 1 ? "dia" : "dias"} · {amount}. O catálogo
        e os veículos saem do ar; o lojista vê o alerta e pode pagar.
      </ConfirmSheet>
    </>
  );
}

/** **Reativar** com o motivo (SUB-FR-013): sem pagamento, volta em atraso. */
export function ReactivateButton({
  storeId,
  name,
}: {
  storeId: string;
  name: string;
}) {
  const d = useDecision();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  return (
    <>
      <Button
        block
        data-testid="subscription-reactivate"
        onClick={() => setOpen(true)}
      >
        Reativar
      </Button>
      <ConfirmSheet
        open={open}
        title={`Reativar ${name}?`}
        confirmLabel="Reativar"
        confirmVariant="primary"
        busy={d.busy}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          if (reason.trim().length < 3) return setError("Informe o motivo.");
          const r = await d.run(() =>
            reactivateStoreAction({ storeId, reason }),
          );
          if (r.ok) setOpen(false);
          else setError(r.errors?.reason);
        }}
        extra={
          <>
            <TextField
              id={`reactivate-reason-${storeId}`}
              name="reason"
              label="Motivo"
              maxLength={200}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(undefined);
              }}
              error={error}
            />
            <Alert message={error ? null : d.message} />
          </>
        }
      >
        A loja volta ao ar. Sem pagamento, a fatura continua aberta e a loja
        fica em atraso; o job suspende de novo depois da tolerância.
      </ConfirmSheet>
    </>
  );
}
