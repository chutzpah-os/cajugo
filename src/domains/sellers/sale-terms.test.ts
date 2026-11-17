import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { leads, partnerships } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { saleTerms } from "./service";
import { acceptSellers, activeSeller } from "./testing/fixtures";

const at = (iso: string) => new Date(iso);

describe("Confirmar venda: cálculo [7g]", () => {
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
    const caio = await activeSeller(t.db, "CAIO", { name: "Caio" });
    for (const s of [ana, beto])
      await t.db.insert(partnerships).values({
        sellerId: s.userId,
        storeId: a.storeId,
        origin: "request",
        status: "active",
      });
    const lead = (sellerId: string | null, createdAt: Date) =>
      t.db.insert(leads).values({
        storeId: a.storeId,
        vehicleId: argo.id,
        channel: "form",
        origin: sellerId ? "seller" : "cajugo",
        status: "new",
        sellerId,
        createdAt,
      });
    return { a, argo, ana, beto, caio, lead };
  }

  it("[RCL-FR-010] comissão e taxa sobre o valor final para o vendedor escolhido", async () => {
    // Arrange
    const { a, argo, ana } = await setup();

    // Act
    const terms = await saleTerms(t.db, a, {
      vehicleId: argo.id,
      finalPriceCents: 5_800_000,
      sellerId: ana.userId,
    });

    // Assert
    expect(terms).toMatchObject({
      commissionCents: 116_000,
      feeCents: 58_000,
      feeBps: 100,
    });
    expect(terms.partners.map((p) => p.name)).toEqual(["Ana", "Beto"]);
  });

  it("[RCL-FR-013] sugere o vendedor do lead mais recente com parceria que vale; sem lead assim, nenhum", async () => {
    // Arrange
    const { a, argo, ana, beto, caio, lead } = await setup();
    await lead(beto.userId, at("2026-11-15T10:00:00Z"));
    await lead(ana.userId, at("2026-11-16T10:00:00Z"));
    await lead(caio.userId, at("2026-11-17T09:00:00Z"));
    await lead(null, at("2026-11-17T10:00:00Z"));

    // Act
    const terms = await saleTerms(t.db, a, {
      vehicleId: argo.id,
      finalPriceCents: null,
      sellerId: null,
    });

    // Assert
    expect(terms.suggested).toEqual({ sellerId: ana.userId, name: "Ana" });
    expect(terms.commissionCents).toBeNull();
  });

  it("[RCL-FR-009] vendedor sem parceria não entra na conta; usuário da loja calcula; loja B → 404", async () => {
    // Arrange
    const { a, argo, caio } = await setup();
    const staff = await personWith(t.db, "store_staff", a.storeId);
    const b = await liveStore(t.db, "loja-b");

    // Act
    const terms = await saleTerms(t.db, staff, {
      vehicleId: argo.id,
      finalPriceCents: 5_800_000,
      sellerId: caio.userId,
    });

    // Assert
    expect(terms).toMatchObject({
      suggested: null,
      commissionCents: null,
      feeCents: null,
    });
    await expect(
      saleTerms(t.db, b, {
        vehicleId: argo.id,
        finalPriceCents: 1,
        sellerId: null,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
