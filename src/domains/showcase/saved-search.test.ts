import { describe, expect, it } from "vitest";
import { savedSearch } from "./saved-search";

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
});
