import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stores, vehicles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { eq } from "drizzle-orm";
import { subscriptionCard } from "@/domains/billing/service";
import { listVehicles, saveDraft } from "./service";
import { goLive, personWith, storeOwner } from "./testing/fixtures";

describe("Meus veículos [1c]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const now = new Date("2026-11-20T12:00:00Z");
  const deps = () => ({ db: t.db, now: () => now });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  async function seed() {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    await goLive(t.db, a.storeId);
    const make = async (set: Partial<typeof vehicles.$inferInsert>) => {
      const { vehicleId } = await saveDraft(deps(), a, {});
      await t.db.update(vehicles).set(set).where(eq(vehicles.id, vehicleId));
      return vehicleId;
    };
    await make({
      status: "published",
      shareOnCajugo: true,
      model: "ONIX",
      version: "ONIX HATCH LT",
      plate: "ABC1D23",
      plateEnd: "3",
    });
    await make({
      status: "published",
      shareOnCajugo: true,
      model: "S10",
      version: "S10 LTZ",
    });
    await make({
      status: "published",
      shareOnCajugo: false,
      model: "ONIX",
      version: "ONIX SEDAN",
    });
    await make({ status: "draft", model: "HB20", version: "HB20 Sense" });
    await make({
      status: "sold",
      soldAt: new Date("2026-11-10T12:00:00Z"),
      model: "GOL",
      version: "GOL 1.0",
    });
    await make({
      status: "sold",
      soldAt: new Date("2026-10-10T12:00:00Z"),
      model: "UNO",
      version: "UNO Way",
    });
    await make({ status: "deleted", model: "KA", version: "KA SE" });
    return a;
  }

  it("[VEH-FR-001] indicadores, contagem por filtro e vendidos só do mês; excluído não conta", async () => {
    const a = await seed();

    const list = await listVehicles(deps(), a, {});

    expect(list.kpis).toEqual({ published: 3, onCajugo: 2, soldThisMonth: 1 });
    expect(list.counts).toEqual({ all: 6, published: 3, draft: 1, sold: 2 });
    expect(list.items).toHaveLength(6);
    expect(
      (await listVehicles(deps(), a, { status: "draft" })).items.map(
        (i) => i.name,
      ),
    ).toEqual(["HB20 Sense"]);
  });

  it("[VEH-FR-001] busca por modelo ou pela placa (inteira ou final)", async () => {
    const a = await seed();

    const byModel = await listVehicles(deps(), a, { q: "onix" });
    const byPlate = await listVehicles(deps(), a, { q: "abc-1d23" });

    expect(byModel.items.map((i) => i.name).sort()).toEqual([
      "ONIX HATCH LT",
      "ONIX SEDAN",
    ]);
    expect(byPlate.items.map((i) => i.name)).toEqual(["ONIX HATCH LT"]);
  });

  it("[VEH-FR-002] card com selo, legenda e o que pode fazer", async () => {
    const a = await seed();

    const items = (await listVehicles(deps(), a, {})).items;
    const onix = items.find((i) => i.name === "ONIX HATCH LT")!;
    const draft = items.find((i) => i.name === "HB20 Sense")!;

    expect(onix).toMatchObject({
      statusLabel: "Publicado",
      shareCaption: "Visível na vitrine CajuGo",
      canShare: true,
      canSell: true,
    });
    expect(draft).toMatchObject({
      shareCaption: "Publique para liberar",
      canShare: false,
      canSell: false,
    });
  });

  it("[VEH-SEC-001] a loja B vê só os próprios veículos", async () => {
    await seed();
    const b = await storeOwner(t.db, "loja-b", "b@x.com");

    expect((await listVehicles(deps(), b, {})).items).toEqual([]);
  });

  it("[VEH-FR-001] card da assinatura para o lojista; usuário da loja não vê cobrança", async () => {
    const a = await seed();
    await t.db
      .update(stores)
      .set({ nextDueAt: new Date("2026-12-26T03:00:00Z") })
      .where(eq(stores.id, a.storeId));
    const staff = await personWith(t.db, "store_staff", a.storeId);

    expect(await subscriptionCard(deps(), a)).toEqual({
      plan: "Plano Catálogo",
      membershipCents: 10000,
      statusLabel: "Ativo",
      nextDueAt: new Date("2026-12-26T03:00:00Z"),
    });
    await expect(subscriptionCard(deps(), staff)).rejects.toMatchObject({
      status: 403,
    });
  });
});
