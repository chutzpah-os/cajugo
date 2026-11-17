import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activityLog, leads, partnerships, sales } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { vehicleRow } from "@/domains/vehicles/testing/fixtures";
import { confirmSale } from "./service";
import { acceptSellers, activeSeller } from "./testing/fixtures";

const NOW = new Date("2026-11-17T12:00:00Z");

describe("Confirmar venda [7g]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  async function setup() {
    const a = await liveStore(t.db, "loja-a");
    await acceptSellers(t.db, a.storeId, { type: "pct", value: 200 });
    const argo = await car(t.db, a.storeId, { priceCents: 6_000_000 });
    const ana = await activeSeller(t.db, "ANA", { name: "Ana" });
    const beto = await activeSeller(t.db, "BETO", { name: "Beto" });
    for (const s of [ana, beto])
      await t.db.insert(partnerships).values({
        sellerId: s.userId,
        storeId: a.storeId,
        origin: "request",
        status: "active",
      });
    await t.db.insert(leads).values({
      storeId: a.storeId,
      vehicleId: argo.id,
      channel: "form",
      origin: "seller",
      status: "new",
      sellerId: ana.userId,
    });
    return { a, argo, ana, beto };
  }

  const sale = (vehicleId: string, over: Record<string, unknown> = {}) => ({
    vehicleId,
    finalPriceCents: 5_800_000,
    attribution: "link",
    commissionPaid: false,
    ...over,
  });

  it("[RCL-FR-011] com o vendedor do link: comissão A receber, taxa guardada e veículo vendido", async () => {
    // Arrange
    const { a, argo, ana } = await setup();

    // Act
    await confirmSale(
      { db: t.db },
      a,
      sale(argo.id, { sellerId: ana.userId }),
      NOW,
    );

    // Assert
    const [row] = await t.db.select().from(sales);
    expect(row).toMatchObject({
      finalPriceCents: 5_800_000,
      attribution: "link",
      sellerId: ana.userId,
      commissionCents: 116_000,
      commissionStatus: "to_receive",
      feeBps: 100,
      feeCents: 58_000,
      confirmedBy: a.userId,
      canceledAt: null,
    });
    expect(await vehicleRow(t.db, argo.id)).toMatchObject({
      status: "sold",
      saleId: row.id,
      shareOnCajugo: false,
      soldAt: NOW,
    });
  });

  it("[RCL-FR-011] com 'Já paguei' a comissão fica Paga; outro parceiro também vale", async () => {
    // Arrange
    const { a, argo, beto } = await setup();

    // Act
    await confirmSale(
      { db: t.db },
      a,
      sale(argo.id, {
        attribution: "other_partner",
        sellerId: beto.userId,
        commissionPaid: true,
      }),
      NOW,
    );

    // Assert
    const [row] = await t.db.select().from(sales);
    expect(row).toMatchObject({
      sellerId: beto.userId,
      commissionStatus: "paid",
    });
  });

  it("[RCL-FR-012] venda da loja: sem comissão nem taxa", async () => {
    // Arrange
    const { a, argo } = await setup();

    // Act
    await confirmSale(
      { db: t.db },
      a,
      sale(argo.id, { attribution: "store" }),
      NOW,
    );

    // Assert
    const [row] = await t.db.select().from(sales);
    expect(row).toMatchObject({
      attribution: "store",
      sellerId: null,
      commissionCents: null,
      commissionStatus: null,
      feeCents: null,
    });
  });

  it("[RCL-SEC-003] outro parceiro sem parceria → 422; link com vendedor que não é o sugerido → 422; repetir → 409", async () => {
    // Arrange
    const { a, argo, beto } = await setup();
    const caio = await activeSeller(t.db, "CAIO");

    // Act / Assert
    await expect(
      confirmSale(
        { db: t.db },
        a,
        sale(argo.id, { attribution: "other_partner", sellerId: caio.userId }),
        NOW,
      ),
    ).rejects.toMatchObject({
      status: 422,
      errors: [expect.objectContaining({ field: "sellerId" })],
    });
    await expect(
      confirmSale(
        { db: t.db },
        a,
        sale(argo.id, { sellerId: beto.userId }),
        NOW,
      ),
    ).rejects.toMatchObject({ status: 422 });
    await confirmSale(
      { db: t.db },
      a,
      sale(argo.id, { attribution: "store" }),
      NOW,
    );
    await expect(
      confirmSale(
        { db: t.db },
        a,
        sale(argo.id, { attribution: "store" }),
        NOW,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(await t.db.select().from(sales)).toHaveLength(1);
  });

  it("[RCL-SEC-002] [RCL-SEC-001] usuário da loja confirma; loja B → 404; vendedor → 403", async () => {
    // Arrange
    const { a, argo, ana } = await setup();
    const staff = await personWith(t.db, "store_staff", a.storeId);
    const b = await liveStore(t.db, "loja-b");

    // Act / Assert
    await expect(
      confirmSale(
        { db: t.db },
        b,
        sale(argo.id, { attribution: "store" }),
        NOW,
      ),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      confirmSale(
        { db: t.db },
        ana,
        sale(argo.id, { attribution: "store" }),
        NOW,
      ),
    ).rejects.toMatchObject({ status: 403 });
    await confirmSale(
      { db: t.db },
      staff,
      sale(argo.id, { attribution: "store" }),
      NOW,
    );
    expect((await vehicleRow(t.db, argo.id)).status).toBe("sold");
  });

  it("[RCL-SEC-005] a venda fica no registro com valor, comissão e taxa, sem CPF nem Pix", async () => {
    // Arrange
    const { a, argo, ana } = await setup();

    // Act
    await confirmSale(
      { db: t.db },
      a,
      sale(argo.id, { sellerId: ana.userId }),
      NOW,
    );

    // Assert
    const log = await t.db.select().from(activityLog);
    expect(log.find((l) => l.action === "sale.confirmed")).toMatchObject({
      userId: a.userId,
      data: {
        finalPriceCents: 5_800_000,
        attribution: "link",
        commissionCents: 116_000,
        feeCents: 58_000,
      },
    });
    expect(JSON.stringify(log)).not.toContain("@x.com");
  });
});
