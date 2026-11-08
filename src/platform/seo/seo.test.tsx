import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { storeUrl } from "../http/urls";
import { JsonLd, jsonLdText, pageMetadata } from "./seo";

describe("SEO", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("[STO-NFR-001] metadata com título, descrição, canônica absoluta e Open Graph", () => {
    vi.stubEnv("APP_URL", "https://cajugo.vercel.app");

    const meta = pageMetadata({
      title: "Catálogo de carros para sua loja",
      description: "Seu estoque online hoje, com vitrine na CajuGo.",
      path: "/lojistas",
    });

    expect(meta).toMatchObject({
      title: "Catálogo de carros para sua loja | CajuGo",
      description: "Seu estoque online hoje, com vitrine na CajuGo.",
      alternates: { canonical: "https://cajugo.vercel.app/lojistas" },
      openGraph: {
        title: "Catálogo de carros para sua loja | CajuGo",
        url: "https://cajugo.vercel.app/lojistas",
        siteName: "CajuGo",
        locale: "pt_BR",
        type: "website",
      },
      twitter: { card: "summary_large_image" },
    });
  });

  it("[STO-NFR-001] a canônica nunca leva parâmetros (filtros, ?ref=, ?codigo=)", () => {
    vi.stubEnv("APP_URL", "https://cajugo.vercel.app/");

    const meta = pageMetadata({
      title: "X",
      description: "Y",
      path: "/lojistas?codigo=RICARDO10#faq",
    });

    expect(meta.alternates?.canonical).toBe(
      "https://cajugo.vercel.app/lojistas",
    );
  });

  it("[STO-NFR-001] JSON-LD é escapado: texto do usuário não fecha o <script>", () => {
    const text = jsonLdText({
      "@context": "https://schema.org",
      "@type": "AutoDealer",
      name: "</script><script>alert(1)</script>",
    });

    expect(text).not.toContain("</script>");
    expect(JSON.parse(text).name).toBe("</script><script>alert(1)</script>");
    const html = renderToStaticMarkup(<JsonLd data={{ "@type": "Thing" }} />);
    expect(html).toContain('type="application/ld+json"');
  });

  it("[STO-FR-011] endereço do catálogo da loja vem de uma função só", () => {
    vi.stubEnv("APP_URL", "https://cajugo.vercel.app/");

    expect(storeUrl("silvautocar")).toBe(
      "https://cajugo.vercel.app/loja/silvautocar",
    );
  });
});
