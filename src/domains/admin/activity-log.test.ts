import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { personWith, storeOwner } from "@/domains/billing/testing/fixtures";
import { activityLog } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { uuidv7 } from "@/platform/db/uuid";
import { LOG_PAGE_SIZE, activityLogView } from "./activity-log";

describe("Log do admin: logs de atividade (012b)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = () => ({ db: t.db });

  beforeEach(async () => {
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  async function log(
    action: string,
    at: string,
    extra: Partial<typeof activityLog.$inferInsert> = {},
  ) {
    await t.db.insert(activityLog).values({
      id: uuidv7(),
      action,
      entity: "store",
      createdAt: new Date(at),
      ...extra,
    });
  }

  it("[ADM-FR-015] [ADM-SEC-003] filtra o tipo Senha temporária no período, do mais recente ao mais antigo, sem a senha", async () => {
    // Arrange
    const admin = await personWith(t.db, "admin");
    await log("auth.temp_password_set", "2026-11-18T15:00:00Z", {
      userId: admin.userId,
      entity: "profile",
      data: { note: "sem senha" },
    });
    await log("subscription.cancel_scheduled", "2026-11-19T15:00:00Z");
    await log("auth.temp_password_set", "2026-11-20T15:00:00Z", {
      userId: admin.userId,
      entity: "profile",
    });
    await log("auth.temp_password_set", "2026-11-01T15:00:00Z", {
      entity: "profile",
    });

    // Act
    const view = await activityLogView(deps(), admin, {
      tipo: "senha",
      de: "2026-11-18",
      ate: "2026-11-24",
    });

    // Assert
    expect(view.items.map((i) => [i.label, i.at.slice(0, 10), i.by])).toEqual([
      ["Senha temporária definida", "2026-11-20", "Pessoa admin"],
      ["Senha temporária definida", "2026-11-18", "Pessoa admin"],
    ]);
    expect(JSON.stringify(view)).not.toContain("sem senha");
  });

  it("[ADM-FR-015] 20 por vez, com o cursor para os anteriores; sem quem fez, 'Sistema'", async () => {
    // Arrange
    const support = await personWith(t.db, "support");
    for (let i = 0; i < LOG_PAGE_SIZE + 3; i++)
      await log(
        "invoice.opened",
        `2026-11-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
      );

    // Act
    const first = await activityLogView(deps(), support, {});
    const second = await activityLogView(deps(), support, {
      depois: first.next!,
    });

    // Assert
    expect(first.items).toHaveLength(LOG_PAGE_SIZE);
    expect(first.items[0]).toMatchObject({
      label: "Fatura aberta",
      by: "Sistema",
    });
    expect(second.items).toHaveLength(3);
    expect(second.next).toBeNull();
  });

  it("[ADM-FR-011] [ADM-SEC-005] filtrado pela loja, só os registros dela, com o nome da loja", async () => {
    // Arrange
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const b = await storeOwner(t.db, "loja-b", "b@x.com");
    const admin = await personWith(t.db, "admin");
    await log("store.suspended", "2026-11-20T12:00:00Z", {
      entityId: a.storeId,
    });
    await log("vehicle.hidden", "2026-11-21T12:00:00Z", {
      entity: "vehicle",
      entityId: uuidv7(),
      data: { storeId: a.storeId },
    });
    await log("store.suspended", "2026-11-22T12:00:00Z", {
      entityId: b.storeId,
    });

    // Act
    const view = await activityLogView(deps(), admin, { loja: a.storeId });

    // Assert
    expect(view.items.map((i) => i.label)).toEqual([
      "Veículo ocultado",
      "Loja suspensa",
      "Loja cadastrada pelo lojista",
    ]);
    expect(view.store?.id).toBe(a.storeId);
  });

  it("[ADM-SEC-001] lojista e visitante não veem o Log", async () => {
    // Arrange
    const owner = await personWith(t.db, "store_owner");

    // Act + Assert
    await expect(activityLogView(deps(), owner, {})).rejects.toMatchObject({
      status: 403,
    });
    await expect(activityLogView(deps(), null, {})).rejects.toMatchObject({
      status: 401,
    });
  });
});
