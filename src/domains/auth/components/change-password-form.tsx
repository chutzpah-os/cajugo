"use client";

import { useActionState } from "react";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/text-field";
import { changePasswordAction, type ChangePasswordState } from "../actions";

/** Troca da própria senha (CFG-FR-010): atual, nova e confirmação. */
export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<
    ChangePasswordState,
    FormData
  >(changePasswordAction, null);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <TextField
        id="current-password"
        name="current"
        label="Senha atual"
        type="password"
        autoComplete="current-password"
        required
        maxLength={200}
        error={state?.errors.current}
      />
      <TextField
        id="change-password"
        name="password"
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={200}
        help="Pelo menos 8 caracteres."
        error={state?.errors.password}
      />
      <TextField
        id="change-password-confirmation"
        name="confirmation"
        label="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
        required
        maxLength={200}
        error={state?.errors.confirmation}
      />
      {state?.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={state.ok ? "text-sm text-ok" : "text-sm text-caju-deep"}
        >
          {state.message}
        </p>
      )}
      <Button type="submit" block disabled={pending}>
        {pending ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
