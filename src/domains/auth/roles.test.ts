import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { profiles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import type { Role } from "@/platform/http/session";
import { grantRole } from "./roles";

const ID = "0192f1e0-0000-7000-8000-000000000001";

describe("grantRole", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  async function account(roles: Role[]) {
    await t.db
      .insert(profiles)
      .values({ id: ID, name: "Fulano", email: "f@x.com", roles });
  }
  const rolesOf = async () =>
    (
      await t.db
        .select({ roles: profiles.roles })
        .from(profiles)
        .where(eq(profiles.id, ID))
    )[0].roles;

  it("[AUT-SEC-009] cadastro público dá lojista, vendedor ou indicador e acumula", async () => {
    await account([]);

    await grantRole(t.db, ID, "referrer", "public-signup");
    await grantRole(t.db, ID, "seller", "public-signup");
    await grantRole(t.db, ID, "seller", "public-signup");

    expect(await rolesOf()).toEqual(["referrer", "seller"]);
  });

  it("[AUT-SEC-009] cadastro público nunca dá papel de equipe nem de usuário da loja", async () => {
    await account([]);

    for (const role of ["admin", "support", "store_staff"] as const) {
      await expect(
        grantRole(t.db, ID, role, "public-signup"),
      ).rejects.toMatchObject({ status: 403 });
    }
    expect(await rolesOf()).toEqual([]);
  });

  it("[AUT-SEC-009] conta da equipe não acumula papéis de lojista, vendedor ou indicador", async () => {
    await account(["support"]);

    for (const role of ["store_owner", "seller", "referrer"] as const) {
      await expect(grantRole(t.db, ID, role, "admin")).rejects.toMatchObject({
        status: 403,
      });
    }
    expect(await rolesOf()).toEqual(["support"]);
  });

  it("[AUT-SEC-009] conta de cliente não vira equipe", async () => {
    await account(["seller"]);

    await expect(grantRole(t.db, ID, "admin", "admin")).rejects.toMatchObject({
      status: 403,
    });
    expect(await rolesOf()).toEqual(["seller"]);
  });

  it("[AUT-SEC-009] admin dá papel de equipe a conta nova", async () => {
    await account([]);

    await grantRole(t.db, ID, "support", "admin");

    expect(await rolesOf()).toEqual(["support"]);
  });

  it("[AUT-SEC-009] conta inexistente responde 404", async () => {
    await expect(
      grantRole(t.db, ID, "seller", "public-signup"),
    ).rejects.toMatchObject({ status: 404 });
  });
});
