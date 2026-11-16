import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activityLog, vehicleReports } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { keep, reportQueue } from "./service";
import { report } from "./testing/fixtures";

const NOW = new Date("2026-11-16T12:00:00Z");

describe("Manter", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[RPT-FR-003] arquiva as denúncias abertas; o anúncio sai da fila e uma denúncia nova o traz de volta", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const argo = await car(t.db, a.storeId);
    await report(t.db, argo.id);
    await report(t.db, argo.id, { reason: "scam" });
    const admin = await personWith(t.db, "admin");

    // Act
    const kept = await keep(t.db, admin, { vehicleId: argo.id }, NOW);
    const after = await reportQueue(t.db, admin);
    await report(t.db, argo.id);
    const reopened = await reportQueue(t.db, admin);

    // Assert
    expect(kept).toBe(true);
    expect(after).toEqual([]);
    expect(reopened).toMatchObject([{ vehicle: { id: argo.id }, open: 1 }]);
    const rows = await t.db.select().from(vehicleReports);
    expect(rows.filter((r) => r.status === "kept")).toEqual([
      expect.objectContaining({ decidedBy: admin.userId, decidedAt: NOW }),
      expect.objectContaining({ decidedBy: admin.userId, decidedAt: NOW }),
    ]);
  });

  it("[RPT-SEC-005] Manter fica no registro de atividade com quem decidiu, sem texto das denúncias", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const argo = await car(t.db, a.storeId);
    await report(t.db, argo.id, { details: "Texto secreto do denunciante" });
    const support = await personWith(t.db, "support");

    // Act
    await keep(t.db, support, { vehicleId: argo.id }, NOW);

    // Assert
    const log = await t.db.select().from(activityLog);
    const entry = log.find((l) => l.action === "vehicle_reports.kept");
    expect(entry).toMatchObject({
      userId: support.userId,
      entity: "vehicle",
      entityId: argo.id,
    });
    expect(JSON.stringify(log)).not.toContain("Texto secreto");
  });

  it("[RPT-SEC-003] lojista, usuário da loja e vendedor não mantêm, e nada muda", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const argo = await car(t.db, a.storeId);
    await report(t.db, argo.id);
    const people = [
      await personWith(t.db, "store_owner", a.storeId),
      await personWith(t.db, "store_staff", a.storeId),
      await personWith(t.db, "seller"),
    ];

    // Act / Assert
    for (const p of people)
      await expect(
        keep(t.db, p, { vehicleId: argo.id }, NOW),
      ).rejects.toMatchObject({ status: 403 });
    const rows = await t.db.select().from(vehicleReports);
    expect(rows.map((r) => r.status)).toEqual(["open"]);
  });

  it("[RPT-SEC-004] Manter o anúncio da loja A não mexe nas denúncias da loja B", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const b = await liveStore(t.db, "loja-b");
    const argo = await car(t.db, a.storeId);
    const onix = await car(t.db, b.storeId);
    await report(t.db, argo.id);
    await report(t.db, onix.id);
    const admin = await personWith(t.db, "admin");

    // Act
    await keep(t.db, admin, { vehicleId: argo.id }, NOW);

    // Assert
    expect(await reportQueue(t.db, admin)).toMatchObject([
      { vehicle: { id: onix.id }, open: 1 },
    ]);
  });
});
