"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { brl } from "@/platform/br/money";
import { Button } from "@/ui/button";
import { MoneyField, PercentField } from "@/ui/number-field";
import { SelectField } from "@/ui/select-field";
import { setCommissionOverrideAction } from "../actions";
import { commissionFromText } from "../commission";

const TYPES = [
  ["pct", "% do preço"],
  ["fixed", "Valor fixo"],
] as const;

const label = (o: { type: "pct" | "fixed"; value: number }) =>
  o.type === "pct"
    ? `${(o.value / 100).toLocaleString("pt-BR")}%`
    : brl(o.value);

/** Ajuste da comissão por veículo [7e] (RCL-FR-003): vale no lugar da padrão. */
export function VehicleOverrides({
  overrides,
  vehicles,
}: {
  overrides: {
    vehicleId: string;
    title: string;
    type: "pct" | "fixed";
    value: number;
  }[];
  vehicles: { vehicleId: string; title: string }[];
}) {
  const router = useRouter();
  const [vehicleId, setVehicle] = useState("");
  const [type, setType] = useState<"pct" | "fixed">("fixed");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (input: {
    vehicleId: string;
    type: "pct" | "fixed" | null;
    value: number | null;
  }) => {
    setBusy(true);
    const r = await setCommissionOverrideAction(input);
    setBusy(false);
    if (!r.ok)
      return setError(
        r.errors.value ?? r.message ?? "Não foi possível salvar.",
      );
    setError(null);
    setText("");
    setVehicle("");
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <h2 className="text-[17px] font-extrabold">Ajuste por veículo</h2>
      {overrides.length ? (
        <ul className="flex flex-col gap-2">
          {overrides.map((o) => (
            <li
              key={o.vehicleId}
              data-testid="commission-override"
              className="flex min-h-11 items-center justify-between gap-2"
            >
              <span className="min-w-0 truncate">
                {o.title} · <strong>{label(o)}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11"
                disabled={busy}
                onClick={() =>
                  save({ vehicleId: o.vehicleId, type: null, value: null })
                }
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-2">
          Nenhum ajuste: todos os carros usam a comissão padrão.
        </p>
      )}
      <SelectField
        id="override-vehicle"
        label="Veículo"
        placeholder="Escolha o veículo"
        options={vehicles.map((v) => [v.vehicleId, v.title] as const)}
        value={vehicleId}
        onChange={(e) => setVehicle(e.target.value)}
      />
      <SelectField
        id="override-type"
        label="Tipo"
        options={TYPES}
        value={type}
        onChange={(e) => setType(e.target.value as "pct" | "fixed")}
      />
      {type === "pct" ? (
        <PercentField
          id="override-value"
          label="Comissão deste veículo"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      ) : (
        <MoneyField
          id="override-value"
          label="Comissão deste veículo"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-caju-deep">
          {error}
        </p>
      )}
      <Button
        variant="outline"
        disabled={busy || !vehicleId || !text.trim()}
        onClick={() =>
          save({ vehicleId, type, value: commissionFromText(type, text) })
        }
      >
        Adicionar ajuste
      </Button>
    </section>
  );
}
