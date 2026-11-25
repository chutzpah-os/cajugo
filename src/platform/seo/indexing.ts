import type { MetadataRoute } from "next";
import { appUrl } from "../http/urls";

/** Um sitemap por tipo de página (SEO.md §2), listados no robots.txt. */
export const SITEMAP_IDS = [
  "pages",
  "stores",
  "vehicles",
  "discovery",
] as const;

export type SitemapId = (typeof SITEMAP_IDS)[number];

/** Áreas logadas e telas de conta: fora da busca (SEO.md §2). */
const PRIVATE = [
  "/painel",
  "/rede-caju",
  "/indica",
  "/admin",
  "/entrar",
  "/conta",
  "/nova-senha",
  "/recuperar",
  "/lojistas/pagamento",
  "/alertas",
  "/api",
];
/** Cadastros públicos dentro de áreas bloqueadas. */
const PUBLIC_EXCEPTIONS = ["/rede-caju/cadastro", "/indica/cadastro"];

export function robotsRules(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", ...PUBLIC_EXCEPTIONS],
      disallow: PRIVATE,
    },
    sitemap: SITEMAP_IDS.map((id) => `${appUrl()}/sitemap/${id}.xml`),
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
    { url: `${base}/veiculos`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/lojistas`, changeFrequency: "monthly", priority: 0.8 },
    {
      url: `${base}/conheca/lojistas`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/conheca/caju-indica`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/conheca/rede-caju`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/conheca/leilao`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    { url: `${base}/termos`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
