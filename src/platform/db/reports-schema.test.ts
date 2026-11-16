import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./testing/test-db";

describe("tabela de denúncias de anúncio", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[RPT-SEC-006] vehicle_reports não tem coluna de autor nem de IP, e tem RLS", async () => {
    // Act
    const { rows } = await t.client.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'vehicle_reports' order by column_name",
    );
    const rls = await t.client.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relname = 'vehicle_reports'",
    );

    // Assert
    expect(rows.map((r) => r.column_name)).toEqual([
      "created_at",
      "decided_at",
      "decided_by",
      "details",
      "id",
      "reason",
      "status",
      "vehicle_id",
    ]);
    expect(rls.rows).toEqual([{ relrowsecurity: true }]);
  });

  it("[RPT-FR-006] veículo tem a marca de moderação e os avisos de ocultar e mostrar", async () => {
    // Act
    const { rows } = await t.client.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'vehicles' and column_name like 'hidden_%' order by column_name",
    );
    const kinds = await t.client.query<{ v: string }>(
      "select unnest(enum_range(null::notice_kind))::text as v",
    );

    // Assert
    expect(rows.map((r) => r.column_name)).toEqual([
      "hidden_at",
      "hidden_by",
      "hidden_note",
      "hidden_reason",
    ]);
    expect(kinds.rows.map((r) => r.v)).toEqual(
      expect.arrayContaining(["vehicle_hidden", "vehicle_shown"]),
    );
  });
});
