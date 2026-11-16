"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/ui/button";
import { HoneypotField } from "@/ui/honeypot-field";
import { SelectField } from "@/ui/select-field";
import { TextField } from "@/ui/text-field";
import { registerSellerAction, type SellerSignupState } from "../actions";

const PIX_OPTIONS = [
  ["cpf", "CPF"],
  ["email", "E-mail"],
  ["phone", "Celular"],
  ["cnpj", "CNPJ"],
  ["random", "Chave aleatória"],
] as const;

const NEXT = encodeURIComponent("/rede/cadastro");

/**
 * Cadastro do vendedor [7a] (SEL-FR-001, 016): conta + dados do vendedor; conectado,
 * só CPF, cidade e Pix. Os campos ficam no estado para um erro não apagar o que foi
 * digitado. As fotos do documento vêm no passo seguinte, já conectado (D1).
 */
export function SellerSignupForm({ signedIn }: { signedIn: boolean }) {
  const [state, action, pending] = useActionState<SellerSignupState, FormData>(
    registerSellerAction,
    null,
  );
  const [v, setV] = useState<Record<string, string>>({ pixType: "cpf" });
  const [terms, setTerms] = useState(false);
  const field = (name: string) => ({
    id: `seller-${name}`,
    name,
    value: v[name] ?? "",
    onChange: (e: { target: { value: string } }) =>
      setV((x) => ({ ...x, [name]: e.target.value })),
    error: state?.errors[name],
  });

  if (state?.sent)
    return (
      <p role="status" className="rounded-card border border-line p-3">
        Cadastro enviado. A CajuGo vai analisar seus dados.
      </p>
    );

  return (
    <form action={action} className="relative flex flex-col gap-4" noValidate>
      <HoneypotField />
      {!signedIn && (
        <>
          <TextField
            {...field("name")}
            label="Nome completo"
            autoComplete="name"
            maxLength={80}
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
            {...field("phone")}
            label="Celular"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(79) 99999-9999"
          />
        </>
      )}
      <div className="flex flex-col gap-1">
        <TextField
          {...field("cpf")}
          label="CPF"
          inputMode="numeric"
          placeholder="000.000.000-00"
          maxLength={14}
        />
        {state?.errors.cpf === "CPF já cadastrado." && (
          <Link
            href={`/entrar?next=${encodeURIComponent("/rede")}`}
            className="flex min-h-11 items-center self-start text-sm font-bold text-caju-ink"
          >
            Entrar
          </Link>
        )}
      </div>
      <TextField
        {...field("city")}
        label="Cidade"
        autoComplete="address-level2"
        maxLength={60}
      />
      <SelectField
        {...field("pixType")}
        label="Tipo da chave Pix"
        options={PIX_OPTIONS}
      />
      <TextField
        {...field("pixKey")}
        label="Chave Pix"
        help="Para as lojas parceiras pagarem a sua comissão."
        maxLength={140}
      />
      {!signedIn && (
        <TextField
          {...field("password")}
          id="seller-password"
          label="Senha"
          type="password"
          autoComplete="new-password"
          maxLength={200}
          help="Pelo menos 8 caracteres."
        />
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
        {pending ? "Enviando…" : "Continuar"}
      </Button>
    </form>
  );
}
