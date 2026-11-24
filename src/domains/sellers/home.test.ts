import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { partnerships, sellerVehicleClicks } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { sellerHome } from "./service";
import { activeSeller, seller } from "./testing/fixtures";

const NOW = new Date("2026-11-16T12:00:00Z");

describe("início do vendedor [7b]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[SEL-FR-002] em análise mostra o status e se falta a foto do documento", async () => {
    // Arrange
    const sem = await seller(t.db);
    const com = await seller(t.db, {
      documentFrontPublicId: "f",
      documentFrontFormat: "jpg",
      documentBackPublicId: "b",
      documentBackFormat: "jpg",
    });

    // Act / Assert
    expect(await sellerHome(t.db, sem, NOW)).toEqual({
      kind: "status",
      status: "in_review",
      reason: null,
      documentsMissing: true,
    });
    expect(await sellerHome(t.db, com, NOW)).toMatchObject({
      kind: "status",
      documentsMissing: false,
    });
  });

  it("[SEL-FR-002] bloqueado mostra o motivo", async () => {
    // Arrange
    const ana = await activeSeller(t.db, "ANA", {
      status: "blocked",
      blockedReason: "Cobrou sinal por fora",
    });

    // Act / Assert
    expect(await sellerHome(t.db, ana, NOW)).toMatchObject({
      kind: "status",
      status: "blocked",
      reason: "Cobrou sinal por fora",
    });
  });

  it("[SEL-FR-006] painel com os cliques do mês e as lojas Parceiro e Pendente", async () => {
    // Arrange
    const ana = await activeSeller(t.db, "ANA");
    const a = await liveStore(t.db, "loja-a");
    const b = await liveStore(t.db, "loja-b");
    const c = await liveStore(t.db, "loja-c");
    const v = await car(t.db, a.storeId);
    await t.db.insert(partnerships).values([
      {
        sellerId: ana.userId,
        storeId: a.storeId,
        origin: "request",
        status: "active",
      },
      { sellerId: ana.userId, storeId: b.storeId, origin: "request" },
      {
        sellerId: ana.userId,
        storeId: c.storeId,
        origin: "request",
        status: "declined",
      },
    ]);
    await t.db.insert(sellerVehicleClicks).values([
      { sellerId: ana.userId, vehicleId: v.id, day: "2026-11-01", clicks: 7 },
      { sellerId: ana.userId, vehicleId: v.id, day: "2026-11-16", clicks: 5 },
      { sellerId: ana.userId, vehicleId: v.id, day: "2026-10-31", clicks: 9 },
    ]);

    // Act
    const home = await sellerHome(t.db, ana, NOW);

    // Assert
    expect(home).toEqual({
      kind: "panel",
      code: "ANA",
      clicksThisMonth: 12,
      stores: [
        { storeId: a.storeId, name: "Loja loja-a", status: "partner" },
        { storeId: b.storeId, name: "Loja loja-b", status: "pending" },
      ],
      toReceiveCents: 0,
      salesThisMonth: 0,
      recentSales: [],
    });
  });

  it("[SEL-SEC-004] o vendedor B não vê os cliques nem as lojas do A", async () => {
    // Arrange
    const ana = await activeSeller(t.db, "ANA");
    const beto = await activeSeller(t.db, "BETO");
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    await t.db.insert(partnerships).values({
      sellerId: ana.userId,
      storeId: a.storeId,
      origin: "request",
      status: "active",
    });
    await t.db.insert(sellerVehicleClicks).values({
      sellerId: ana.userId,
      vehicleId: v.id,
      day: "2026-11-16",
      clicks: 5,
    });

    // Act / Assert
    expect(await sellerHome(t.db, beto, NOW)).toMatchObject({
      clicksThisMonth: 0,
      stores: [],
    });
  });
});
