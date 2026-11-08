import type { MetadataRoute } from "next";
import { appUrl } from "../http/urls";

/** Áreas logadas e telas de conta: fora da busca (SEO.md §2). */
const PRIVATE = [
  "/painel",
  "/rede",
  "/indica",
  "/admin",
  "/entrar",
  "/conta",
  "/nova-senha",
  "/recuperar",
  "/lojistas/pagamento",
  "/api",
];
/** Cadastros públicos dentro de áreas bloqueadas. */
const PUBLIC_EXCEPTIONS = ["/rede/cadastro", "/indica/cadastro"];

export function robotsRules(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", ...PUBLIC_EXCEPTIONS],
      disallow: PRIVATE,
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}

/**
 * Páginas públicas fixas. Lojas, veículos e páginas de descoberta entram com as
 * specs 005 e 006 (SEO.md §2: sitemap índice por tipo).
 */
export function staticSitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/lojistas`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/termos`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
