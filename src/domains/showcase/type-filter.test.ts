import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { filterHref, filtersToQuery, parseFilters } from "./filters";
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

describe("filtro novo, seminovo e usado (017)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[HOM-FR-003] novo é 0 km; seminovo, até 3 anos; usado, o resto", async () => {
    const { storeId } = await liveStore(t.db, "loja-a");
    const year = new Date().getUTCFullYear();
    await car(t.db, storeId, { mileageKm: 0, yearModel: year });
    await car(t.db, storeId, { mileageKm: 20000, yearModel: year - 2 });
    await car(t.db, storeId, { mileageKm: 90000, yearModel: year - 8 });
    const count = async (estado: string) =>
      (
        await searchShowcase(t.db, {
          scope: "showcase",
          filters: parseFilters({ estado }),
        })
      ).total;

    expect([
      await count("novo"),
      await count("seminovo"),
      await count("usado"),
    ]).toEqual([1, 1, 1]);
    expect(
      filtersToQuery(parseFilters({ estado: "novo", tipo: "carro" })),
    ).toBe("tipo=carro&estado=novo");
  });
});

describe("página de cada tipo (SEO)", () => {
  it("[TIP-FR-007] com tipo, o link vai para a página do tipo; sem tipo, para a vitrine", () => {
    const moto = parseFilters({ tipo: "moto", marca: "honda" });
    expect(filterHref("/veiculos", moto)).toBe("/motos?marca=honda");
    expect(filterHref("/motos", { ...moto, type: undefined })).toBe(
      "/veiculos?marca=honda",
    );
    expect(filterHref("/carros", parseFilters({ tipo: "carro" }))).toBe(
      "/carros",
    );
    // Catálogo da loja e descoberta não mudam.
    expect(filterHref("/loja/x", moto)).toBe("/loja/x?tipo=moto&marca=honda");
  });
});
