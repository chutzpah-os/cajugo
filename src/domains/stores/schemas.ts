import { z } from "zod";
import { findCity } from "@/platform/geo/cities";
import { slugSchema } from "./slug";

/** Telefone brasileiro (DDD + número), guardado com DDI: `55` + 10 ou 11 dígitos. */
export const brPhoneSchema = z
  .string()
  .transform((s) => s.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""))
  .pipe(
    z
      .string()
      .regex(
        /^[1-9]{2}9?\d{8}$/,
        "Informe DDD e número (ex.: (79) 98136-0206).",
      ),
  )
  .transform((d) => `55${d}`);

const storeFields = {
  storeName: z
    .string()
    .trim()
    .min(2, "Use pelo menos 2 caracteres.")
    .max(60, "Use no máximo 60 caracteres."),
  city: z.string().trim().max(80),
  state: z.string().trim().max(2),
  whatsapp: brPhoneSchema,
  slug: slugSchema,
  referralCode: z.string().trim().max(20).optional(),
};

/** Cidade precisa existir no IBGE com a UF (STO-FR-004); grava o nome oficial. */
function withCity<T extends { city: string; state: string }>(
  v: T,
  ctx: z.RefinementCtx,
) {
  const city = findCity(v.city, v.state);
  if (!city) {
    ctx.addIssue({
      code: "custom",
      path: ["city"],
      message: "Escolha uma cidade da lista.",
    });
    return z.NEVER;
  }
  return { ...v, city: city.name, state: city.state };
}

/** Cadastro [5c] de visitante: conta + loja (STO-FR-003/004). Sem campo privilegiado. */
export const registerStoreSchema = z
  .object({
    ...storeFields,
    name: z.string().trim().min(2, "Informe seu nome.").max(80),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Informe um e-mail válido."))
      .pipe(z.string().max(254)),
    phone: brPhoneSchema,
    password: z
      .string()
      .min(8, "Use pelo menos 8 caracteres.")
      .max(200, "Use no máximo 200 caracteres."),
    terms: z.literal(true, { error: "Aceite os termos para continuar." }),
  })
  .strict()
  .transform(withCity);

/** Cadastro de quem já está conectado: só os dados da loja (STO-FR-015). */
export const addStoreSchema = z
  .object({
    ...storeFields,
    terms: z.literal(true, { error: "Aceite os termos para continuar." }),
  })
  .strict()
  .transform(withCity);

export type RegisterStoreInput = z.input<typeof registerStoreSchema>;
