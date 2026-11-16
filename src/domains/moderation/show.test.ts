import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activityLog } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { noticesFor } from "@/domains/notices/service";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { vehicleRow } from "@/domains/vehicles/testing/fixtures";
import { hiddenList, hide, show } from "./service";

const NOW = new Date("2026-11-16T12:00:00Z");

describe("Ocultados e Mostrar de novo", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  async function hiddenArgo() {
    const a = await liveStore(t.db, "loja-a");
    const argo = await car(t.db, a.storeId, { make: "Fiat", model: "ARGO" });
    const admin = await personWith(t.db, "admin");
    await hide(
      t.db,
      admin,
      { vehicleId: argo.id, reason: "unreal_price" },
      NOW,
    );
    return { a, argo, admin };
  }

  it("[RPT-FR-008] a aba Ocultados lista o anúncio com o motivo e quando foi ocultado", async () => {
    // Arrange
    const { argo, admin } = await hiddenArgo();

    // Act
    const list = await hiddenList(t.db, admin);

    // Assert
    expect(list).toEqual([
      expect.objectContaining({
        vehicle: expect.objectContaining({
          id: argo.id,
          title: "Fiat ARGO",
          storeName: "Loja loja-a",
        }),
        reason: "Preço não real",
        hiddenAt: NOW,
      }),
    ]);
  });

  it("[RPT-FR-008] Mostrar de novo devolve à vitrine, sai da aba, avisa a loja e registra", async () => {
    // Arrange
    const { a, argo, admin } = await hiddenArgo();

    // Act
    const later = new Date(NOW.getTime() + 60_000);
    const done = await show(t.db, admin, { vehicleId: argo.id }, later);

    // Assert
    expect(done).toBe(true);
    expect((await vehicleRow(t.db, argo.id)).status).toBe("published");
    expect(await hiddenList(t.db, admin)).toEqual([]);
    expect((await noticesFor(t.db, a))[0].text).toContain("voltou à vitrine");
    const log = await t.db.select().from(activityLog);
    expect(log.find((l) => l.action === "vehicle.shown")).toMatchObject({
      userId: admin.userId,
      entityId: argo.id,
    });
  });

  it("[RPT-SEC-003] lojista, usuário da loja e vendedor não veem a aba nem mostram de novo", async () => {
    // Arrange
    const { a, argo } = await hiddenArgo();
    const people = [
      a,
      await personWith(t.db, "store_staff", a.storeId),
      await personWith(t.db, "seller"),
    ];

    // Act / Assert
    for (const p of people) {
      await expect(hiddenList(t.db, p)).rejects.toMatchObject({
        status: 403,
      });
      await expect(
        show(t.db, p, { vehicleId: argo.id }, NOW),
      ).rejects.toMatchObject({ status: 403 });
    }
    expect((await vehicleRow(t.db, argo.id)).status).toBe("hidden");
  });
});
