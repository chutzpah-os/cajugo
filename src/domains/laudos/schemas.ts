import { z } from "zod";
import { brPhoneSchema } from "@/platform/br/phone";

/** Placa antiga (ABC1234) ou Mercosul (ABC1D23), sem traço nem espaço. */
export const plateSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((v) => v.replace(/[^A-Z0-9]/g, ""))
  .pipe(
    z
      .string()
      .regex(
        /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/,
        "Confira a placa (ex.: ABC1D23).",
      ),
  );

/** Pedido do LaudoCaju [/laudocaju/pedir] (LAU-FR-003): contato, veículo e o aceite. */
export const laudoRequestSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o seu nome.").max(80),
    whatsapp: brPhoneSchema,
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Informe um e-mail válido."))
      .pipe(z.string().max(254)),
    plate: plateSchema,
    vehicle: z
      .string()
      .trim()
      .min(2, "Informe a marca, o modelo e o ano.")
      .max(80, "Use no máximo 80 caracteres."),
    vehicleId: z.uuid().optional().catch(undefined),
    consent: z.literal(true, {
      error: "Confirme que podemos mandar o laudo pelo WhatsApp ou e-mail.",
    }),
    website: z.string().optional(),
  })
  .strict();
