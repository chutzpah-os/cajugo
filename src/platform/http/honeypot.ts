/** Nome do campo invisível dos formulários públicos (SECURITY.md §6). */
export const HONEYPOT_FIELD = "website";

/** Bots preenchem todos os campos; pessoas não veem este. Preenchido = descartar em silêncio. */
export function isHoneypotFilled(form: FormData): boolean {
  return filled(form.get(HONEYPOT_FIELD));
}

/** O mesmo, para a entrada de uma Server Action (objeto em vez de `FormData`). */
export function isHoneypotFilledIn(input: unknown): boolean {
  return (
    typeof input === "object" &&
    input !== null &&
    filled((input as Record<string, unknown>)[HONEYPOT_FIELD])
  );
}

const filled = (value: unknown) =>
  typeof value === "string" && value.trim() !== "";
