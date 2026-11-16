import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { personWith, storeOwner } from "@/domains/billing/testing/fixtures";
import { attachDocument, documentFile, documentUpload } from "./service";
import { seller, sellerRow } from "./testing/fixtures";

const IMAGE = { format: "jpg", bytes: 200_000, width: 800, height: 600 };

describe("fotos do documento do vendedor", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  const deps = () => ({ db: t.db, cloudinary });

  beforeEach(async () => {
    t = await createTestDb();
    cloudinary = new FakeCloudinary();
  });
  afterEach(async () => {
    await t.close();
  });

  async function send(
    s: Awaited<ReturnType<typeof seller>>,
    side: "front" | "back",
    file = IMAGE,
  ) {
    const signed = await documentUpload(deps(), s, side);
    cloudinary.simulateUpload(signed, file);
    const publicId = `${signed.fields.folder}/${signed.fields.public_id}`;
    await attachDocument(deps(), s, { side, publicId });
    return publicId;
  }

  it("[SEL-FR-001] frente e verso vão privados para a pasta do vendedor e ficam no cadastro", async () => {
    // Arrange
    const ana = await seller(t.db);

    // Act
    const signed = await documentUpload(deps(), ana, "front");
    const front = await send(ana, "front");
    const back = await send(ana, "back", { ...IMAGE, format: "pdf" });

    // Assert
    expect(signed.fields).toMatchObject({ type: "authenticated" });
    expect(signed.fields.folder).toContain(`sellers/${ana.userId}`);
    expect(await sellerRow(t.db, ana.userId)).toMatchObject({
      documentFrontPublicId: front,
      documentFrontFormat: "jpg",
      documentBackPublicId: back,
      documentBackFormat: "pdf",
    });
  });

  it("[SEL-SEC-009] arquivo grande ou fora do formato é recusado e apagado", async () => {
    // Arrange
    const ana = await seller(t.db);

    // Act / Assert
    await expect(
      send(ana, "front", { ...IMAGE, bytes: 11 * 1024 * 1024 }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      send(ana, "front", { ...IMAGE, format: "gif" }),
    ).rejects.toMatchObject({ status: 422 });
    expect(cloudinary.destroyed).toHaveLength(2);
    expect(
      (await sellerRow(t.db, ana.userId)).documentFrontPublicId,
    ).toBeNull();
  });

  it("[SEL-SEC-009] arquivo de outro vendedor ou fora da pasta não é aceito", async () => {
    // Arrange
    const ana = await seller(t.db);
    const beto = await seller(t.db);
    const signed = await documentUpload(deps(), ana, "front");
    cloudinary.simulateUpload(signed, IMAGE);
    const publicId = `${signed.fields.folder}/${signed.fields.public_id}`;

    // Act / Assert
    await expect(
      attachDocument(deps(), beto, { side: "front", publicId }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      attachDocument(deps(), ana, { side: "back", publicId }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("[SEL-SEC-009] admin, suporte e o próprio vendedor abrem; lojista e outro vendedor recebem 404", async () => {
    // Arrange
    const ana = await seller(t.db);
    await send(ana, "front");
    const beto = await seller(t.db);
    const owner = await storeOwner(t.db, "loja-a", "a@x.com");
    const admin = await personWith(t.db, "admin");
    const support = await personWith(t.db, "support");

    // Act / Assert
    for (const who of [admin, support, ana])
      expect(
        (await documentFile(deps(), who, ana.userId, "front")).filename,
      ).toBe("documento-front.jpg");
    for (const who of [owner, beto])
      await expect(
        documentFile(deps(), who, ana.userId, "front"),
      ).rejects.toMatchObject({ status: 404 });
    await expect(
      documentFile(deps(), admin, ana.userId, "back"),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      documentFile(deps(), admin, "nao-e-uuid", "front"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("[SEL-FR-001] vendedor ativo ou bloqueado não troca as fotos", async () => {
    // Arrange
    const ativo = await seller(t.db, { status: "active", code: "ANA" });

    // Act / Assert
    await expect(documentUpload(deps(), ativo, "front")).rejects.toMatchObject({
      status: 409,
    });
  });
});
