import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { personWith } from "@/domains/billing/testing/fixtures";
import { activityLog, profiles, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { createStoreByAdmin } from "./service";

const NOW = new Date("2026-11-25T12:00:00Z");
const NEW_STORE = {
  storeName: "Loja Nova",
  city: "aracaju",
  state: "se",
  whatsapp: "(79) 3211-1234",
  slug: "loja-nova",
  name: "Marta Souza",
  email: "Marta@LojaNova.com",
  phone: "(79) 99999-0000",
};

describe("Nova loja pelo admin (012b)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let auth: FakeAuthProvider;
  const deps = () => ({ db: t.db, auth, now: () => NOW });

  beforeEach(async () => {
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
    auth = new FakeAuthProvider();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[ADM-FR-005] [ADM-SEC-003] cria a loja cadastrada e o dono com a senha temporária devolvida uma vez, sem a senha no registro", async () => {
    // Arrange
    const admin = await personWith(t.db, "admin");

    // Act
    const { storeId, temporaryPassword } = await createStoreByAdmin(
      deps(),
      admin,
      NEW_STORE,
    );

    // Assert: loja cadastrada (aguardando o 1º pagamento)
    const [store] = await t.db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId));
    expect(store).toMatchObject({
      name: "Loja Nova",
      slug: "loja-nova",
      city: "Aracaju",
      status: "registered",
    });
    // dono com papel de lojista e troca de senha no 1º login
    const [owner] = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, store.ownerId));
    expect(owner).toMatchObject({
      name: "Marta Souza",
      email: "marta@lojanova.com",
      roles: ["store_owner"],
      storeId,
      mustChangePassword: true,
    });
    expect(owner.tempPasswordExpiresAt).not.toBeNull();
    expect(
      await auth.verifyPassword("marta@lojanova.com", temporaryPassword),
    ).toBe(true);
    // registro com quem criou, sem a senha
    const log = await t.db.select().from(activityLog);
    const created = log.find((l) => l.action === "store.created_by_admin");
    expect(created).toMatchObject({ userId: admin.userId, entityId: storeId });
    expect(JSON.stringify(log)).not.toContain(temporaryPassword);
  });

  it("[ADM-FR-005] e-mail que já tem conta → 422 no campo e-mail, sem conta nova no login", async () => {
    // Arrange
    const admin = await personWith(t.db, "admin");
    await createStoreByAdmin(deps(), admin, NEW_STORE);

    // Act
    const again = createStoreByAdmin(deps(), admin, {
      ...NEW_STORE,
      slug: "outra-loja",
    });

    // Assert
    await expect(again).rejects.toMatchObject({
      status: 422,
      errors: [expect.objectContaining({ field: "email" })],
    });
    expect(await t.db.select().from(stores)).toHaveLength(1);
  });

  it("[ADM-SEC-002] suporte e lojista não criam loja (403) e visitante recebe 401", async () => {
    // Arrange
    const support = await personWith(t.db, "support");
    const owner = await personWith(t.db, "store_owner");

    // Act + Assert
    await expect(
      createStoreByAdmin(deps(), support, NEW_STORE),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      createStoreByAdmin(deps(), owner, NEW_STORE),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      createStoreByAdmin(deps(), null, NEW_STORE),
    ).rejects.toMatchObject({ status: 401 });
    expect(await t.db.select().from(stores)).toHaveLength(0);
  });
});
