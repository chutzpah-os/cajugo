"use client";

import { useActionState, useEffect, useState } from "react";
import { AutocompleteField, type Suggestion } from "@/ui/autocomplete-field";
import { AvailabilityHint, type Availability } from "@/ui/availability-hint";
import { Button } from "@/ui/button";
import { CopyLine } from "@/ui/copy-line";
import { TextField } from "@/ui/text-field";
import {
  checkSlugAction,
  createStoreByAdminAction,
  searchCitiesAction,
  type NewStoreState,
} from "../actions";
import { suggestSlug } from "../slug";

function useDebounced<T>(value: T, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/**
 * **Nova loja** dentro de Lojas [1d] (ADM-FR-005): loja e dono num formulário; a
 * loja nasce cadastrada e a senha temporária aparece uma vez, com **Copiar**.
 * Os campos ficam no estado, para um erro não apagar o que foi digitado.
 */
export function NewStoreForm({ appHost }: { appHost: string }) {
  const [state, action, pending] = useActionState<NewStoreState, FormData>(
    createStoreByAdminAction,
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
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [slugStatus, setSlugStatus] = useState<Availability>("idle");

  const shownSlug = slugEdited ? slug : suggestSlug(storeName || "");
  const debouncedSlug = useDebounced(storeName || slugEdited ? shownSlug : "");
  const debouncedCity = useDebounced(cityText);

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

  if (state?.ok)
    return (
      <div
        data-testid="new-store-done"
        className="flex flex-col gap-3 rounded-card border border-ok bg-ok-soft p-4"
      >
        <p className="text-[15px] font-extrabold">
          {state.storeName} cadastrada
        </p>
        <p className="text-sm text-text-2">
          Passe o e-mail e a senha temporária ao dono pelo WhatsApp. A senha
          vale 24 horas, aparece só agora e o dono cria a própria no primeiro
          acesso. A loja fica no ar depois do 1º pagamento.
        </p>
        <CopyLine label="E-mail do dono" value={state.email} />
        <CopyLine label="Senha temporária" value={state.temporaryPassword} />
      </div>
    );

  const err = (f: string) => (state && !state.ok ? state.errors[f] : undefined);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-[15px] font-extrabold">Loja</legend>
        <TextField
          id="new-storeName"
          name="storeName"
          label="Nome da loja"
          maxLength={60}
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          error={err("storeName")}
        />
        <div>
          <AutocompleteField
            id="new-city"
            label="Cidade"
            value={cityText}
            suggestions={cities}
            placeholder="Comece a digitar"
            onQuery={(t) => {
              setCityText(t);
              setCity(null);
            }}
            onSelect={(s) => {
              const [n, uf] = s.value.split("|");
              setCity({ name: n, state: uf });
              setCityText(n);
              setCities([]);
            }}
            error={err("city")}
            help={city ? `${city.name}/${city.state}` : undefined}
          />
          <input type="hidden" name="city" value={city?.name ?? cityText} />
          <input type="hidden" name="state" value={city?.state ?? ""} />
        </div>
        <TextField
          id="new-whatsapp"
          name="whatsapp"
          label="WhatsApp da loja"
          type="tel"
          inputMode="tel"
          placeholder="(79) 99999-9999"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          error={err("whatsapp")}
        />
        <div className="flex flex-col gap-1">
          <TextField
            id="new-slug"
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
            aria-describedby="new-slug-status"
            error={err("slug")}
          />
          <AvailabilityHint
            id="new-slug-status"
            status={shownSlug ? slugStatus : "idle"}
          />
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-[15px] font-extrabold">Dono</legend>
        <TextField
          id="new-name"
          name="name"
          label="Nome do dono"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={err("name")}
        />
        <TextField
          id="new-email"
          name="email"
          label="E-mail do dono"
          type="email"
          inputMode="email"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={err("email")}
        />
        <TextField
          id="new-phone"
          name="phone"
          label="Celular do dono (opcional)"
          type="tel"
          inputMode="tel"
          placeholder="(79) 99999-9999"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={err("phone")}
        />
      </fieldset>
      {state && !state.ok && state.message && (
        <p role="alert" className="text-sm text-caju-deep">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="dark" block disabled={pending}>
        {pending ? "Criando…" : "Criar loja"}
      </Button>
    </form>
  );
}
