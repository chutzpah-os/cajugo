import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { discoveryPage } from "./service";
import { car, liveStore } from "./testing/fixtures";

describe("página de descoberta", () => {
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
    const argo = { make: "Fiat", model: "Argo", modelSlug: "argo" };
    await car(t.db, campinas, { ...argo, priceCents: 5_000_000 });
    await car(t.db, campinas, { ...argo, priceCents: 6_000_000 });
    await car(t.db, sumare, { ...argo, priceCents: 7_000_000 });
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[DSC-FR-006] [DSC-FR-007] modelo: nomes, caminho e números da página", async () => {
    // Act
    const page = await discoveryPage(t.db, {
      makeSlug: "fiat",
      modelSlug: "argo",
    });

    // Assert
    expect(page).toMatchObject({
      kind: "listing",
      path: "/carros/fiat/argo",
      names: { make: "Fiat", model: "Argo" },
      stats: {
        total: 3,
        stores: 2,
        cities: 2,
        minPriceCents: 5_000_000,
        maxPriceCents: 7_000_000,
      },
      crumbs: [
        { name: "Início", path: "/" },
        { name: "Carros", path: "/carros" },
        { name: "Fiat", path: "/carros/fiat" },
        { name: "Argo", path: "/carros/fiat/argo" },
      ],
    });
  });

  it("[DSC-FR-007] [DSC-FR-011] marca na cidade, com o nome conhecido da marca", async () => {
    // Arrange
    await car(t.db, campinas, { make: "GM - Chevrolet", model: "ONIX" });

    // Act
    const page = await discoveryPage(t.db, {
      citySlug: "campinas-sp",
      makeSlug: "chevrolet",
    });

    // Assert
    expect(page).toMatchObject({
      kind: "listing",
      names: { make: "Chevrolet", city: "Campinas", state: "SP" },
      crumbs: [
        { name: "Início", path: "/" },
        { name: "Carros", path: "/carros" },
        { name: "Campinas/SP", path: "/carros/campinas-sp" },
        { name: "Chevrolet", path: "/carros/campinas-sp/chevrolet" },
      ],
    });
  });

  it("[DSC-FR-005] modelo que ficou sem veículos: vazio, com a marca como alternativa", async () => {
    // Arrange
    await car(t.db, campinas, { make: "Fiat", model: "Mobi", status: "sold" });

    // Act
    const page = await discoveryPage(t.db, {
      makeSlug: "fiat",
      modelSlug: "mobi",
    });

    // Assert
    expect(page).toMatchObject({
      kind: "empty",
      names: { make: "Fiat", model: "Mobi" },
      stats: { total: 0 },
      fallback: {
        key: { makeSlug: "fiat" },
        path: "/carros/fiat",
        name: "Fiat",
      },
    });
  });

  it("[DSC-SEC-002] único Mobi não divulgado: a página fica vazia, sem contar o veículo", async () => {
    // Arrange
    await car(t.db, campinas, {
      make: "Fiat",
      model: "Mobi",
      shareOnCajugo: false,
    });

    // Act
    const page = await discoveryPage(t.db, {
      makeSlug: "fiat",
      modelSlug: "mobi",
    });

    // Assert
    expect(page).toMatchObject({ kind: "empty", stats: { total: 0 } });
  });

  it("[DSC-FR-005] marca e cidade vazias levam à vitrine", async () => {
    // Arrange
    await liveStore(t.db, "loja-vazia", { city: "Itu", state: "SP" });

    // Act
    const page = await discoveryPage(t.db, { citySlug: "itu-sp" });

    // Assert
    expect(page).toMatchObject({
      kind: "empty",
      fallback: { key: null, path: "/", name: "a vitrine CajuGo" },
    });
  });

  it("[DSC-SEC-004] o que nunca existiu não tem página", async () => {
    // Arrange: BMW existe em Campinas e Sumaré existe, mas nunca teve BMW
    await car(t.db, campinas, { make: "BMW", model: "320i" });

    // Assert
    expect(
      await discoveryPage(t.db, { citySlug: "sumare-sp", makeSlug: "bmw" }),
    ).toBeNull();
    expect(await discoveryPage(t.db, { makeSlug: "nao-existe" })).toBeNull();
    expect(
      await discoveryPage(t.db, { makeSlug: "fiat", modelSlug: "uno" }),
    ).toBeNull();
    expect(await discoveryPage(t.db, { citySlug: "recife-pe" })).toBeNull();
    expect(
      await discoveryPage(t.db, { citySlug: "campinas-sp", makeSlug: "audi" }),
    ).toBeNull();
  });
});
