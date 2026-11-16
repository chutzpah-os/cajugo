"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/ui/button";
import { ConfirmSheet } from "@/ui/confirm-sheet";
import { TextField } from "@/ui/text-field";
import {
  approveSellerAction,
  blockSellerAction,
  unblockSellerAction,
  type DecisionResult,
} from "../actions";

function useDecision() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const run = async (action: () => Promise<DecisionResult>) => {
    setBusy(true);
    const r = await action();
    setBusy(false);
    setMessage(r.ok ? null : r.message);
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

/** **Aprovar** (SEL-FR-004): sem as duas fotos fica desabilitado. */
export function ApproveButton({
  sellerId,
  ready,
}: {
  sellerId: string;
  ready: boolean;
}) {
  const d = useDecision();
  return (
    <div className="flex flex-col gap-1">
      <Button
        block
        disabled={!ready || d.busy}
        data-testid="seller-approve"
        onClick={() => d.run(() => approveSellerAction({ sellerId }))}
      >
        {d.busy ? "Aguarde…" : "Aprovar"}
      </Button>
      {!ready && (
        <p className="text-xs text-text-3">Falta a foto do documento.</p>
      )}
      <Alert message={d.message} />
    </div>
  );
}

/** **Desbloquear** (SEL-FR-005). */
export function UnblockButton({ sellerId }: { sellerId: string }) {
  const d = useDecision();
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="ghost"
        block
        disabled={d.busy}
        data-testid="seller-unblock"
        onClick={() => d.run(() => unblockSellerAction({ sellerId }))}
      >
        {d.busy ? "Aguarde…" : "Desbloquear"}
      </Button>
      <Alert message={d.message} />
    </div>
  );
}

/** **Bloquear** com motivo, na confirmação de [6f] (SEL-FR-005). */
export function BlockButton({
  sellerId,
  name,
}: {
  sellerId: string;
  name: string;
}) {
  const d = useDecision();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  return (
    <>
      <Button
        variant="ghost"
        block
        data-testid="seller-block"
        onClick={() => setOpen(true)}
      >
        Bloquear
      </Button>
      <ConfirmSheet
        open={open}
        title={`Bloquear ${name}?`}
        confirmLabel="Bloquear"
        confirmVariant="primary"
        busy={d.busy}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          if (reason.trim().length < 3) return setError("Informe o motivo.");
          const r = await d.run(() => blockSellerAction({ sellerId, reason }));
          if (r.ok) setOpen(false);
          else setError(r.errors?.reason);
        }}
        extra={
          <>
            <TextField
              id={`block-reason-${sellerId}`}
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
        Os links dele deixam de marcar novos contatos e as parcerias ficam
        suspensas até desbloquear. Ele vê o motivo ao entrar.
      </ConfirmSheet>
    </>
  );
}
