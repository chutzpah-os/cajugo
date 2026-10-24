import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog, profiles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { createAdmin } from "./create-admin";
import { getSession, signIn } from "./service";

const NOW = new Date("2026-10-23T12:00:00Z");

describe("createAdmin", () => {
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

  it("[AUT-SEC-009] cria o admin com senha temporária de 24 h e troca obrigatória", async () => {
    // Act
    const { userId, password } = await createAdmin(deps(), {
      email: " Dono@CajuGo.com ",
      name: "Haniel",
    });

    // Assert
    const [p] = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId));
    expect(p).toMatchObject({
      email: "dono@cajugo.com",
      name: "Haniel",
      roles: ["admin"],
      mustChangePassword: true,
      tempPasswordExpiresAt: new Date(NOW.getTime() + 24 * 60 * 60_000),
    });
    const result = await signIn(
      deps(),
      { email: "dono@cajugo.com", password },
      { ipHash: "rede-a" },
    );
    expect(result.redirectTo).toBe("/nova-senha");
    expect(await getSession(deps())).toMatchObject({ activeRole: "admin" });
  });

  it("[AUT-SEC-003] a auditoria registra a criação sem a senha", async () => {
    const { userId, password } = await createAdmin(deps(), {
      email: "dono@cajugo.com",
    });

    const logs = await t.db.select().from(activityLog);
    expect(logs).toEqual([
      expect.objectContaining({
        userId: null,
        action: "auth.admin_created",
        entity: "profile",
        entityId: userId,
      }),
    ]);
    expect(JSON.stringify(logs)).not.toContain(password);
  });

  it("[AUT-SEC-009] sem nome, usa a parte do e-mail antes do @", async () => {
    const { userId } = await createAdmin(deps(), { email: "dono@cajugo.com" });

    const [p] = await t.db
      .select({ name: profiles.name })
      .from(profiles)
      .where(eq(profiles.id, userId));
    expect(p.name).toBe("dono");
  });

  it("[AUT-SEC-009] recusa e-mail inválido ou já cadastrado", async () => {
    await createAdmin(deps(), { email: "dono@cajugo.com" });

    await expect(
      createAdmin(deps(), { email: "nao-e-email" }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      createAdmin(deps(), { email: "DONO@cajugo.com" }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
