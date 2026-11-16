import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PublicCard } from "@/domains/showcase/service";
import { staticSitemap } from "@/platform/seo/indexing";

vi.mock("../actions", () => ({ favoriteCardsAction: vi.fn() }));
const { FavoritesView, priceDrop } = await import("./favorites-view");

const entry = (priceCents: number | null) => ({
  id: "00000000-0000-4000-8000-000000000001",
  path: "/v/x",
  title: "Fiat Argo 2022",
  priceCents,
  savedAt: "2026-11-16T10:00:00.000Z",
});
const card = (priceCents: number | null) =>
  ({ vehicleId: entry(0).id, priceCents }) as PublicCard;

describe("Favoritos [14a]", () => {
  it("[BUY-FR-006] selo só quando o preço baixou desde que favoritou", () => {
    expect(priceDrop(entry(8_000_000), card(7_600_000))).toBe(400_000);
    expect(priceDrop(entry(8_000_000), card(8_000_000))).toBeNull();
    expect(priceDrop(entry(8_000_000), card(8_100_000))).toBeNull();
    expect(priceDrop(entry(null), card(7_600_000))).toBeNull();
    expect(priceDrop(entry(8_000_000), card(null))).toBeNull();
  });

  it("[BUY-NFR-002] o HTML do servidor é o mesmo para todos: só o esqueleto", () => {
    const html = renderToStaticMarkup(<FavoritesView cloudName="demo" />);
    expect(html).toContain("animate-pulse");
    expect(html).not.toContain("Nenhum favorito");
  });

  it("[BUY-FR-005] a página pessoal fica fora do sitemap", () => {
    vi.stubEnv("APP_URL", "https://cajugo.test");
    expect(staticSitemap().map((e) => e.url)).not.toContain(
      "https://cajugo.test/favoritos",
    );
    vi.unstubAllEnvs();
  });
});
