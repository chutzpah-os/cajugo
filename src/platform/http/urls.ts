/**
 * Endereço público do site (`APP_URL`), sem barra no fim. Sem a variável, local e
 * Preview usam `http://localhost:3000`; no deploy de produção é erro (o build para),
 * para canônica, sitemap e links nunca saírem com localhost (SEO.md).
 */
export function appUrl(): string {
  const url = process.env.APP_URL?.trim();
  if (!url) {
    if (process.env.VERCEL_ENV === "production")
      throw new Error("Defina APP_URL no ambiente de produção.");
    return "http://localhost:3000";
  }
  return url.replace(/\/+$/, "");
}

/** Única função que monta o endereço do catálogo de uma loja (ADR 0009). */
export function storeUrl(slug: string): string {
  return `${appUrl()}/loja/${slug}`;
}
