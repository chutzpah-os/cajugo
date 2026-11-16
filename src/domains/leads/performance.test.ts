import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { leads, vehicleDailyStats } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { vehiclePerformance } from "./service";

const NOW = new Date("2026-11-16T12:00:00Z");
const DAY = 86_400_000;
const daysAgo = (d: number) => new Date(NOW.getTime() - d * DAY);

describe("desempenho do anúncio", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[LED-FR-012] soma visualizações, conta leads e dias no ar", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId, { publishedAt: daysAgo(10) });
    const other = await car(t.db, a.storeId);
    await t.db.insert(vehicleDailyStats).values([
      { vehicleId: v.id, day: "2026-11-10", views: 70 },
      { vehicleId: v.id, day: "2026-11-15", views: 50 },
      { vehicleId: other.id, day: "2026-11-15", views: 9 },
    ]);
    const lead = {
      storeId: a.storeId,
      channel: "form",
      origin: "cajugo",
      status: "new",
    } as const;
    await t.db
      .insert(leads)
      .values([
        ...Array.from({ length: 4 }, () => ({ ...lead, vehicleId: v.id })),
        { ...lead, vehicleId: other.id },
      ]);

    // Act
    const perf = await vehiclePerformance(t.db, a, v.id, NOW);

    // Assert
    expect(perf).toEqual({ views: 120, leads: 4, daysLive: 10 });
  });

  it("[LED-FR-012] vendido conta os dias até a venda; sem dados, zeros", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const sold = await car(t.db, a.storeId, {
      status: "sold",
      publishedAt: daysAgo(10),
      soldAt: daysAgo(3),
    });
    const draft = await car(t.db, a.storeId, {
      status: "draft",
      publishedAt: null,
    });

    // Act / Assert
    expect(await vehiclePerformance(t.db, a, sold.id, NOW)).toEqual({
      views: 0,
      leads: 0,
      daysLive: 7,
    });
    expect(await vehiclePerformance(t.db, a, draft.id, NOW)).toEqual({
      views: 0,
      leads: 0,
      daysLive: 0,
    });
  });

  it("[LED-SEC-001] veículo da loja A pela loja B responde como inexistente", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const b = await liveStore(t.db, "loja-b");
    const v = await car(t.db, a.storeId);

    // Act / Assert
    await expect(vehiclePerformance(t.db, b, v.id, NOW)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      vehiclePerformance(t.db, b, "nao-e-uuid", NOW),
    ).rejects.toMatchObject({ status: 404 });
  });
});
