import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { parseFilters } from "./filters";
import { countMatches, facets, searchShowcase } from "./service";
import { car, liveStore } from "./testing/fixtures";

describe("escopo de descoberta", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const NONE = parseFilters({});
  const versions = async (discovery: Record<string, string>) =>
    (await searchShowcase(t.db, { scope: { discovery }, filters: NONE })).items
      .map((c) => c.version)
      .sort();

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    const campinas = await liveStore(t.db, "loja-campinas", {
      city: "Campinas",
      state: "SP",
    });
    const sumare = await liveStore(t.db, "loja-sumare", {
      city: "Sumaré",
      state: "SP",
    });
    const fiat = { make: "Fiat", makeSlug: "fiat" };
    await car(t.db, campinas.storeId, {
      ...fiat,
      model: "Argo",
      modelSlug: "argo",
      version: "Argo A",
    });
    await car(t.db, campinas.storeId, {
      ...fiat,
      model: "Argo",
      modelSlug: "argo",
      version: "Argo B",
    });
    await car(t.db, campinas.storeId, {
      ...fiat,
      model: "Mobi",
      modelSlug: "mobi",
      version: "Mobi A",
    });
    await car(t.db, campinas.storeId, {
      make: "BMW",
      makeSlug: "bmw",
      model: "X1",
      modelSlug: "x1",
      version: "X1 A",
    });
    await car(t.db, sumare.storeId, {
      ...fiat,
      model: "Argo",
      modelSlug: "argo",
      version: "Argo Sumaré",
    });
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[DSC-FR-001] marca: os veículos da marca de todas as cidades", async () => {
    expect(await versions({ makeSlug: "fiat" })).toEqual([
      "Argo A",
      "Argo B",
      "Argo Sumaré",
      "Mobi A",
    ]);
  });

  it("[DSC-FR-002] modelo: só os do modelo, dentro da marca", async () => {
    expect(await versions({ makeSlug: "fiat", modelSlug: "argo" })).toEqual([
      "Argo A",
      "Argo B",
      "Argo Sumaré",
    ]);
  });

  it("[DSC-FR-003] cidade e marca na cidade", async () => {
    expect(await versions({ citySlug: "campinas-sp" })).toEqual([
      "Argo A",
      "Argo B",
      "Mobi A",
      "X1 A",
    ]);
    expect(
      await versions({ citySlug: "campinas-sp", makeSlug: "fiat" }),
    ).toEqual(["Argo A", "Argo B", "Mobi A"]);
    expect(await versions({ citySlug: "sumare-sp" })).toEqual(["Argo Sumaré"]);
  });

  it("[DSC-FR-004] contagem ao vivo e marcas disponíveis seguem o escopo", async () => {
    const scope = { discovery: { citySlug: "campinas-sp" } };

    expect(
      await countMatches(t.db, scope, parseFilters({ marca: "fiat" })),
    ).toBe(3);
    expect((await facets(t.db, scope)).makes.map((m) => m.slug)).toEqual([
      "bmw",
      "fiat",
    ]);
  });

  it("[DSC-SEC-001] [DSC-SEC-002] rascunho, loja suspensa e não divulgado ficam de fora", async () => {
    // Arrange
    const other = await liveStore(t.db, "loja-x", {
      city: "Campinas",
      state: "SP",
    });
    const fiat = {
      make: "Fiat",
      makeSlug: "fiat",
      model: "Argo",
      modelSlug: "argo",
    };
    await car(t.db, other.storeId, {
      ...fiat,
      version: "rascunho",
      status: "draft",
    });
    await car(t.db, other.storeId, {
      ...fiat,
      version: "não divulgado",
      shareOnCajugo: false,
    });
    const suspended = await liveStore(t.db, "loja-s", {
      city: "Campinas",
      state: "SP",
      status: "suspended",
    });
    await car(t.db, suspended.storeId, { ...fiat, version: "suspensa" });

    // Act
    const found = await versions({ citySlug: "campinas-sp", makeSlug: "fiat" });

    // Assert
    expect(found).toEqual(["Argo A", "Argo B", "Mobi A"]);
  });
});
