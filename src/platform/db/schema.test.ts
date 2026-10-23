import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./testing/test-db";
import { profiles, stores } from "./schema";

describe("schema e migrations", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });

  afterEach(async () => {
    await t.close();
  });

  it("aplica as migrations com RLS ligado em todas as tabelas", async () => {
    // Act
    const { rows } = await t.client.query<{
      relname: string;
      relrowsecurity: boolean;
    }>(
      "select relname, relrowsecurity from pg_class where relname in ('profiles','stores') order by relname",
    );

    // Assert
    expect(rows).toEqual([
      { relname: "profiles", relrowsecurity: true },
      { relname: "stores", relrowsecurity: true },
    ]);
  });

  it("cria loja ligada ao dono e gera id v7", async () => {
    // Arrange
    const ownerId = "0192f1e0-0000-7000-8000-000000000001";
    await t.db.insert(profiles).values({
      id: ownerId,
      name: "Ricardo Silva",
      email: "ricardo@example.com",
      roles: ["store_owner"],
    });

    // Act
    const [store] = await t.db
      .insert(stores)
      .values({
        name: "Auto Center Silva",
        slug: "autocentersilva",
        city: "Campinas",
        state: "SP",
        whatsapp: "19998122015",
        ownerId,
      })
      .returning();

    // Assert
    expect(store.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
    expect(store.shareByDefault).toBe(true);
  });

  it("rejeita slug repetido", async () => {
    // Arrange
    const ownerId = "0192f1e0-0000-7000-8000-000000000002";
    await t.db.insert(profiles).values({
      id: ownerId,
      name: "Dono",
      email: "dono@example.com",
      roles: ["store_owner"],
    });
    const base = {
      name: "Loja",
      city: "Campinas",
      state: "SP",
      whatsapp: "19999999999",
      ownerId,
    };
    await t.db.insert(stores).values({ ...base, slug: "garagem77" });

    // Act + Assert
    await expect(
      t.db.insert(stores).values({ ...base, slug: "garagem77" }),
    ).rejects.toThrow();
  });
});
