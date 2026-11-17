import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { partnerships, sales, sellers } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { markSold } from "@/domains/vehicles/service";
import { vehicleRow } from "@/domains/vehicles/testing/fixtures";
import { confirmSale, saleTerms, storeNetwork } from "./service";
import { acceptSellers, activeSeller } from "./testing/fixtures";

const NOW = new Date("2026-11-17T12:00:00Z");

describe("ajustes do /verify da 009", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[RCL-FR-008] com a loja aceitando vendedores, o 'Vendido' simples é recusado no servidor", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    await acceptSellers(t.db, a.storeId);
    const v = await car(t.db, a.storeId);

    // Act / Assert
    await expect(markSold({ db: t.db }, a, v.id)).rejects.toMatchObject({
      status: 409,
    });
    expect((await vehicleRow(t.db, v.id)).status).toBe("published");
  });

  it("[RCL-FR-010] sem regra de comissão, a tela e a venda mostram R$ 0", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    await acceptSellers(t.db, a.storeId);
    const v = await car(t.db, a.storeId);
    const ana = await activeSeller(t.db, "ANA");
    await t.db.insert(partnerships).values({
      sellerId: ana.userId,
      storeId: a.storeId,
      origin: "request",
      status: "active",
    });
    const input = {
      vehicleId: v.id,
      finalPriceCents: 5_000_000,
      sellerId: ana.userId,
    };

    // Act
    const terms = await saleTerms(t.db, a, input);
    await confirmSale(
      { db: t.db },
      a,
      { ...input, attribution: "other_partner", commissionPaid: false },
      NOW,
    );

    // Assert
    expect(terms.commissionCents).toBe(0);
    const [row] = await t.db.select().from(sales);
    expect(row.commissionCents).toBe(0);
  });

  it("[RCL-SEC-004] vendedor bloqueado aparece sem celular nem Pix para a loja", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    await acceptSellers(t.db, a.storeId);
    const ana = await activeSeller(t.db, "ANA");
    await t.db.insert(partnerships).values({
      sellerId: ana.userId,
      storeId: a.storeId,
      origin: "request",
      status: "active",
    });
    await t.db
      .update(sellers)
      .set({ status: "blocked", blockedReason: "x" })
      .where(eq(sellers.profileId, ana.userId));

    // Act
    const [p] = (await storeNetwork(t.db, a)).partners;

    // Assert
    expect(p).toMatchObject({ blocked: true, phone: null, pixKey: null });
  });
});
