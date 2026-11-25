import { z } from "zod";
import { brMobileSchema } from "@/platform/br/phone";

/** Assuntos dos pedidos de contato que chegam ao admin [Contatos]. */
export const CONTACT_TOPICS = ["auction_waitlist", "password_help"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const TOPIC_LABEL: Record<ContactTopic, string> = {
  auction_waitlist: "Leilão · quer ser avisado",
  password_help: "Esqueceu a senha",
};

const base = {
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome.")
    .max(80, "Use até 80 caracteres."),
  phone: brMobileSchema,
  consent: z.literal(true, {
    error: "Aceite para a CajuGo falar com você pelo WhatsApp.",
  }),
  website: z.string().max(200).optional(),
};

/** Formulário público: o e-mail da conta só no pedido de senha. */
export const contactRequestSchema = z.discriminatedUnion("topic", [
  z.object({ topic: z.literal("auction_waitlist"), ...base }).strict(),
  z
    .object({
      topic: z.literal("password_help"),
      ...base,
      email: z
        .string()
        .trim()
        .toLowerCase()
        .max(254)
        .pipe(z.email("Informe o e-mail da sua conta.")),
    })
    .strict(),
]);

export const handleSchema = z.object({ requestId: z.uuid() }).strict();
