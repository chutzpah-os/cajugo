import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { partnerships, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { parseFilters } from "@/domains/showcase/service";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { requestPartnership, sellerHome, sellerShowcase } from "./service";
import { acceptSellers, activeSeller, seller } from "./testing/fixtures";

describe("vitrine do vendedor [7c]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const NONE = parseFilters({});

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  async function setup() {
    const a = await liveStore(t.db, "loja-a");
    const b = await liveStore(t.db, "loja-b");
    await acceptSellers(t.db, b.storeId);
    await t.db
      .update(stores)
      .set({
        commissionType: "pct",
        commissionValue: 200,
        acceptsSellers: true,
      })
      .where(eq(stores.id, a.storeId));
    const argo = await car(t.db, a.storeId, {
      make: "Fiat",
      model: "ARGO",
      priceCents: 6_000_000,
    });
    const onix = await car(t.db, b.storeId);
    const ana = await activeSeller(t.db, "ANA");
    await t.db.insert(partnerships).values({
      sellerId: ana.userId,
      storeId: a.storeId,
      origin: "request",
      status: "active",
    });
    return { a, b, argo, onix, ana };
  }

  it("[SEL-FR-007] [SEL-FR-008] todos os veículos da vitrine; parceira mostra 'Você ganha'; todos com o link do vendedor", async () => {
    // Arrange
    const { a, b, argo, onix, ana } = await setup();

    // Act
    const view = await sellerShowcase(t.db, ana, { filters: NONE });

    // Assert
    expect(view.total).toBe(2);
    const byId = new Map(view.items.map((i) => [i.card.vehicleId, i]));
    expect(byId.get(argo.id)).toMatchObject({
      storeId: a.storeId,
      partner: "partner",
      earnCents: 120_000,
      shareUrl: expect.stringMatching(
        new RegExp(`^https://cajugo\\.test/v/${argo.id}-.*\\?ref=ANA$`),
      ),
    });
    expect(byId.get(onix.id)).toMatchObject({
      storeId: b.storeId,
      partner: "none",
      earnCents: null,
      shareUrl: expect.stringContaining("?ref=ANA"),
    });
  });

  it("[SEL-FR-007] usa a busca e os filtros da vitrine", async () => {
    // Arrange
    const { argo, ana } = await setup();

    // Act
    const view = await sellerShowcase(t.db, ana, {
      filters: parseFilters({ marca: "fiat" }),
    });

    // Assert
    expect(view.items.map((i) => i.card.vehicleId)).toEqual([argo.id]);
  });

  it("[SEL-FR-009] pedir parceria fica Pendente e pedir de novo não duplica", async () => {
    // Arrange
    const { b, ana, onix } = await setup();

    // Act
    const first = await requestPartnership(t.db, ana, { storeId: b.storeId });
    const again = await requestPartnership(t.db, ana, { storeId: b.storeId });
    const view = await sellerShowcase(t.db, ana, { filters: NONE });

    // Assert
    expect([first, again]).toEqual(["pending", "pending"]);
    expect(
      await t.db
        .select()
        .from(partnerships)
        .where(eq(partnerships.storeId, b.storeId)),
    ).toHaveLength(1);
    expect(view.items.find((i) => i.card.vehicleId === onix.id)?.partner).toBe(
      "pending",
    );
    expect(await sellerHome(t.db, ana)).toMatchObject({
      stores: expect.arrayContaining([
        expect.objectContaining({ storeId: b.storeId, status: "pending" }),
      ]),
    });
  });

  it("[SEL-FR-009] pedir a loja que já é parceira devolve Parceiro; loja fora do ar → 404", async () => {
    // Arrange
    const { a, ana } = await setup();
    const off = await liveStore(t.db, "loja-off", { status: "suspended" });

    // Act / Assert
    expect(await requestPartnership(t.db, ana, { storeId: a.storeId })).toBe(
      "partner",
    );
    await expect(
      requestPartnership(t.db, ana, { storeId: off.storeId }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("[SEL-SEC-004] [SEL-SEC-008] vendedor em análise não usa a vitrine; o B não vê a parceria do A; pedido não aceita status", async () => {
    // Arrange
    const { a, argo } = await setup();
    const novo = await seller(t.db);
    const beto = await activeSeller(t.db, "BETO");

    // Act
    const betoView = await sellerShowcase(t.db, beto, { filters: NONE });

    // Assert
    await expect(
      sellerShowcase(t.db, novo, { filters: NONE }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      requestPartnership(t.db, novo, { storeId: a.storeId }),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      betoView.items.find((i) => i.card.vehicleId === argo.id),
    ).toMatchObject({ partner: "none", earnCents: null });
    await expect(
      requestPartnership(t.db, beto, { storeId: a.storeId, status: "active" }),
    ).rejects.toMatchObject({ status: 422 });
  });
});
