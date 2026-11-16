import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activityLog, notices, vehicleReports } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { noticesFor } from "@/domains/notices/service";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { vehicleRow } from "@/domains/vehicles/testing/fixtures";
import { hide, reportQueue } from "./service";
import { report } from "./testing/fixtures";

const NOW = new Date("2026-11-16T12:00:00Z");

describe("Ocultar", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  async function argoWithReports() {
    const a = await liveStore(t.db, "loja-a");
    const argo = await car(t.db, a.storeId, { make: "Fiat", model: "ARGO" });
    await report(t.db, argo.id, { details: "Texto do denunciante" });
    await report(t.db, argo.id, { reason: "scam" });
    return { a, argo };
  }

  it("[RPT-FR-004] oculta o anúncio, fecha as denúncias abertas e ele sai da fila", async () => {
    // Arrange
    const { argo } = await argoWithReports();
    const admin = await personWith(t.db, "admin");

    // Act
    const done = await hide(
      t.db,
      admin,
      { vehicleId: argo.id, reason: "unreal_price" },
      NOW,
    );

    // Assert
    expect(done).toBe(true);
    expect(await vehicleRow(t.db, argo.id)).toMatchObject({
      status: "hidden",
      hiddenReason: "unreal_price",
    });
    const rows = await t.db.select().from(vehicleReports);
    expect(rows.map((r) => r.status)).toEqual(["hidden", "hidden"]);
    expect(await reportQueue(t.db, admin)).toEqual([]);
  });

  it("[RPT-FR-004] sem motivo não oculta; 'Outro' exige a nota", async () => {
    // Arrange
    const { argo } = await argoWithReports();
    const admin = await personWith(t.db, "admin");

    // Act / Assert
    await expect(
      hide(t.db, admin, { vehicleId: argo.id }, NOW),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      hide(t.db, admin, { vehicleId: argo.id, reason: "other" }, NOW),
    ).rejects.toMatchObject({ status: 422 });
    expect((await vehicleRow(t.db, argo.id)).status).toBe("published");
  });

  it("[RPT-FR-006] o lojista recebe o aviso com o veículo e o motivo, sem dado das denúncias", async () => {
    // Arrange
    const { a, argo } = await argoWithReports();
    const admin = await personWith(t.db, "admin");

    // Act
    await hide(
      t.db,
      admin,
      { vehicleId: argo.id, reason: "other", note: "Anúncio duplicado" },
      NOW,
    );

    // Assert
    const [notice] = await noticesFor(t.db, a);
    expect(notice.text).toContain("Anúncio duplicado");
    expect(notice.text).toContain("ocultado da vitrine");
    expect(JSON.stringify(await t.db.select().from(notices))).not.toContain(
      "Texto do denunciante",
    );
  });

  it("[RPT-SEC-005] fica no registro com quem decidiu e o motivo, sem IP nem texto das denúncias", async () => {
    // Arrange
    const { argo } = await argoWithReports();
    const support = await personWith(t.db, "support");

    // Act
    await hide(
      t.db,
      support,
      { vehicleId: argo.id, reason: "unreal_price" },
      NOW,
    );

    // Assert
    const log = await t.db.select().from(activityLog);
    expect(log.find((l) => l.action === "vehicle.hidden")).toMatchObject({
      userId: support.userId,
      entity: "vehicle",
      entityId: argo.id,
      data: { reason: "unreal_price", note: null },
    });
    expect(JSON.stringify(log)).not.toContain("Texto do denunciante");
  });

  it("[RPT-SEC-004] ocultar o Argo da loja A não muda o Onix da loja B nem avisa a loja B", async () => {
    // Arrange
    const { argo } = await argoWithReports();
    const b = await liveStore(t.db, "loja-b");
    const onix = await car(t.db, b.storeId);
    await report(t.db, onix.id);
    const admin = await personWith(t.db, "admin");

    // Act
    await hide(t.db, admin, { vehicleId: argo.id, reason: "scam" }, NOW);

    // Assert
    expect((await vehicleRow(t.db, onix.id)).status).toBe("published");
    expect(await reportQueue(t.db, admin)).toMatchObject([
      { vehicle: { id: onix.id } },
    ]);
    expect(await noticesFor(t.db, b)).toEqual([]);
  });

  it("[RPT-SEC-003] lojista, usuário da loja e vendedor não ocultam, e nada muda", async () => {
    // Arrange
    const { a, argo } = await argoWithReports();
    const people = [
      a,
      await personWith(t.db, "store_staff", a.storeId),
      await personWith(t.db, "seller"),
    ];

    // Act / Assert
    for (const p of people)
      await expect(
        hide(t.db, p, { vehicleId: argo.id, reason: "scam" }, NOW),
      ).rejects.toMatchObject({ status: 403 });
    expect((await vehicleRow(t.db, argo.id)).status).toBe("published");
  });
});
