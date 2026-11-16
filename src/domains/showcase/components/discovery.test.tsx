import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { discoveryFilters, parseFilters } from "../filters";
import type { DiscoveryPage } from "../service";
import { Breadcrumbs } from "./breadcrumbs";
import { discoveryMetadata, DiscoveryEmpty } from "./discovery-parts";
import { FiltersSide } from "./filters-side";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../actions", () => ({
  countMatchesAction: vi.fn(),
  loadMoreAction: vi.fn(),
}));

const ARGO: DiscoveryPage = {
  kind: "listing",
  key: { makeSlug: "fiat", modelSlug: "argo" },
  path: "/carros/fiat/argo",
  names: { make: "Fiat", model: "Argo" },
  crumbs: [
    { name: "Início", path: "/" },
    { name: "Carros", path: "/carros" },
    { name: "Fiat", path: "/carros/fiat" },
    { name: "Argo", path: "/carros/fiat/argo" },
  ],
  stats: {
    total: 3,
    stores: 2,
    cities: 2,
    minPriceCents: 5_000_000,
    maxPriceCents: 7_000_000,
  },
  fallback: null,
};

describe("telas de descoberta", () => {
  it("[DSC-FR-006] metadados com título, descrição e canônica sem filtros", () => {
    // Act
    const meta = discoveryMetadata(ARGO, { filtered: true, total: 3 });

    // Assert
    expect(meta.title).toBe("Fiat Argo usados à venda | CajuGo");
    expect(meta.description).toContain("de R$ 50.000 a R$ 70.000");
    expect(meta.alternates?.canonical).toMatch(/\/carros\/fiat\/argo$/);
    expect(meta.robots).toBeUndefined();
  });

  it("[DSC-FR-005] [DSC-SEC-002] vazia ou filtrada sem resultado fica fora do Google", () => {
    const empty = { ...ARGO, kind: "empty" as const };
    expect(
      discoveryMetadata(empty, { filtered: false, total: 0 }).robots,
    ).toEqual({
      index: false,
      follow: true,
    });
    expect(
      discoveryMetadata(ARGO, { filtered: true, total: 0 }).robots,
    ).toEqual({
      index: false,
      follow: true,
    });
  });

  it("[DSC-FR-007] caminho de navegação com os anteriores clicáveis e o atual marcado", () => {
    // Act
    const html = renderToStaticMarkup(<Breadcrumbs crumbs={ARGO.crumbs} />);

    // Assert
    expect(html).toContain('aria-label="Caminho"');
    expect(html).toContain('href="/carros/fiat"');
    expect(html).toMatch(/aria-current="page"[^>]*>Argo</);
    expect(html).not.toContain('href="/carros/fiat/argo"');
  });

  it("[DSC-FR-005] página vazia diz o que falta e leva à página acima", () => {
    // Act
    const html = renderToStaticMarkup(
      <DiscoveryEmpty
        page={{
          ...ARGO,
          kind: "empty",
          fallback: {
            key: { makeSlug: "fiat" },
            path: "/carros/fiat",
            name: "Fiat",
          },
        }}
      />,
    );

    // Assert
    expect(html).toContain("Nenhum Fiat Argo à venda agora");
    expect(html).toContain('href="/carros/fiat"');
  });

  it("[DSC-FR-004] marca fixa: a URL não troca a marca e o filtro de marca some", () => {
    // Act
    const filters = discoveryFilters(
      ARGO.key,
      parseFilters({ marca: "bmw", cambio: "cvt" }),
    );
    const html = renderToStaticMarkup(
      <FiltersSide
        filters={filters}
        makes={[{ slug: "fiat", name: "Fiat", count: 3 }]}
        total={3}
        basePath="/carros/fiat/argo"
        source={{ kind: "discovery", path: "/carros/fiat/argo" }}
        lockMake
      />,
    );

    // Assert
    expect(filters.makes).toEqual([]);
    expect(filters.transmissions).toEqual(["cvt"]);
    expect(html).not.toContain('id="lateral-marca"');
  });
});
