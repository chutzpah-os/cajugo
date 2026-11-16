import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vehicleDailyStats } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { recordView } from "./service";

const PERSON =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const ctx = (now: string, over: Record<string, unknown> = {}) => ({
  ipHash: "ip-1",
  userAgent: PERSON,
  now: new Date(now),
  ...over,
});

describe("visualizações do veículo", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[LED-FR-015] soma por veículo e dia de São Paulo; robô não conta", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const v = await car(t.db, storeId);
    const view = { vehicleId: v.id };

    // Act: 2 pessoas hoje, 1 robô, 1 pessoa às 23h30 de Brasília (já é amanhã em UTC)
    await recordView(t.db, view, ctx("2026-11-16T12:00:00Z"));
    await recordView(
      t.db,
      view,
      ctx("2026-11-16T13:00:00Z", { ipHash: "ip-2" }),
    );
    await recordView(
      t.db,
      view,
      ctx("2026-11-16T14:00:00Z", { userAgent: "Googlebot/2.1" }),
    );
    await recordView(
      t.db,
      view,
      ctx("2026-11-17T02:30:00Z", { ipHash: "ip-3" }),
    );
    await recordView(t.db, view, ctx("2026-11-17T12:00:00Z"));

    // Assert
    const rows = await t.db.select().from(vehicleDailyStats);
    expect(
      rows
        .map((r) => [r.day, r.views])
        .sort(([a], [b]) => String(a).localeCompare(String(b))),
    ).toEqual([
      ["2026-11-16", 3],
      ["2026-11-17", 1],
    ]);
  });

  it("[LED-FR-015] veículo fora do ar ou entrada inválida não conta", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const draft = await car(t.db, storeId, { status: "draft" });

    // Act
    await recordView(
      t.db,
      { vehicleId: draft.id },
      ctx("2026-11-16T12:00:00Z"),
    );
    await recordView(t.db, { vehicleId: "x" }, ctx("2026-11-16T12:00:00Z"));

    // Assert
    expect(await t.db.select().from(vehicleDailyStats)).toEqual([]);
  });

  it("[LED-SEC-002] o mesmo IP conta até 60 aberturas por minuto", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const v = await car(t.db, storeId);

    // Act
    for (let i = 0; i < 61; i++)
      await recordView(t.db, { vehicleId: v.id }, ctx("2026-11-16T12:00:00Z"));

    // Assert
    const [row] = await t.db.select().from(vehicleDailyStats);
    expect(row.views).toBe(60);
  });
});
