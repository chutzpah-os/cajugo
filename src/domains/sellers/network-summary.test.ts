import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { partnerships } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { liveStore } from "@/domains/showcase/testing/fixtures";
import { networkSummary } from "./service";
import { acceptSellers, activeSeller } from "./testing/fixtures";

describe("bloco Rede Caju da Conta", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[RCL-FR-014] diz se a loja aceita vendedores e quantos pedidos esperam, só da loja da sessão", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const b = await liveStore(t.db, "loja-b");
    await acceptSellers(t.db, a.storeId);
    for (const code of ["ANA", "BETO"]) {
      const s = await activeSeller(t.db, code);
      await t.db
        .insert(partnerships)
        .values({ sellerId: s.userId, storeId: a.storeId, origin: "request" });
    }
    const staff = await personWith(t.db, "store_staff", a.storeId);

    // Act / Assert
    expect(await networkSummary(t.db, a)).toEqual({
      acceptsSellers: true,
      pending: 2,
    });
    expect(await networkSummary(t.db, b)).toEqual({
      acceptsSellers: false,
      pending: 0,
    });
    await expect(networkSummary(t.db, staff)).rejects.toMatchObject({
      status: 403,
    });
  });
});
