import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./testing/test-db";
import { searchAlerts } from "./schema";

const alert = (over: Partial<typeof searchAlerts.$inferInsert> = {}) => ({
  name: "Ana",
  phone: "5579999990000",
  query: "cambio=automatico&q=fiat+toro",
  consentAt: new Date("2026-11-16T10:00:00Z"),
  ...over,
});

describe("tabela de alertas de busca", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[ALR-FR-006] mesma busca pendente do mesmo celular não repete; na vitrine e na descoberta são buscas diferentes", async () => {
    // Arrange
    await t.db.insert(searchAlerts).values(alert());

    // Act / Assert
    await expect(t.db.insert(searchAlerts).values(alert())).rejects.toThrow();
    await t.db
      .insert(searchAlerts)
      .values(alert({ discoveryPath: "/carros/fiat" }));
    await expect(
      t.db
        .insert(searchAlerts)
        .values(alert({ discoveryPath: "/carros/fiat" })),
    ).rejects.toThrow();
    await t.db.insert(searchAlerts).values(alert({ phone: "5579988887777" }));
  });

  it("[ALR-SEC-004] fechado libera a mesma busca e aceita ficar sem nome e celular", async () => {
    // Arrange
    await t.db
      .insert(searchAlerts)
      .values(alert({ status: "notified", name: null, phone: null }));

    // Act
    const [row] = await t.db.insert(searchAlerts).values(alert()).returning();

    // Assert
    expect(row).toMatchObject({ status: "pending", discoveryPath: null });
  });

  it("[ALR-FR-005] RLS ligado e validade inicial de 90 dias nas regras", async () => {
    const { rows } = await t.client.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relname = 'search_alerts'",
    );
    expect(rows).toEqual([{ relrowsecurity: true }]);
    const seeded = await t.client.query<{ value: unknown }>(
      "select value from setting_values where key = 'search_alert_validity_days'",
    );
    expect(seeded.rows.map((r) => Number(r.value))).toEqual([90]);
  });
});
