import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stores, vehicles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { onboardingStatus } from "@/domains/stores/service";
import { parseFilters, searchShowcase } from "@/domains/showcase/service";
import { hasPublishedVehicle, saveDraft } from "./service";
import { goLive, storeOwner } from "./testing/fixtures";

describe("veículos no catálogo público", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = () => ({ db: t.db });
  const catalogOf = async (storeId: string) =>
    (
      await searchShowcase(t.db, {
        scope: { storeId },
        filters: parseFilters({}),
      })
    ).items;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  async function storeWithEachStatus() {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    for (const status of [
      "draft",
      "published",
      "sold",
      "deleted",
      "hidden",
    ] as const) {
      const { vehicleId } = await saveDraft(deps(), a, { priceCents: 5000000 });
      await t.db
        .update(vehicles)
        .set({
          status,
          version: `V ${status}`,
          plate: "ABC1D23",
          plateEnd: "3",
          chassis: "9BWZZZ377VT004251",
        })
        .where(eq(vehicles.id, vehicleId));
    }
    return a;
  }

  it("[VEH-SEC-004] [VEH-FR-010] [RPT-FR-005] só o publicado (e o oculto pela CajuGo) de loja no ar; loja cadastrada ou suspensa não mostra nada", async () => {
    const a = await storeWithEachStatus();
    expect(await catalogOf(a.storeId)).toEqual([]);

    await goLive(t.db, a.storeId);
    expect((await catalogOf(a.storeId)).map((v) => v.version).sort()).toEqual([
      "V hidden",
      "V published",
    ]);

    await t.db
      .update(stores)
      .set({ status: "suspended" })
      .where(eq(stores.id, a.storeId));
    expect(await catalogOf(a.storeId)).toEqual([]);
  });

  it("[VEH-SEC-002] o cartão público não tem placa nem chassi", async () => {
    const a = await storeWithEachStatus();
    await goLive(t.db, a.storeId);

    const json = JSON.stringify(await catalogOf(a.storeId));

    expect(json).not.toContain("ABC1D23");
    expect(json).not.toContain("9BWZZZ");
    expect(json).not.toMatch(/plate|chassis/i);
  });

  it("[VEH-FR-015] o primeiro veículo publicado completa o passo dos primeiros passos", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    await t.db
      .update(stores)
      .set({ status: "active", activatedAt: new Date() })
      .where(eq(stores.id, a.storeId));
    expect(await hasPublishedVehicle(t.db, a.storeId)).toBe(false);

    const { vehicleId } = await saveDraft(deps(), a, {});
    await t.db
      .update(vehicles)
      .set({ status: "published" })
      .where(eq(vehicles.id, vehicleId));
    const firstVehicle = await hasPublishedVehicle(t.db, a.storeId);

    expect(firstVehicle).toBe(true);
    expect(await onboardingStatus(t.db, a, { firstVehicle })).toMatchObject({
      done: 2,
      steps: { subscription: true, firstVehicle: true },
    });
  });
});
