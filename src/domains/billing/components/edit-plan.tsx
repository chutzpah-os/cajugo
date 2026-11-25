"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "@/ui/button";
import { ConfirmSheet } from "@/ui/confirm-sheet";
import { MoneyField } from "@/ui/number-field";
import { TextField } from "@/ui/text-field";
import { editPlanAction, type EditPlanResult } from "../actions";

/**
 * **Editar plano** [4b] (CAN-FR-011): valor e data (pelo menos 30 dias à frente); depois
 * de salvar, a lista de `wa.me` para avisar cada loja. Só o admin.
 */
export function EditPlanButton({ earliest }: { earliest: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [validFrom, setValidFrom] = useState(earliest);
  const [result, setResult] = useState<EditPlanResult | null>(null);
  const errors = result && !result.ok ? result.errors : {};

  return (
    <>
      <button
        type="button"
        className="flex min-h-11 flex-none items-center text-sm font-bold text-caju-ink"
        data-testid="edit-plan"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
      >
        Editar plano
      </button>
      <ConfirmSheet
        open={open}
        title="Editar plano"
        confirmLabel="Salvar"
        confirmVariant="dark"
        busy={busy}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          setBusy(true);
          const r = await editPlanAction({ amount, validFrom });
          setBusy(false);
          setResult(r);
          if (r.ok) {
            setOpen(false);
            router.refresh();
          }
        }}
        extra={
          <>
            <MoneyField
              id="plan-amount"
              name="amount"
              label="Nova mensalidade"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={errors.membershipCents}
            />
            <TextField
              id="plan-valid-from"
              name="validFrom"
              type="date"
              label="Vale a partir de"
              min={earliest}
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              error={errors.validFrom}
            />
            {result && !result.ok && result.message && (
              <p role="alert" className="text-sm text-caju-deep">
                {result.message}
              </p>
            )}
          </>
        }
      >
        Vale para todas as lojas, nas faturas abertas a partir da data. Os
        lojistas veem o aviso no painel.
      </ConfirmSheet>
      {result?.ok && (
        <section
          aria-labelledby="avisar-lojas"
          className="flex flex-col gap-2"
          data-testid="plan-notify"
        >
          <h3 id="avisar-lojas" className="font-bold">
            Avisar as lojas no WhatsApp ({result.stores.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {result.stores.map((s) => (
              <li key={s.storeId} className="flex flex-col gap-1">
                <span className="text-sm">{s.name}</span>
                <ButtonLink href={s.whatsappUrl} variant="whatsapp" block>
                  Avisar {s.name}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
