import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { parseFilters } from "../filters";
import type { PublicCard, SearchResult } from "../service";
import ErrorPage from "@/app/error";
import { CatalogToolbar } from "./catalog-toolbar";
import { CatalogList } from "./catalog-list";
import { CatalogSkeleton } from "./catalog-skeleton";
import { FiltersSide } from "./filters-side";
import { NoResults } from "./no-results";
import { showcaseMetadata } from "./showcase-view";
import { SortSelect } from "./sort-select";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("../actions", () => ({
  countMatchesAction: vi.fn(),
  loadMoreAction: vi.fn(),
}));

const MAKES = [
  { slug: "bmw", name: "BMW", count: 2 },
  { slug: "fiat", name: "Fiat", count: 9 },
];

function toolbar(params: Record<string, string>) {
  return renderToStaticMarkup(
    <CatalogToolbar
      filters={parseFilters(params)}
      makes={MAKES}
      total={3}
      basePath="/"
      source={null}
    />,
  );
}

describe("barra de busca e filtros [1a]", () => {
  it("[SHW-FR-005] chip Filtros mostra quantos estão ativos", () => {
    // Act
    const html = toolbar({ marca: "bmw", cambio: "automatico" });

    // Assert
    expect(html).toMatch(/data-testid="filters-chip"[^>]*>.*Filtros.*>2</);
  });

  it("[SHW-FR-005] sem filtro ativo o chip não mostra número", () => {
    expect(toolbar({})).toMatch(/data-testid="filters-chip"[^>]*>Filtros</);
  });

  it("[SHW-FR-004] a busca guarda os outros filtros e não repete o próprio termo", () => {
    // Act
    const html = toolbar({ marca: "bmw", q: "x3" });

    // Assert
    expect(html).toContain('placeholder="Buscar marca, modelo ou versão"');
    expect(html).toContain('value="x3"');
    expect(html).toMatch(/type="hidden"[^>]*name="marca"[^>]*value="bmw"/);
    expect(html).not.toMatch(/type="hidden"[^>]*name="q"/);
  });
});

describe("ordenação [1a]", () => {
  it("[SHW-FR-006] oferece as seis ordens, com a atual marcada", () => {
    // Act
    const html = renderToStaticMarkup(
      <SortSelect
        filters={parseFilters({ ordem: "menor-preco" })}
        basePath="/"
      />,
    );

    // Assert
    for (const label of [
      "Mais relevantes",
      "Menor preço",
      "Maior preço",
      "Mais recentes",
      "Menor km",
      "Ano mais novo",
    ])
      expect(html).toContain(label);
    expect(html).toMatch(/value="price_asc" selected/);
  });
});

describe("busca sem resultado [12a]", () => {
  it("[SHW-FR-012] sugere limpar filtros e buscar só a marca escolhida", () => {
    // Act
    const html = renderToStaticMarkup(
      <NoResults
        filters={parseFilters({ marca: "bmw", cambio: "cvt" })}
        basePath="/"
      />,
    );

    // Assert
    expect(html).toContain("Limpar filtros");
    expect(html).toContain('href="/?marca=bmw"');
  });

  it("[SHW-FR-012] sem marca, usa a 1ª palavra da busca", () => {
    // Act
    const html = renderToStaticMarkup(
      <NoResults
        filters={parseFilters({ q: "corolla xei" })}
        basePath="/loja/x"
      />,
    );

    // Assert
    expect(html).toContain('href="/loja/x?q=corolla"');
  });
});

const CARD: PublicCard = {
  vehicleId: "v1",
  path: "/v/v1-fiat-argo-2022-aracaju-se",
  make: "Fiat",
  model: "Argo",
  version: "Drive",
  yearManufacture: 2021,
  yearModel: 2022,
  mileageKm: 1000,
  city: "Aracaju",
  state: "SE",
  priceCents: 5000000,
  installmentCents: null,
  coverPublicId: null,
  photoCount: 1,
  badge: null,
  storeName: "Loja",
};

function list(result: Partial<SearchResult>) {
  return renderToStaticMarkup(
    <CatalogList
      result={{
        items: [CARD],
        total: 1,
        stores: 1,
        nextCursor: null,
        ...result,
      }}
      cloudName="demo"
      showStore
      source={null}
      query=""
      empty={<p>vazio</p>}
    />,
  );
}

describe("lista do catálogo", () => {
  it("[SHW-NFR-002] os cards saem no HTML do servidor", () => {
    expect(list({})).toContain(CARD.path);
  });

  it("[SHW-FR-007] botão só aparece quando há mais página", () => {
    expect(list({})).not.toContain("Carregar mais veículos");
    expect(list({ nextCursor: "abc" })).toContain("Carregar mais veículos");
  });

  it("[SHW-FR-012] lista vazia mostra o estado recebido", () => {
    expect(list({ items: [], total: 0 })).toContain("vazio");
  });

  it("[SHW-FR-012] esqueleto tem o formato do card", () => {
    expect(renderToStaticMarkup(<CatalogSkeleton />)).toContain(
      'data-testid="catalog-skeleton"',
    );
  });

  it("[SHW-FR-012] erro de carregamento mostra Tentar de novo", () => {
    // Act
    const html = renderToStaticMarkup(
      <ErrorPage error={new Error("x")} retry={() => {}} />,
    );

    // Assert
    expect(html).toContain("Tentar de novo");
    expect(html).not.toContain("Error: x");
  });
});

describe("desktop [15a]", () => {
  it("[SHW-NFR-001] filtros laterais sem repetir a ordenação e sem id igual ao da folha", () => {
    // Act
    const html = renderToStaticMarkup(
      <FiltersSide
        filters={parseFilters({})}
        makes={MAKES}
        total={3}
        basePath="/"
        source={null}
      />,
    );

    // Assert
    expect(html).toContain("Câmbio");
    expect(html).not.toContain("Ordenar por");
    expect(html).toContain('id="lateral-marca"');
    expect(html).not.toContain('id="filtro-marca"');
  });
});

describe("vitrine vazia", () => {
  it("[SHW-FR-001] sem veículo fica fora do Google; com o 1º, volta sozinha", () => {
    // Act
    const empty = showcaseMetadata({
      items: [],
      total: 0,
      stores: 0,
      nextCursor: null,
    });
    const full = showcaseMetadata({
      items: [CARD],
      total: 1,
      stores: 1,
      nextCursor: null,
    });

    // Assert
    expect(empty.robots).toEqual({ index: false, follow: true });
    expect(full.robots).toBeUndefined();
  });
});
