import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stores, storeSlugRedirects } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { parseFilters } from "./filters";
import { searchShowcase, storePage } from "./service";
import { car, liveStore } from "./testing/fixtures";

describe("catálogo da loja", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const NONE = parseFilters({});

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[SHW-FR-002] [SHW-SEC-002] todos os publicados da loja, divulgados ou não, e só os dela", async () => {
    const a = await liveStore(t.db, "loja-a");
    const b = await liveStore(t.db, "loja-b");
    await car(t.db, a.storeId);
    await car(t.db, a.storeId, { shareOnCajugo: false });
    await car(t.db, b.storeId);

    const r = await searchShowcase(t.db, {
      scope: { storeId: a.storeId },
      filters: NONE,
    });

    expect(r.total).toBe(2);
    expect(r.items.every((i) => i.storeName === "Loja loja-a")).toBe(true);
  });

  it("[SHW-FR-002] dados públicos da loja, sem documento", async () => {
    const a = await liveStore(t.db, "loja-a", {
      taxId: "12345678000195",
      taxIdType: "cnpj",
      logoPublicId: "x/logo",
    });

    const page = await storePage(t.db, "loja-a");

    expect(page).toMatchObject({
      kind: "store",
      storeId: a.storeId,
      name: "Loja loja-a",
      slug: "loja-a",
      city: "Aracaju",
      state: "SE",
      logoPublicId: "x/logo",
      initials: "LL",
    });
    expect(JSON.stringify(page)).not.toContain("12345678000195");
  });

  it("[SHW-FR-011] loja suspensa: aviso sem motivo; cadastrada, cancelada ou inexistente: nada", async () => {
    const a = await liveStore(t.db, "loja-a");
    await t.db
      .update(stores)
      .set({ status: "suspended" })
      .where(eq(stores.id, a.storeId));
    expect(await storePage(t.db, "loja-a")).toEqual({ kind: "suspended" });

    for (const status of [
      "registered",
      "payment_review",
      "canceled",
      "archived",
    ] as const) {
      await t.db.update(stores).set({ status }).where(eq(stores.id, a.storeId));
      expect(await storePage(t.db, "loja-a"), status).toBeNull();
    }
    expect(await storePage(t.db, "nao-existe")).toBeNull();
  });

  it("[SHW-FR-014] endereço antigo aponta para o atual", async () => {
    const a = await liveStore(t.db, "loja-nova");
    await t.db.insert(storeSlugRedirects).values({
      oldSlug: "loja-velha",
      storeId: a.storeId,
      expiresAt: new Date("2099-01-01"),
    });

    expect(await storePage(t.db, "loja-velha")).toEqual({
      kind: "redirect",
      to: "/loja/loja-nova",
    });
  });
});
