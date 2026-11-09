import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { models } from "@/domains/fipe/service";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import { addPhoto, photoUpload, publish, saveDraft } from "./service";
import { storeOwner, vehicleRow } from "./testing/fixtures";
import { fakeFipe } from "./testing/fipe";

const DAY = 86_400_000;

describe("campos de busca e relevância", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  const now = new Date("2026-11-09T12:00:00Z");
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

  async function addPhotos(
    s: Awaited<ReturnType<typeof storeOwner>>,
    vehicleId: string,
    n: number,
  ) {
    for (let i = 0; i < n; i++) {
      const signed = await photoUpload(deps(), s, vehicleId);
      cloudinary.simulateUpload(signed, { format: "jpg", bytes: 1000 });
      await addPhoto(
        deps(),
        s,
        vehicleId,
        `${signed.fields.folder}/${signed.fields.public_id}`,
      );
    }
  }

  it("[SHW-FR-004] [SHW-FR-005] salvar grava marca e modelo em slug e o texto de busca sem acento", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");

    const { vehicleId } = await saveDraft(deps(), a, COMPLETE);

    expect(await vehicleRow(t.db, vehicleId)).toMatchObject({
      makeSlug: "gm-chevrolet",
      modelSlug: "onix",
      searchText: "gm - chevrolet onix onix hatch lt 1.0 12v flex 5p mec.",
    });
  });

  it("[SHW-FR-006] relevância: dia da publicação mais os pontos de anúncio completo", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const { vehicleId } = await saveDraft(deps(), a, COMPLETE);
    await addPhotos(a, vehicleId, 1);
    expect((await vehicleRow(t.db, vehicleId)).rankScore).toBe(0);

    await publish(deps(), a, vehicleId);
    const day = Math.floor(now.getTime() / DAY);
    expect((await vehicleRow(t.db, vehicleId)).rankScore).toBe(day);

    await saveDraft(deps(), a, {
      vehicleId,
      description: "Revisado.",
      features: ["airbag"],
    });
    await addPhotos(a, vehicleId, 5);
    expect((await vehicleRow(t.db, vehicleId)).rankScore).toBe(day + 7);
  });
});
