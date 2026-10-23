/** Nome do campo invisível dos formulários públicos (SECURITY.md §6). */
export const HONEYPOT_FIELD = "website";

/** Bots preenchem todos os campos; pessoas não veem este. Preenchido = descartar em silêncio. */
export function isHoneypotFilled(form: FormData): boolean {
  const value = form.get(HONEYPOT_FIELD);
  return typeof value === "string" && value.trim() !== "";
}
