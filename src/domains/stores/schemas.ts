import { z } from "zod";
import { findCity } from "@/platform/geo/cities";
import { hoursSchema } from "./hours";
import { slugSchema } from "./slug";

/** Telefone brasileiro (DDD + número), guardado com DDI: `55` + 10 ou 11 dígitos. */
export { brPhoneSchema } from "@/platform/br/phone";
import { brPhoneSchema } from "@/platform/br/phone";

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

/** Texto opcional: vazio vira `null`. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .transform((v) => v || null)
    .nullable()
    .optional();

/** Instagram como `@usuario` ou link; guarda só o usuário. */
const instagramSchema = z
  .string()
  .trim()
  .transform((v) =>
    v
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/^@/, "")
      .replace(/\/.*$/, ""),
  )
  .pipe(
    z
      .string()
      .regex(
        /^$|^[A-Za-z0-9._]{1,30}$/,
        "Informe o usuário do Instagram (ex.: @silvaautocar).",
      ),
  )
  .transform((v) => v || null)
  .nullable()
  .optional();

/** Minha loja [3b] (STO-FR-008, 009, 012). Sem `storeId`, `status` nem endereço do catálogo. */
export const storeUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Use pelo menos 2 caracteres.")
      .max(60, "Use no máximo 60 caracteres."),
    about: optionalText(2000),
    whatsapp: brPhoneSchema,
    instagram: instagramSchema,
    addressStreet: optionalText(120),
    addressNumber: optionalText(10),
    addressComplement: optionalText(60),
    addressDistrict: optionalText(60),
    addressZip: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().regex(/^$|^\d{8}$/, "O CEP tem 8 dígitos."))
      .transform((v) => v || null)
      .nullable()
      .optional(),
    hours: hoursSchema.nullable().optional(),
    shareByDefault: z.boolean(),
  })
  .strict();
