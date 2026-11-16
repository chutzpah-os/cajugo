"use client";

import { uuidv7 } from "@/platform/db/uuid";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { HONEYPOT_FIELD } from "@/platform/http/honeypot";
import { Button } from "@/ui/button";
import { HoneypotField } from "@/ui/honeypot-field";
import { TextAreaField } from "@/ui/textarea-field";
import { TextField } from "@/ui/text-field";
import { contactLeadAction } from "../actions";
import { browserStorage } from "@/platform/browser/marks";
import { leadOrigin } from "../device";
import type { LeadVehicle } from "../status";

const DEFAULT_MESSAGE =
  "Olá, tenho interesse no veículo. Por favor entre em contato.";

/**
 * "Envie uma mensagem à loja" em [1b] (LED-FR-001, 002, LED-SEC-004). A origem vem da
 * marca da aba (D1); o servidor descobre a loja pelo veículo.
 */
export function ContactForm({ vehicleId, storeSlug, shared }: LeadVehicle) {
  // Chave deste envio (API.md §2.6): repetir o mesmo envio não duplica o lead.
  const [requestId] = useState(() => uuidv7());
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (sent)
    return (
      <p
        role="status"
        data-testid="lead-sent"
        className="rounded-card border border-line p-3 font-semibold"
      >
        Mensagem enviada. A loja vai responder em breve.
      </p>
    );

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const result = await contactLeadAction({
      requestId,
      vehicleId,
      origin: leadOrigin(browserStorage("session"), storeSlug, shared),
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      message,
      website: String(form.get(HONEYPOT_FIELD) ?? ""),
    });
    setBusy(false);
    if (result.ok) return setSent(true);
    setNotice(result.message);
    setErrors(
      Object.fromEntries(result.errors.map((x) => [x.field, x.message])),
    );
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Envie uma mensagem à loja"
      className="relative flex flex-col gap-3 rounded-card border border-line p-3"
      noValidate
    >
      <h2 className="text-[17px] font-extrabold">Envie uma mensagem à loja</h2>
      <HoneypotField />
      <TextField
        id="lead-name"
        name="name"
        label="Nome"
        autoComplete="name"
        maxLength={80}
        error={errors.name}
      />
      <TextField
        id="lead-email"
        name="email"
        label="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        maxLength={254}
        error={errors.email}
      />
      <TextField
        id="lead-phone"
        name="phone"
        label="Telefone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(79) 99999-0000"
        error={errors.phone}
      />
      <TextAreaField
        id="lead-message"
        name="message"
        label="Mensagem"
        max={1000}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        error={errors.message}
      />
      <p className="text-xs text-text-3">
        Seus dados vão só para esta loja.{" "}
        <Link href="/termos#privacidade" className="underline">
          Privacidade
        </Link>
      </p>
      {notice && !Object.keys(errors).length && (
        <p role="alert" className="text-sm text-caju-deep">
          {notice}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Enviando…" : "Enviar mensagem"}
      </Button>
    </form>
  );
}
