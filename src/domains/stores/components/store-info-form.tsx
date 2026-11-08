"use client";

import { useActionState, useState } from "react";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/text-field";
import { Toggle } from "@/ui/toggle";
import { updateStoreAction, type StoreFormState } from "../actions";
import { WEEK, type Weekday } from "../hours";
import type { DayForm } from "../hours-form";

const DAY_LABEL: Record<Weekday, string> = {
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
  sun: "Domingo",
};

export type StoreInfoInitial = {
  name: string;
  about: string;
  whatsapp: string;
  instagram: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressDistrict: string;
  addressZip: string;
  cityLabel: string;
  hours: Record<Weekday, DayForm>;
  shareByDefault: boolean;
};

/**
 * Minha loja [3b]: informações públicas, endereço, horário e preferência de divulgar
 * (STO-FR-008, 009, 012). Campos no estado: o React limpa o formulário a cada envio.
 */
export function StoreInfoForm({ initial }: { initial: StoreInfoInitial }) {
  const [state, action, pending] = useActionState<StoreFormState, FormData>(
    updateStoreAction,
    null,
  );
  const [v, setV] = useState(initial);
  const set =
    (
      k: keyof Omit<StoreInfoInitial, "hours" | "shareByDefault" | "cityLabel">,
    ) =>
    (e: { target: { value: string } }) =>
      setV({ ...v, [k]: e.target.value });
  const setDay = (day: Weekday, next: DayForm) =>
    setV({ ...v, hours: { ...v.hours, [day]: next } });
  const err = (k: string) => state?.errors[k];

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
        <h2 className="text-[17px] font-extrabold">Informações públicas</h2>
        <TextField
          id="store-name"
          name="name"
          label="Nome da loja"
          maxLength={60}
          value={v.name}
          onChange={set("name")}
          error={err("name")}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="store-about" className="text-[13px] font-semibold">
            Sobre a loja
          </label>
          <textarea
            id="store-about"
            name="about"
            rows={4}
            maxLength={2000}
            value={v.about}
            onChange={set("about")}
            className="rounded-input border border-field bg-surface p-3.5 text-[15px] outline-none focus:border-[1.5px] focus:border-ink"
          />
          {err("about") && (
            <p className="text-xs text-caju-deep">{err("about")}</p>
          )}
        </div>
        <TextField
          id="store-whatsapp"
          name="whatsapp"
          label="WhatsApp"
          type="tel"
          inputMode="tel"
          value={v.whatsapp}
          onChange={set("whatsapp")}
          error={err("whatsapp")}
        />
        <TextField
          id="store-instagram"
          name="instagram"
          label="Instagram"
          placeholder="@sualoja"
          autoCapitalize="none"
          value={v.instagram}
          onChange={set("instagram")}
          error={err("instagram")}
        />
      </section>

      <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
        <h2 className="text-[17px] font-extrabold">Endereço</h2>
        <p className="text-sm text-text-2">Cidade: {v.cityLabel}</p>
        <TextField
          id="store-street"
          name="addressStreet"
          label="Rua"
          maxLength={120}
          autoComplete="address-line1"
          value={v.addressStreet}
          onChange={set("addressStreet")}
          error={err("addressStreet")}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            id="store-number"
            name="addressNumber"
            label="Número"
            maxLength={10}
            value={v.addressNumber}
            onChange={set("addressNumber")}
            error={err("addressNumber")}
          />
          <TextField
            id="store-zip"
            name="addressZip"
            label="CEP"
            inputMode="numeric"
            autoComplete="postal-code"
            value={v.addressZip}
            onChange={set("addressZip")}
            error={err("addressZip")}
          />
        </div>
        <TextField
          id="store-complement"
          name="addressComplement"
          label="Complemento"
          maxLength={60}
          value={v.addressComplement}
          onChange={set("addressComplement")}
          error={err("addressComplement")}
        />
        <TextField
          id="store-district"
          name="addressDistrict"
          label="Bairro"
          maxLength={60}
          value={v.addressDistrict}
          onChange={set("addressDistrict")}
          error={err("addressDistrict")}
        />
      </section>

      <fieldset className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        <legend className="sr-only">Horário de atendimento</legend>
        <h2 aria-hidden className="text-[17px] font-extrabold">
          Horário de atendimento
        </h2>
        {err("hours") && (
          <p role="alert" className="text-xs text-caju-deep">
            {err("hours")}
          </p>
        )}
        {WEEK.map((day) => {
          const d = v.hours[day];
          return (
            <div
              key={day}
              className="flex flex-col gap-2 border-b border-line-2 pb-3 last:border-0"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{DAY_LABEL[day]}</span>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`hours.${day}.closed`}
                    checked={d.closed}
                    onChange={(e) =>
                      setDay(day, { ...d, closed: e.target.checked })
                    }
                    className="size-5 accent-caju"
                  />
                  Fechado
                </label>
              </div>
              {err(`hours.${day}`) && (
                <p role="alert" className="text-xs text-caju-deep">
                  {err(`hours.${day}`)}
                </p>
              )}
              {!d.closed &&
                d.ranges.map((r, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3">
                    {(["from", "to"] as const).map((edge) => (
                      <div key={edge} className="flex flex-col gap-1">
                        <label
                          htmlFor={`hours-${day}-${i}-${edge}`}
                          className="text-xs text-text-3"
                        >
                          {i === 0 ? "" : "2º intervalo · "}
                          {edge === "from" ? "Abre" : "Fecha"}
                        </label>
                        <input
                          id={`hours-${day}-${i}-${edge}`}
                          type="time"
                          name={`hours.${day}.${i}.${edge}`}
                          value={r[edge]}
                          onChange={(e) =>
                            setDay(day, {
                              ...d,
                              ranges: d.ranges.map((x, j) =>
                                j === i ? { ...x, [edge]: e.target.value } : x,
                              ),
                            })
                          }
                          className="h-11 rounded-input border border-field bg-surface px-3 text-[15px]"
                        />
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          );
        })}
      </fieldset>

      <section className="rounded-card border border-line bg-surface p-4">
        <Toggle
          name="shareByDefault"
          title="Divulgar novos veículos na CajuGo"
          caption="Novos veículos já vêm marcados para aparecer na vitrine CajuGo."
          checked={v.shareByDefault}
          onChange={(e) => setV({ ...v, shareByDefault: e.target.checked })}
        />
      </section>

      {state?.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={state.ok ? "text-sm text-ok" : "text-sm text-caju-deep"}
        >
          {state.message}
        </p>
      )}
      <Button type="submit" block disabled={pending}>
        {pending ? "Salvando…" : "Salvar alterações"}
      </Button>
    </form>
  );
}
