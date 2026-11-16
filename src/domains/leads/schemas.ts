import { z } from "zod";
import { brPhoneSchema } from "@/platform/br/phone";

const vehicleId = z.uuid();
const origin = z.enum(["cajugo", "store_catalog"]);

/**
 * "Envie uma mensagem à loja" em [1b] (LED-FR-001, 002, LED-SEC-004). A loja vem do
 * veículo no servidor; status, canal e datas nunca vêm do navegador.
 */
export const leadFormSchema = z
  .object({
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
export const whatsappClickSchema = z.object({ vehicleId, origin }).strict();

/** Abertura da página do veículo (LED-FR-015). */
export const viewSchema = z.object({ vehicleId }).strict();
