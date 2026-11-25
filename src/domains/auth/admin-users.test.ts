import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { profiles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith, storeOwner } from "@/domains/billing/testing/fixtures";
import { usersAdmin } from "./service";

describe("Usuários do admin [1d] (012b)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[ADM-FR-007] lojista e vendedora: selos Lojista e Vendedor, e o toque abre a loja", async () => {
    // Arrange
    const marta = await storeOwner(t.db, "garagem-77", "marta@x.com", {
      name: "Marta Oliveira",
    });
    await t.db
      .update(profiles)
      .set({ roles: ["store_owner", "seller"] })
      .where(eq(profiles.id, marta.userId));
    const seller = await personWith(t.db, "seller");
    const admin = await personWith(t.db, "admin");

    // Act
    const found = await usersAdmin(t.db, admin, { q: "marta" });
    const bySeller = await usersAdmin(t.db, admin, { q: seller.userId });

    // Assert
    expect(found.items).toEqual([
      {
        profileId: marta.userId,
        name: "Marta Oliveira",
        info: "Loja garagem-77",
        badges: ["Lojista", "Vendedor"],
        href: `/admin/lojas/${marta.storeId}`,
      },
    ]);
    expect(bySeller.items[0]).toMatchObject({
      badges: ["Vendedor"],
      href: `/admin/vendedores?q=${encodeURIComponent(`${seller.userId}@x.com`)}`,
    });
  });

  it("[ADM-SEC-001] lojista não lista usuários", async () => {
    const owner = await storeOwner(t.db, "loja-x", "x@x.com");
    await expect(usersAdmin(t.db, owner, {})).rejects.toMatchObject({
      status: 403,
    });
  });
});
