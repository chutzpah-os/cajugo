import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { profiles, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { registerStore } from "./service";

// Falha no meio da transação: a gravação da indicação quebra.
vi.mock("@/domains/referrals/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/domains/referrals/service")>()),
  getOrCreateCode: vi.fn().mockRejectedValue(new Error("falha simulada")),
}));

describe("registerStore com falha no meio", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[STO-FR-003] desfaz tudo: nem conta, nem perfil, nem loja", async () => {
    // Arrange
    const auth = new FakeAuthProvider();

    // Act
    await expect(
      registerStore(
        { db: t.db, auth },
        null,
        {
          storeName: "Silva Autocar",
          city: "Aracaju",
          state: "SE",
          whatsapp: "79981360206",
          slug: "silvautocar",
          name: "João",
          email: "joao@x.com",
          phone: "79981360206",
          password: "senha-forte-1",
          terms: true,
        },
        { ipHash: "rede-a" },
      ),
    ).rejects.toThrow("falha simulada");

    // Assert
    expect(await auth.verifyPassword("joao@x.com", "senha-forte-1")).toBe(
      false,
    );
    expect(await t.db.select().from(profiles)).toHaveLength(0);
    expect(await t.db.select().from(stores)).toHaveLength(0);
  });
});
