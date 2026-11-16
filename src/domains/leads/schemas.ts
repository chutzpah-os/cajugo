import { z } from "zod";
import { brPhoneSchema } from "@/platform/br/phone";

export const vehicleIdSchema = z.uuid();
const vehicleId = vehicleIdSchema;
const origin = z.enum(["cajugo", "store_catalog"]);
/**
 * Chave de idempotência gerada na tela a cada envio (API.md §2.6): vira o id do lead
 * (uuid v7, ARCHITECTURE §4), e repetir o mesmo envio não duplica.
 */
const requestId = z.uuid({ version: "v7" });

/**
 * "Envie uma mensagem à loja" em [1b] (LED-FR-001, 002, LED-SEC-004). A loja vem do
 * veículo no servidor; status, canal e datas nunca vêm do navegador.
 */
export const leadFormSchema = z
  .object({
    requestId,
    vehicleId,
    origin,
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome.")
      .max(80, "Use até 80 caracteres."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, "Use até 254 caracteres.")
      .pipe(z.email("Informe um e-mail válido.")),
    phone: brPhoneSchema,
    message: z
      .string()
      .trim()
      .max(1000, "Use até 1.000 caracteres.")
      .optional(),
    website: z.string().max(200).optional(),
  })
  .strict();

/** Toque no WhatsApp de [1b] ou do simulador (LED-FR-003). */
export const whatsappClickSchema = z
  .object({ requestId, vehicleId, origin })
  .strict();

/** Abertura da página do veículo (LED-FR-015). */
export const viewSchema = z.object({ vehicleId }).strict();

/** "→ próximo status" ou "Perdido" no card de [3a] (LED-FR-008). */
export const moveLeadSchema = z
  .object({ leadId: z.uuid(), to: z.enum(["next", "lost"]) })
  .strict();
