import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import {
  addPhoto,
  photoUpload,
  removePhoto,
  reorderPhotos,
  saveDraft,
  vehicleForm,
} from "./service";
import { storeOwner } from "./testing/fixtures";

const MB = 1024 * 1024;

describe("fotos do veículo", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  const deps = () => ({ db: t.db, cloudinary });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    cloudinary = new FakeCloudinary();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  async function owner(slug = "loja-a") {
    const s = await storeOwner(t.db, slug, `${slug}@x.com`);
    const { vehicleId } = await saveDraft(deps(), s, {});
    return { s, vehicleId };
  }

  async function sendPhoto(
    s: Awaited<ReturnType<typeof owner>>["s"],
    vehicleId: string,
    file = { format: "jpg", bytes: 300_000, width: 1600, height: 1200 },
  ) {
    const signed = await photoUpload(deps(), s, vehicleId);
    cloudinary.simulateUpload(signed, file);
    const publicId = `${signed.fields.folder}/${signed.fields.public_id}`;
    return {
      signed,
      publicId,
      photo: await addPhoto(deps(), s, vehicleId, publicId),
    };
  }

  it("[VEH-FR-004] [VEH-SEC-003] assina na pasta do veículo, reduzindo para 1.600 px; grava na ordem", async () => {
    const { s, vehicleId } = await owner();

    const first = await sendPhoto(s, vehicleId);
    await sendPhoto(s, vehicleId);

    expect(first.signed.fields).toMatchObject({
      folder: `staging/vehicles/${vehicleId}`,
      transformation: "c_limit,w_1600,h_1600",
      allowed_formats: "jpg,png,webp,heic",
    });
    const form = await vehicleForm(t.db, s, vehicleId);
    expect(form.photos.map((p) => p.position)).toEqual([0, 1]);
    expect(form.photos[0]).toMatchObject({
      publicId: first.publicId,
      width: 1600,
      height: 1200,
    });
  });

  it("[VEH-FR-004] até 20 fotos: a 21ª não é assinada", async () => {
    const { s, vehicleId } = await owner();
    for (let i = 0; i < 20; i++) await sendPhoto(s, vehicleId);

    await expect(photoUpload(deps(), s, vehicleId)).rejects.toMatchObject({
      status: 409,
      detail: "Limite de 20 fotos por veículo.",
    });
  });

  it("[VEH-SEC-003] formato proibido ou acima de 15 MB é recusado e apagado", async () => {
    const { s, vehicleId } = await owner();
    for (const file of [
      { format: "svg", bytes: 1000 },
      { format: "gif", bytes: 1000 },
      { format: "jpg", bytes: 15 * MB + 1 },
    ]) {
      const signed = await photoUpload(deps(), s, vehicleId);
      cloudinary.simulateUpload(signed, file);
      const publicId = `${signed.fields.folder}/${signed.fields.public_id}`;
      await expect(
        addPhoto(deps(), s, vehicleId, publicId),
      ).rejects.toMatchObject({ status: 422 });
      expect(cloudinary.destroyed).toContain(publicId);
    }
    expect((await vehicleForm(t.db, s, vehicleId)).photos).toEqual([]);
  });

  it("[VEH-FR-004] reordenar: a escolhida vira capa; remover apaga e fecha o buraco", async () => {
    const { s, vehicleId } = await owner();
    const a = await sendPhoto(s, vehicleId);
    const b = await sendPhoto(s, vehicleId);
    const c = await sendPhoto(s, vehicleId);

    await reorderPhotos(deps(), s, vehicleId, [
      c.photo.id,
      a.photo.id,
      b.photo.id,
    ]);
    await removePhoto(deps(), s, vehicleId, a.photo.id);

    const form = await vehicleForm(t.db, s, vehicleId);
    expect(form.photos.map((p) => [p.id, p.position])).toEqual([
      [c.photo.id, 0],
      [b.photo.id, 1],
    ]);
    expect(cloudinary.destroyed).toContain(a.publicId);
    await expect(
      reorderPhotos(deps(), s, vehicleId, [b.photo.id]),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("[VEH-SEC-001] a loja B não envia, grava, reordena nem remove foto do veículo da loja A", async () => {
    // Arrange
    const { s: a, vehicleId } = await owner("loja-a");
    const { s: b, vehicleId: vehicleB } = await owner("loja-b");
    const fromA = await sendPhoto(a, vehicleId);

    // Act + Assert
    await expect(photoUpload(deps(), b, vehicleId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      addPhoto(deps(), b, vehicleId, fromA.publicId),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      addPhoto(deps(), b, vehicleB, fromA.publicId),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      addPhoto(
        deps(),
        b,
        vehicleB,
        `staging/vehicles/${vehicleB}/photo-x/../../${vehicleId}/x`,
      ),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      removePhoto(deps(), b, vehicleId, fromA.photo.id),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      removePhoto(deps(), b, vehicleB, fromA.photo.id),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      reorderPhotos(deps(), b, vehicleId, [fromA.photo.id]),
    ).rejects.toMatchObject({ status: 404 });
    expect((await vehicleForm(t.db, a, vehicleId)).photos).toHaveLength(1);
  });
});
