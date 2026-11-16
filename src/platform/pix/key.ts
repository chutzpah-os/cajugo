import { z } from "zod";
import { isValidCnpj, isValidCpf } from "@/platform/br/tax-id";

/** Tipos de chave Pix (Bacen). */
export const PIX_TYPES = ["cpf", "cnpj", "email", "phone", "random"] as const;
export type PixKeyType = (typeof PIX_TYPES)[number];

const digits = (s: string) => s.replace(/\D/g, "");

/**
 * Confere e normaliza a chave do tipo informado: CPF e CNPJ só dígitos, e-mail em
 * minúsculas, celular `+55` + DDD + número, aleatória como UUID minúsculo.
 */
export function normalizePixKey(
  type: PixKeyType,
  key: string,
): { key: string } | { error: string } {
  switch (type) {
    case "cpf": {
      const d = digits(key);
      return isValidCpf(d) ? { key: d } : { error: "CPF inválido." };
    }
    case "cnpj": {
      const d = digits(key);
      return isValidCnpj(d) ? { key: d } : { error: "CNPJ inválido." };
    }
    case "email": {
      const email = key.toLowerCase();
      return z.email().safeParse(email).success
        ? { key: email }
        : { error: "E-mail inválido." };
    }
    case "phone": {
      const d = digits(key).replace(/^55(?=\d{10,11}$)/, "");
      return /^\d{10,11}$/.test(d)
        ? { key: `+55${d}` }
        : { error: "Celular inválido: informe DDD e número." };
    }
    case "random": {
      const k = key.toLowerCase();
      return z.uuid().safeParse(k).success
        ? { key: k }
        : { error: "Chave aleatória inválida." };
    }
  }
}

export const pixTypeField = z.enum(PIX_TYPES, {
  error: "Escolha o tipo da chave.",
});
export const pixKeyField = z
  .string()
  .trim()
  .min(1, "Informe a chave Pix.")
  .max(140);

/** Chave Pix para receber (vendedor, indicador): tipo + chave, normalizada. */
export const pixKeySchema = z
  .object({ type: pixTypeField, key: pixKeyField })
  .transform((pix, ctx) => {
    const r = normalizePixKey(pix.type, pix.key);
    if ("error" in r) {
      ctx.addIssue({ code: "custom", path: ["key"], message: r.error });
      return z.NEVER;
    }
    return { type: pix.type, key: r.key };
  });

export type PixKey = z.output<typeof pixKeySchema>;
