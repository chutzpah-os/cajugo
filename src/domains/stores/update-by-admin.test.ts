import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { personWith, storeOwner } from "@/domains/billing/testing/fixtures";
import { activityLog, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { updateStoreByAdmin } from "./service";

const EDIT = {
  name: "Garagem 77",
  whatsapp: "(79) 3211-1234",
  city: "aracaju",
  state: "se",
  about: "Seminovos revisados.",
  instagram: "@garagem77",
  addressStreet: "Av. Beira Mar",
  addressNumber: "77",
  addressComplement: "",
  addressDistrict: "Atalaia",
  addressZip: "49037-000",
};

describe("Editar dados da loja pelo admin [6g] (012b)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = () => ({ db: t.db, auth: new FakeAuthProvider() });

  beforeEach(async () => {
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  const storeRow = async (id: string) =>
    (await t.db.select().from(stores).where(eq(stores.id, id)))[0];

  it("[ADM-FR-010] WhatsApp inválido dá o erro de Minha loja e nada muda; válido grava, sem trocar endereço do catálogo nem dono", async () => {
    // Arrange
    const o = await storeOwner(t.db, "garagem-77", "dono@x.com");
    const before = await storeRow(o.storeId);
    const admin = await personWith(t.db, "admin");

    // Act: número inválido
    const bad = updateStoreByAdmin(deps(), admin, {
      ...EDIT,
      storeId: o.storeId,
      whatsapp: "123",
    });

    // Assert
    await expect(bad).rejects.toMatchObject({
      status: 422,
      errors: [expect.objectContaining({ field: "whatsapp" })],
    });
    expect((await storeRow(o.storeId)).name).toBe(before.name);

    // Act: dados válidos
    await updateStoreByAdmin(deps(), admin, { ...EDIT, storeId: o.storeId });

    // Assert
    expect(await storeRow(o.storeId)).toMatchObject({
      name: "Garagem 77",
      whatsapp: "557932111234",
      city: "Aracaju",
      state: "SE",
      instagram: "garagem77",
      addressZip: "49037000",
      addressComplement: null,
      slug: before.slug,
      ownerId: before.ownerId,
    });
    const log = await t.db.select().from(activityLog);
    expect(
      log.find((l) => l.action === "store.updated_by_admin"),
    ).toMatchObject({ userId: admin.userId, entityId: o.storeId });
  });

  it("[ADM-FR-010] o formulário não aceita endereço do catálogo nem dono", async () => {
    // Arrange
    const o = await storeOwner(t.db, "garagem-77", "dono@x.com");
    const admin = await personWith(t.db, "admin");

    // Act
    const sneaky = updateStoreByAdmin(deps(), admin, {
      ...EDIT,
      storeId: o.storeId,
      slug: "outro",
      ownerId: admin.userId,
    });

    // Assert
    await expect(sneaky).rejects.toMatchObject({ status: 422 });
  });

  it("[ADM-SEC-002] id inexistente ou inválido → 404; suporte e lojista → 403", async () => {
    // Arrange
    const o = await storeOwner(t.db, "garagem-77", "dono@x.com");
    const admin = await personWith(t.db, "admin");
    const support = await personWith(t.db, "support");
    const owner = await personWith(t.db, "store_owner", o.storeId);

    // Act + Assert
    for (const storeId of [
      "nao-e-uuid",
      "0190f0f0-0000-7000-8000-000000000000",
    ])
      await expect(
        updateStoreByAdmin(deps(), admin, { ...EDIT, storeId }),
      ).rejects.toMatchObject({ status: 404 });
    for (const s of [support, owner])
      await expect(
        updateStoreByAdmin(deps(), s, { ...EDIT, storeId: o.storeId }),
      ).rejects.toMatchObject({ status: 403 });
    expect((await storeRow(o.storeId)).name).not.toBe("Garagem 77");
  });
});
