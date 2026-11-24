import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { sales } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { sellerStatement } from "./service";
import { activeSeller, soldBy } from "./testing/fixtures";

const NOW = new Date("2026-11-23T12:00:00Z");
const day = (d: number) =>
  new Date(`2026-11-${String(d).padStart(2, "0")}T12:00:00Z`);

describe("extrato do vendedor [7d]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  async function anaWithTwo() {
    const ana = await activeSeller(t.db, "ANA", { name: "Ana" });
    const a = await liveStore(t.db, "loja-a");
    const b = await liveStore(t.db, "loja-b");
    const argo = await car(t.db, a.storeId, { make: "Fiat", model: "ARGO" });
    const x1 = await car(t.db, b.storeId, { make: "BMW", model: "X1" });
    const argoSale = await soldBy(t.db, {
      sellerId: ana.userId,
      storeId: a.storeId,
      confirmedBy: a.userId,
      vehicleId: argo.id,
      at: day(20),
    });
    const x1Sale = await soldBy(t.db, {
      sellerId: ana.userId,
      storeId: b.storeId,
      confirmedBy: b.userId,
      vehicleId: x1.id,
      commissionCents: 80_000,
      status: "paid",
      at: day(10),
    });
    return { ana, a, b, argoSale, x1Sale };
  }

  it("[EXT-FR-001] lista as vendas, da mais recente, com veículo, loja, data, valor final, comissão e status", async () => {
    // Arrange
    const { ana } = await anaWithTwo();

    // Act
    const view = await sellerStatement(t.db, ana, {}, NOW);

    // Assert
    expect(view.items).toEqual([
      expect.objectContaining({
        vehicle: "Fiat ARGO",
        store: "Loja loja-a",
        date: day(20),
        finalPriceCents: 5_800_000,
        commissionCents: 116_000,
        status: "to_receive",
        canUndoUntil: null,
      }),
      expect.objectContaining({
        vehicle: "BMW X1",
        store: "Loja loja-b",
        commissionCents: 80_000,
        status: "paid",
      }),
    ]);
  });

  it("[EXT-FR-002] filtros com contagens; 'a-receber' mostra só a do Fiat Argo", async () => {
    const { ana } = await anaWithTwo();

    const view = await sellerStatement(t.db, ana, { filtro: "a-receber" }, NOW);
    const junk = await sellerStatement(t.db, ana, { filtro: "xyz" }, NOW);

    expect(view.filter).toBe("a-receber");
    expect(view.counts).toEqual({ all: 2, toReceive: 1, paid: 1 });
    expect(view.items.map((i) => i.vehicle)).toEqual(["Fiat ARGO"]);
    expect(junk.filter).toBe("todas");
  });

  it("[EXT-FR-007] a venda desfeita pela loja some do extrato e das contagens", async () => {
    const { ana, argoSale } = await anaWithTwo();
    await t.db
      .update(sales)
      .set({ canceledAt: day(21) })
      .where(eq(sales.id, argoSale.id));

    const view = await sellerStatement(t.db, ana, {}, NOW);

    expect(view.items.map((i) => i.vehicle)).toEqual(["BMW X1"]);
    expect(view.counts.all).toBe(1);
  });

  it("[EXT-FR-008] sem vendas: lista vazia e contagens zeradas", async () => {
    const bia = await activeSeller(t.db, "BIA");

    const view = await sellerStatement(t.db, bia, {}, NOW);

    expect(view).toMatchObject({
      items: [],
      counts: { all: 0, toReceive: 0, paid: 0 },
      nextCursor: null,
    });
  });

  it("[EXT-NFR-002] 20 por vez, com cursor para as seguintes", async () => {
    const ana = await activeSeller(t.db, "ANA");
    const a = await liveStore(t.db, "loja-a");
    for (let i = 1; i <= 25; i++) {
      const v = await car(t.db, a.storeId);
      await soldBy(t.db, {
        sellerId: ana.userId,
        storeId: a.storeId,
        confirmedBy: a.userId,
        vehicleId: v.id,
        at: new Date(Date.UTC(2026, 10, 1, i)),
      });
    }

    const first = await sellerStatement(t.db, ana, {}, NOW);
    const second = await sellerStatement(
      t.db,
      ana,
      { cursor: first.nextCursor },
      NOW,
    );

    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(5);
    expect(second.nextCursor).toBeNull();
    const ids = [...first.items, ...second.items].map((i) => i.saleId);
    expect(new Set(ids).size).toBe(25);
  });

  it("[EXT-SEC-001] [EXT-SEC-003] a vendedora B vê só as dela; nenhum dado do comprador sai", async () => {
    const { ana } = await anaWithTwo();
    const bia = await activeSeller(t.db, "BIA");

    const mine = await sellerStatement(t.db, ana, {}, NOW);
    const hers = await sellerStatement(t.db, bia, {}, NOW);

    expect(hers.items).toEqual([]);
    expect(Object.keys(mine.items[0]).sort()).toEqual(
      [
        "canUndoUntil",
        "commissionCents",
        "date",
        "finalPriceCents",
        "saleId",
        "status",
        "store",
        "vehicle",
      ].sort(),
    );
  });

  it("[EXT-SEC-001] só vendedor abre o extrato; o bloqueado continua vendo", async () => {
    const { a } = await anaWithTwo();
    const blocked = await activeSeller(t.db, "BLOQ", { status: "blocked" });

    await expect(sellerStatement(t.db, a, {}, NOW)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      sellerStatement(t.db, blocked, {}, NOW),
    ).resolves.toMatchObject({ items: [] });
  });
});
