import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog, vehicleHistory, vehicles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import {
  refreshFipeReference,
  saveDraft,
  vehicleForm,
  vehicleSummary,
} from "./service";
import { fakeFipe } from "./testing/fipe";
import { goLive, storeOwner } from "./testing/fixtures";

const DAY = 86_400_000;

describe("editar veículo publicado [6e]", () => {
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

  async function published() {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    await goLive(t.db, a.storeId);
    const { vehicleId } = await saveDraft(deps(), a, {
      priceCents: 8000000,
      mileageKm: 40000,
    });
    await t.db.update(vehicles).set({
      status: "published",
      publishedAt: new Date(now.getTime() - 5 * DAY),
    });
    return { a, vehicleId };
  }

  it("[VEH-FR-012] [VEH-SEC-005] mudar o preço do publicado grava o histórico e o log; o rascunho não", async () => {
    // Arrange
    const { a, vehicleId } = await published();

    // Act
    await saveDraft(deps(), a, { vehicleId, priceCents: 7500000 });
    await saveDraft(deps(), a, { vehicleId, priceCents: 7500000 });

    // Assert
    const history = await t.db.select().from(vehicleHistory);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      vehicleId,
      field: "price",
      oldValue: "8000000",
      newValue: "7500000",
      userId: a.userId,
    });
    const [log] = await t.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "vehicle.price_changed"));
    expect(log.data).toEqual({ oldCents: 8000000, newCents: 7500000 });

    const { vehicleId: draft } = await saveDraft(deps(), a, {
      priceCents: 100000,
    });
    await saveDraft(deps(), a, { vehicleId: draft, priceCents: 200000 });
    expect(await t.db.select().from(vehicleHistory)).toHaveLength(1);
  });

  it("[VEH-FR-011] resumo com dias no ar, selo, legenda e o dado novo na hora", async () => {
    const { a, vehicleId } = await published();
    await saveDraft(deps(), a, { vehicleId, mileageKm: 41000 });

    expect(await vehicleSummary(deps(), a, vehicleId)).toMatchObject({
      status: "published",
      statusLabel: "Publicado",
      mileageKm: 41000,
      daysOnAir: 5,
      shareCaption: "Visível na vitrine CajuGo",
    });
  });

  it("[VEH-SEC-001] a loja B não vê o resumo nem edita o veículo da loja A", async () => {
    const { vehicleId } = await published();
    const b = await storeOwner(t.db, "loja-b", "b@x.com");

    await expect(vehicleSummary(deps(), b, vehicleId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      saveDraft(deps(), b, { vehicleId, priceCents: 100000 }),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it("[VEH-FR-009] publicado não perde o que é obrigatório: limpar preço ou identificação é recusado", async () => {
    const { a, vehicleId } = await published();

    for (const [input, field] of [
      [{ priceCents: null }, "priceCents"],
      [{ mileageKm: null }, "mileageKm"],
      [{ fipeBrandId: null }, "fipeBrandId"],
    ] as const)
      await expect(
        saveDraft(deps(), a, { vehicleId, ...input }),
      ).rejects.toMatchObject({
        status: 422,
        errors: expect.arrayContaining([expect.objectContaining({ field })]),
      });
    expect((await vehicleSummary(deps(), a, vehicleId)).priceCents).toBe(
      8000000,
    );
  });

  it("[VEH-FR-007] a referência FIPE guardada no veículo é renovada quando a tabela muda de mês", async () => {
    const { a, vehicleId } = await published();
    await t.db
      .update(vehicles)
      .set({
        fipeBrandId: "23",
        fipeModelId: "1",
        fipeYearId: "1:2020-1",
        fipePriceCents: 1,
        fipeMonth: "outubro de 2026",
      })
      .where(eq(vehicles.id, vehicleId));
    const fipeDeps = { db: t.db, now: () => now, fipe: fakeFipe() };

    await refreshFipeReference(fipeDeps, a, vehicleId);

    expect(await vehicleForm(t.db, a, vehicleId)).toMatchObject({
      fipePriceCents: 8000000,
      fipeMonth: "novembro de 2026",
    });
  });

  it("[VEH-SEC-001] endereço com id inválido responde 404", async () => {
    const { a } = await published();

    await expect(vehicleForm(t.db, a, "abc")).rejects.toMatchObject({
      status: 404,
    });
  });
});
