import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { profiles, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import type { Role } from "@/platform/http/session";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { signIn } from "./service";
import type { SignInInput } from "./schemas";

const NOW = new Date("2026-10-23T12:00:00Z");
const PASSWORD = "senha-forte-1";

describe("signIn", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let auth: FakeAuthProvider;
  let now = NOW;
  const deps = () => ({ db: t.db, auth, now: () => now });
  const login = (input: SignInInput, ipHash = "rede-a") =>
    signIn(deps(), input, { ipHash });

  async function createAccount(
    email: string,
    roles: Role[],
    extra: Partial<typeof profiles.$inferInsert> = {},
  ) {
    const user = await auth.adminCreateUser(email, PASSWORD);
    await t.db
      .insert(profiles)
      .values({ id: user.id, name: "Fulano", email, roles, ...extra });
    return user;
  }

  /** Lojista com loja: a loja exige dono, e o perfil aponta para a loja. */
  async function createOwner(
    email: string,
    status: "active" | "registered" = "active",
  ) {
    const user = await createAccount(email, ["store_owner"]);
    const [store] = await t.db
      .insert(stores)
      .values({
        name: "Silva Autocar",
        slug: "silvautocar",
        city: "Aracaju",
        state: "SE",
        whatsapp: "5579999999999",
        status,
        ownerId: user.id,
      })
      .returning({ id: stores.id });
    await t.db
      .update(profiles)
      .set({ storeId: store.id })
      .where(eq(profiles.id, user.id));
    return user;
  }

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    now = NOW;
    t = await createTestDb();
    auth = new FakeAuthProvider();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[AUT-FR-001] lojista entra e vai para o painel do seu papel", async () => {
    // Arrange
    const user = await createOwner("lojista@x.com", "active");

    // Act
    const result = await login({
      email: "Lojista@X.com ",
      password: PASSWORD,
    });

    // Assert
    expect(result.redirectTo).toBe("/painel/veiculos");
    expect(await auth.getUser()).toMatchObject({ id: user.id });
    const [p] = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id));
    expect(p.lastLoginAt).toEqual(NOW);
    expect(p.lastSeenAt).toEqual(NOW);
  });

  it("[AUT-FR-001] respeita o status da loja (1º pagamento pendente)", async () => {
    await createOwner("lojista@x.com", "registered");

    const result = await login({
      email: "lojista@x.com",
      password: PASSWORD,
    });

    expect(result.redirectTo).toBe("/lojistas/pagamento");
  });

  it("[AUT-FR-011] volta para a página pedida, se for interna", async () => {
    await createAccount("vendedor@x.com", ["seller"]);

    const ok = await login({
      email: "vendedor@x.com",
      password: PASSWORD,
      next: "/rede/extrato",
    });
    expect(ok.redirectTo).toBe("/rede/extrato");

    const external = await login({
      email: "vendedor@x.com",
      password: PASSWORD,
      next: "https://evil.com",
    });
    expect(external.redirectTo).toBe("/rede");
  });

  it("[AUT-FR-002] e-mail inexistente e senha errada dão o mesmo erro", async () => {
    // Arrange
    await createAccount("lojista@x.com", ["store_owner"]);

    // Act
    const unknown = login({
      email: "ninguem@x.com",
      password: PASSWORD,
    });
    const wrong = login({
      email: "lojista@x.com",
      password: "errada-123",
    });

    // Assert
    const expected = {
      type: "invalid-credentials",
      title: "E-mail ou senha incorretos",
    };
    await expect(unknown).rejects.toMatchObject(expected);
    await expect(wrong).rejects.toMatchObject(expected);
    expect(await auth.getUser()).toBeNull();
  });

  it("[AUT-FR-002] conta sem perfil não entra e não fica conectada", async () => {
    await auth.adminCreateUser("orfa@x.com", PASSWORD);

    await expect(
      login({ email: "orfa@x.com", password: PASSWORD }),
    ).rejects.toMatchObject({ type: "invalid-credentials" });
    expect(await auth.getUser()).toBeNull();
  });

  it("[AUT-FR-015] senha temporária válida leva à nova senha, ignorando o next", async () => {
    await createAccount("lojista@x.com", ["store_owner"], {
      mustChangePassword: true,
      tempPasswordExpiresAt: new Date(NOW.getTime() + 60_000),
    });

    const result = await login({
      email: "lojista@x.com",
      password: PASSWORD,
      next: "/painel/leads",
    });

    expect(result.redirectTo).toBe("/nova-senha");
  });

  it("[AUT-FR-014] [AUT-SEC-003] senha temporária vencida dá o erro genérico e encerra a sessão", async () => {
    await createAccount("lojista@x.com", ["store_owner"], {
      mustChangePassword: true,
      tempPasswordExpiresAt: new Date(NOW.getTime() - 1),
    });

    await expect(
      login({ email: "lojista@x.com", password: PASSWORD }),
    ).rejects.toMatchObject({
      type: "invalid-credentials",
      title: "E-mail ou senha incorretos",
    });
    expect(await auth.getUser()).toBeNull();
  });

  it("[AUT-SEC-003] o erro nunca contém a senha", async () => {
    await createAccount("lojista@x.com", ["store_owner"]);

    const error = await login({
      email: "lojista@x.com",
      password: "minha-senha-secreta",
    }).catch((e: unknown) => e);

    expect(JSON.stringify(error)).not.toContain("minha-senha-secreta");
    expect(String((error as Error).message)).not.toContain(
      "minha-senha-secreta",
    );
  });

  it("[AUT-FR-003] 5 falhas em 15 min bloqueiam o e-mail, mesmo com a senha certa", async () => {
    // Arrange
    await createAccount("a@x.com", ["seller"]);
    for (let i = 0; i < 5; i++) {
      await expect(
        login({ email: "a@x.com", password: "errada-1" }, `rede-${i}`),
      ).rejects.toMatchObject({ type: "invalid-credentials" });
    }

    // Act
    const sixth = login({ email: "a@x.com", password: PASSWORD }, "rede-x");

    // Assert
    await expect(sixth).rejects.toMatchObject({
      type: "too-many-requests",
      status: 429,
    });
    expect(await auth.getUser()).toBeNull();
  });

  it("[AUT-FR-003] o bloqueio do e-mail não afeta outra conta e acaba em até 15 min", async () => {
    await createAccount("a@x.com", ["seller"]);
    await createAccount("b@x.com", ["seller"]);
    for (let i = 0; i < 5; i++)
      await login(
        { email: "a@x.com", password: "errada-1" },
        `rede-${i}`,
      ).catch(() => {});

    expect(
      (await login({ email: "b@x.com", password: PASSWORD }, "rede-y"))
        .redirectTo,
    ).toBe("/rede");

    now = new Date(NOW.getTime() + 15 * 60_000);
    expect(
      (await login({ email: "a@x.com", password: PASSWORD }, "rede-z"))
        .redirectTo,
    ).toBe("/rede");
  });

  it("[AUT-FR-003] login certo não conta como falha", async () => {
    await createAccount("a@x.com", ["seller"]);
    for (let i = 0; i < 6; i++) {
      now = new Date(NOW.getTime() + i * 61_000); // fora do limite por rede
      await login({ email: "a@x.com", password: PASSWORD });
    }
    now = new Date(NOW.getTime() + 6 * 61_000);
    expect(
      (await login({ email: "a@x.com", password: PASSWORD })).redirectTo,
    ).toBe("/rede");
  });

  it("[AUT-FR-003] a mesma rede passando do limite por minuto é recusada", async () => {
    await createAccount("a@x.com", ["seller"]);
    for (let i = 0; i < 5; i++)
      await login({ email: `n${i}@x.com`, password: "x-123456" }).catch(
        () => {},
      );

    await expect(
      login({ email: "a@x.com", password: PASSWORD }),
    ).rejects.toMatchObject({ type: "too-many-requests" });
    expect(
      (await login({ email: "a@x.com", password: PASSWORD }, "outra-rede"))
        .redirectTo,
    ).toBe("/rede");
  });
});
