import { describe, expect, it } from "vitest";
import {
  activeFilters,
  filterHref,
  filtersFromQuery,
  filtersToQuery,
  normalizeFilters,
  parseFilters,
} from "./filters";

describe("filtros na URL", () => {
  it("[SHW-FR-005] lê da URL, com marcas múltiplas e valores em português", () => {
    const f = parseFilters({
      marca: "bmw,audi",
      preco_de: "30000",
      preco_ate: "80000",
      ano_de: "2018",
      ano_ate: "2022",
      km_ate: "60000",
      cambio: "automatico,manual",
      combustivel: "flex",
      ordem: "menor-preco",
      q: "onix",
    });

    expect(f).toEqual({
      makes: ["bmw", "audi"],
      priceFrom: 3000000,
      priceTo: 8000000,
      yearFrom: 2018,
      yearTo: 2022,
      kmTo: 60000,
      transmissions: ["automatic", "manual"],
      fuels: ["flex"],
      sort: "price_asc",
      q: "onix",
    });
    expect(activeFilters(f)).toBe(6);
  });

  it("[SHW-FR-005] volta para a URL e ida e volta dá o mesmo resultado", () => {
    const query = "marca=bmw&cambio=automatico&ordem=recentes";

    expect(
      filtersToQuery(
        parseFilters(Object.fromEntries(new URLSearchParams(query))),
      ),
    ).toBe(query);
    expect(filtersToQuery(parseFilters({}))).toBe("");
  });

  it("[SHW-SEC-004] valor inválido é ignorado, sem erro", () => {
    const f = parseFilters({
      ordem: "<script>",
      preco_ate: "abc",
      ano_de: "1",
      km_ate: "-5",
      cambio: "foguete",
      marca: "../../etc,bmw",
      q: "x".repeat(200),
    });

    expect(f).toMatchObject({
      sort: "relevance",
      makes: ["bmw"],
      transmissions: [],
    });
    expect(f.priceTo).toBeUndefined();
    expect(f.yearFrom).toBeUndefined();
    expect(f.kmTo).toBeUndefined();
    expect(f.q?.length).toBe(60);
  });
});

describe("endereço dos filtros", () => {
  it("[SHW-FR-005] filterHref não deixa interrogação sem filtro", () => {
    expect(filterHref("/", parseFilters({}))).toBe("/");
    expect(filterHref("/loja/x", parseFilters({ marca: "bmw" }))).toBe(
      "/loja/x?marca=bmw",
    );
  });

  it("[SHW-FR-005] filtersFromQuery lê o texto do endereço", () => {
    expect(
      filtersFromQuery("marca=bmw&cambio=automatico").transmissions,
    ).toEqual(["automatic"]);
  });

  it("[SHW-SEC-004] normalizeFilters descarta o que foi digitado pela metade", () => {
    // Act
    const f = normalizeFilters({ ...parseFilters({}), yearFrom: 20 });

    // Assert
    expect(f.yearFrom).toBeUndefined();
    expect(filterHref("/", f)).toBe("/");
  });
});
