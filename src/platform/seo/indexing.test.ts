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
});
