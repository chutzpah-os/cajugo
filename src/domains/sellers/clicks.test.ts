import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sellerVehicleClicks } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { recordSellerClick } from "./service";
import { activeSeller } from "./testing/fixtures";

const NOW = new Date("2026-11-16T12:00:00Z");
const PHONE =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";

describe("cliques no link do vendedor", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  const ctx = (
    over: Partial<{ ipHash: string; userAgent: string | null }> = {},
  ) => ({
    ipHash: "ip-1",
    userAgent: PHONE,
    now: NOW,
    ...over,
  });

  it("[SEL-FR-010] soma um clique por vendedor, veículo e dia, parceiro ou não", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    const ana = await activeSeller(t.db, "ANA");

    // Act
    await recordSellerClick(t.db, { vehicleId: v.id, code: "ana" }, ctx());
    await recordSellerClick(
      t.db,
      { vehicleId: v.id, code: "ANA" },
      ctx({ ipHash: "ip-2" }),
    );

    // Assert
    expect(await t.db.select().from(sellerVehicleClicks)).toEqual([
      { sellerId: ana.userId, vehicleId: v.id, day: "2026-11-16", clicks: 2 },
    ]);
  });

  it("[SEL-FR-010] robô, vendedor bloqueado, código falso e veículo fora do ar não contam", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    const sold = await car(t.db, a.storeId, { status: "sold" });
    await activeSeller(t.db, "ANA");
    await activeSeller(t.db, "BLOQ", { status: "blocked", blockedReason: "x" });

    // Act
    await recordSellerClick(
      t.db,
      { vehicleId: v.id, code: "ANA" },
      ctx({ userAgent: "Googlebot/2.1" }),
    );
    await recordSellerClick(t.db, { vehicleId: v.id, code: "BLOQ" }, ctx());
    await recordSellerClick(t.db, { vehicleId: v.id, code: "NINGUEM" }, ctx());
    await recordSellerClick(t.db, { vehicleId: sold.id, code: "ANA" }, ctx());
    await recordSellerClick(t.db, { vehicleId: v.id, code: "<x>" }, ctx());

    // Assert
    expect(await t.db.select().from(sellerVehicleClicks)).toEqual([]);
  });

  it("[SEL-FR-010] mais de 60 por minuto da mesma rede não contam", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    await activeSeller(t.db, "ANA");

    // Act
    for (let i = 0; i < 62; i++)
      await recordSellerClick(t.db, { vehicleId: v.id, code: "ANA" }, ctx());

    // Assert
    const [row] = await t.db.select().from(sellerVehicleClicks);
    expect(row.clicks).toBe(60);
  });
});
