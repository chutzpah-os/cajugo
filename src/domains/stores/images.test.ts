import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import type { Session } from "@/platform/http/session";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { registerStore, setStoreImage, storeImageUpload } from "./service";

const MB = 1024 * 1024;

describe("logo e capa da loja", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  const deps = () => ({ db: t.db, auth: new FakeAuthProvider(), cloudinary });

  async function owner(slug: string, email: string): Promise<Session> {
    const { userId, storeId } = await registerStore(
      deps(),
      null,
      {
        storeName: "Loja",
        city: "Aracaju",
        state: "SE",
        whatsapp: "79981360206",
        slug,
        name: "Dono",
        email,
        phone: `7998${Math.floor(1000000 + Math.random() * 8999999)}`,
        password: "senha-forte-1",
        terms: true,
      },
      { ipHash: crypto.randomUUID() },
    );
    return {
      userId,
      roles: ["store_owner"],
      activeRole: "store_owner",
      storeId,
      mustChangePassword: false,
    };
  }

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    cloudinary = new FakeCloudinary();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[STO-FR-010] [STO-SEC-004] assina o envio na pasta da loja e salva o logo enviado", async () => {
    // Arrange
    const a = await owner("loja-a", "a@x.com");

    // Act
    const signed = await storeImageUpload(deps(), a, "logo");
    cloudinary.simulateUpload(signed, { format: "png", bytes: 200_000 });
    const publicId = `${signed.fields.folder}/${signed.fields.public_id}`;
    await setStoreImage(deps(), a, "logo", publicId);

    // Assert
    expect(signed.fields.folder).toBe(`staging/stores/${a.storeId}`);
    expect(signed.fields.allowed_formats).toBe("jpg,png,webp,heic");
    expect(signed.fields.public_id).toMatch(/^logo-/);
    const [store] = await t.db
      .select()
      .from(stores)
      .where(eq(stores.id, a.storeId!));
    expect(store.logoPublicId).toBe(publicId);
  });

  it("[STO-SEC-004] recusa formato proibido, arquivo acima de 15 MB (e apaga o arquivo) ou que não foi enviado", async () => {
    const a = await owner("loja-a", "a@x.com");
    const cases = [
      { format: "svg", bytes: 1000 },
      { format: "gif", bytes: 1000 },
      { format: "pdf", bytes: 1000 },
      { format: "jpg", bytes: 15 * MB + 1 },
    ];
    for (const image of cases) {
      const signed = await storeImageUpload(deps(), a, "cover");
      cloudinary.simulateUpload(signed, image);
      await expect(
        setStoreImage(
          deps(),
          a,
          "cover",
          `${signed.fields.folder}/${signed.fields.public_id}`,
        ),
      ).rejects.toMatchObject({ status: 422 });
      // O arquivo recusado não fica guardado na pasta da loja.
      expect(cloudinary.destroyed).toContain(
        `${signed.fields.folder}/${signed.fields.public_id}`,
      );
    }
    await expect(
      setStoreImage(
        deps(),
        a,
        "cover",
        `staging/stores/${a.storeId}/cover-00000000-0000-4000-8000-000000000000`,
      ),
    ).rejects.toMatchObject({ status: 422 });
    const [store] = await t.db
      .select()
      .from(stores)
      .where(eq(stores.id, a.storeId!));
    expect(store.coverPublicId).toBeNull();
  });

  it("[STO-SEC-004] [STO-SEC-001] imagem da pasta de outra loja é recusada", async () => {
    const a = await owner("loja-a", "a@x.com");
    const b = await owner("loja-b", "b@x.com");
    const signedA = await storeImageUpload(deps(), a, "logo");
    cloudinary.simulateUpload(signedA, { format: "jpg", bytes: 1000 });

    await expect(
      setStoreImage(
        deps(),
        b,
        "logo",
        `${signedA.fields.folder}/${signedA.fields.public_id}`,
      ),
    ).rejects.toMatchObject({ status: 404 });
    const [storeB] = await t.db
      .select()
      .from(stores)
      .where(eq(stores.id, b.storeId!));
    expect(storeB.logoPublicId).toBeNull();
  });

  it("[STO-SEC-003] usuário da loja não envia imagem", async () => {
    const a = await owner("loja-a", "a@x.com");
    const staff: Session = {
      ...a,
      userId: crypto.randomUUID(),
      roles: ["store_staff"],
      activeRole: "store_staff",
    };

    await expect(storeImageUpload(deps(), staff, "logo")).rejects.toMatchObject(
      { status: 403 },
    );
    await expect(
      storeImageUpload(deps(), a, "banner" as never),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("[STO-SEC-004] [STO-SEC-001] nome fora do padrão assinado (ex.: ../ para outra loja) é recusado", async () => {
    const a = await owner("loja-a", "a@x.com");
    const b = await owner("loja-b", "b@x.com");
    const signedB = await storeImageUpload(deps(), b, "logo");
    cloudinary.simulateUpload(signedB, { format: "jpg", bytes: 1000 });

    for (const publicId of [
      `staging/stores/${a.storeId}/logo-x/../../${b.storeId}/${signedB.fields.public_id}`,
      `staging/stores/${a.storeId}/logo-qualquer`,
    ])
      await expect(
        setStoreImage(deps(), a, "logo", publicId),
      ).rejects.toMatchObject({ status: 404 });
  });
});
