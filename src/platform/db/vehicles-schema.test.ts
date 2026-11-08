import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { profiles, stores, vehiclePhotos, vehicles } from "./schema";
import { createTestDb } from "./testing/test-db";
import { uuidv7 } from "./uuid";

describe("veículos no banco", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let storeId: string;

  beforeEach(async () => {
    t = await createTestDb();
    const ownerId = uuidv7();
    await t.db
      .insert(profiles)
      .values({ id: ownerId, email: "d@x.com", name: "Dono" });
    [{ id: storeId }] = await t.db
      .insert(stores)
      .values({
        name: "Loja",
        slug: "loja",
        city: "Aracaju",
        state: "SE",
        whatsapp: "5579981360206",
        ownerId,
      })
      .returning({ id: stores.id });
  });
  afterEach(() => t.close());

  it("[VEH-FR-003] veículo novo nasce rascunho, com condições e itens vazios", async () => {
    const [v] = await t.db.insert(vehicles).values({ storeId }).returning();

    expect(v).toMatchObject({
      status: "draft",
      conditions: {},
      features: [],
      shareOnCajugo: true,
    });
  });

  it("[VEH-FR-004] duas fotos não ocupam a mesma posição no mesmo veículo", async () => {
    const [v] = await t.db
      .insert(vehicles)
      .values({ storeId })
      .returning({ id: vehicles.id });
    const photo = (position: number) =>
      t.db.insert(vehiclePhotos).values({
        vehicleId: v.id,
        publicId: `p-${position}-${uuidv7()}`,
        position,
      });
    await photo(0);
    await photo(1);

    await expect(photo(1)).rejects.toThrow();
  });
});
