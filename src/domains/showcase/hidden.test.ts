import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { hideVehicle } from "@/domains/vehicles/service";
import { parseFilters } from "./filters";
import {
  contactTarget,
  gateDecision,
  searchShowcase,
  sitemapEntries,
  vehiclePage,
} from "./service";
import { car, liveStore } from "./testing/fixtures";

describe("veículo oculto na leitura pública", () => {
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

  async function hiddenArgo() {
    const a = await liveStore(t.db, "loja-a");
    const argo = await car(t.db, a.storeId, { make: "Fiat", model: "ARGO" });
    const other = await car(t.db, a.storeId, { make: "Fiat", model: "MOBI" });
    const admin = await personWith(t.db, "admin");
    await hideVehicle(t.db, admin, argo.id, {
      reason: "unreal_price",
      note: null,
    });
    return { a, argo, other };
  }

  it("[RPT-FR-005] sai da vitrine, da descoberta e do sitemap", async () => {
    // Arrange
    const { argo, other } = await hiddenArgo();

    // Act
    const showcase = await searchShowcase(t.db, {
      scope: "showcase",
      filters: NONE,
    });
    const discovery = await searchShowcase(t.db, {
      scope: { discovery: { makeSlug: "fiat" } },
      filters: NONE,
    });
    const search = await searchShowcase(t.db, {
      scope: "showcase",
      filters: parseFilters({ q: "argo" }),
    });
    const sitemap = (await sitemapEntries(t.db, "vehicles")).map((e) => e.path);

    // Assert
    const ids = (r: { items: { vehicleId: string }[] }) =>
      r.items.map((i) => i.vehicleId);
    expect(ids(showcase)).toEqual([other.id]);
    expect(ids(discovery)).toEqual([other.id]);
    expect(ids(search)).toEqual([]);
    expect(sitemap.some((p) => p.includes(argo.id))).toBe(false);
  });

  it("[RPT-FR-005] continua no catálogo da loja e a página abre como veículo do catálogo, sem indexação", async () => {
    // Arrange
    const { a, argo } = await hiddenArgo();

    // Act
    const catalog = await searchShowcase(t.db, {
      scope: { storeId: a.storeId },
      filters: NONE,
    });
    const page = await vehiclePage(t.db, argo.id);
    const path = page?.kind === "vehicle" ? page.path : "";

    // Assert
    expect(catalog.items.map((i) => i.vehicleId)).toContain(argo.id);
    expect(page).toMatchObject({
      kind: "vehicle",
      shared: false,
      indexable: false,
    });
    expect(await gateDecision(t.db, path)).toBe("ok");
    expect(await contactTarget(t.db, argo.id)).toEqual({
      storeId: a.storeId,
      shared: false,
    });
  });

  it("[RPT-FR-005] o veículo publicado continua indexável", async () => {
    // Arrange
    const { other } = await hiddenArgo();

    // Act / Assert
    expect(await vehiclePage(t.db, other.id)).toMatchObject({
      kind: "vehicle",
      indexable: true,
    });
  });
});
