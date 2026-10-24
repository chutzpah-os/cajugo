import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { profiles, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { E2E_ACCOUNTS, seedE2E } from "./e2e-seed";
import { signIn } from "./service";

const NOW = new Date("2026-10-23T12:00:00Z");

describe("seedE2E", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let auth: FakeAuthProvider;
  const deps = () => ({ db: t.db, auth, now: () => NOW });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    auth = new FakeAuthProvider();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("cria as contas com os papéis e a loja ativa, fora da vitrine", async () => {
    const { ids, storeId } = await seedE2E(deps(), "senha-e2e-1");

    const rows = await t.db.select().from(profiles);
    expect(rows).toHaveLength(Object.keys(E2E_ACCOUNTS).length);
    const owner = rows.find((r) => r.id === ids.owner)!;
    const staff = rows.find((r) => r.id === ids.staff)!;
    expect(owner).toMatchObject({ roles: ["store_owner"], storeId });
    expect(staff).toMatchObject({ roles: ["store_staff"], storeId });
    const [store] = await t.db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId));
    expect(store).toMatchObject({ status: "active", shareByDefault: false });
    const result = await signIn(
      deps(),
      { email: E2E_ACCOUNTS.owner.email, password: "senha-e2e-1" },
      { ipHash: "rede-a" },
    );
    expect(result.redirectTo).toBe("/painel/veiculos");
  });

  it("rodar de novo não duplica e volta tudo ao estado inicial", async () => {
    const first = await seedE2E(deps(), "senha-e2e-1");
    await t.db
      .update(profiles)
      .set({ lastPanel: "referrer", mustChangePassword: false })
      .where(eq(profiles.id, first.ids.sellerReferrer));
    await t.db
      .update(profiles)
      .set({ mustChangePassword: false })
      .where(eq(profiles.id, first.ids.temporary));

    const second = await seedE2E(deps(), "senha-e2e-1");

    expect(second).toEqual(first);
    expect(await t.db.select().from(profiles)).toHaveLength(
      Object.keys(E2E_ACCOUNTS).length,
    );
    const [seller] = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, first.ids.sellerReferrer));
    expect(seller.lastPanel).toBeNull();
    const [temp] = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, first.ids.temporary));
    expect(temp.mustChangePassword).toBe(true);
  });

  it("zera o bloqueio por e-mail só das contas de teste", async () => {
    // Arrange: lojista de teste bloqueado e uma conta real também
    await seedE2E(deps(), "senha-e2e-1");
    await auth.adminCreateUser("real@x.com", "senha-real-1");
    for (const email of [E2E_ACCOUNTS.owner.email, "real@x.com"])
      for (let i = 0; i < 5; i++)
        await signIn(
          deps(),
          { email, password: "errada-123" },
          { ipHash: `rede-${email}-${i}` },
        ).catch(() => {});

    // Act
    await seedE2E(deps(), "senha-e2e-1");

    // Assert
    const result = await signIn(
      deps(),
      { email: E2E_ACCOUNTS.owner.email, password: "senha-e2e-1" },
      { ipHash: "rede-nova" },
    );
    expect(result.redirectTo).toBe("/painel/veiculos");
    await expect(
      signIn(
        deps(),
        { email: "real@x.com", password: "senha-real-1" },
        { ipHash: "rede-nova-2" },
      ),
    ).rejects.toMatchObject({ type: "too-many-requests" });
  });
});
