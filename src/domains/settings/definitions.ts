import { sql } from "drizzle-orm";
import { z } from "zod";
import { settingValues } from "@/platform/db/schema";
import { bpsToPercent, centsToReais } from "./format";

/**
 * Lista única das regras configuráveis (spec 002, PRD §5.14, ADR 0010).
 * `initial` é o valor provisório, igual ao da migration `0005` (um teste garante).
 * Dinheiro em centavos; porcentagem em centésimos de ponto (1,79% = 179).
 * Os limites (D2 do plano) são trava contra erro de digitação.
 */

export type SettingGroup =
  "showcase" | "network" | "payment" | "approval" | "data" | "referral";

const integer = (min: number, max: number, unit = "") =>
  z
    .number({ error: "Informe um número." })
    .int("Use um número inteiro.")
    .min(min, `Use um valor entre ${min} e ${max}${unit}.`)
    .max(max, `Use um valor entre ${min} e ${max}${unit}.`);

const percent = (minBps: number, maxBps: number) => {
  const msg = `Use um valor entre ${bpsToPercent(minBps)}% e ${bpsToPercent(maxBps)}%.`;
  return z
    .number({ error: "Informe um número." })
    .int(msg)
    .min(minBps, msg)
    .max(maxBps, msg);
};

const money = (minCents: number, maxCents: number) => {
  const msg = `Use um valor entre R$ ${centsToReais(minCents)} e R$ ${centsToReais(maxCents)}.`;
  return z
    .number({ error: "Informe um valor." })
    .int(msg)
    .min(minCents, msg)
    .max(maxCents, msg);
};

const digits = (s: string) => s.replace(/\D/g, "");

/** Dígitos verificadores de CPF/CNPJ (módulo 11). */
function validCheckDigits(value: string, weights: number[][]): boolean {
  if (/^(\d)\1+$/.test(value)) return false;
  return weights.every((w) => {
    const pos = w.length;
    const sum = w.reduce((acc, wi, i) => acc + Number(value[i]) * wi, 0);
    const dv = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return dv === Number(value[pos]);
  });
}
const CPF_WEIGHTS = [
  [10, 9, 8, 7, 6, 5, 4, 3, 2],
  [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
];
const CNPJ_WEIGHTS = [
  [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
];

export const PIX_TYPES = ["cpf", "cnpj", "email", "phone", "random"] as const;

const pixSchema = z
  .object({
    type: z.enum(PIX_TYPES, { error: "Escolha o tipo da chave." }),
    key: z.string().trim().min(1, "Informe a chave Pix.").max(140),
    beneficiary: z
      .string()
      .trim()
      .min(2, "Informe o favorecido.")
      .max(100, "Use no máximo 100 caracteres."),
  })
  .transform((pix, ctx) => {
    const fail = (message: string) => {
      ctx.addIssue({ code: "custom", path: ["key"], message });
      return z.NEVER;
    };
    switch (pix.type) {
      case "cpf": {
        const d = digits(pix.key);
        if (d.length !== 11 || !validCheckDigits(d, CPF_WEIGHTS))
          return fail("CPF inválido.");
        return { ...pix, key: d };
      }
      case "cnpj": {
        const d = digits(pix.key);
        if (d.length !== 14 || !validCheckDigits(d, CNPJ_WEIGHTS))
          return fail("CNPJ inválido.");
        return { ...pix, key: d };
      }
      case "email": {
        const email = pix.key.toLowerCase();
        if (!z.email().safeParse(email).success)
          return fail("E-mail inválido.");
        return { ...pix, key: email };
      }
      case "phone": {
        const d = digits(pix.key).replace(/^55(?=\d{10,11}$)/, "");
        if (!/^\d{10,11}$/.test(d))
          return fail("Celular inválido: informe DDD e número.");
        return { ...pix, key: `+55${d}` };
      }
      case "random": {
        const key = pix.key.toLowerCase();
        if (!z.uuid().safeParse(key).success)
          return fail("Chave aleatória inválida.");
        return { ...pix, key };
      }
    }
  });

export type Pix = z.output<typeof pixSchema>;

type Definition<S extends z.ZodType> = {
  group: SettingGroup;
  label: string;
  schema: S;
  initial: z.output<S>;
};
const define = <S extends z.ZodType>(d: Definition<S>) => d;

export const SETTINGS = {
  support_whatsapp: define({
    group: "showcase",
    label: "WhatsApp de atendimento",
    schema: z
      .string()
      .transform(digits)
      .pipe(
        z
          .string()
          .regex(
            /^\d{12,13}$/,
            "Informe o WhatsApp com DDI e DDD, só números (ex.: 5579981360206).",
          ),
      ),
    initial: "557981360206",
  }),
  pix: define({
    group: "payment",
    label: "Chave Pix da CajuGo",
    schema: pixSchema.nullable(),
    initial: null,
  }),
  review_business_days: define({
    group: "payment",
    label: "Prazo de conferência do comprovante (dias úteis)",
    schema: integer(1, 10, " dias úteis"),
    initial: 1,
  }),
  past_due_tolerance_days: define({
    group: "payment",
    label: "Tolerância de atraso antes da suspensão (dias)",
    schema: integer(0, 30, " dias"),
    initial: 5,
  }),
  installment_rate_bps: define({
    group: "payment",
    label: "Taxa do simulador (% a.m.)",
    schema: percent(0, 1000),
    initial: 179,
  }),
  cajugo_fee_bps: define({
    group: "network",
    label: "Taxa CajuGo por carro vendido via vendedor (%)",
    schema: percent(0, 2000),
    initial: 100,
  }),
  require_approval: define({
    group: "approval",
    label: "Aprovar veículos antes de publicar",
    schema: z.boolean(),
    initial: false,
  }),
  min_photos: define({
    group: "approval",
    label: "Mínimo de fotos por veículo",
    schema: integer(1, 20),
    initial: 6,
  }),
  retention_days: define({
    group: "data",
    label: "Retenção de dados após o cancelamento (dias)",
    schema: integer(30, 3650, " dias"),
    initial: 90,
  }),
  referral_enabled: define({
    group: "referral",
    label: "Programa ativo",
    schema: z.boolean(),
    initial: true,
  }),
  referral_who: define({
    group: "referral",
    label: "Quem pode indicar",
    schema: z.object({
      store_owner: z.boolean(),
      seller: z.boolean(),
      referrer: z.boolean(),
    }),
    initial: { store_owner: true, seller: true, referrer: true },
  }),
  referral_pct_bps: define({
    group: "referral",
    label: "Recompensa (% da mensalidade)",
    schema: percent(100, 10000),
    initial: 3000,
  }),
  referral_months: define({
    group: "referral",
    label: "Duração da recompensa (meses)",
    schema: integer(1, 24, " meses"),
    initial: 3,
  }),
  payout_min_cents: define({
    group: "referral",
    label: "Resgate mínimo",
    schema: money(100, 100000),
    initial: 5000,
  }),
};

export type SettingKey = keyof typeof SETTINGS;
export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];

/** Todas as regras, já tipadas. */
export type Settings = {
  [K in SettingKey]: z.output<(typeof SETTINGS)[K]["schema"]>;
};

/**
 * Lê `setting_values.value` como texto e interpreta o JSON aqui: o mapeamento de
 * `jsonb` do Drizzle interpreta de novo um texto JSON e transforma "557981360206"
 * em número (testado em PGlite e postgres.js). Use sempre isto para ler valores.
 */
export const settingValueJson = sql<
  string | null
>`${settingValues.value}::text`;
export const parseSettingValue = (text: string | null): unknown =>
  text === null ? null : JSON.parse(text);
