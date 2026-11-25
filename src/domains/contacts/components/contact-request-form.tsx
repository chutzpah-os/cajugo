"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { HONEYPOT_FIELD } from "@/platform/http/honeypot";
import { Button } from "@/ui/button";
import { HoneypotField } from "@/ui/honeypot-field";
import { TextField } from "@/ui/text-field";
import { requestContactAction } from "../actions";
import type { ContactTopic } from "../schemas";

/**
 * Pedido de contato público: a pessoa deixa o WhatsApp e a equipe chama. Nenhum número
 * da CajuGo aparece na tela; o pedido cai no admin [Contatos].
 */
export function ContactRequestForm({
  topic,
  submitLabel,
  doneTitle,
  doneText,
}: {
  topic: ContactTopic;
  submitLabel: string;
  doneTitle: string;
  doneText: string;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (done)
    return (
      <div
        role="status"
        data-testid="contact-done"
        className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4"
      >
        <p className="font-bold">{doneTitle}</p>
        <p className="text-sm text-text-2">{doneText}</p>
      </div>
    );

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const result = await requestContactAction({
      topic,
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      ...(topic === "password_help"
        ? { email: String(form.get("email") ?? "") }
        : {}),
      consent: form.get("consent") === "on",
      website: String(form.get(HONEYPOT_FIELD) ?? ""),
    });
    setBusy(false);
    if (result.ok) return setDone(true);
    setMessage(result.message);
    setErrors(
      Object.fromEntries(result.errors.map((x) => [x.field, x.message])),
    );
  }

  return (
    <form
      onSubmit={submit}
      aria-label={submitLabel}
      className="relative flex w-full flex-col gap-3"
      noValidate
    >
      <HoneypotField />
      <TextField
        id="contact-name"
        name="name"
        label="Nome"
        autoComplete="name"
        maxLength={80}
        error={errors.name}
      />
      {topic === "password_help" && (
        <TextField
          id="contact-email"
          name="email"
          label="E-mail da sua conta"
          type="email"
          autoComplete="email"
          maxLength={254}
          error={errors.email}
        />
      )}
      <TextField
        id="contact-phone"
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
          aria-describedby={
            errors.consent ? "contact-consent-error" : undefined
          }
        />
        <span>
          Aceito que a CajuGo fale comigo pelo WhatsApp. Meus dados ficam só com
          a CajuGo e são apagados depois do atendimento (
          <Link href="/termos#privacidade" className="underline">
            privacidade
          </Link>
          ).
        </span>
      </label>
      {errors.consent && (
        <p id="contact-consent-error" className="text-sm text-caju-deep">
          {errors.consent}
        </p>
      )}
      {message && !Object.keys(errors).length && (
        <p role="alert" className="text-sm text-caju-deep">
          {message}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Aguarde…" : submitLabel}
      </Button>
    </form>
  );
}
