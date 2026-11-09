import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { parseFilters } from "./filters";
import { countMatches, facets, searchShowcase } from "./service";
import { car, liveStore } from "./testing/fixtures";

describe("busca e filtros", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let storeId: string;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    storeId = (await liveStore(t.db, "loja-a")).storeId;
    await car(t.db, storeId, {
      make: "Citroën",
      model: "C3",
      version: "C3 Tendance",
      priceCents: 4000000,
      yearModel: 2018,
      mileageKm: 90000,
      transmission: "manual",
      fuel: "gasoline",
    });
    await car(t.db, storeId, {
      make: "BMW",
      model: "320i",
      version: "320i GP",
      priceCents: 15000000,
      yearModel: 2022,
      mileageKm: 20000,
      transmission: "automatic",
      fuel: "flex",
    });
    await car(t.db, storeId, {
      make: "BMW",
      model: "X1",
      version: "X1 sDrive",
      priceCents: 18000000,
      yearModel: 2021,
      mileageKm: 30000,
      transmission: "automatic",
      fuel: "gasoline",
    });
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  const names = async (params: Record<string, string>) =>
    (
      await searchShowcase(t.db, {
        scope: "showcase",
        filters: parseFilters(params),
      })
    ).items
      .map((i) => i.model)
      .sort();

  it("[SHW-FR-004] busca sem diferenciar maiúscula nem acento, por marca, modelo ou versão", async () => {
    expect(await names({ q: "citroen" })).toEqual(["C3"]);
    expect(await names({ q: "CITROËN" })).toEqual(["C3"]);
    expect(await names({ q: "tend" })).toEqual(["C3"]);
    expect(await names({ q: "bmw x1" })).toEqual(["X1"]);
    expect(await names({ q: "inexistente" })).toEqual([]);
  });

  it("[SHW-SEC-004] texto com símbolos da busca não quebra a consulta", async () => {
    for (const q of ["a & b", "'; drop", "(x:*", "!!!", "|"])
      await expect(names({ q })).resolves.toBeDefined();
  });

  it("[SHW-FR-005] marca, preço, ano, km, câmbio e combustível", async () => {
    expect(await names({ marca: "bmw" })).toEqual(["320i", "X1"]);
    expect(await names({ marca: "bmw,citroen" })).toHaveLength(3);
    expect(await names({ preco_ate: "50000" })).toEqual(["C3"]);
    expect(await names({ preco_de: "160000" })).toEqual(["X1"]);
    expect(await names({ ano_de: "2022" })).toEqual(["320i"]);
    expect(await names({ ano_ate: "2018" })).toEqual(["C3"]);
    expect(await names({ km_ate: "25000" })).toEqual(["320i"]);
    expect(await names({ cambio: "manual" })).toEqual(["C3"]);
    expect(await names({ combustivel: "flex" })).toEqual(["320i"]);
    expect(await names({ marca: "bmw", combustivel: "gasolina" })).toEqual([
      "X1",
    ]);
  });

  it("[SHW-FR-005] contagem ao vivo e marcas disponíveis no escopo", async () => {
    expect(
      await countMatches(t.db, "showcase", parseFilters({ marca: "bmw" })),
    ).toBe(2);
    expect((await facets(t.db, "showcase")).makes).toEqual([
      { slug: "bmw", name: "BMW", count: 2 },
      { slug: "citroen", name: "Citroën", count: 1 },
    ]);
  });
});
