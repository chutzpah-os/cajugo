import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { notices, partnerships, sales } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { confirmSale, sellerHome } from "./service";
import { acceptSellers, activeSeller, soldBy } from "./testing/fixtures";

const NOW = new Date("2026-11-23T12:00:00Z");

describe("painel do vendedor [7b]: vendas e a receber", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  async function panel(session: Parameters<typeof sellerHome>[1]) {
    const home = await sellerHome(t.db, session, NOW);
    if (home.kind !== "panel") throw new Error("esperava o painel");
    return home;
  }

  it("[EXT-FR-005] a receber, vendas do mês (São Paulo) e as 5 últimas", async () => {
    // Arrange
    const ana = await activeSeller(t.db, "ANA");
    const a = await liveStore(t.db, "loja-a");
    const sell = async (
      at: string,
      status: "to_receive" | "paid",
      cents: number,
    ) =>
      soldBy(t.db, {
        sellerId: ana.userId,
        storeId: a.storeId,
        confirmedBy: a.userId,
        vehicleId: (await car(t.db, a.storeId)).id,
        at: new Date(at),
        status,
        commissionCents: cents,
      });
    await sell("2026-11-20T12:00:00Z", "to_receive", 116_000);
    await sell("2026-11-05T12:00:00Z", "paid", 80_000);
    // 31/10 às 23h em São Paulo ainda é outubro.
    await sell("2026-11-01T02:00:00Z", "to_receive", 50_000);
    for (const d of ["10", "11", "12", "13"])
      await sell(`2026-10-${d}T12:00:00Z`, "paid", 10_000);

    // Act
    const home = await panel(ana);

    // Assert
    expect(home.toReceiveCents).toBe(166_000);
    expect(home.salesThisMonth).toBe(2);
    expect(home.recentSales).toHaveLength(5);
    expect(home.recentSales[0].date).toEqual(new Date("2026-11-20T12:00:00Z"));
  });

  it("[EXT-FR-007] [EXT-FR-008] sem vendas (ou só desfeitas): R$ 0, 0 e nenhuma venda", async () => {
    const ana = await activeSeller(t.db, "ANA");
    const a = await liveStore(t.db, "loja-a");
    const s = await soldBy(t.db, {
      sellerId: ana.userId,
      storeId: a.storeId,
      confirmedBy: a.userId,
      vehicleId: (await car(t.db, a.storeId)).id,
      at: new Date("2026-11-20T12:00:00Z"),
    });
    await t.db.update(sales).set({ canceledAt: NOW }).where(eq(sales.id, s.id));

    const home = await panel(ana);

    expect(home).toMatchObject({
      toReceiveCents: 0,
      salesThisMonth: 0,
      recentSales: [],
    });
  });

  it("[EXT-FR-006] a loja confirma a venda com o vendedor: ele vê o aviso com veículo, loja e comissão", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    await acceptSellers(t.db, a.storeId, { type: "pct", value: 200 });
    const argo = await car(t.db, a.storeId, { make: "Fiat", model: "ARGO" });
    const ana = await activeSeller(t.db, "ANA");
    await t.db.insert(partnerships).values({
      sellerId: ana.userId,
      storeId: a.storeId,
      origin: "request",
      status: "active",
    });

    // Act
    await confirmSale(
      { db: t.db },
      a,
      {
        vehicleId: argo.id,
        finalPriceCents: 5_800_000,
        attribution: "other_partner",
        sellerId: ana.userId,
        commissionPaid: false,
      },
      NOW,
    );

    // Assert
    const [notice] = await t.db
      .select()
      .from(notices)
      .where(eq(notices.profileId, ana.userId));
    expect(notice).toMatchObject({
      kind: "sale_confirmed",
      data: {
        vehicle: "Fiat ARGO",
        store: "Loja loja-a",
        commissionCents: 116_000,
      },
    });
  });
});
