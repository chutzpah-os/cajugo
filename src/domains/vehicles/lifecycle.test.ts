import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog, vehicles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import {
  markSold,
  remove,
  saveDraft,
  undoSold,
  unpublish,
  vehicleForm,
} from "./service";
import { storeOwner, vehicleRow } from "./testing/fixtures";

const DAY = 86_400_000;

describe("vendido, despublicar e excluir [6f]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let now: Date;
  const deps = () => ({ db: t.db, now: () => now });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    now = new Date("2026-11-08T12:00:00Z");
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  async function published(share = true) {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const { vehicleId } = await saveDraft(deps(), a, { shareOnCajugo: share });
    await t.db.update(vehicles).set({ status: "published", publishedAt: now });
    return { a, vehicleId };
  }

  const actions = async () =>
    (await t.db.select({ a: activityLog.action }).from(activityLog)).map(
      (r) => r.a,
    );

  it("[VEH-FR-013] [VEH-SEC-005] vendido desliga a divulgação; desfazer em até 7 dias volta como estava", async () => {
    // Arrange
    const { a, vehicleId } = await published(true);

    // Act
    await markSold(deps(), a, vehicleId);
    const sold = await vehicleRow(t.db, vehicleId);
    now = new Date(now.getTime() + 6 * DAY);
    await undoSold(deps(), a, vehicleId);

    // Assert
    expect(sold).toMatchObject({
      status: "sold",
      shareOnCajugo: false,
      shareBeforeSale: true,
    });
    expect(await vehicleRow(t.db, vehicleId)).toMatchObject({
      status: "published",
      shareOnCajugo: true,
      soldAt: null,
    });
    expect(await actions()).toEqual(
      expect.arrayContaining(["vehicle.sold", "vehicle.sale_undone"]),
    );
  });

  it("[VEH-FR-013] depois de 7 dias, não desfaz", async () => {
    const { a, vehicleId } = await published();
    await markSold(deps(), a, vehicleId);
    now = new Date(now.getTime() + 8 * DAY);

    await expect(undoSold(deps(), a, vehicleId)).rejects.toMatchObject({
      status: 409,
    });
    expect((await vehicleRow(t.db, vehicleId)).status).toBe("sold");
  });

  it("[VEH-FR-014] [VEH-SEC-005] despublicar volta a rascunho; excluir é definitivo para a loja", async () => {
    const { a, vehicleId } = await published();

    await unpublish(deps(), a, vehicleId);
    expect((await vehicleRow(t.db, vehicleId)).status).toBe("draft");

    await remove(deps(), a, vehicleId);
    expect(await vehicleRow(t.db, vehicleId)).toMatchObject({
      status: "deleted",
      deletedAt: now,
    });
    await expect(vehicleForm(t.db, a, vehicleId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      saveDraft(deps(), a, { vehicleId, mileageKm: 1 }),
    ).rejects.toMatchObject({ status: 404 });
    expect(await actions()).toEqual(
      expect.arrayContaining(["vehicle.unpublished", "vehicle.deleted"]),
    );
  });

  it("[VEH-FR-013] vender só publicado; despublicar só publicado", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const { vehicleId } = await saveDraft(deps(), a, {});

    await expect(markSold(deps(), a, vehicleId)).rejects.toMatchObject({
      status: 409,
    });
    await expect(unpublish(deps(), a, vehicleId)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("[VEH-SEC-001] a loja B não vende, desfaz, despublica nem exclui veículo da loja A", async () => {
    const { vehicleId } = await published();
    const b = await storeOwner(t.db, "loja-b", "b@x.com");

    for (const action of [markSold, undoSold, unpublish, remove])
      await expect(action(deps(), b, vehicleId)).rejects.toMatchObject({
        status: 404,
      });
    expect((await vehicleRow(t.db, vehicleId)).status).toBe("published");
    const logs = await t.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.entity, "vehicle"));
    expect(logs).toEqual([]);
  });
});
