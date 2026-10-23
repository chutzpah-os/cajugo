"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/text-field";
import { signInAction, type SignInState } from "../actions";

/** Formulário do login [9f]: só e-mail e senha no MVP. */
export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signInAction,
    null,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <TextField
        id="email"
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        autoFocus
        required
        maxLength={254}
        defaultValue={state?.email}
      />
      <div className="flex flex-col gap-1.5">
        <div className="relative">
          <TextField
            id="password"
            name="password"
            label="Senha"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            maxLength={200}
            className="pr-20"
            error={state?.message}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-controls="password"
            aria-pressed={showPassword}
            className="absolute top-[26px] right-1 flex h-[44px] min-w-[44px] items-center justify-center px-3 text-sm font-semibold text-text-2"
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <Link
          href="/recuperar"
          className="flex min-h-[44px] items-center self-end text-sm font-semibold text-caju-ink"
        >
          Esqueci minha senha
        </Link>
      </div>
      <Button type="submit" block disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
