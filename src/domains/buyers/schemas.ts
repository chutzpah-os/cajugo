import { z } from "zod";
import { listSourceSchema } from "@/domains/showcase/service";
import { brMobileSchema } from "@/platform/br/phone";

/** Formulário "Avisar quando chegar" [12a] (ALR-FR-001, ALR-SEC-002). */
export const alertRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome.")
      .max(80, "Use até 80 caracteres."),
    phone: brMobileSchema,
    consent: z.literal(true, {
      error: "Aceite para receber o aviso pelo WhatsApp.",
    }),
    source: listSourceSchema,
    query: z.string().max(1000),
    website: z.string().max(200).optional(),
  })
  .strict();

/** "Marcar como avisado" (ALR-FR-003). */
export const notifySchema = z.object({ alertId: z.uuid() }).strict();

/** Cancelar pelo link (ALR-FR-004); o formato do link é conferido depois. */
export const cancelSchema = z.object({ token: z.string().max(200) }).strict();
