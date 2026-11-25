import { z } from "zod";

/** Telefone/WhatsApp brasileiro com DDD, guardado como `55` + dígitos. */
export const brPhoneSchema = z
  .string()
  .transform((s) => s.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""))
  .pipe(
    z
      .string()
      .regex(
        /^[1-9]{2}9?\d{8}$/,
        "Informe DDD e número (ex.: (79) 99999-0000).",
      ),
  )
  .transform((d) => `55${d}`);

/**
 * Celular brasileiro (WhatsApp) com DDD: DDD + 9 + 8 dígitos, guardado como `55` +
 * dígitos. Telefone fixo não recebe WhatsApp do jeito que o aviso precisa (ALR-FR-001).
 */
export const brMobileSchema = z
  .string()
  .transform((s) => s.replace(/\D/g, "").replace(/^55(?=\d{11}$)/, ""))
  .pipe(
    z
      .string()
      .regex(/^[1-9]{2}9\d{8}$/, "Informe um celular com WhatsApp, com DDD."),
  )
  .transform((d) => `55${d}`);

/** `55` + DDD + número → `(79) 99999-0000`; outro formato volta como veio. */
export function formatBrPhone(stored: string): string {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(stored);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : stored;
}
