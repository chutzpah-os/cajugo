import { beforeEach, describe, expect, it, vi } from "vitest";

const showcase = vi.hoisted(() => ({
  favoriteCards: vi.fn(async (_db: unknown, ids: string[]) =>
    ids.slice(0, 1).map((id) => ({ vehicleId: id })),
  ),
  similarPaths: vi.fn(async (_db: unknown, ids: string[]) =>
    Object.fromEntries(ids.map((id) => [id, "/carros/fiat/argo"])),
  ),
}));
vi.mock("@/domains/showcase/service", () => showcase);
vi.mock("@/platform/db/client", () => ({ getDb: () => ({ db: true }) }));

const { favoriteCardsAction } = await import("./actions");

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("leitura dos favoritos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("[BUY-SEC-001] só lê: devolve os cards atuais dos ids, sem repetir", async () => {
    // Act
    const result = await favoriteCardsAction({ ids: [id(1), id(2), id(1)] });

    // Assert
    expect(result).toEqual({
      cards: [{ vehicleId: id(1) }],
      similar: { [id(2)]: "/carros/fiat/argo" },
    });
    expect(showcase.similarPaths).toHaveBeenCalledWith({ db: true }, [id(2)]);
    expect(showcase.favoriteCards).toHaveBeenCalledWith({ db: true }, [
      id(1),
      id(2),
    ]);
  });

  it("[BUY-NFR-004] [BUY-SEC-002] entrada fora do formato não chega à consulta", async () => {
    for (const input of [
      { ids: [] },
      { ids: ["nao-e-uuid"] },
      { ids: Array.from({ length: 201 }, (_, n) => id(n)) },
      { ids: [id(1)], storeId: "loja-a" },
      null,
    ])
      expect(await favoriteCardsAction(input)).toBeNull();
    expect(showcase.favoriteCards).not.toHaveBeenCalled();
  });

  it("[BUY-FR-005] falha na leitura devolve null, para a tela oferecer Tentar de novo", async () => {
    showcase.favoriteCards.mockRejectedValueOnce(new Error("banco fora"));
    expect(await favoriteCardsAction({ ids: [id(1)] })).toBeNull();
  });
});
