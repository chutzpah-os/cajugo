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
        "Informe DDD e número (ex.: (79) 98136-0206).",
      ),
  )
  .transform((d) => `55${d}`);
