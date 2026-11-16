import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { activityLog, profiles, searchAlerts } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import type { Role, Session } from "@/platform/http/session";
import { cancelToken } from "./alert-token";
import { cancelAlert, markNotified } from "./service";

const NOW = new Date("2026-11-16T12:00:00Z");
const ADMIN_ID = "0192f1e0-0000-7000-8000-0000000000a1";

const session = (roles: Role[], userId = ADMIN_ID): Session => ({
  userId,
  roles,
  activeRole: roles[0],
  storeId: roles.includes("store_owner") ? "loja-a" : null,
  mustChangePassword: false,
});

describe("fechar o alerta", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let alertId: string;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    await t.db.insert(profiles).values({
      id: ADMIN_ID,
      name: "Admin",
      email: "admin@x.com",
      roles: ["admin"],
    });
    [{ id: alertId }] = await t.db
      .insert(searchAlerts)
      .values({
        name: "Ana",
        phone: "5579999990000",
        query: "q=toro",
        consentAt: NOW,
        createdAt: NOW,
      })
      .returning({ id: searchAlerts.id });
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  const row = async () =>
    (
      await t.db.select().from(searchAlerts).where(eq(searchAlerts.id, alertId))
    )[0];

  it("[ALR-FR-003] [ALR-SEC-004] avisado: fecha, apaga nome e celular e registra quem avisou", async () => {
    // Act
    const ok = await markNotified(t.db, session(["admin"]), { alertId }, NOW);

    // Assert
    expect(ok).toBe(true);
    expect(await row()).toMatchObject({
      status: "notified",
      name: null,
      phone: null,
      closedAt: NOW,
      notifiedBy: ADMIN_ID,
    });
    const logs = await t.db.select().from(activityLog);
    expect(logs).toEqual([
      expect.objectContaining({
        action: "search_alert.notified",
        entityId: alertId,
        userId: ADMIN_ID,
      }),
    ]);
    expect(JSON.stringify(logs)).not.toContain("5579999990000");
    expect(await markNotified(t.db, session(["admin"]), { alertId }, NOW)).toBe(
      false,
    );
  });

  it("[ALR-SEC-001] lojista e visitante não marcam alerta; id inválido é recusado", async () => {
    await expect(
      markNotified(t.db, session(["store_owner"]), { alertId }, NOW),
    ).rejects.toThrow();
    await expect(markNotified(t.db, null, { alertId }, NOW)).rejects.toThrow();
    await expect(
      markNotified(t.db, session(["admin"]), { alertId: "x" }, NOW),
    ).rejects.toThrow();
    expect((await row()).status).toBe("pending");
  });

  it("[ALR-FR-004] [ALR-SEC-004] cancelar pelo link: fecha e apaga; de novo, já encerrado", async () => {
    // Act / Assert
    expect(await cancelAlert(t.db, cancelToken(alertId), NOW)).toBe("canceled");
    expect(await row()).toMatchObject({
      status: "canceled",
      name: null,
      phone: null,
      closedAt: NOW,
    });
    expect(await cancelAlert(t.db, cancelToken(alertId), NOW)).toBe("closed");
  });

  it("[ALR-SEC-005] link de outro alerta ou adulterado não cancela", async () => {
    const other = "0192f1e0-0000-7000-8000-0000000000ff";
    expect(await cancelAlert(t.db, cancelToken(other), NOW)).toBe("invalid");
    expect(await cancelAlert(t.db, `${alertId}.abc`, NOW)).toBe("invalid");
    expect((await row()).status).toBe("pending");
  });
});
