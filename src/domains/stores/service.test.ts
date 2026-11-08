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
import type { Role, Session } from "@/platform/http/session";
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

describe("registerStore (proteções e conta existente)", () => {
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

  async function account(email: string, roles: Role[]): Promise<Session> {
    const user = await auth.adminCreateUser(email, "senha-forte-1");
    await t.db
      .insert(profiles)
      .values({ id: user.id, name: "Ana Lima", email, roles });
    return {
      userId: user.id,
      roles,
      activeRole: roles[0],
      storeId: null,
      mustChangePassword: false,
    };
  }

  it("[STO-SEC-002] campo isca preenchido: nada é criado", async () => {
    await expect(
      registerStore(deps(), null, VALID, {
        ipHash: "rede-a",
        honeypotFilled: true,
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(await t.db.select().from(stores)).toHaveLength(0);
    expect(await auth.verifyPassword("joao@silva.com", "senha-forte-1")).toBe(
      false,
    );
  });

  it("[STO-SEC-002] a mesma rede acima de 5 tentativas por minuto recebe aviso para aguardar", async () => {
    // Arrange: 5 tentativas (inválidas) da mesma rede
    for (let i = 0; i < 5; i++)
      await registerStore(
        deps(),
        null,
        { ...VALID, terms: false },
        { ipHash: "rede-a" },
      ).catch(() => {});

    // Act / Assert
    await expect(
      registerStore(deps(), null, VALID, { ipHash: "rede-a" }),
    ).rejects.toMatchObject({ type: "too-many-requests", status: 429 });
    expect(
      (await registerStore(deps(), null, VALID, { ipHash: "rede-b" })).storeId,
    ).toBeTruthy();
  });

  it("[STO-FR-015] e-mail já cadastrado: convite neutro para entrar, nada é criado", async () => {
    // Arrange
    await account("ana@x.com", ["referrer"]);

    // Act / Assert
    await expect(
      registerStore(
        deps(),
        null,
        { ...VALID, email: "ANA@x.com" },
        { ipHash: "rede-a" },
      ),
    ).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          field: "email",
          message: "Se você já tem conta, entre para continuar.",
        }),
      ],
    });
    expect(await t.db.select().from(stores)).toHaveLength(0);
  });

  it("[STO-FR-015] conectada, a indicadora informa só a loja e passa a ser também lojista", async () => {
    // Arrange
    const ana = await account("ana@x.com", ["referrer"]);

    // Act
    const { userId, storeId } = await registerStore(
      deps(),
      ana,
      {
        storeName: "Ana Veículos",
        city: "Aracaju",
        state: "SE",
        whatsapp: "79981360206",
        slug: "ana-veiculos",
        terms: true,
      },
      { ipHash: "rede-a" },
    );

    // Assert
    expect(userId).toBe(ana.userId);
    const [profile] = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, ana.userId));
    expect(profile.roles).toEqual(["referrer", "store_owner"]);
    expect(profile.storeId).toBe(storeId);
    const [code] = await t.db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.profileId, ana.userId));
    expect(code.code).toBe("ANA10");
  });

  it("[STO-FR-015] conectada, autoindicação pelo próprio código é recusada", async () => {
    const ana = await account("ana@x.com", ["referrer"]);
    await t.db
      .insert(referralCodes)
      .values({ code: "ANA10", profileId: ana.userId });

    await expect(
      registerStore(
        deps(),
        ana,
        {
          storeName: "Ana Veículos",
          city: "Aracaju",
          state: "SE",
          whatsapp: "79981360206",
          slug: "ana-veiculos",
          terms: true,
          referralCode: "ANA10",
        },
        { ipHash: "rede-a" },
      ),
    ).rejects.toMatchObject({
      errors: [expect.objectContaining({ field: "referralCode" })],
    });
  });

  it("[STO-FR-015] [STO-SEC-002] conta da equipe não abre loja; quem já tem loja também não", async () => {
    const support = await account("suporte@x.com", ["support"]);
    const store = {
      storeName: "Loja",
      city: "Aracaju",
      state: "SE",
      whatsapp: "79981360206",
      slug: "loja-equipe",
      terms: true,
    };

    await expect(
      registerStore(deps(), support, store, { ipHash: "rede-a" }),
    ).rejects.toMatchObject({
      status: 403,
    });

    const owner = await registerStore(deps(), null, VALID, {
      ipHash: "rede-b",
    });
    const ownerSession: Session = {
      userId: owner.userId,
      roles: ["store_owner"],
      activeRole: "store_owner",
      storeId: owner.storeId,
      mustChangePassword: false,
    };
    await expect(
      registerStore(
        deps(),
        ownerSession,
        { ...store, slug: "segunda-loja" },
        { ipHash: "rede-c" },
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});
