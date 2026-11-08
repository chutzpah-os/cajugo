"use client";

import { useActionState, useState } from "react";
import { Button, ButtonLink } from "@/ui/button";
import { TextField } from "@/ui/text-field";
import { startCheckoutAction, type FormState } from "../actions";

/**
 * Forma de pagamento e CPF/CNPJ de [5d] (PIX-FR-002, PIX-FR-004). Sem chave Pix
 * configurada, avisa e oferece o WhatsApp da CajuGo; o botão fica desabilitado.
 */
export function CheckoutForm({
  amountLabel,
  maskedTaxId,
  pixReady,
  supportUrl,
}: {
  amountLabel: string;
  maskedTaxId: string | null;
  pixReady: boolean;
  supportUrl: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    startCheckoutAction,
    null,
  );
  const [taxId, setTaxId] = useState("");

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-extrabold">Forma de pagamento</h2>
        <p className="flex min-h-11 items-center gap-3 rounded-card border-[1.5px] border-ink bg-surface px-4 font-bold">
          <span aria-hidden>◉</span> Pix
        </p>
      </section>

      <TextField
        id="taxId"
        name="taxId"
        label="CPF ou CNPJ para a nota fiscal"
        inputMode="numeric"
        autoComplete="off"
        maxLength={18}
        placeholder={maskedTaxId ?? "000.000.000-00"}
        help={
          maskedTaxId
            ? `Informado: ${maskedTaxId}. Confirme para continuar.`
            : undefined
        }
        value={taxId}
        onChange={(e) => setTaxId(e.target.value)}
        error={state?.errors.taxId}
      />

      {!pixReady && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-card bg-warn-soft p-4 text-sm text-warn"
        >
          <p className="font-bold">
            O pagamento está indisponível no momento. Fale com a CajuGo.
          </p>
          <ButtonLink
            variant="whatsapp"
            size="sm"
            href={supportUrl}
            target="_blank"
            rel="noopener"
            className="self-start"
          >
            Falar no WhatsApp
          </ButtonLink>
        </div>
      )}
      {state?.message && (
        <p role="alert" className="text-sm text-caju-deep">
          {state.message}
        </p>
      )}
      <div className="sticky bottom-0 -mx-4 border-t border-line bg-bg px-4 py-3">
        <Button
          type="submit"
          block
          disabled={!pixReady || pending || !taxId.trim()}
        >
          {pending ? "Continuando…" : `Pagar com Pix · ${amountLabel}`}
        </Button>
      </div>
    </form>
  );
}
