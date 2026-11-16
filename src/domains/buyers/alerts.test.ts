import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { searchAlerts } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { createAlert } from "./service";

const NOW = new Date("2026-11-16T10:00:00Z");
const TORO = { query: "cambio=automatico&q=Fiat+Toro", discoveryPath: null };
const input = (over: Partial<Parameters<typeof createAlert>[1]> = {}) => ({
  name: "Ana",
  phone: "5579999990000",
  search: TORO,
  ...over,
});

describe("pedir alerta de busca", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[ALR-FR-001] guarda nome, celular, busca e o consentimento, pendente", async () => {
    // Act
    const r = await createAlert(t.db, input(), NOW);

    // Assert
    expect(r).toMatchObject({ ok: true, status: "created" });
    const rows = await t.db.select().from(searchAlerts);
    expect(rows).toEqual([
      expect.objectContaining({
        status: "pending",
        name: "Ana",
        phone: "5579999990000",
        query: TORO.query,
        discoveryPath: null,
        consentAt: NOW,
        createdAt: NOW,
      }),
    ]);
  });

  it("[ALR-FR-006] mesma busca pendente do mesmo celular não duplica", async () => {
    // Arrange
    await createAlert(t.db, input(), NOW);

    // Act
    const again = await createAlert(t.db, input({ name: "Ana Paula" }), NOW);

    // Assert
    expect(again).toEqual({ ok: true, status: "duplicate" });
    expect(await t.db.select().from(searchAlerts)).toHaveLength(1);
  });

  it("[ALR-SEC-002] até 5 pendentes por celular; fechado não conta", async () => {
    // Arrange
    for (let n = 0; n < 5; n++)
      await createAlert(
        t.db,
        input({ search: { query: `q=carro+${n}`, discoveryPath: null } }),
        NOW,
      );

    // Act
    const sixth = await createAlert(
      t.db,
      input({ search: { query: "q=outro", discoveryPath: null } }),
      NOW,
    );
    await t.db
      .update(searchAlerts)
      .set({ status: "canceled", name: null, phone: null })
      .where(eq(searchAlerts.query, "q=carro+0"));
    const afterClose = await createAlert(
      t.db,
      input({ search: { query: "q=outro", discoveryPath: null } }),
      NOW,
    );

    // Assert
    expect(sixth).toEqual({ ok: false, error: "too-many" });
    expect(afterClose).toMatchObject({ ok: true, status: "created" });
  });
});
