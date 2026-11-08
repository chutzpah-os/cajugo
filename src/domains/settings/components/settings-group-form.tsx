"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { Button } from "@/ui/button";
import { MoneyField, PercentField } from "@/ui/number-field";
import { TextField } from "@/ui/text-field";
import { Toggle } from "@/ui/toggle";
import { saveSettingsAction, type SaveSettingsState } from "../actions";
import type { SettingGroup, SettingInput } from "../definitions";

export type SettingFieldView = {
  key: string;
  label: string;
  input: SettingInput;
  value: string | boolean | Record<string, boolean>;
};

const WHO_LABELS = {
  store_owner: "Lojistas",
  seller: "Vendedores",
  referrer: "Indicadores",
} as const;

/** Um grupo de regras com o próprio "Salvar" (CFG-FR-001/002); sem `canEdit`, só leitura (CFG-SEC-001). */
export function SettingsGroupForm({
  group,
  title,
  fields,
  canEdit,
  children,
}: {
  group: SettingGroup;
  title: string;
  fields: SettingFieldView[];
  canEdit: boolean;
  /** Informações só de leitura no topo do grupo (ex.: nome e domínio da vitrine). */
  children?: ReactNode;
}) {
  const [state, action, pending] = useActionState<SaveSettingsState, FormData>(
    saveSettingsAction,
    null,
  );
  const error = (key: string) => state?.errors[key];

  return (
    <form
      action={action}
      aria-labelledby={`group-${group}`}
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4"
      noValidate
    >
      <input type="hidden" name="group" value={group} />
      <h2 id={`group-${group}`} className="text-[17px] font-extrabold">
        {title}
      </h2>
      {children}
      {fields.map((f) => {
        const common = {
          id: `setting-${f.key}`,
          name: f.key,
          label: f.label,
          disabled: !canEdit,
          error: error(f.key),
          defaultValue: state?.typed?.[f.key] ?? (f.value as string),
        };
        switch (f.input) {
          case "percent":
            return <PercentField key={f.key} {...common} />;
          case "money":
            return <MoneyField key={f.key} {...common} />;
          case "int":
            return <TextField key={f.key} inputMode="numeric" {...common} />;
          case "phone":
            return (
              <TextField
                key={f.key}
                inputMode="tel"
                help="Com DDI e DDD, só números (ex.: 5579981360206)."
                {...common}
              />
            );
          case "bool":
            return (
              <Toggle
                key={f.key}
                name={f.key}
                title={f.label}
                disabled={!canEdit}
                defaultChecked={f.value as boolean}
              />
            );
          case "who":
            return (
              <fieldset key={f.key} className="flex flex-col gap-1">
                <legend className="text-[13px] font-semibold">{f.label}</legend>
                {Object.entries(WHO_LABELS).map(([role, label]) => (
                  <Toggle
                    key={role}
                    name={`${f.key}.${role}`}
                    title={label}
                    disabled={!canEdit}
                    defaultChecked={(f.value as Record<string, boolean>)[role]}
                  />
                ))}
              </fieldset>
            );
          default:
            return null;
        }
      })}
      <ul className="flex flex-wrap gap-x-4 text-sm">
        {fields.map((f) => (
          <li key={f.key}>
            <Link
              href={`/admin/conta/historico/${f.key}`}
              className="flex min-h-11 items-center font-semibold text-caju-ink"
            >
              Histórico: {f.label.replace(/ \(.*\)$/, "")}
            </Link>
          </li>
        ))}
      </ul>
      {state?.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={state.ok ? "text-sm text-ok" : "text-sm text-caju-deep"}
        >
          {state.message}
        </p>
      )}
      {canEdit && (
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      )}
    </form>
  );
}
