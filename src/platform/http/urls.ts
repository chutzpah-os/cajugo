/** Endereço público do site (`APP_URL`), sem barra no fim. */
export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/** Única função que monta o endereço do catálogo de uma loja (ADR 0009). */
export function storeUrl(slug: string): string {
  return `${appUrl()}/loja/${slug}`;
}
