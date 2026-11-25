"use client";

import { useActionState, useState } from "react";
import {
  updateStoreByAdminAction,
  type StoreFormState,
} from "@/domains/stores/actions";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/text-field";

export type StoreEditValues = {
  name: string;
  whatsapp: string;
  city: string;
  state: string;
  about: string;
  instagram: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressDistrict: string;
  addressZip: string;
};

const FIELDS: [keyof StoreEditValues, string, number][] = [
  ["name", "Nome da loja", 80],
  ["whatsapp", "WhatsApp da loja", 20],
  ["city", "Cidade", 80],
  ["state", "UF", 2],
  ["addressStreet", "Rua", 120],
  ["addressNumber", "Número", 20],
  ["addressComplement", "Complemento", 80],
  ["addressDistrict", "Bairro", 80],
  ["addressZip", "CEP", 9],
  ["instagram", "Instagram", 60],
];

/**
 * **Editar dados da loja** no próprio detalhe [6g] (ADM-FR-010): recolhível, com as
 * validações de Minha loja no servidor; endereço do catálogo e dono não mudam aqui.
 */
export function StoreEditForm({
  storeId,
  values,
}: {
  storeId: string;
  values: StoreEditValues;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<StoreFormState, FormData>(
    updateStoreByAdminAction,
    null,
  );
  const errors = state?.errors ?? {};
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="group"
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-[15px] font-bold [&::-webkit-details-marker]:hidden">
        Editar dados da loja
        <span aria-hidden className="text-text-3 group-open:rotate-90">
          ›
        </span>
      </summary>
      <form action={action} className="flex flex-col gap-3 pt-1 pb-4">
        <input type="hidden" name="storeId" value={storeId} />
        <div className="grid gap-3 lg:grid-cols-2">
          {FIELDS.map(([key, label, max]) => (
            <TextField
              key={key}
              id={`store-edit-${key}`}
              name={key}
              label={label}
              defaultValue={values[key]}
              maxLength={max}
              error={errors[key]}
            />
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="store-edit-about"
            className="text-[13px] font-semibold"
          >
            Sobre a loja
          </label>
          <textarea
            id="store-edit-about"
            name="about"
            defaultValue={values.about}
            maxLength={600}
            rows={4}
            className="rounded-input border border-field bg-surface px-3 py-2.5 text-[15px]"
          />
          {errors.about && (
            <p className="text-sm text-caju-deep">{errors.about}</p>
          )}
        </div>
        {state?.message && (
          <p
            role={state.ok ? "status" : "alert"}
            className={state.ok ? "text-sm text-ok" : "text-sm text-caju-deep"}
          >
            {state.message}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </form>
    </details>
  );
}
