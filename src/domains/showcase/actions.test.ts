import { beforeEach, describe, expect, it, vi } from "vitest";

const current = vi.hoisted(() => ({
  cachedCount: vi.fn(async () => 7),
  cachedSearch: vi.fn(async () => ({ items: [], nextCursor: null })),
  cachedStorePage: vi.fn(async (slug: string) =>
    slug === "loja-a" ? { kind: "store", storeId: "s-a" } : null,
  ),
}));
vi.mock("./current", () => current);

const { countMatchesAction, loadMoreAction } = await import("./actions");

describe("actions públicas da lista", () => {
  beforeEach(() => vi.clearAllMocks());

  it("[DSC-FR-004] página de descoberta conta e carrega no próprio recorte", async () => {
    // Act
    const n = await countMatchesAction({
      source: { kind: "discovery", path: "/carros/fiat/argo" },
      query: "cambio=automatico",
    });
    await loadMoreAction({
      source: { kind: "discovery", path: "/carros/campinas-sp/fiat" },
      query: "",
      cursor: "abc",
    });

    // Assert
    expect(n).toBe(7);
    expect(current.cachedCount).toHaveBeenCalledWith(
      { discovery: { makeSlug: "fiat", modelSlug: "argo" } },
      expect.objectContaining({ transmissions: ["automatic"] }),
    );
    expect(current.cachedSearch).toHaveBeenCalledWith(
      { discovery: { citySlug: "campinas-sp", makeSlug: "fiat" } },
      expect.anything(),
      "abc",
    );
  });

  it("[SHW-FR-005] vitrine e catálogo de loja continuam iguais", async () => {
    await countMatchesAction({ source: null, query: "" });
    await countMatchesAction({
      source: { kind: "store", slug: "loja-a" },
      query: "",
    });

    expect(current.cachedCount).toHaveBeenNthCalledWith(
      1,
      "showcase",
      expect.anything(),
    );
    expect(current.cachedCount).toHaveBeenNthCalledWith(
      2,
      { storeId: "s-a" },
      expect.anything(),
    );
  });

  it("[DSC-SEC-004] origem inválida não chega à consulta", async () => {
    // Act
    const results = [
      await countMatchesAction({
        source: { kind: "discovery", path: "/carros/<script>" },
        query: "",
      }),
      await countMatchesAction({
        source: { kind: "discovery", path: "/loja/x" },
        query: "",
      }),
      await countMatchesAction({ source: { kind: "admin" }, query: "" }),
      await countMatchesAction({ store: null, query: "" }),
    ];

    // Assert
    expect(results).toEqual([0, 0, null, null]);
    expect(current.cachedCount).not.toHaveBeenCalled();
  });
});
