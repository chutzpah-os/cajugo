/** Unicidade violada no Postgres (código 23505), procurando também na causa do erro. */
export function isUniqueViolation(error: unknown): boolean {
  for (
    let e = error;
    e && typeof e === "object";
    e = (e as { cause?: unknown }).cause
  )
    if ((e as { code?: string }).code === "23505") return true;
  return false;
}
