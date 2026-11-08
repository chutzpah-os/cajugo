import { WEEK, type StoreHours, type Weekday } from "./hours";

/** Intervalos por dia no formulário (o segundo é opcional, ex.: depois do almoço). */
export const FORM_RANGES = 2;

export type DayForm = {
  closed: boolean;
  ranges: { from: string; to: string }[];
};

/** Formulário → horário para validar no servidor (STO-FR-009). Intervalo vazio é ignorado. */
export function hoursFromForm(form: FormData): Record<Weekday, unknown> {
  const text = (k: string) => String(form.get(k) ?? "").trim();
  return Object.fromEntries(
    WEEK.map((day) => {
      if (form.get(`hours.${day}.closed`) === "on")
        return [day, { closed: true }];
      const ranges = Array.from({ length: FORM_RANGES }, (_, i) => ({
        from: text(`hours.${day}.${i}.from`),
        to: text(`hours.${day}.${i}.to`),
      })).filter((r) => r.from || r.to);
      return [day, { ranges }];
    }),
  ) as Record<Weekday, unknown>;
}

/** Horário salvo → valores iniciais do formulário. */
export function hoursToForm(
  hours: StoreHours | null,
): Record<Weekday, DayForm> {
  return Object.fromEntries(
    WEEK.map((day) => {
      const d = hours?.[day];
      const ranges = d && "ranges" in d ? d.ranges : [];
      return [
        day,
        {
          closed: !!d && "closed" in d && !!d.closed,
          ranges: Array.from(
            { length: FORM_RANGES },
            (_, i) => ranges?.[i] ?? { from: "", to: "" },
          ),
        },
      ];
    }),
  ) as Record<Weekday, DayForm>;
}
