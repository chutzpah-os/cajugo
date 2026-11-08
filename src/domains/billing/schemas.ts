import { z } from "zod";

/** [5d]: só o documento; loja, fatura e valor nunca vêm da tela (PIX-SEC-004). */
export const startCheckoutSchema = z
  .object({ taxId: z.string().max(30) })
  .strict();
