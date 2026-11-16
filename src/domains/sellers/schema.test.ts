import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { liveStore } from "@/domains/showcase/testing/fixtures";
import { partnerships, profiles, sellers } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { uuidv7 } from "@/platform/db/uuid";

describe("tabelas da Rede Caju (vendedor)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  async function person(cpf: string | null) {
    const id = uuidv7();
    await t.db.insert(profiles).values({
      id,
      email: `${id}@x.com`,
      name: "Ana",
      roles: ["seller"],
      cpf,
    });
    return id;
  }

  it("[SEL-SEC-001] CPF é único entre as contas; conta sem CPF não conflita", async () => {
    // Arrange
    await person("52998224725");
    await person(null);

    // Act / Assert
    await person(null);
    await expect(person("52998224725")).rejects.toThrow();
  });

  it("[SEL-SEC-004] uma parceria aberta por vendedor e loja; encerrada libera um pedido novo", async () => {
    // Arrange
    const sellerId = await person("52998224725");
    await t.db.insert(sellers).values({ profileId: sellerId, city: "Aracaju" });
    const store = { id: (await liveStore(t.db, "loja-a")).storeId };
    const open = { sellerId, storeId: store.id, origin: "request" as const };
    await t.db.insert(partnerships).values(open);

    // Act / Assert
    await expect(t.db.insert(partnerships).values(open)).rejects.toThrow();
    await t.db.update(partnerships).set({ status: "ended" });
    await t.db.insert(partnerships).values(open);
  });

  it("[SEL-SEC-004] RLS ligado nas tabelas novas e origem seller no lead", async () => {
    // Act
    const { rows } = await t.client.query<{ relname: string }>(
      "select relname from pg_class where relrowsecurity and relname in ('sellers','partnerships','seller_vehicle_clicks') order by relname",
    );
    const origins = await t.client.query<{ v: string }>(
      "select unnest(enum_range(null::lead_origin))::text as v",
    );

    // Assert
    expect(rows.map((r) => r.relname)).toEqual([
      "partnerships",
      "seller_vehicle_clicks",
      "sellers",
    ]);
    expect(origins.rows.map((r) => r.v)).toContain("seller");
  });
});
