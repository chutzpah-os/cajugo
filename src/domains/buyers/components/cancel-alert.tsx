"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/ui/button";
import {
  cancelSearchAlertAction,
  type CancelActionOutcome as Outcome,
} from "../actions";

const MESSAGES: Record<Outcome, string> = {
  canceled: "Aviso cancelado. Não vamos mais mandar mensagem sobre esta busca.",
  closed: "Este alerta já foi encerrado.",
  invalid: "Link inválido.",
  "rate-limited": "Muitas tentativas. Aguarde um minuto e tente de novo.",
  failed: "Não foi possível cancelar agora. Tente de novo em instantes.",
};

/**
 * Cancelar o "Avisar quando chegar" (ALR-FR-004): só no toque, nunca ao abrir o
 * link (o WhatsApp abre links para montar a prévia).
 */
export function CancelAlert({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  if (outcome)
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="status" data-testid="cancel-outcome" className="font-bold">
          {MESSAGES[outcome]}
        </p>
        <ButtonLink href="/" variant="ghost">
          Ver a vitrine
        </ButtonLink>
      </div>
    );
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-text-2">
        Você deixa de receber o aviso desta busca, e seu nome e celular são
        apagados.
      </p>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setOutcome(await cancelSearchAlertAction({ token }));
          setBusy(false);
        }}
      >
        {busy ? "Aguarde…" : "Cancelar aviso"}
      </Button>
    </div>
  );
}
