import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stores, vehicles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { saveDraft, vehicleForm } from "./service";
import { personWith, storeOwner, vehicleRow } from "./testing/fixtures";

describe("rascunho do veículo [2a]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = () => ({
    db: t.db,
    now: () => new Date("2026-11-08T12:00:00Z"),
  });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[VEH-FR-003] o 1º salvamento cria o rascunho; os seguintes completam, sem perder o que já estava", async () => {
    // Arrange
    const a = await storeOwner(t.db, "loja-a", "a@x.com");

    // Act
    const { vehicleId, savedAt } = await saveDraft(deps(), a, {
      mileageKm: 42000,
    });
    await saveDraft(deps(), a, {
      vehicleId,
      priceCents: 7632000,
      color: "Prata",
    });

    // Assert
    expect(savedAt).toEqual(new Date("2026-11-08T12:00:00Z"));
    const form = await vehicleForm(t.db, a, vehicleId);
    expect(form).toMatchObject({
      status: "draft",
      mileageKm: 42000,
      priceCents: 7632000,
      color: "Prata",
    });
    expect(await t.db.select().from(vehicles)).toHaveLength(1);
  });

  it("[VEH-FR-008] divulgação e contato vêm da loja e podem mudar por veículo sem mexer na loja", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    await t.db
      .update(stores)
      .set({ shareByDefault: false, whatsapp: "557932110000" });

    const { vehicleId } = await saveDraft(deps(), a, {});
    expect(await vehicleForm(t.db, a, vehicleId)).toMatchObject({
      shareOnCajugo: false,
      contactWhatsapp: "557932110000",
    });

    await saveDraft(deps(), a, {
      vehicleId,
      contactWhatsapp: "(79) 99999-0000",
    });
    expect((await vehicleRow(t.db, vehicleId)).contactWhatsapp).toBe(
      "5579999990000",
    );
    const [store] = await t.db.select({ w: stores.whatsapp }).from(stores);
    expect(store.w).toBe("557932110000");
  });

  it("[VEH-FR-006] listas fechadas, itens e limite da descrição", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const { vehicleId } = await saveDraft(deps(), a, {
      transmission: "automatic",
      fuel: "flex",
      body: "hatchback",
      doors: 4,
      conditions: { singleOwner: true, ipvaPaid: true },
      features: ["airbag", "abs", "airConditioning"],
      description: "Revisado.",
    });

    expect(await vehicleForm(t.db, a, vehicleId)).toMatchObject({
      features: ["airbag", "abs", "airConditioning"],
      conditions: { singleOwner: true, ipvaPaid: true },
    });
    for (const bad of [
      { transmission: "foguete" },
      { features: ["jetpack"] },
      { description: "x".repeat(2001) },
      { doors: 7 },
      { conditions: { voa: true } },
    ])
      await expect(
        saveDraft(deps(), a, { vehicleId, ...bad }),
      ).rejects.toMatchObject({
        status: 422,
      });
  });

  it("[VEH-SEC-001] a loja B não lê nem altera o rascunho da loja A; loja e status não vêm da tela", async () => {
    // Arrange
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const b = await storeOwner(t.db, "loja-b", "b@x.com");
    const { vehicleId } = await saveDraft(deps(), a, { mileageKm: 1 });

    // Act + Assert
    await expect(vehicleForm(t.db, b, vehicleId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      saveDraft(deps(), b, { vehicleId, mileageKm: 999 }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      saveDraft(deps(), a, { vehicleId, storeId: b.storeId }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      saveDraft(deps(), a, { vehicleId, status: "published" }),
    ).rejects.toMatchObject({ status: 422 });
    expect((await vehicleRow(t.db, vehicleId)).mileageKm).toBe(1);
  });

  it("[VEH-SEC-001] usuário da loja também cadastra; quem não é da loja não", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const staff = await personWith(t.db, "store_staff", a.storeId);
    const seller = await personWith(t.db, "seller");

    const { vehicleId } = await saveDraft(deps(), staff, { mileageKm: 10 });

    expect((await vehicleRow(t.db, vehicleId)).storeId).toBe(a.storeId);
    await expect(saveDraft(deps(), seller, {})).rejects.toMatchObject({
      status: 403,
    });
    await expect(saveDraft(deps(), null, {})).rejects.toMatchObject({
      status: 401,
    });
    const rows = await t.db
      .select()
      .from(vehicles)
      .where(eq(vehicles.storeId, a.storeId));
    expect(rows).toHaveLength(1);
  });
});
