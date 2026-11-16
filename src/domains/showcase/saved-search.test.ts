import { describe, expect, it } from "vitest";
import { savedSearch, searchLabel } from "./saved-search";

describe("busca guardada no alerta", () => {
  it("[ALR-FR-001] vitrine: filtros na ordem da URL, sem a ordenação", () => {
    expect(
      savedSearch(
        null,
        "q=Fiat+Toro&ordem=menor-preco&cambio=automatico&lixo=1",
      ),
    ).toEqual({ query: "cambio=automatico&q=Fiat+Toro", discoveryPath: null });
  });

  it("[ALR-FR-001] descoberta: guarda a página; marca fixa sai dos filtros", () => {
    expect(
      savedSearch(
        { kind: "discovery", path: "/carros/fiat/toro" },
        "marca=bmw&preco_ate=120000",
      ),
    ).toEqual({
      query: "preco_ate=120000",
      discoveryPath: "/carros/fiat/toro",
    });
    expect(
      savedSearch(
        { kind: "discovery", path: "/carros/aracaju-se" },
        "marca=fiat",
      ),
    ).toEqual({ query: "marca=fiat", discoveryPath: "/carros/aracaju-se" });
  });

  it("[ALR-FR-001] catálogo da loja e página inválida não têm alerta", () => {
    expect(savedSearch({ kind: "store", slug: "loja-a" }, "q=toro")).toBeNull();
    expect(
      savedSearch({ kind: "discovery", path: "/carros/<script>" }, ""),
    ).toBeNull();
    expect(savedSearch({ kind: "discovery", path: "/v/abc" }, "")).toBeNull();
  });

  it("[ALR-FR-003] rótulo da busca para o admin, em português", () => {
    expect(
      searchLabel({
        query:
          "ano_de=2018&ano_ate=2022&cambio=automatico&combustivel=flex&km_ate=80000&marca=fiat,bmw&preco_ate=120000&q=Toro",
        discoveryPath: null,
      }),
    ).toBe(
      "“Toro” · fiat, bmw · até R$ 120.000 · 2018 a 2022 · até 80.000 km · Automático · Flex",
    );
    expect(
      searchLabel({
        query: "preco_de=50000",
        discoveryPath: "/carros/fiat/toro",
      }),
    ).toBe("/carros/fiat/toro · a partir de R$ 50.000");
    expect(searchLabel({ query: "", discoveryPath: null })).toBe(
      "Qualquer veículo",
    );
  });
});
