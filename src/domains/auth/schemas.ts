import { z } from "zod";
import { userRole } from "@/platform/db/schema";

/** Entrada do login [9f]. Sem campos de papel, loja ou painel (AUT-SEC-002). */
export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Informe um e-mail válido.")),
  password: z.string().min(1, "Informe a senha.").max(200),
  next: z.string().max(2000).optional(),
});

export type SignInInput = z.input<typeof signInSchema>;

/** Papel escolhido na troca de painel; a action ainda confere se a conta o tem. */
export const panelSchema = z.enum(userRole.enumValues);

/** Nova senha (AUT-FR-015): mínimo de 8 e confirmação igual. */
export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Use pelo menos 8 caracteres.")
      .max(200, "Use no máximo 200 caracteres."),
    confirmation: z.string(),
  })
  .refine((v) => v.password === v.confirmation, {
    path: ["confirmation"],
    message: "As senhas não conferem.",
  });

/** E-mail digitado na busca de conta do admin. */
export const accountEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email());

/** Id de conta vindo de formulário (ex.: alvo da senha temporária). */
export const userIdSchema = z.uuid();
