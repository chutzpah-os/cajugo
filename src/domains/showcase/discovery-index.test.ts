import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { discoveryIndex, discoveryLinks } from "./service";
import { car, liveStore } from "./testing/fixtures";

describe("índice e links de descoberta", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let campinas: string;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    campinas = (
      await liveStore(t.db, "loja-campinas", { city: "Campinas", state: "SP" })
    ).storeId;
    const sumare = (
      await liveStore(t.db, "loja-sumare", { city: "Sumaré", state: "SP" })
    ).storeId;
    await car(t.db, campinas, { make: "Fiat", model: "Argo" });
    await car(t.db, campinas, { make: "GM - Chevrolet", model: "ONIX" });
    await car(t.db, sumare, { make: "Fiat", model: "Argo" });
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[DSC-FR-013] índice com marcas e cidades da vitrine e a contagem de cada", async () => {
    expect(await discoveryIndex(t.db)).toEqual({
      makes: [
        { path: "/carros/chevrolet", name: "Chevrolet", count: 1 },
        { path: "/carros/fiat", name: "Fiat", count: 2 },
      ],
      cities: [
        { path: "/carros/campinas-sp", name: "Campinas/SP", count: 2 },
        { path: "/carros/sumare-sp", name: "Sumaré/SP", count: 1 },
      ],
    });
  });

  it("[DSC-SEC-001] [DSC-SEC-002] índice não conta rascunho, loja suspensa nem não divulgado", async () => {
    // Arrange
    await car(t.db, campinas, {
      make: "BMW",
      model: "X1",
      shareOnCajugo: false,
    });
    await car(t.db, campinas, { make: "BMW", model: "X1", status: "draft" });
    const off = await liveStore(t.db, "loja-off", {
      city: "Itu",
      state: "SP",
      status: "suspended",
    });
    await car(t.db, off.storeId, { make: "BMW", model: "X1" });

    // Act
    const index = await discoveryIndex(t.db);

    // Assert
    expect(index.makes.map((m) => m.name)).toEqual(["Chevrolet", "Fiat"]);
    expect(index.cities.map((c) => c.name)).toEqual([
      "Campinas/SP",
      "Sumaré/SP",
    ]);
  });

  it("[DSC-FR-008] links do veículo para marca, modelo e cidade com veículos", async () => {
    expect(
      await discoveryLinks(t.db, {
        make: "Fiat",
        makeSlug: "fiat",
        model: "Argo",
        modelSlug: "argo",
        city: "Campinas",
        state: "SP",
        citySlug: "campinas-sp",
      }),
    ).toEqual([
      { name: "Fiat usados", path: "/carros/fiat" },
      { name: "Fiat Argo usados", path: "/carros/fiat/argo" },
      { name: "Carros usados em Campinas/SP", path: "/carros/campinas-sp" },
    ]);
  });

  it("[DSC-FR-008] [DSC-FR-009] página sem veículos fica fora dos links", async () => {
    // Arrange: única loja de Itu sem veículo na vitrine; Mobi só não divulgado
    await liveStore(t.db, "loja-itu", { city: "Itu", state: "SP" });
    await car(t.db, campinas, {
      make: "Fiat",
      model: "Mobi",
      shareOnCajugo: false,
    });

    // Act
    const links = await discoveryLinks(t.db, {
      make: "Fiat",
      makeSlug: "fiat",
      model: "Mobi",
      modelSlug: "mobi",
      city: "Itu",
      state: "SP",
      citySlug: "itu-sp",
    });

    // Assert
    expect(links).toEqual([{ name: "Fiat usados", path: "/carros/fiat" }]);
  });

  it("[DSC-FR-009] catálogo da loja: só a cidade", async () => {
    expect(
      await discoveryLinks(t.db, {
        city: "Campinas",
        state: "SP",
        citySlug: "campinas-sp",
      }),
    ).toEqual([
      { name: "Carros usados em Campinas/SP", path: "/carros/campinas-sp" },
    ]);
  });
});
