import { z } from "zod";

/** [5d]: só o documento; loja, fatura e valor nunca vêm da tela (PIX-SEC-004). */
export const startCheckoutSchema = z
  .object({ taxId: z.string().max(30).optional() })
  .strict();

/** Envio do comprovante [6c]: o arquivo já no Cloudinary e o valor pago (PIX-FR-005). */
export const submitReceiptSchema = z
  .object({
    publicId: z.string().max(200),
    paidCents: z
      .number({ error: "Informe o valor pago." })
      .int("Informe o valor pago.")
      .min(1, "Informe o valor pago.")
      .max(10_000_000, "Confira o valor pago."),
  })
  .strict();

const cents = (message: string) =>
  z
    .number({ error: message })
    .int(message)
    .min(1, message)
    .max(10_000_000, message);

/** Confirmar [10b]: o valor corrigido é opcional (PIX-FR-008). */
export const confirmPaymentSchema = z
  .object({
    paymentId: z.uuid(),
    amountCents: cents("Informe o valor que caiu na conta.").optional(),
  })
  .strict();

/** Recusar [10b]: motivo obrigatório (PIX-FR-010); valor corrigido opcional. */
export const rejectPaymentSchema = z
  .object({
    paymentId: z.uuid(),
    reason: z
      .string()
      .trim()
      .min(3, "Informe o motivo.")
      .max(300, "Use no máximo 300 caracteres."),
    amountCents: cents("Informe o valor que caiu na conta.").optional(),
  })
  .strict();

/** Registro sem comprovante [10b] (PIX-FR-011): exceção, sempre com forma e observação. */
export const manualPaymentSchema = z
  .object({
    storeId: z.uuid(),
    method: z.enum(["cash", "transfer", "pix", "other"], {
      error: "Escolha a forma de pagamento.",
    }),
    amountCents: cents("Informe o valor recebido."),
    note: z
      .string()
      .trim()
      .min(3, "Conte como foi pago.")
      .max(300, "Use no máximo 300 caracteres."),
  })
  .strict();

export const storeSearchSchema = z.string().trim().min(2).max(60);
