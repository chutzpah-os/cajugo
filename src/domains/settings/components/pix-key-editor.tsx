"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/text-field";
import { savePixAction, type SavePixState } from "../actions";

const TYPES = [
  ["cpf", "CPF"],
  ["cnpj", "CNPJ"],
  ["email", "E-mail"],
  ["phone", "Celular"],
  ["random", "Chave aleatória"],
] as const;

/**
 * Chave Pix da CajuGo [4c]: mostra a atual (mascarada) e, para o admin, a troca em
 * 2 passos: nova chave → revisão lado a lado + senha (CFG-FR-008, CFG-SEC-005).
 * Um formulário só: o rascunho vai em campos ocultos ligados ao estado. O React
 * reinicia o formulário depois de cada envio, e o reinício apagaria o tipo escolhido
 * num campo visível (voltaria a "CPF"); campo oculto mantém o valor.
 */
export function PixKeyEditor({
  current,
  canEdit,
}: {
  current: { masked: string; beneficiary: string } | null;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState<SavePixState, FormData>(
    savePixAction,
    null,
  );
  const [step, setStep] = useState<"view" | "edit" | "review">("view");
  const [draft, setDraft] = useState({ type: "cpf", key: "", beneficiary: "" });

  // A cada resposta nova: erro na chave volta ao passo 1; erro de senha fica no
  // passo 2; sucesso fecha. (Ajuste durante a renderização, sem efeito.)
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) setStep("view");
    else if (
      state?.errors.key ||
      state?.errors.type ||
      state?.errors.beneficiary
    )
      setStep("edit");
  }

  const typeLabel = TYPES.find(([t]) => t === draft.type)?.[1];

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <h2 className="text-[17px] font-extrabold">Chave Pix da CajuGo</h2>
      {current ? (
        <p className="text-sm text-text-2">
          <strong className="font-mono text-ink">{current.masked}</strong>
          {" · "}
          {current.beneficiary}
        </p>
      ) : (
        <p className="text-sm font-semibold text-caju-deep">Não configurada</p>
      )}
      <Link
        href="/admin/conta/historico/pix"
        className="flex min-h-11 items-center self-start text-sm font-semibold text-caju-ink"
      >
        Histórico da chave Pix
      </Link>
      {state?.ok && (
        <p role="status" className="text-sm text-ok">
          {state.message}
        </p>
      )}

      {canEdit && step === "view" && (
        <Button
          variant="outline"
          className="self-start"
          onClick={() => setStep("edit")}
        >
          {current ? "Trocar chave Pix" : "Configurar chave Pix"}
        </Button>
      )}

      {canEdit && step !== "view" && (
        <form action={action} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="type" value={draft.type} />
          <input type="hidden" name="key" value={draft.key} />
          <input type="hidden" name="beneficiary" value={draft.beneficiary} />
          <div className={step === "edit" ? "flex flex-col gap-4" : "hidden"}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pix-type" className="text-[13px] font-semibold">
                Tipo da chave
              </label>
              <select
                id="pix-type"
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                className="h-[50px] rounded-input border border-field bg-surface px-3 text-[15px]"
              >
                {TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <TextField
              id="pix-key"
              label="Nova chave Pix"
              autoComplete="off"
              value={draft.key}
              onChange={(e) => setDraft({ ...draft, key: e.target.value })}
              error={state?.errors.key ?? state?.errors.type}
            />
            <TextField
              id="pix-beneficiary"
              label="Favorecido"
              autoComplete="off"
              value={draft.beneficiary}
              onChange={(e) =>
                setDraft({ ...draft, beneficiary: e.target.value })
              }
              error={state?.errors.beneficiary}
            />
            <div className="flex gap-2">
              <Button
                disabled={!draft.key.trim() || !draft.beneficiary.trim()}
                onClick={() => setStep("review")}
              >
                Revisar
              </Button>
              <Button variant="ghost" onClick={() => setStep("view")}>
                Cancelar
              </Button>
            </div>
          </div>

          {step === "review" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-input bg-bg p-3">
                  <p className="text-xs text-text-3">Atual</p>
                  <p className="font-mono break-all text-ink">
                    {current?.masked ?? "Não configurada"}
                  </p>
                  {current && (
                    <p className="text-text-2">{current.beneficiary}</p>
                  )}
                </div>
                <div className="rounded-input bg-caju-tint p-3">
                  <p className="text-xs text-text-3">Nova ({typeLabel})</p>
                  <p className="font-mono break-all text-ink">{draft.key}</p>
                  <p className="text-text-2">{draft.beneficiary}</p>
                </div>
              </div>
              <p className="text-sm text-text-2">
                Todo lojista passa a pagar nesta chave. Para confirmar, digite a
                sua senha.
              </p>
              <TextField
                id="pix-password"
                name="password"
                label="Sua senha"
                type="password"
                autoComplete="current-password"
                error={state?.errors.password}
              />
              {state && !state.ok && state.message && (
                <p role="alert" className="text-sm text-caju-deep">
                  {state.message}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Salvando…" : "Confirmar troca"}
                </Button>
                <Button variant="ghost" onClick={() => setStep("view")}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
