import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { parseFilters } from "../filters";
import { CatalogToolbar } from "./catalog-toolbar";
import { NoResults } from "./no-results";
import { SortSelect } from "./sort-select";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("../actions", () => ({ countMatchesAction: vi.fn() }));

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
      store={null}
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
