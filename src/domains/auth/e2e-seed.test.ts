import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  profiles,
  settingValues,
  stores,
  vehiclePhotos,
  vehicles,
} from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { E2E_ACCOUNTS, E2E_PIX, seedE2E } from "./e2e-seed";
import { getSettings } from "@/domains/settings/service";
import { registerStore } from "@/domains/stores/service";
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

  it("volta as regras alteradas aos valores provisórios, sem apagar o histórico", async () => {
    // Arrange: um teste anterior mudou duas regras
    await seedE2E(deps(), "senha-e2e-1");
    await t.db.insert(settingValues).values([
      { key: "min_photos", value: 9 },
      {
        key: "pix",
        value: { type: "email", key: "a@b.com", beneficiary: "CajuGo" },
      },
    ]);
    const rowsBefore = (await t.db.select().from(settingValues)).length;

    // Act
    await seedE2E(deps(), "senha-e2e-1");

    // Assert: valores provisórios de novo, com 2 linhas novas (nada apagado)
    const settings = await getSettings(t.db);
    expect(settings.min_photos).toBe(6);
    expect(settings.pix).toEqual(E2E_PIX);
    expect((await t.db.select().from(settingValues)).length).toBe(
      rowsBefore + 2,
    );
    // Rodar de novo, sem nada alterado, não grava nada.
    await seedE2E(deps(), "senha-e2e-1");
    expect((await t.db.select().from(settingValues)).length).toBe(
      rowsBefore + 2,
    );
  });

  it("apaga as lojas e contas criadas pelos e2e de cadastro, e só elas", async () => {
    // Arrange: um cadastro de teste (indicado pelo lojista de teste) e um cadastro real
    await seedE2E(deps(), "senha-e2e-1");
    const signup = (email: string, slug: string) =>
      registerStore(
        deps(),
        null,
        {
          storeName: "Loja",
          city: "Aracaju",
          state: "SE",
          whatsapp: "79981360206",
          slug,
          name: "Fulano",
          email,
          phone: `7998${Math.floor(1000000 + Math.random() * 8999999)}`,
          password: "senha-boa-123",
          terms: true,
        },
        { ipHash: crypto.randomUUID() },
      );
    await signup("e2e-cadastro-1@cajugo.test", "e2e-cadastro-loja");
    const real = await signup("dono@loja.com", "loja-real");

    // Act
    await seedE2E(deps(), "senha-e2e-1");

    // Assert
    const slugs = (await t.db.select({ slug: stores.slug }).from(stores)).map(
      (s) => s.slug,
    );
    expect(slugs).toContain("loja-real");
    expect(slugs).not.toContain("e2e-cadastro-loja");
    expect(
      await auth.verifyPassword("e2e-cadastro-1@cajugo.test", "senha-boa-123"),
    ).toBe(false);
    expect(await auth.verifyPassword("dono@loja.com", "senha-boa-123")).toBe(
      true,
    );
    const [realProfile] = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, real.userId));
    expect(realProfile.storeId).toBe(real.storeId);
    expect(await t.db.select().from(settingValues)).toBeTruthy();
  });

  it("apaga veículos, fotos e histórico da loja de teste", async () => {
    // Arrange
    const { storeId } = await seedE2E(deps(), "senha-e2e-1");
    const [v] = await t.db
      .insert(vehicles)
      .values({ storeId })
      .returning({ id: vehicles.id });
    await t.db.insert(vehiclePhotos).values({
      vehicleId: v.id,
      publicId: "staging/vehicles/x/photo-1",
      position: 0,
    });

    // Act
    await seedE2E(deps(), "senha-e2e-1");

    // Assert
    expect(await t.db.select().from(vehicles)).toEqual([]);
    expect(await t.db.select().from(vehiclePhotos)).toEqual([]);
  });
});
