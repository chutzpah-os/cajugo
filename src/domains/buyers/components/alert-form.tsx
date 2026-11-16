"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { ListSource } from "@/domains/showcase/service";
import { HONEYPOT_FIELD } from "@/platform/http/honeypot";
import { Button } from "@/ui/button";
import { HoneypotField } from "@/ui/honeypot-field";
import { TextField } from "@/ui/text-field";
import { createSearchAlertAction } from "../actions";
import type { AlertRequestResult } from "../service";

type Done = Extract<AlertRequestResult, { ok: true }>;

/**
 * "Avisar quando chegar" na busca sem resultado [12a] (ALR-FR-001): nome, celular
 * com WhatsApp e consentimento. A página e a busca vão como estão na tela; o servidor
 * valida e normaliza (só vitrine e descoberta).
 */
export function AlertForm({
  source,
  query,
}: {
  source: ListSource;
  query: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (done)
    return (
      <div
        role="status"
        data-testid="alert-done"
        className="flex flex-col gap-1"
      >
        <p className="font-bold">
          {done.status === "created"
            ? "Vamos avisar quando chegar."
            : "Já estamos de olho nessa busca."}
        </p>
        <p className="text-sm text-text-2">
          Quando entrar um veículo assim, a CajuGo manda uma mensagem no seu
          WhatsApp.
        </p>
        {done.cancelPath && (
          <Link
            href={done.cancelPath}
            className="flex min-h-11 items-center text-sm font-semibold text-caju-deep underline"
          >
            Não quero mais este aviso
          </Link>
        )}
      </div>
    );

  if (!open)
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Avisar quando chegar
      </Button>
    );

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const result = await createSearchAlertAction({
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      consent: form.get("consent") === "on",
      source,
      query,
      website: String(form.get(HONEYPOT_FIELD) ?? ""),
    });
    setBusy(false);
    if (result.ok) return setDone(result);
    setMessage(result.message);
    setErrors(
      Object.fromEntries(result.errors.map((x) => [x.field, x.message])),
    );
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Avisar quando chegar"
      className="relative flex w-full flex-col gap-3"
      noValidate
    >
      <p className="text-sm text-text-2">
        Deixe seu WhatsApp: avisamos quando chegar um veículo com esta busca.
      </p>
      <HoneypotField />
      <TextField
        id="alert-name"
        name="name"
        label="Nome"
        autoComplete="name"
        maxLength={80}
        error={errors.name}
      />
      <TextField
        id="alert-phone"
        name="phone"
        label="Celular com WhatsApp"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(79) 99999-0000"
        error={errors.phone}
      />
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="consent"
          className="mt-1 size-5 accent-caju"
          aria-describedby={errors.consent ? "alert-consent-error" : undefined}
        />
        <span>
          Aceito receber o aviso pelo WhatsApp. Seus dados ficam só com a CajuGo
          e são apagados depois do aviso (
          <Link href="/termos#privacidade" className="underline">
            privacidade
          </Link>
          ).
        </span>
      </label>
      {errors.consent && (
        <p id="alert-consent-error" className="text-sm text-caju-deep">
          {errors.consent}
        </p>
      )}
      {message && !Object.keys(errors).length && (
        <p role="alert" className="text-sm text-caju-deep">
          {message}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Aguarde…" : "Avisar quando chegar"}
      </Button>
    </form>
  );
}
