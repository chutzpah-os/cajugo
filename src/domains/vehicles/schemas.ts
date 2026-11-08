import { z } from "zod";
import { brPhoneSchema } from "@/platform/br/phone";
import {
  BODIES,
  CONDITIONS,
  DOORS,
  FEATURES,
  FUELS,
  MAX_DESCRIPTION,
  TRANSMISSIONS,
  keysOf,
} from "./lists";

/**
 * Campos do veículo editáveis pela tela [2a]. Tudo opcional no rascunho (VEH-FR-003);
 * loja, status, datas e referência FIPE nunca vêm da tela (VEH-SEC-001).
 */
export const vehicleFields = {
  /** Escolha da FIPE (ids); nomes e referência vêm do servidor (VEH-FR-005). */
  fipeBrandId: z.string().max(12).nullable(),
  fipeModelId: z.string().max(12).nullable(),
  fipeYearId: z.string().max(40).nullable(),
  yearManufacture: z
    .number()
    .int()
    .min(1950)
    .max(2100, "Confira o ano de fabricação."),
  plate: z.string().max(10),
  mileageKm: z.number().int().min(0).max(2_000_000, "Confira a quilometragem."),
  transmission: z.enum(keysOf(TRANSMISSIONS), { error: "Escolha o câmbio." }),
  fuel: z.enum(keysOf(FUELS), { error: "Escolha o combustível." }),
  body: z.enum(keysOf(BODIES), { error: "Escolha a carroceria." }),
  color: z.string().trim().max(30, "Use no máximo 30 caracteres."),
  doors: z
    .number()
    .int()
    .refine(
      (d) => (DOORS as readonly number[]).includes(d),
      "Escolha 2, 3, 4 ou 5 portas.",
    ),
  engine: z.string().trim().max(10, "Use no máximo 10 caracteres."),
  priceCents: z
    .number({ error: "Informe o preço." })
    .int("Informe o preço.")
    .min(100_000, "Confira o preço (mínimo R$ 1.000).")
    .max(100_000_000, "Confira o preço."),
  showInstallment: z.boolean(),
  conditions: z
    .object(
      Object.fromEntries(
        keysOf(CONDITIONS).map((k) => [k, z.boolean()]),
      ) as Record<keyof typeof CONDITIONS, z.ZodBoolean>,
    )
    .partial()
    .strict(),
  features: z
    .array(z.enum(keysOf(FEATURES)))
    .max(Object.keys(FEATURES).length)
    .transform((f) => [...new Set(f)]),
  description: z
    .string()
    .max(MAX_DESCRIPTION, `Use no máximo ${MAX_DESCRIPTION} caracteres.`),
  contactWhatsapp: brPhoneSchema,
  shareOnCajugo: z.boolean(),
};

export const draftSchema = z
  .object({ vehicleId: z.uuid().optional(), ...vehicleFields })
  .partial()
  .strict();
