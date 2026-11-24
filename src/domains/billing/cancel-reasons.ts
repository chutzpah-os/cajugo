import { z } from "zod";

/**
 * Motivos do cancelamento [12h] (011b, D5): lista fixa, só texto (não é regra numérica,
 * por isso não fica nas regras do admin). Guardado em `stores.cancel_reason`.
 */
export const CANCEL_REASONS = [
  "Vou parar de vender",
  "Está caro para mim",
  "Recebi poucos contatos",
  "Vou usar outra plataforma",
  "Tive problemas com a CajuGo",
  "Outro motivo",
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number];

/** Entrada de `cancelSubscription`: motivo opcional, só da lista (CAN-FR-002). */
export const cancelSchema = z
  .object({ reason: z.enum(CANCEL_REASONS).optional() })
  .strict();
