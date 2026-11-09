import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stores, vehicles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { sitemapEntries } from "./service";
import { car, liveStore } from "./testing/fixtures";

describe("sitemap", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  const paths = async (kind: "stores" | "vehicles") =>
    (await sitemapEntries(t.db, kind)).map((e) => e.path);

  it("[SHW-FR-015] lojas no ar e veículos publicados, divulgados ou não; vendido sai", async () => {
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId, { shareOnCajugo: false });

    expect(await paths("stores")).toEqual(["/loja/loja-a"]);
    expect((await paths("vehicles"))[0]).toContain(`/v/${v.id}-`);

    await t.db
      .update(vehicles)
      .set({ status: "sold" })
      .where(eq(vehicles.id, v.id));
    expect(await paths("vehicles")).toEqual([]);
  });

  it("[SHW-SEC-003] rascunho e loja fora do ar ficam de fora", async () => {
    const a = await liveStore(t.db, "loja-a");
    await car(t.db, a.storeId, { status: "draft" });
    const off = await liveStore(t.db, "loja-off");
    await car(t.db, off.storeId);
    await t.db
      .update(stores)
      .set({ status: "suspended" })
      .where(eq(stores.id, off.storeId));

    expect(await paths("stores")).toEqual(["/loja/loja-a"]);
    expect(await paths("vehicles")).toEqual([]);
  });

  it("[SHW-SEC-001] sem placa nem documento", async () => {
    const a = await liveStore(t.db, "loja-a", {
      taxId: "12345678000195",
      taxIdType: "cnpj",
    });
    await car(t.db, a.storeId);

    const json = JSON.stringify([
      await sitemapEntries(t.db, "stores"),
      await sitemapEntries(t.db, "vehicles"),
    ]);

    expect(json).not.toContain("ABC1D23");
    expect(json).not.toContain("12345678000195");
  });
});
