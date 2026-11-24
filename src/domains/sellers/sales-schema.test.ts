import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { notices, sales, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";

describe("tabela de vendas da Rede Caju", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[RCL-SEC-003] uma venda ativa por veículo; a cancelada libera outra; loja começa sem aceitar vendedores", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    const sale = {
      vehicleId: v.id,
      storeId: a.storeId,
      finalPriceCents: 5_800_000,
      attribution: "store" as const,
      confirmedBy: a.userId,
    };
    const [first] = await t.db.insert(sales).values(sale).returning();

    // Act / Assert
    await expect(t.db.insert(sales).values(sale)).rejects.toThrow();
    await t.db
      .update(sales)
      .set({ canceledAt: new Date() })
      .where(eq(sales.id, first.id));
    await t.db.insert(sales).values(sale);
    const [store] = await t.db
      .select({ accepts: stores.acceptsSellers })
      .from(stores)
      .where(eq(stores.id, a.storeId));
    expect(store.accepts).toBe(false);
  });

  it("[EXT-FR-009] [EXT-FR-010] a venda guarda quando o vendedor marcou o Recebi; avisos do extrato existem", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    const at = new Date("2026-11-23T12:00:00Z");

    // Act
    const [row] = await t.db
      .insert(sales)
      .values({
        vehicleId: v.id,
        storeId: a.storeId,
        finalPriceCents: 5_800_000,
        attribution: "store",
        confirmedBy: a.userId,
        commissionReceivedAt: at,
      })
      .returning();
    for (const kind of [
      "sale_confirmed",
      "commission_received",
      "commission_unreceived",
    ] as const)
      await t.db
        .insert(notices)
        .values({ profileId: a.userId, kind, data: {} });

    // Assert
    expect(row.commissionReceivedAt).toEqual(at);
    expect(await t.db.select().from(notices)).toHaveLength(3);
  });
});
