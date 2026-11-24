"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { Button } from "@/ui/button";
import { HoneypotField } from "@/ui/honeypot-field";
import { TextField } from "@/ui/text-field";
import { registerReferrerAction, type ReferrerSignupState } from "../actions";

const NEXT = encodeURIComponent("/indica/cadastro");

/** Cadastro rápido do indicador [9b] (IND-FR-004); conectado, só o aceite. */
export function ReferrerSignupForm({ signedIn }: { signedIn: boolean }) {
  const [state, action, pending] = useActionState<
    ReferrerSignupState,
    FormData
  >(registerReferrerAction, null);
  const [v, setV] = useState<Record<string, string>>({});
  const [terms, setTerms] = useState(false);
  const field = (name: string) => ({
    id: `referrer-${name}`,
    name,
    value: v[name] ?? "",
    onChange: (e: { target: { value: string } }) =>
      setV((x) => ({ ...x, [name]: e.target.value })),
    error: state?.errors[name],
  });

  if (state?.sent)
    return (
      <p role="status" className="rounded-card border border-line p-3">
        Cadastro enviado.
      </p>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="relative flex flex-col gap-4"
      noValidate
    >
      <HoneypotField />
      {!signedIn && (
        <>
          <TextField
            {...field("name")}
            label="Nome"
            autoComplete="name"
            maxLength={80}
          />
          <TextField
            {...field("phone")}
            label="Celular"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(79) 99999-9999"
          />
          <div className="flex flex-col gap-1">
            <TextField
              {...field("email")}
              label="E-mail"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
            />
            {state?.errors.email?.startsWith("Se você já tem conta") && (
              <Link
                href={`/entrar?next=${NEXT}`}
                className="flex min-h-11 items-center self-start text-sm font-bold text-caju-ink"
              >
                Entrar e continuar
              </Link>
            )}
          </div>
          <TextField
            {...field("password")}
            label="Senha"
            type="password"
            autoComplete="new-password"
            maxLength={200}
            help="Pelo menos 8 caracteres."
          />
        </>
      )}
      <div className="flex flex-col gap-1">
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="terms"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-1 size-5 accent-caju"
          />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" className="font-bold underline">
              termos de uso e a política de privacidade
            </Link>
            .
          </span>
        </label>
        {state?.errors.terms && (
          <p className="text-xs text-caju-deep">{state.errors.terms}</p>
        )}
      </div>
      {state?.message && (
        <p role="alert" className="text-sm text-caju-deep">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Criar minha conta"}
      </Button>
    </form>
  );
}
