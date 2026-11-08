import { z } from "zod";

/** Dias da semana, de segunda a domingo. */
export const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEK)[number];

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato 08:00.");

const range = z.object({ from: time, to: time }).strict();

/** Um dia: `{ closed: true }` ou `{ ranges: [...] }` (1 a 3 intervalos, em ordem). */
const day = z
  .object({
    closed: z.literal(true).optional(),
    ranges: z
      .array(range)
      .max(3, "Use no máximo 3 intervalos por dia.")
      .optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.closed) return;
    if (!d.ranges?.length) {
      ctx.addIssue({
        code: "custom",
        message: "Informe um horário ou marque Fechado.",
      });
      return;
    }
    const sorted = [...d.ranges].sort((a, b) => a.from.localeCompare(b.from));
    sorted.forEach((r, i) => {
      if (r.to <= r.from)
        ctx.addIssue({
          code: "custom",
          message: "O fim precisa ser depois do início.",
        });
      else if (i > 0 && r.from < sorted[i - 1].to)
        ctx.addIssue({
          code: "custom",
          message: "Os intervalos se sobrepõem.",
        });
    });
  })
  .transform((d) =>
    d.closed
      ? { closed: true as const }
      : {
          ranges: [...(d.ranges ?? [])].sort((a, b) =>
            a.from.localeCompare(b.from),
          ),
        },
  );

/** Horário de atendimento por dia (STO-FR-009): intervalos ou "Fechado". */
export const hoursSchema = z
  .object(
    Object.fromEntries(WEEK.map((d) => [d, day])) as Record<
      Weekday,
      typeof day
    >,
  )
  .strict();

export type StoreHours = z.output<typeof hoursSchema>;
