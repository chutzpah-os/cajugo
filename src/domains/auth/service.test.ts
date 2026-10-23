import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog, profiles, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import type { Role } from "@/platform/http/session";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import {
  findAccountByEmail,
  generateTemporaryPassword,
  getSession,
  setTemporaryPassword,
  signIn,
  signOut,
  switchPanel,
  updatePassword,
} from "./service";
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

  describe("getSession", () => {
    const HOUR = 60 * 60_000;
    const DAY = 24 * HOUR;

    async function connected(roles: Role[], lastSeenAgo: number) {
      const user = await createAccount("p@x.com", roles);
      await login({ email: "p@x.com", password: PASSWORD });
      await t.db
        .update(profiles)
        .set({ lastSeenAt: new Date(NOW.getTime() - lastSeenAgo) })
        .where(eq(profiles.id, user.id));
      return user;
    }
    const lastSeen = async (id: string) =>
      (
        await t.db
          .select({ v: profiles.lastSeenAt })
          .from(profiles)
          .where(eq(profiles.id, id))
      )[0].v;

    it("sem login não há sessão", async () => {
      expect(await getSession(deps())).toBeNull();
    });

    it("[AUT-FR-004] quem usou há 10 dias continua conectado", async () => {
      // Arrange
      const user = await connected(["seller", "referrer"], 10 * DAY);

      // Act
      const session = await getSession(deps());

      // Assert
      expect(session).toEqual({
        userId: user.id,
        roles: ["seller", "referrer"],
        activeRole: "seller",
        storeId: null,
        mustChangePassword: false,
      });
      expect(await lastSeen(user.id)).toEqual(NOW);
    });

    it("[AUT-FR-004] 31 dias sem uso encerram a sessão", async () => {
      await connected(["store_owner"], 31 * DAY);

      expect(await getSession(deps())).toBeNull();
      expect(await auth.getUser()).toBeNull();
    });

    it("[AUT-FR-004] admin e suporte: 25 horas sem uso encerram a sessão", async () => {
      await connected(["admin"], 25 * HOUR);

      expect(await getSession(deps())).toBeNull();
      expect(await auth.getUser()).toBeNull();
    });

    it("[AUT-FR-004] admin que usou há 23 horas continua conectado", async () => {
      await connected(["support"], 23 * HOUR);

      expect(await getSession(deps())).toMatchObject({
        activeRole: "support",
      });
    });

    it("[AUT-FR-004] grava o último uso no máximo uma vez por hora", async () => {
      const user = await connected(["seller"], 30 * 60_000);

      await getSession(deps());

      expect(await lastSeen(user.id)).toEqual(
        new Date(NOW.getTime() - 30 * 60_000),
      );
    });

    it("[AUT-FR-015] marca a troca obrigatória de senha", async () => {
      const user = await connected(["seller"], 0);
      await t.db
        .update(profiles)
        .set({
          mustChangePassword: true,
          tempPasswordExpiresAt: new Date(NOW.getTime() + HOUR),
        })
        .where(eq(profiles.id, user.id));

      expect(await getSession(deps())).toMatchObject({
        mustChangePassword: true,
      });
    });

    it("[AUT-FR-014] senha temporária vencida encerra a sessão", async () => {
      const user = await connected(["seller"], 0);
      await t.db
        .update(profiles)
        .set({
          mustChangePassword: true,
          tempPasswordExpiresAt: new Date(NOW.getTime() - 1),
        })
        .where(eq(profiles.id, user.id));

      expect(await getSession(deps())).toBeNull();
      expect(await auth.getUser()).toBeNull();
    });

    it("[AUT-FR-006] o painel ativo é o último usado", async () => {
      const user = await connected(["seller", "referrer"], 0);
      await t.db
        .update(profiles)
        .set({ lastPanel: "referrer" })
        .where(eq(profiles.id, user.id));

      expect(await getSession(deps())).toMatchObject({
        activeRole: "referrer",
      });
    });
  });

  describe("signOut", () => {
    it("[AUT-FR-005] sai só deste aparelho e volta à vitrine", async () => {
      // Arrange
      await createAccount("p@x.com", ["seller"]);
      const phone = auth.device();
      await login({ email: "p@x.com", password: PASSWORD });
      await signIn(
        { ...deps(), auth: phone },
        { email: "p@x.com", password: PASSWORD },
        { ipHash: "rede-b" },
      );

      // Act
      const result = await signOut(deps());

      // Assert
      expect(result.redirectTo).toBe("/");
      expect(await getSession(deps())).toBeNull();
      expect(await phone.getUser()).not.toBeNull();
    });
  });

  describe("switchPanel", () => {
    async function sessionOf(email: string, roles: Role[]) {
      await createAccount(email, roles);
      const device = auth.device();
      await signIn(
        { ...deps(), auth: device },
        { email, password: PASSWORD },
        { ipHash: email },
      );
      const session = await getSession({ ...deps(), auth: device });
      return session!;
    }
    const profileOf = async (id: string) =>
      (await t.db.select().from(profiles).where(eq(profiles.id, id)))[0];

    it("[AUT-FR-007] troca para outro papel da conta e grava o último painel", async () => {
      // Arrange
      const session = await sessionOf("a@x.com", ["seller", "referrer"]);

      // Act
      const result = await switchPanel(deps(), session, "referrer");

      // Assert
      expect(result.redirectTo).toBe("/indica");
      expect((await profileOf(session.userId)).lastPanel).toBe("referrer");
    });

    it("[AUT-FR-007] [AUT-SEC-002] papel que a conta não tem é recusado e nada muda", async () => {
      const session = await sessionOf("a@x.com", ["referrer"]);

      for (const role of ["store_owner", "seller", "admin", "dono"]) {
        await expect(switchPanel(deps(), session, role)).rejects.toMatchObject({
          status: 403,
        });
      }
      const p = await profileOf(session.userId);
      expect(p.roles).toEqual(["referrer"]);
      expect(p.lastPanel).toBeNull();
      expect(p.storeId).toBeNull();
    });

    it("[AUT-SEC-001] usuário B troca o próprio painel sem afetar a conta A", async () => {
      const a = await sessionOf("a@x.com", ["seller", "referrer"]);
      const b = await sessionOf("b@x.com", ["seller", "referrer"]);

      await switchPanel(deps(), b, "referrer");

      expect((await profileOf(a.userId)).lastPanel).toBeNull();
      expect((await profileOf(b.userId)).lastPanel).toBe("referrer");
    });

    it("sem sessão responde 401", async () => {
      await expect(switchPanel(deps(), null, "seller")).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  describe("setTemporaryPassword", () => {
    async function sessionOf(email: string, roles: Role[]) {
      const user = await createAccount(email, roles);
      return {
        userId: user.id,
        roles,
        activeRole: roles[0],
        storeId: null,
        mustChangePassword: false,
      };
    }

    it("gera senha forte e diferente a cada vez", () => {
      const a = generateTemporaryPassword();
      expect(a).toMatch(/^[A-Za-z0-9]{12,}$/);
      expect(generateTemporaryPassword()).not.toBe(a);
    });

    it("[AUT-FR-014] [AUT-SEC-004] admin define a senha: vale 24 h, obriga troca e vai para a auditoria sem a senha", async () => {
      // Arrange
      const admin = await sessionOf("admin@x.com", ["admin"]);
      const target = await createAccount("lojista@x.com", ["seller"]);

      // Act
      const { password } = await setTemporaryPassword(deps(), admin, target.id);

      // Assert
      const [p] = await t.db
        .select()
        .from(profiles)
        .where(eq(profiles.id, target.id));
      expect(p.mustChangePassword).toBe(true);
      expect(p.tempPasswordExpiresAt).toEqual(
        new Date(NOW.getTime() + 24 * 60 * 60_000),
      );
      const logs = await t.db.select().from(activityLog);
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        userId: admin.userId,
        action: "auth.temp_password_set",
        entity: "profile",
        entityId: target.id,
      });
      expect(JSON.stringify(logs)).not.toContain(password);
      expect(
        (await login({ email: "lojista@x.com", password })).redirectTo,
      ).toBe("/nova-senha");
    });

    it("[AUT-SEC-004] [AUT-SEC-008] suporte e lojista são recusados", async () => {
      const target = await createAccount("alvo@x.com", ["seller"]);
      for (const [email, role] of [
        ["suporte@x.com", "support"],
        ["dono@x.com", "store_owner"],
      ] as const) {
        const session = await sessionOf(email, [role]);
        await expect(
          setTemporaryPassword(deps(), session, target.id),
        ).rejects.toMatchObject({ status: 403 });
      }
      expect(await t.db.select().from(activityLog)).toHaveLength(0);
    });

    it("conta inexistente responde 404", async () => {
      const admin = await sessionOf("admin@x.com", ["admin"]);
      await expect(
        setTemporaryPassword(
          deps(),
          admin,
          "0192f1e0-0000-7000-8000-000000000099",
        ),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        setTemporaryPassword(deps(), admin, "nao-e-uuid"),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("[AUT-FR-014] vencida em 25 h é recusada, e o admin gera outra", async () => {
      // Arrange
      const admin = await sessionOf("admin@x.com", ["admin"]);
      const target = await createAccount("lojista@x.com", ["seller"]);
      const first = await setTemporaryPassword(deps(), admin, target.id);

      // Act
      now = new Date(NOW.getTime() + 25 * 60 * 60_000);
      const expired = login({
        email: "lojista@x.com",
        password: first.password,
      });
      const second = await setTemporaryPassword(deps(), admin, target.id);

      // Assert
      await expect(expired).rejects.toMatchObject({
        title: "E-mail ou senha incorretos",
      });
      expect(
        (
          await login(
            { email: "lojista@x.com", password: second.password },
            "outra-rede",
          )
        ).redirectTo,
      ).toBe("/nova-senha");
    });
  });

  describe("updatePassword", () => {
    const NEW = "nova-senha-1";

    async function withTempPassword() {
      const user = await createAccount("p@x.com", ["seller"], {
        mustChangePassword: true,
        tempPasswordExpiresAt: new Date(NOW.getTime() + 60 * 60_000),
      });
      const other = auth.device();
      await signIn(
        { ...deps(), auth: other },
        { email: "p@x.com", password: PASSWORD },
        { ipHash: "rede-b" },
      );
      await login({ email: "p@x.com", password: PASSWORD });
      const session = (await getSession(deps()))!;
      return { user, other, session };
    }

    it("[AUT-FR-015] nova senha válida limpa a obrigação, entra no painel e encerra outros aparelhos", async () => {
      // Arrange
      const { user, other, session } = await withTempPassword();

      // Act
      const result = await updatePassword(deps(), session, {
        password: NEW,
        confirmation: NEW,
      });

      // Assert
      expect(result.redirectTo).toBe("/rede");
      const [p] = await t.db
        .select()
        .from(profiles)
        .where(eq(profiles.id, user.id));
      expect(p.mustChangePassword).toBe(false);
      expect(p.tempPasswordExpiresAt).toBeNull();
      expect(await other.getUser()).toBeNull();
      expect(await getSession(deps())).toMatchObject({
        mustChangePassword: false,
      });
      expect(
        (await login({ email: "p@x.com", password: NEW }, "rede-c")).redirectTo,
      ).toBe("/rede");
    });

    it("[AUT-FR-015] recusa senha curta ou confirmação diferente, sem trocar nada", async () => {
      const { session } = await withTempPassword();

      await expect(
        updatePassword(deps(), session, {
          password: "curta",
          confirmation: "curta",
        }),
      ).rejects.toMatchObject({
        status: 422,
        errors: [expect.objectContaining({ field: "password" })],
      });
      await expect(
        updatePassword(deps(), session, {
          password: NEW,
          confirmation: "outra-senha",
        }),
      ).rejects.toMatchObject({
        status: 422,
        errors: [expect.objectContaining({ field: "confirmation" })],
      });
      expect(await getSession(deps())).toMatchObject({
        mustChangePassword: true,
      });
    });

    it("[AUT-FR-015] recusa repetir a senha atual, com erro no campo", async () => {
      const { session } = await withTempPassword();

      await expect(
        updatePassword(deps(), session, {
          password: PASSWORD,
          confirmation: PASSWORD,
        }),
      ).rejects.toMatchObject({
        status: 422,
        errors: [expect.objectContaining({ code: "same_password" })],
      });
    });

    it("sem sessão responde 401", async () => {
      await expect(
        updatePassword(deps(), null, { password: NEW, confirmation: NEW }),
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("findAccountByEmail", () => {
    const sessionFor = (userId: string, roles: Role[]) => ({
      userId,
      roles,
      activeRole: roles[0],
      storeId: null,
      mustChangePassword: false,
    });

    it("[AUT-SEC-008] admin e suporte encontram a conta, só com os campos da tela", async () => {
      // Arrange
      const target = await createAccount("lojista@x.com", [
        "seller",
        "referrer",
      ]);

      for (const role of ["admin", "support"] as const) {
        // Act
        const found = await findAccountByEmail(
          deps(),
          sessionFor("0192f1e0-0000-7000-8000-0000000000aa", [role]),
          " Lojista@X.com ",
        );

        // Assert
        expect(found).toEqual({
          id: target.id,
          name: "Fulano",
          email: "lojista@x.com",
          roles: ["seller", "referrer"],
        });
      }
    });

    it("e-mail sem conta ou inválido devolve null", async () => {
      const admin = sessionFor("0192f1e0-0000-7000-8000-0000000000aa", [
        "admin",
      ]);
      expect(
        await findAccountByEmail(deps(), admin, "ninguem@x.com"),
      ).toBeNull();
      expect(await findAccountByEmail(deps(), admin, "nao-e-email")).toBeNull();
    });

    it("[AUT-SEC-001] lojista não busca contas", async () => {
      await expect(
        findAccountByEmail(
          deps(),
          sessionFor("0192f1e0-0000-7000-8000-0000000000bb", ["store_owner"]),
          "x@x.com",
        ),
      ).rejects.toMatchObject({ status: 403 });
    });
  });
});
