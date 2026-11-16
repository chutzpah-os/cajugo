import { z } from "zod";
import { brPhoneSchema } from "@/platform/br/phone";
import { isValidCpf } from "@/platform/br/tax-id";
import { normalizePixKey, pixKeyField, pixTypeField } from "@/platform/pix/key";

const cpf = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine(isValidCpf, "CPF inválido.");
const city = z
  .string()
  .trim()
  .min(2, "Informe sua cidade.")
  .max(60, "Use no máximo 60 caracteres.");
const terms = z.literal(true, { error: "Aceite os termos para continuar." });

/** Tipo e chave Pix lado a lado no formulário; a chave é conferida pelo tipo. */
const pixFields = { pixType: pixTypeField, pixKey: pixKeyField };
function withPix<
  T extends { pixType: Parameters<typeof normalizePixKey>[0]; pixKey: string },
>(v: T, ctx: z.RefinementCtx) {
  const r = normalizePixKey(v.pixType, v.pixKey);
  if ("error" in r) {
    ctx.addIssue({ code: "custom", path: ["pixKey"], message: r.error });
    return z.NEVER;
  }
  const rest: Omit<T, "pixType" | "pixKey"> & Partial<T> = { ...v };
  delete rest.pixType;
  delete rest.pixKey;
  return { ...rest, pix: { type: v.pixType, key: r.key } };
}

/**
 * Cadastro do vendedor [7a] (SEL-FR-001, SEL-SEC-008): status, código e comissão
 * nunca vêm da tela. O honeypot é conferido antes, pelo serviço.
 */
export const sellerSignupSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome.").max(80),
    cpf,
    phone: brPhoneSchema,
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Informe um e-mail válido."))
      .pipe(z.string().max(254)),
    city,
    ...pixFields,
    password: z
      .string()
      .min(8, "Use pelo menos 8 caracteres.")
      .max(200, "Use no máximo 200 caracteres."),
    terms,
  })
  .strict()
  .transform(withPix);

/** Quem já está conectado (SEL-FR-016): nome, e-mail e celular vêm da conta. */
export const addSellerSchema = z
  .object({ cpf, city, ...pixFields, terms })
  .strict()
  .transform(withPix);

export type SellerSignup = z.output<typeof sellerSignupSchema>;

/** Decisão da equipe sobre um vendedor (SEL-FR-004, 005). */
export const sellerDecisionSchema = z.object({ sellerId: z.uuid() }).strict();

/** Bloquear pede o motivo (SEL-FR-005). */
export const blockSellerSchema = z
  .object({
    sellerId: z.uuid(),
    reason: z
      .string()
      .trim()
      .min(3, "Informe o motivo.")
      .max(200, "Use no máximo 200 caracteres."),
  })
  .strict();

/** "Pedir parceria" em [7c] (SEL-FR-009): só a loja; status vem do servidor. */
export const partnershipRequestSchema = z
  .object({ storeId: z.uuid() })
  .strict();
