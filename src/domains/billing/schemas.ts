import { z } from "zod";

/** [5d]: só o documento; loja, fatura e valor nunca vêm da tela (PIX-SEC-004). */
export const startCheckoutSchema = z
  .object({ taxId: z.string().max(30) })
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
