import { z } from "zod";
import { HIDE_REASONS, REPORT_REASONS } from "./reasons";

const vehicleId = z.uuid();
const pickReason = { error: "Escolha um motivo." };

/**
 * "Denunciar anúncio" em [14d] (RPT-FR-001, RPT-SEC-002). `requestId` é a chave do envio
 * gerada na tela e vira o id da denúncia (API.md §2.6). Nada de quem denunciou
 * (RPT-SEC-006); status e datas vêm do servidor.
 */
export const reportSchema = z
  .object({
    requestId: z.uuid({ version: "v7" }),
    vehicleId,
    reason: z.enum(REPORT_REASONS, pickReason),
    details: z
      .string()
      .trim()
      .max(1000, "Use até 1.000 caracteres.")
      .optional(),
    website: z.string().max(200).optional(),
  })
  .strict();

/** Ocultar [6f] (RPT-FR-004): "Outro" exige nota de até 200 caracteres. */
export const hideSchema = z
  .object({
    vehicleId,
    reason: z.enum(HIDE_REASONS, pickReason),
    note: z.string().trim().max(200, "Use até 200 caracteres.").optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.reason === "other" && !v.note)
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message: "Descreva o motivo.",
      });
  });

/** Manter e Mostrar de novo agem num veículo (RPT-FR-003, 008). */
export const vehicleDecisionSchema = z.object({ vehicleId }).strict();
