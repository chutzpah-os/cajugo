"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/text-field";
import {
  findAccountAction,
  setTemporaryPasswordAction,
  type AccountSearchState,
  type TemporaryPasswordState,
} from "../actions";
import { PANEL_LABEL } from "../labels";
import type { AccountSummary } from "../service";

/** Gera a senha e a mostra uma única vez (AUT-FR-014, AUT-SEC-003). */
function SetPassword({ account }: { account: AccountSummary }) {
  const [state, action, pending] = useActionState<
    TemporaryPasswordState,
    FormData
  >(setTemporaryPasswordAction, null);
  const [copied, setCopied] = useState(false);

  if (state?.password)
    return (
      <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
        <p className="text-sm font-semibold">
          Senha temporária de {account.email}
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-input bg-bg px-3 py-3 font-mono text-[17px] tracking-wider">
            {state.password}
          </code>
          <Button
            variant="dark"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(state.password!);
              setCopied(true);
            }}
          >
            {copied ? "Copiada" : "Copiar"}
          </Button>
        </div>
        <p className="text-xs text-text-3">
          Aparece só agora e vale por 24 horas. Envie ao titular da conta; no
          primeiro acesso ele cria a própria senha.
        </p>
      </div>
    );

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={account.id} />
      {state?.message && (
        <p role="alert" className="text-sm text-caju-deep">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Gerando…" : "Definir senha temporária"}
      </Button>
    </form>
  );
}

/** Tela "Senha temporária" do admin: busca por e-mail + definir senha. */
export function TemporaryPasswordTool({ canSet }: { canSet: boolean }) {
  const [state, action, pending] = useActionState<AccountSearchState, FormData>(
    findAccountAction,
    null,
  );

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-3" noValidate>
        <TextField
          id="account-email"
          name="email"
          label="E-mail da conta"
          type="email"
          autoComplete="off"
          required
          maxLength={254}
        />
        <Button
          type="submit"
          variant="outline"
          disabled={pending}
          className="self-start"
        >
          {pending ? "Buscando…" : "Buscar"}
        </Button>
      </form>

      {state?.message && (
        <p role="alert" className="text-sm text-caju-deep">
          {state.message}
        </p>
      )}
      {state && !state.message && !state.account && (
        <p className="text-sm text-text-2">Nenhuma conta com esse e-mail.</p>
      )}
      {state?.account && (
        <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
          <div>
            <p className="text-[15px] font-bold">{state.account.name}</p>
            <p className="text-sm text-text-2">{state.account.email}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {state.account.roles.map((r) => (
              <Badge key={r} tone="neutral">
                {PANEL_LABEL[r]}
              </Badge>
            ))}
          </div>
          {canSet && (
            <SetPassword key={state.account.id} account={state.account} />
          )}
        </section>
      )}
    </div>
  );
}
