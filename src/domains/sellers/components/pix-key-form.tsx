"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/ui/button";
import { SelectField } from "@/ui/select-field";
import { TextField } from "@/ui/text-field";
import { updatePixKeyAction } from "../actions";
import { PIX_TYPE_OPTIONS } from "../status";

/** Trocar a chave Pix [13c] (SEL-FR-014): conferida pelo tipo no servidor. */
export function PixKeyForm({
  current,
}: {
  current: { type: string; key: string } | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pixType, setType] = useState(current?.type ?? "cpf");
  const [pixKey, setKey] = useState(current?.key ?? "");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  if (!editing)
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate" data-testid="seller-pix">
          {current ? current.key : "Sem chave Pix"}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11"
          onClick={() => setEditing(true)}
        >
          Trocar
        </Button>
      </div>
    );

  return (
    <form
      className="flex flex-col gap-3"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await updatePixKeyAction({ pixType, pixKey });
        setBusy(false);
        if (r.ok) {
          setEditing(false);
          setErrors({});
          setMessage(null);
          return router.refresh();
        }
        setErrors(r.errors);
        setMessage(r.message ?? null);
      }}
    >
      <SelectField
        id="pix-type"
        name="pixType"
        label="Tipo da chave Pix"
        options={PIX_TYPE_OPTIONS}
        value={pixType}
        onChange={(e) => setType(e.target.value)}
        error={errors.pixType}
      />
      <TextField
        id="pix-key"
        name="pixKey"
        label="Chave Pix"
        maxLength={140}
        value={pixKey}
        onChange={(e) => setKey(e.target.value)}
        error={errors.pixKey}
      />
      {message && (
        <p role="alert" className="text-sm text-caju-deep">
          {message}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" type="button" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
