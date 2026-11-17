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

/** Abertura do link do vendedor (SEL-FR-010); o código é conferido no servidor. */
export const sellerClickSchema = z
  .object({ vehicleId: z.uuid(), code: z.string().max(40) })
  .strict();

/** Trocar a chave Pix na conta [13c] (SEL-FR-014). */
export const pixUpdateSchema = z
  .object({ ...pixFields })
  .strict()
  .transform(withPix);

/** Lado da foto do documento (SEL-FR-001). */
export const documentSideSchema = z
  .object({ side: z.enum(["front", "back"]) })
  .strict();

/** Foto enviada com a assinatura: o nome é conferido no serviço (SEL-SEC-009). */
export const attachDocumentSchema = z
  .object({ side: z.enum(["front", "back"]), publicId: z.string().max(300) })
  .strict();

/** Próxima página da vitrine do vendedor (SEL-NFR-003). */
export const sellerShowcasePageSchema = z
  .object({ query: z.string().max(500), cursor: z.string().max(300) })
  .strict();

/** Limites da comissão (RCL-FR-002): 10% e R$ 10.000. */
const MAX_PCT_BPS = 1000;
const MAX_FIXED_CENTS = 1_000_000;

/** Tipo e valor da comissão, conferidos juntos pelos limites de cada tipo. */
function checkCommission(
  v: { type: "pct" | "fixed" | null; value: number | null },
  ctx: z.RefinementCtx,
  path: string,
) {
  if (v.type === null && v.value === null) return;
  if (v.type === null || v.value === null) {
    ctx.addIssue({
      code: "custom",
      path: [path],
      message: "Informe a comissão.",
    });
    return;
  }
  const over =
    v.type === "pct" ? v.value > MAX_PCT_BPS : v.value > MAX_FIXED_CENTS;
  if (over)
    ctx.addIssue({
      code: "custom",
      path: [path],
      message: v.type === "pct" ? "Use até 10%." : "Use até R$ 10.000.",
    });
}

const commissionType = z.enum(["pct", "fixed"]).nullable();
const commissionValue = z
  .number({ error: "Informe a comissão." })
  .int()
  .min(0, "Informe a comissão.")
  .nullable();

/** "Aceitar vendedores" e a comissão padrão da loja [7e] (RCL-FR-001, 002). */
export const networkRulesSchema = z
  .object({ acceptsSellers: z.boolean(), commissionType, commissionValue })
  .strict()
  .superRefine((v, ctx) =>
    checkCommission(
      { type: v.commissionType, value: v.commissionValue },
      ctx,
      "commissionValue",
    ),
  );

/** Ajuste da comissão de um veículo [7e] (RCL-FR-003); nulo remove o ajuste. */
export const commissionOverrideSchema = z
  .object({ vehicleId: z.uuid(), type: commissionType, value: commissionValue })
  .strict()
  .superRefine((v, ctx) => checkCommission(v, ctx, "value"));

/** Aprovar, recusar ou encerrar uma parceria [7f] (RCL-FR-005, 006). */
export const partnershipDecisionSchema = z
  .object({
    partnershipId: z.uuid(),
    decision: z.enum(["approve", "decline", "end"]),
  })
  .strict();

/**
 * Confirmar venda [7g] (RCL-FR-009, 011, 012, RCL-SEC-003): o valor final é o único
 * número da tela; comissão, taxa e status saem do servidor.
 */
export const confirmSaleSchema = z
  .object({
    vehicleId: z.uuid(),
    finalPriceCents: z
      .number({ error: "Informe o valor final." })
      .int()
      .min(1, "Informe o valor final.")
      .max(100_000_000, "Confira o valor final."),
    attribution: z.enum(["link", "other_partner", "store"]),
    sellerId: z.uuid().nullable().optional(),
    commissionPaid: z.boolean(),
  })
  .strict();

/** Cálculo ao vivo de [7g] (RCL-FR-010): valor e vendedor ainda podem faltar. */
export const saleTermsSchema = z
  .object({
    vehicleId: z.uuid(),
    finalPriceCents: z.number().int().min(0).max(100_000_000).nullable(),
    sellerId: z.uuid().nullable(),
  })
  .strict();
