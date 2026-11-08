import { afterEach, describe, expect, it, vi } from "vitest";
import { robotsRules, staticSitemap } from "./indexing";

describe("indexação", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("[STO-NFR-001] robots bloqueia as áreas logadas e libera os cadastros públicos", () => {
    vi.stubEnv("APP_URL", "https://cajugo.vercel.app");

    const robots = robotsRules();

    expect(robots.sitemap).toBe("https://cajugo.vercel.app/sitemap.xml");
    expect(robots.rules).toMatchObject({
      userAgent: "*",
      allow: expect.arrayContaining([
        "/",
        "/rede/cadastro",
        "/indica/cadastro",
      ]),
      disallow: expect.arrayContaining([
        "/painel",
        "/rede",
        "/indica",
        "/admin",
        "/entrar",
        "/conta",
        "/nova-senha",
        "/lojistas/pagamento",
        "/api",
      ]),
    });
  });

  it("[STO-NFR-001] sitemap tem as páginas públicas desta fase, com endereço absoluto", () => {
    vi.stubEnv("APP_URL", "https://cajugo.vercel.app");

    const urls = staticSitemap().map((e) => e.url);

    expect(urls).toEqual([
      "https://cajugo.vercel.app/",
      "https://cajugo.vercel.app/lojistas",
      "https://cajugo.vercel.app/termos",
    ]);
  });

  it("[PIX-NFR-002] telas de pagamento e de conferência ficam fora da busca e do sitemap", () => {
    const disallow = [robotsRules().rules].flat()[0]?.disallow as string[];
    const blocked = (path: string) =>
      disallow.some((p) => path === p || path.startsWith(`${p}/`));

    for (const path of [
      "/lojistas/pagamento",
      "/lojistas/pagamento/pix",
      "/painel/pagamento",
      "/painel/veiculos",
      "/admin/pagamentos",
      "/api/v1/payments/x/receipt",
    ])
      expect(blocked(path), path).toBe(true);
    const urls = staticSitemap().map((e) => new URL(e.url).pathname);
    expect(urls.some((u) => /pagamento|painel|admin|api/.test(u))).toBe(false);
  });
});
