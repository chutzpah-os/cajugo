import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { filtersToQuery, parseFilters } from "./filters";
import { searchShowcase } from "./service";
import { car, liveStore } from "./testing/fixtures";

describe("filtro Tipo da vitrine (014)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    const { storeId } = await liveStore(t.db, "loja-a");
    await car(t.db, storeId);
    await car(t.db, storeId);
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[TIP-FR-007] ?tipo=moto entra no filtro e na URL; tipo inválido é ignorado", () => {
    expect(parseFilters({ tipo: "moto" }).type).toBe("moto");
    expect(filtersToQuery(parseFilters({ tipo: "moto", q: "cg" }))).toBe(
      "tipo=moto&q=cg",
    );
    expect(parseFilters({ tipo: "barco" }).type).toBeUndefined();
  });

  it("[TIP-FR-007] Carro mostra os veículos de hoje (todos carros) e os outros tipos ainda vêm vazios", async () => {
    const cars = await searchShowcase(t.db, {
      scope: "showcase",
      filters: parseFilters({ tipo: "carro" }),
    });
    const motos = await searchShowcase(t.db, {
      scope: "showcase",
      filters: parseFilters({ tipo: "moto" }),
    });

    expect(cars.total).toBe(2);
    expect(motos.total).toBe(0);
  });
});
