import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog } from "@/platform/db/schema";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import { models } from "@/domains/fipe/service";
import { addPhoto, photoUpload, publish, saveDraft } from "./service";
import { storeOwner, vehicleRow } from "./testing/fixtures";
import { fakeFipe } from "./testing/fipe";

describe("publicar veículo", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  const now = new Date("2026-11-08T12:00:00Z");
  const deps = () => ({
    db: t.db,
    cloudinary,
    fipe: fakeFipe(),
    now: () => now,
  });
  const COMPLETE = {
    fipeBrandId: "23",
    fipeModelId: "1",
    fipeYearId: "1:2020-1",
    yearManufacture: 2020,
    mileageKm: 42000,
    transmission: "manual",
    fuel: "flex",
    priceCents: 7632000,
  };

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    cloudinary = new FakeCloudinary();
    await models(deps(), "23");
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  async function withPhoto(
    s: Awaited<ReturnType<typeof storeOwner>>,
    vehicleId: string,
  ) {
    const signed = await photoUpload(deps(), s, vehicleId);
    cloudinary.simulateUpload(signed, { format: "jpg", bytes: 1000 });
    await addPhoto(
      deps(),
      s,
      vehicleId,
      `${signed.fields.folder}/${signed.fields.public_id}`,
    );
  }

  it("[VEH-FR-009] faltando foto e preço, mostra o que falta em cada campo e continua rascunho", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const { vehicleId } = await saveDraft(deps(), a, {
      ...COMPLETE,
      priceCents: undefined,
    });

    const error = await publish(deps(), a, vehicleId).catch((e) => e);

    expect(error).toMatchObject({ status: 422 });
    expect(error.errors.map((e: { field: string }) => e.field).sort()).toEqual([
      "photos",
      "priceCents",
    ]);
    expect((await vehicleRow(t.db, vehicleId)).status).toBe("draft");
  });

  it("[VEH-FR-009] [VEH-FR-010] [VEH-SEC-005] completo: publica, data de publicação e histórico; loja ainda não ativada também publica", async () => {
    // Arrange: loja cadastrada (sem 1º pagamento)
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const { vehicleId } = await saveDraft(deps(), a, COMPLETE);
    await withPhoto(a, vehicleId);

    // Act
    await publish(deps(), a, vehicleId);
    await publish(deps(), a, vehicleId);

    // Assert
    expect(await vehicleRow(t.db, vehicleId)).toMatchObject({
      status: "published",
      publishedAt: now,
    });
    const logs = await t.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "vehicle.published"));
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ userId: a.userId, entityId: vehicleId });
  });

  it("[VEH-SEC-001] a loja B não publica o veículo da loja A", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const b = await storeOwner(t.db, "loja-b", "b@x.com");
    const { vehicleId } = await saveDraft(deps(), a, COMPLETE);
    await withPhoto(a, vehicleId);

    await expect(publish(deps(), b, vehicleId)).rejects.toMatchObject({
      status: 404,
    });
    expect((await vehicleRow(t.db, vehicleId)).status).toBe("draft");
  });
});
