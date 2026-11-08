import { sql } from "drizzle-orm";
import { z } from "zod";
import { isValidCnpj, isValidCpf } from "@/platform/br/tax-id";
import { settingValues } from "@/platform/db/schema";
import { bpsToPercent, centsToReais } from "./format";

/**
 * Lista única das regras configuráveis (spec 002, PRD §5.14, ADR 0010).
 * `initial` é o valor provisório, igual ao da migration `0005` (um teste garante).
 * Dinheiro em centavos; porcentagem em centésimos de ponto (1,79% = 179).
 * Os limites (D2 do plano) são trava contra erro de digitação.
 */

export const SETTING_GROUPS = [
  "showcase",
  "network",
  "payment",
  "approval",
  "data",
  "referral",
] as const;
export type SettingGroup = (typeof SETTING_GROUPS)[number];

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

export const PIX_TYPES = ["cpf", "cnpj", "email", "phone", "random"] as const;

export const pixSchema = z
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
        if (!isValidCpf(d)) return fail("CPF inválido.");
        return { ...pix, key: d };
      }
      case "cnpj": {
        const d = digits(pix.key);
        if (!isValidCnpj(d)) return fail("CNPJ inválido.");
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

/** Como a regra aparece no formulário (conversão em `form.ts`). */
export type SettingInput =
  "int" | "percent" | "money" | "bool" | "phone" | "pix" | "who";

type Definition<S extends z.ZodType> = {
  group: SettingGroup;
  label: string;
  input: SettingInput;
  schema: S;
  initial: z.output<S>;
};
const define = <S extends z.ZodType>(d: Definition<S>) => d;

export const SETTINGS = {
  support_whatsapp: define({
    group: "showcase",
    input: "phone",
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
    input: "pix",
    label: "Chave Pix da CajuGo",
    schema: pixSchema.nullable(),
    initial: null,
  }),
  review_business_days: define({
    group: "payment",
    input: "int",
    label: "Prazo de conferência do comprovante (dias úteis)",
    schema: integer(1, 10, " dias úteis"),
    initial: 1,
  }),
  past_due_tolerance_days: define({
    group: "payment",
    input: "int",
    label: "Tolerância de atraso antes da suspensão (dias)",
    schema: integer(0, 30, " dias"),
    initial: 5,
  }),
  installment_rate_bps: define({
    group: "payment",
    input: "percent",
    label: "Taxa do simulador (% a.m.)",
    schema: percent(0, 1000),
    initial: 179,
  }),
  cajugo_fee_bps: define({
    group: "network",
    input: "percent",
    label: "Taxa CajuGo por carro vendido via vendedor (%)",
    schema: percent(0, 2000),
    initial: 100,
  }),
  require_approval: define({
    group: "approval",
    input: "bool",
    label: "Aprovar veículos antes de publicar",
    schema: z.boolean(),
    initial: false,
  }),
  min_photos: define({
    group: "approval",
    input: "int",
    label: "Mínimo de fotos por veículo",
    schema: integer(1, 20),
    initial: 6,
  }),
  retention_days: define({
    group: "data",
    input: "int",
    label: "Retenção de dados após o cancelamento (dias)",
    schema: integer(30, 3650, " dias"),
    initial: 90,
  }),
  referral_enabled: define({
    group: "referral",
    input: "bool",
    label: "Programa ativo",
    schema: z.boolean(),
    initial: true,
  }),
  referral_who: define({
    group: "referral",
    input: "who",
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
    input: "percent",
    label: "Recompensa (% da mensalidade)",
    schema: percent(100, 10000),
    initial: 3000,
  }),
  referral_months: define({
    group: "referral",
    input: "int",
    label: "Duração da recompensa (meses)",
    schema: integer(1, 24, " meses"),
    initial: 3,
  }),
  payout_min_cents: define({
    group: "referral",
    input: "money",
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

/** Regras de um grupo editáveis por formulário (a chave Pix tem fluxo próprio). */
export function editableKeys(group: SettingGroup): SettingKey[] {
  return SETTING_KEYS.filter(
    (k) => SETTINGS[k].group === group && SETTINGS[k].input !== "pix",
  );
}

/** Igualdade de valores de regra independente da ordem das chaves do objeto. */
export function sameSettingValue(a: unknown, b: unknown): boolean {
  const stable = (v: unknown): unknown =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>)
            .sort(([x], [y]) => x.localeCompare(y))
            .map(([k, val]) => [k, stable(val)]),
        )
      : v;
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}
