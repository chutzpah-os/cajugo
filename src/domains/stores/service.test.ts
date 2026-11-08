import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activityLog,
  profiles,
  referralCodes,
  referrals,
  stores,
} from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { registerStore } from "./service";

const NOW = new Date("2026-11-08T12:00:00Z");
export const VALID = {
  storeName: "Silva Autocar",
  city: "aracaju",
  state: "se",
  whatsapp: "(79) 3211-1234",
  slug: "silvautocar",
  name: "João Silva",
  email: "Joao@Silva.com",
  phone: "(79) 98136-0206",
  password: "senha-forte-1",
  terms: true,
};

describe("registerStore (visitante)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let auth: FakeAuthProvider;
  const deps = () => ({ db: t.db, auth, now: () => NOW });
  const ctx = { ipHash: "rede-a" };

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    auth = new FakeAuthProvider();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[STO-FR-003] [STO-FR-006] [STO-FR-014] cria conta, papel, loja cadastrada com endereço reservado e código pessoal", async () => {
    // Act
    const { userId, storeId } = await registerStore(deps(), null, VALID, ctx);

    // Assert: conta no provedor de login
    expect(await auth.verifyPassword("joao@silva.com", "senha-forte-1")).toBe(
      true,
    );
    // perfil com papel de lojista e loja
    const [profile] = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId));
    expect(profile).toMatchObject({
      name: "João Silva",
      email: "joao@silva.com",
      phone: "5579981360206",
      roles: ["store_owner"],
      storeId,
    });
    const [store] = await t.db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId));
    expect(store).toMatchObject({
      name: "Silva Autocar",
      slug: "silvautocar",
      city: "Aracaju",
      state: "SE",
      whatsapp: "557932111234",
      status: "registered",
      ownerId: userId,
      slugReservedUntil: new Date(NOW.getTime() + 7 * 86_400_000),
    });
    // código pessoal e auditoria
    const [code] = await t.db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.profileId, userId));
    expect(code.code).toBe("JOAO10");
    const [log] = await t.db.select().from(activityLog);
    expect(log).toMatchObject({
      userId,
      action: "store.registered",
      entityId: storeId,
    });
    expect(JSON.stringify(log)).not.toContain("senha-forte-1");
  });

  it('[STO-FR-007] com código válido, a indicação fica registrada como "Cadastrada"', async () => {
    // Arrange: Ricardo já tem conta e código
    const ricardo = await registerStore(
      deps(),
      null,
      {
        ...VALID,
        slug: "ricardo-motors",
        name: "Ricardo",
        email: "r@x.com",
        phone: "79999990000",
      },
      ctx,
    );

    // Act
    const { storeId } = await registerStore(
      deps(),
      null,
      { ...VALID, referralCode: "ricardo10" },
      ctx,
    );

    // Assert
    const [referral] = await t.db
      .select()
      .from(referrals)
      .where(eq(referrals.referredStoreId, storeId));
    expect(referral).toMatchObject({
      code: "RICARDO10",
      referrerId: ricardo.userId,
      status: "registered",
    });
  });

  it("[STO-FR-007] código inexistente ou autoindicação: erro no campo e nada é criado", async () => {
    const ricardo = {
      ...VALID,
      slug: "ricardo-motors",
      name: "Ricardo",
      email: "r@x.com",
      phone: "79999990000",
    };
    await registerStore(deps(), null, ricardo, ctx);
    const before = (await t.db.select().from(stores)).length;

    await expect(
      registerStore(deps(), null, { ...VALID, referralCode: "NAOEXISTE" }, ctx),
    ).rejects.toMatchObject({
      status: 422,
      errors: [
        expect.objectContaining({
          field: "referralCode",
          message: "Código não encontrado.",
        }),
      ],
    });
    await expect(
      registerStore(
        deps(),
        null,
        { ...VALID, phone: "79999990000", referralCode: "RICARDO10" },
        ctx,
      ),
    ).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          field: "referralCode",
          message: "Não vale usar o próprio código.",
        }),
      ],
    });
    expect((await t.db.select().from(stores)).length).toBe(before);
    expect(await auth.verifyPassword("joao@silva.com", "senha-forte-1")).toBe(
      false,
    );
  });

  it("[STO-FR-004] valida cada campo, com a mensagem no campo, sem criar conta", async () => {
    // Act
    const error = await registerStore(
      deps(),
      null,
      {
        ...VALID,
        storeName: "S",
        whatsapp: "1234",
        password: "123456",
        terms: false,
        city: "Cidade Inventada",
      },
      ctx,
    ).catch((e: unknown) => e);

    // Assert
    expect(error).toMatchObject({ status: 422 });
    const fields = (error as { errors: { field: string }[] }).errors.map(
      (e) => e.field,
    );
    expect(fields).toEqual(
      expect.arrayContaining(["storeName", "whatsapp", "password", "terms"]),
    );
    expect(await auth.verifyPassword("joao@silva.com", "123456")).toBe(false);
    expect(await t.db.select().from(stores)).toHaveLength(0);
  });

  it("[STO-FR-004] cidade fora da lista do IBGE é recusada", async () => {
    await expect(
      registerStore(deps(), null, { ...VALID, city: "Cidade Inventada" }, ctx),
    ).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          field: "city",
          message: "Escolha uma cidade da lista.",
        }),
      ],
    });
  });

  it("[STO-FR-005] endereço do catálogo em uso: erro no campo e nada é criado", async () => {
    await registerStore(deps(), null, VALID, ctx);

    await expect(
      registerStore(
        deps(),
        null,
        { ...VALID, email: "outra@x.com", phone: "79988887777" },
        ctx,
      ),
    ).rejects.toMatchObject({
      status: 409,
      errors: [
        expect.objectContaining({ field: "slug", message: "Indisponível." }),
      ],
    });
    expect(await auth.verifyPassword("outra@x.com", "senha-forte-1")).toBe(
      false,
    );
  });
});
