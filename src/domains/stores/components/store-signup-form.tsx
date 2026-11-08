"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { AutocompleteField, type Suggestion } from "@/ui/autocomplete-field";
import { AvailabilityHint, type Availability } from "@/ui/availability-hint";
import { Button } from "@/ui/button";
import { HoneypotField } from "@/ui/honeypot-field";
import { TextField } from "@/ui/text-field";
import {
  checkCodeAction,
  checkSlugAction,
  registerStoreAction,
  searchCitiesAction,
  type CodeCheckView,
  type RegisterStoreState,
} from "../actions";
import { suggestSlug } from "../slug";

/** Atraso das checagens ao vivo enquanto a pessoa digita. */
const DEBOUNCE_MS = 400;

function useDebounced<T>(value: T, ms = DEBOUNCE_MS) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/**
 * Cadastro [5c] (STO-FR-003…007, 015): conta + loja num só formulário; conectado,
 * só os dados da loja. Endereço sugerido pelo nome e checado ao vivo; código de
 * indicação validado ao vivo (vem preenchido do link `/i/{codigo}`). Todos os campos
 * ficam no estado: o React limpa o formulário a cada envio, e um erro não pode
 * apagar o que a pessoa digitou.
 */
export function StoreSignupForm({
  signedIn,
  initialCode,
  appHost,
}: {
  signedIn: boolean;
  initialCode: string;
  appHost: string;
}) {
  const [state, action, pending] = useActionState<RegisterStoreState, FormData>(
    registerStoreAction,
    null,
  );
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [cityText, setCityText] = useState("");
  const [city, setCity] = useState<{ name: string; state: string } | null>(
    null,
  );
  const [cities, setCities] = useState<Suggestion[]>([]);
  const [whatsapp, setWhatsapp] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(initialCode);
  const [slugStatus, setSlugStatus] = useState<Availability>("idle");
  const [codeStatus, setCodeStatus] = useState<CodeCheckView>(null);

  const shownSlug = slugEdited ? slug : suggestSlug(storeName || "");
  const debouncedSlug = useDebounced(storeName || slugEdited ? shownSlug : "");
  const debouncedCity = useDebounced(cityText);
  const debouncedCode = useDebounced(code.trim());

  useEffect(() => {
    let alive = true;
    if (!debouncedSlug) return;
    checkSlugAction(debouncedSlug).then((r) => {
      if (alive) setSlugStatus(r ? r.status : "idle");
    });
    return () => {
      alive = false;
    };
  }, [debouncedSlug]);

  useEffect(() => {
    let alive = true;
    if (debouncedCity.length < 2 || city?.name === debouncedCity) return;
    searchCitiesAction(debouncedCity).then((list) => {
      if (alive)
        setCities(
          list.map((c) => ({ value: `${c.name}|${c.state}`, label: c.label })),
        );
    });
    return () => {
      alive = false;
    };
  }, [debouncedCity, city]);

  useEffect(() => {
    let alive = true;
    if (!debouncedCode) return;
    checkCodeAction({ code: debouncedCode, email, phone }).then((r) => {
      if (alive) setCodeStatus(r);
    });
    return () => {
      alive = false;
    };
  }, [debouncedCode, email, phone]);

  const err = (f: string) => state?.errors[f];
  const codeHelp = !code.trim()
    ? "Opcional: o código de quem indicou a CajuGo."
    : codeStatus?.status === "ok"
      ? `Indicação de ${codeStatus.referrerName} aplicada.`
      : undefined;
  const codeError =
    err("referralCode") ??
    (code.trim() && codeStatus?.status === "not-found"
      ? "Código não encontrado."
      : code.trim() && codeStatus?.status === "self-referral"
        ? "Não vale usar o próprio código."
        : undefined);

  return (
    <form action={action} className="relative flex flex-col gap-5" noValidate>
      <HoneypotField />
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-[17px] font-extrabold">Sua loja</legend>
        <TextField
          id="storeName"
          name="storeName"
          label="Nome da loja"
          maxLength={60}
          autoComplete="organization"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          error={err("storeName")}
        />
        <div>
          <AutocompleteField
            id="city"
            label="Cidade"
            value={cityText}
            suggestions={cities}
            placeholder="Comece a digitar"
            onQuery={(t) => {
              setCityText(t);
              setCity(null);
            }}
            onSelect={(s) => {
              const [name, uf] = s.value.split("|");
              setCity({ name, state: uf });
              setCityText(name);
              setCities([]);
            }}
            error={err("city")}
            help={city ? `${city.name}/${city.state}` : undefined}
          />
          <input type="hidden" name="city" value={city?.name ?? cityText} />
          <input type="hidden" name="state" value={city?.state ?? ""} />
        </div>
        <TextField
          id="whatsapp"
          name="whatsapp"
          label="WhatsApp da loja"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(79) 99999-9999"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          error={err("whatsapp")}
        />
        <div className="flex flex-col gap-1">
          <TextField
            id="slug"
            name="slug"
            label="Endereço do catálogo"
            prefix={`${appHost}/loja/`}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={40}
            value={shownSlug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(e.target.value.toLowerCase());
            }}
            aria-describedby="slug-status"
            error={err("slug")}
          />
          <AvailabilityHint
            id="slug-status"
            status={shownSlug ? slugStatus : "idle"}
          />
        </div>
      </fieldset>

      {!signedIn && (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-[17px] font-extrabold">
            Responsável
          </legend>
          <TextField
            id="name"
            name="name"
            label="Seu nome"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={err("name")}
          />
          <div className="flex flex-col gap-1">
            <TextField
              id="email"
              name="email"
              label="E-mail"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={err("email")}
            />
            {err("email")?.startsWith("Se você já tem conta") && (
              <Link
                href={`/entrar?next=${encodeURIComponent(`/lojistas/cadastro${code ? `?codigo=${code}` : ""}`)}`}
                className="flex min-h-11 items-center self-start text-sm font-bold text-caju-ink"
              >
                Entrar e continuar
              </Link>
            )}
          </div>
          <TextField
            id="phone"
            name="phone"
            label="Celular"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={err("phone")}
          />
          <TextField
            id="signup-password"
            name="password"
            label="Senha"
            type="password"
            autoComplete="new-password"
            maxLength={200}
            help="Pelo menos 8 caracteres."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={err("password")}
          />
        </fieldset>
      )}

      <TextField
        id="referralCode"
        name="referralCode"
        label="Código de indicação"
        autoCapitalize="characters"
        maxLength={20}
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase());
          setCodeStatus(null);
        }}
        help={codeHelp}
        error={codeError}
      />

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
            <Link
              href="/termos"
              target="_blank"
              className="font-bold text-caju-ink underline"
            >
              termos de uso e a política de privacidade
            </Link>
            .
          </span>
        </label>
        {err("terms") && (
          <p className="text-xs text-caju-deep">{err("terms")}</p>
        )}
      </div>

      {state?.message && (
        <p role="alert" className="text-sm text-caju-deep">
          {state.message}
        </p>
      )}
      <Button type="submit" block disabled={pending}>
        {pending ? "Criando sua loja…" : "Continuar para pagamento"}
      </Button>
    </form>
  );
}
