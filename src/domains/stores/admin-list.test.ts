import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith, storeOwner } from "@/domains/billing/testing/fixtures";
import { car } from "@/domains/showcase/testing/fixtures";
import { PAGE_SIZE } from "./admin-list";
import { storesAdmin } from "./service";

describe("Lojas do admin [1d] (012b)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  async function store(
    slug: string,
    status: (typeof stores.$inferSelect)["status"],
    set: Partial<typeof stores.$inferInsert> = {},
  ) {
    const o = await storeOwner(t.db, slug, `${slug}@x.com`, {
      name: `Dono ${slug}`,
    });
    await t.db
      .update(stores)
      .set({ status, name: `Loja ${slug}`, ...set })
      .where(eq(stores.id, o.storeId));
    return o;
  }

  it("[ADM-FR-004] busca por nome, cidade ou dono e mostra 'N veículos · M na CajuGo'", async () => {
    // Arrange
    const garagem = await store("garagem-77", "past_due", { city: "Osasco" });
    await store("auto-center", "active");
    await car(t.db, garagem.storeId);
    await car(t.db, garagem.storeId, { shareOnCajugo: false });
    await car(t.db, garagem.storeId, { status: "sold" });
    const admin = await personWith(t.db, "admin");

    // Act
    const byName = await storesAdmin(t.db, admin, { q: "garagem" });
    const byCity = await storesAdmin(t.db, admin, { q: "osasco" });
    const byOwner = await storesAdmin(t.db, admin, { q: "auto-center@x" });

    // Assert
    expect(byName.items).toEqual([
      {
        storeId: garagem.storeId,
        name: "Loja garagem-77",
        owner: "Dono garagem-77",
        city: "Osasco/SE",
        status: "past_due",
        vehicles: 2,
        onCajugo: 1,
      },
    ]);
    expect(byCity.items.map((i) => i.name)).toEqual(["Loja garagem-77"]);
    expect(byOwner.items.map((i) => i.name)).toEqual(["Loja auto-center"]);
  });

  it("[ADM-FR-004] filtros pela situação; arquivadas não aparecem", async () => {
    await store("loja-ativa", "active");
    await store("loja-atrasada", "past_due");
    await store("loja-nova", "registered");
    await store("loja-arquivada", "archived");
    const support = await personWith(t.db, "support");

    const names = async (filtro: string) =>
      (await storesAdmin(t.db, support, { filtro })).items.map((i) => i.name);

    expect(await names("atrasadas")).toEqual(["Loja loja-atrasada"]);
    expect(await names("cadastradas")).toEqual(["Loja loja-nova"]);
    expect(await names("todas")).not.toContain("Loja loja-arquivada");
    expect(await names("qualquer")).toHaveLength(3);
  });

  it("[ADM-NFR-003] 20 por vez, com o cursor da próxima página", async () => {
    for (let i = 0; i < PAGE_SIZE + 2; i++)
      await store(`loja-${String(i).padStart(2, "0")}`, "active");
    const admin = await personWith(t.db, "admin");

    const first = await storesAdmin(t.db, admin, {});
    const second = await storesAdmin(t.db, admin, { depois: first.next });

    expect(first.items).toHaveLength(PAGE_SIZE);
    expect(first.items[0].name).toBe("Loja loja-21");
    expect(second.items.map((i) => i.name)).toEqual([
      "Loja loja-01",
      "Loja loja-00",
    ]);
    expect(second.next).toBeNull();
  });

  it("[ADM-SEC-001] lojista e visitante não listam lojas", async () => {
    const owner = await store("loja-x", "active");
    await expect(storesAdmin(t.db, owner, {})).rejects.toMatchObject({
      status: 403,
    });
    await expect(storesAdmin(t.db, null, {})).rejects.toMatchObject({
      status: 401,
    });
  });
});
