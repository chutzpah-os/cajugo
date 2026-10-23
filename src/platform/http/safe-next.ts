/**
 * Destino do `?next=` depois do login: só caminho interno (AUT-SEC-005).
 * Qualquer outra coisa (site externo, `//`, `\`, codificados, controle) vira `fallback`.
 */
export function safeNext(
  next: string | null | undefined,
  fallback: string,
): string {
  if (!next || !next.startsWith("/")) return fallback;
  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  if (/^\/[/\\]|\\|[\u0000-\u001f\u007f]/.test(decoded)) return fallback;
  if (decoded === "/entrar" || decoded.startsWith("/entrar?")) return fallback;
  return next;
}
