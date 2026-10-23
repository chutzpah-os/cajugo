import { z } from "zod";

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
