import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { leads } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { purgeOldLeads, vehiclePerformance } from "./service";

const NOW = new Date("2026-11-16T12:00:00Z");
const DAY = 86_400_000;
const TWO_YEARS_AGO = new Date("2024-11-16T12:00:00Z");

describe("retenção dos leads", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[LED-SEC-006] lead com mais de 2 anos perde os dados pessoais e continua contando", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    const person = {
      storeId: a.storeId,
      vehicleId: v.id,
      channel: "form",
      origin: "cajugo",
      status: "sold",
      name: "Ana",
      email: "ana@exemplo.com",
      phone: "5579999990000",
      message: "Olá",
    } as const;
    await t.db.insert(leads).values([
      { ...person, createdAt: new Date(TWO_YEARS_AGO.getTime() - DAY) },
      { ...person, createdAt: new Date(TWO_YEARS_AGO.getTime() + DAY) },
    ]);

    // Act
    const purged = await purgeOldLeads(t.db, NOW);
    const again = await purgeOldLeads(t.db, NOW);

    // Assert
    expect([purged, again]).toEqual([1, 0]);
    const rows = await t.db.select().from(leads).orderBy(leads.createdAt);
    expect(rows[0]).toMatchObject({
      name: null,
      email: null,
      phone: null,
      message: null,
      purgedAt: NOW,
      status: "sold",
    });
    expect(rows[1]).toMatchObject({ name: "Ana", purgedAt: null });
    expect((await vehiclePerformance(t.db, a, v.id, NOW)).leads).toBe(2);
  });
});
