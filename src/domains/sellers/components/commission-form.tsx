"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { brl } from "@/platform/br/money";
import { Button } from "@/ui/button";
import { MoneyField, PercentField } from "@/ui/number-field";
import { SelectField } from "@/ui/select-field";
import { Toggle } from "@/ui/toggle";
import { setNetworkRulesAction } from "../actions";
import {
  commissionFor,
  commissionFromText,
  commissionToText,
  feeFor,
} from "../commission";

const EXAMPLE_CENTS = 6_000_000;
const TYPES = [
  ["pct", "% do preço"],
  ["fixed", "Valor fixo"],
] as const;

/**
 * "Aceitar vendedores" e comissão padrão [7e] (RCL-FR-001, 002): a prévia num carro de
 * R$ 60.000 usa a mesma conta do servidor; quem grava e confere os limites é o servidor.
 */
export function CommissionForm({
  acceptsSellers,
  commission,
  feeBps,
}: {
  acceptsSellers: boolean;
  commission: { type: "pct" | "fixed"; value: number } | null;
  feeBps: number;
}) {
  const router = useRouter();
  const [accepts, setAccepts] = useState(acceptsSellers);
  const [type, setType] = useState<"pct" | "fixed">(commission?.type ?? "pct");
  const [text, setText] = useState(
    commission ? commissionToText(commission.type, commission.value) : "",
  );
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const value = commissionFromText(type, text);
  const preview = Number.isFinite(value)
    ? commissionFor({ type, value }, EXAMPLE_CENTS)
    : null;

  return (
    <form
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setSaved(false);
        const r = await setNetworkRulesAction({
          acceptsSellers: accepts,
          commissionType: text.trim() ? type : null,
          commissionValue: text.trim() ? value : null,
        });
        setBusy(false);
        if (r.ok) {
          setErrors({});
          setSaved(true);
          return router.refresh();
        }
        setErrors(
          r.errors.commissionValue || !r.message
            ? r.errors
            : { form: r.message },
        );
      }}
    >
      <Toggle
        title="Aceitar vendedores independentes"
        caption={
          accepts
            ? "Vendedores da Rede Caju podem pedir parceria"
            : "Pedidos novos ficam bloqueados e as parcerias, suspensas"
        }
        checked={accepts}
        onChange={(e) => setAccepts(e.target.checked)}
      />
      <SelectField
        id="commission-type"
        label="Tipo de comissão"
        options={TYPES}
        value={type}
        onChange={(e) => setType(e.target.value as "pct" | "fixed")}
      />
      {type === "pct" ? (
        <PercentField
          id="commission-value"
          label="Comissão padrão"
          value={text}
          onChange={(e) => setText(e.target.value)}
          help="Até 10%."
          error={errors.commissionValue}
        />
      ) : (
        <MoneyField
          id="commission-value"
          label="Comissão padrão"
          value={text}
          onChange={(e) => setText(e.target.value)}
          help="Até R$ 10.000."
          error={errors.commissionValue}
        />
      )}
      <div
        data-testid="commission-preview"
        className="flex flex-col gap-1 rounded-input bg-neutral-soft p-3 text-sm"
      >
        <span className="font-bold">Num carro de {brl(EXAMPLE_CENTS)}</span>
        <span>
          Comissão do vendedor: {preview !== null ? brl(preview) : "—"}
        </span>
        <span>
          Taxa CajuGo ({(feeBps / 100).toLocaleString("pt-BR")}%):{" "}
          {brl(feeFor(EXAMPLE_CENTS, feeBps))}
        </span>
      </div>
      <p className="text-xs text-text-3">
        A taxa CajuGo só vale para carro vendido via vendedor e entra na sua
        próxima fatura. A comissão você paga direto ao vendedor, por Pix.
      </p>
      {errors.form && (
        <p role="alert" className="text-sm text-caju-deep">
          {errors.form}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-ok">
          Salvo.
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
