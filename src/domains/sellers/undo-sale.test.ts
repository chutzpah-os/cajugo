import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { activityLog, partnerships, sales } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { undoSold } from "@/domains/vehicles/service";
import { vehicleRow } from "@/domains/vehicles/testing/fixtures";
import { confirmSale, undoSale } from "./service";
import { acceptSellers, activeSeller } from "./testing/fixtures";

const DAY = 86_400_000;
const NOW = new Date("2026-11-17T12:00:00Z");
const later = (days: number) => new Date(NOW.getTime() + days * DAY);

describe("Desfazer venda da Rede Caju", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  async function sold(paid = false) {
    const a = await liveStore(t.db, "loja-a");
    await acceptSellers(t.db, a.storeId, { type: "pct", value: 200 });
    const argo = await car(t.db, a.storeId, { shareOnCajugo: true });
    const ana = await activeSeller(t.db, "ANA");
    await t.db.insert(partnerships).values({
      sellerId: ana.userId,
      storeId: a.storeId,
      origin: "request",
      status: "active",
    });
    await confirmSale(
      { db: t.db },
      a,
      {
        vehicleId: argo.id,
        finalPriceCents: 5_800_000,
        attribution: "other_partner",
        sellerId: ana.userId,
        commissionPaid: paid,
      },
      NOW,
    );
    return { a, argo };
  }

  it("[RCL-FR-015] desfazer cancela a venda, a comissão e a taxa e volta o veículo como estava", async () => {
    // Arrange
    const { a, argo } = await sold();

    // Act
    await undoSale({ db: t.db }, a, { vehicleId: argo.id }, later(2));

    // Assert
    const [row] = await t.db.select().from(sales);
    expect(row.canceledAt).toEqual(later(2));
    expect(await vehicleRow(t.db, argo.id)).toMatchObject({
      status: "published",
      saleId: null,
      soldAt: null,
      shareOnCajugo: true,
    });
    const log = await t.db.select().from(activityLog);
    expect(log.map((l) => l.action)).toContain("sale.canceled");
  });

  it("[RCL-FR-015] comissão paga não desfaz; depois de 7 dias também não", async () => {
    // Arrange
    const paid = await sold(true);

    // Act / Assert
    await expect(
      undoSale({ db: t.db }, paid.a, { vehicleId: paid.argo.id }, later(1)),
    ).rejects.toMatchObject({
      status: 409,
      detail: "A comissão já foi paga. Para desfazer, fale com a CajuGo.",
    });
    await t.db.update(sales).set({ commissionStatus: "to_receive" });
    await expect(
      undoSale({ db: t.db }, paid.a, { vehicleId: paid.argo.id }, later(8)),
    ).rejects.toMatchObject({ status: 409 });
    const [row] = await t.db.select().from(sales);
    expect(row.canceledAt).toBeNull();
    expect((await vehicleRow(t.db, paid.argo.id)).status).toBe("sold");
  });

  it("[RCL-FR-015] o desfazer simples do veículo é recusado quando há venda", async () => {
    // Arrange
    const { a, argo } = await sold();

    // Act / Assert
    await expect(
      undoSold({ db: t.db, now: () => later(1) }, a, argo.id),
    ).rejects.toMatchObject({ status: 409 });
    expect((await vehicleRow(t.db, argo.id)).status).toBe("sold");
  });

  it("[RCL-SEC-001] a loja B não desfaz a venda da loja A", async () => {
    // Arrange
    const { argo } = await sold();
    const b = await liveStore(t.db, "loja-b");

    // Act / Assert
    await expect(
      undoSale({ db: t.db }, b, { vehicleId: argo.id }, later(1)),
    ).rejects.toMatchObject({ status: 404 });
    const [row] = await t.db
      .select()
      .from(sales)
      .where(eq(sales.vehicleId, argo.id));
    expect(row.canceledAt).toBeNull();
  });
});
