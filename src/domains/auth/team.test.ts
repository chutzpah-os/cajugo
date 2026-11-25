import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { personWith } from "@/domains/billing/testing/fixtures";
import { activityLog, profiles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { inviteTeamMember, removeTeamMember, teamView } from "./service";

const NOW = new Date("2026-11-25T12:00:00Z");

describe("Equipe CajuGo [4c] (012b)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let auth: FakeAuthProvider;
  const deps = () => ({ db: t.db, auth, now: () => NOW });

  beforeEach(async () => {
    t = await createTestDb();
    auth = new FakeAuthProvider();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await t.close();
  });

  it("[ADM-FR-012] [ADM-SEC-003] convidar Bruno como Suporte: aparece na equipe, senha uma vez e fora do registro", async () => {
    // Arrange
    const admin = await personWith(t.db, "admin");

    // Act
    const { profileId, temporaryPassword } = await inviteTeamMember(
      deps(),
      admin,
      { name: "Bruno", email: "Bruno@CajuGo.com", role: "support" },
    );

    // Assert
    expect(temporaryPassword).toBeTruthy();
    expect(
      await auth.verifyPassword("bruno@cajugo.com", temporaryPassword!),
    ).toBe(true);
    const [p] = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId));
    expect(p).toMatchObject({ roles: ["support"], mustChangePassword: true });
    const view = await teamView(deps(), admin);
    expect(view.members.find((m) => m.name === "Bruno")).toMatchObject({
      roleLabel: "Suporte",
      canRemove: true,
    });
    const log = await t.db.select().from(activityLog);
    expect(log.map((l) => l.action)).toContain("team.invited");
    expect(JSON.stringify(log)).not.toContain(temporaryPassword!);
  });

  it("[ADM-FR-012] e-mail de cliente ou de quem já está na equipe → 422 no e-mail", async () => {
    // Arrange
    const admin = await personWith(t.db, "admin");
    const owner = await personWith(t.db, "store_owner");
    const support = await personWith(t.db, "support");

    // Act + Assert
    for (const email of [`${owner.userId}@x.com`, `${support.userId}@x.com`])
      await expect(
        inviteTeamMember(deps(), admin, {
          name: "Xavier",
          email,
          role: "admin",
        }),
      ).rejects.toMatchObject({
        status: 422,
        errors: [expect.objectContaining({ field: "email" })],
      });
  });

  it("[ADM-FR-012] remover: perde o papel e é desconectado; ninguém remove a si mesmo nem o último admin", async () => {
    // Arrange
    const admin = await personWith(t.db, "admin");
    const bruno = await personWith(t.db, "support");
    const signOut = vi.spyOn(auth, "adminSignOutAll");

    // Act
    await removeTeamMember(deps(), admin, { profileId: bruno.userId });

    // Assert
    const [p] = await t.db
      .select({ roles: profiles.roles })
      .from(profiles)
      .where(eq(profiles.id, bruno.userId));
    expect(p.roles).toEqual([]);
    expect(signOut).toHaveBeenCalledWith(bruno.userId);
    await expect(
      removeTeamMember(deps(), admin, { profileId: admin.userId }),
    ).rejects.toMatchObject({ status: 409 });
    const view = await teamView(deps(), admin);
    expect(view.members).toEqual([
      expect.objectContaining({ isSelf: true, canRemove: false }),
    ]);

    // o último admin fica: com a sessão antiga de quem saiu, remover o outro é recusado
    const other = await personWith(t.db, "admin");
    await removeTeamMember(deps(), other, { profileId: admin.userId });
    await expect(
      removeTeamMember(deps(), admin, { profileId: other.userId }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("[ADM-SEC-002] suporte vê a equipe sem Remover e não convida nem remove (403)", async () => {
    // Arrange
    await personWith(t.db, "admin");
    const support = await personWith(t.db, "support");

    // Act
    const view = await teamView(deps(), support);

    // Assert
    expect(view.canManage).toBe(false);
    expect(view.members.every((m) => !m.canRemove)).toBe(true);
    await expect(
      inviteTeamMember(deps(), support, {
        name: "Xavier",
        email: "x@cajugo.com",
        role: "support",
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      removeTeamMember(deps(), support, { profileId: support.userId }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
