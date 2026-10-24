"use client";

import { useActionState } from "react";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/text-field";
import { updatePasswordAction, type NewPasswordState } from "../actions";

/** Nova senha [6b]: senha + confirmação, mínimo de 8 (AUT-FR-015). */
export function NewPasswordForm() {
  const [state, action, pending] = useActionState<NewPasswordState, FormData>(
    updatePasswordAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <TextField
        id="new-password"
        name="password"
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        autoFocus
        required
        minLength={8}
        maxLength={200}
        help="Pelo menos 8 caracteres."
        error={state?.errors.password}
      />
      <TextField
        id="new-password-confirmation"
        name="confirmation"
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        required
        maxLength={200}
        error={state?.errors.confirmation}
      />
      {state?.message && (
        <p role="alert" className="text-sm text-caju-deep">
          {state.message}
        </p>
      )}
      <Button type="submit" block disabled={pending}>
        {pending ? "Salvando…" : "Salvar e entrar"}
      </Button>
    </form>
  );
}
