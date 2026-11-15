import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vehicles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { gateDecision, sitemapEntries } from "./service";
import { car, liveStore } from "./testing/fixtures";

describe("descoberta: status real e sitemap", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let argo: string;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    const campinas = await liveStore(t.db, "loja-campinas", {
      city: "Campinas",
      state: "SP",
    });
    argo = (await car(t.db, campinas.storeId, { make: "Fiat", model: "Argo" }))
      .id;
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[DSC-SEC-004] o que existe passa; o que nunca existiu ou é inválido é 404", async () => {
    for (const path of [
      "/carros",
      "/carros/fiat",
      "/carros/fiat/argo",
      "/carros/campinas-sp",
      "/carros/campinas-sp/fiat",
    ])
      expect(await gateDecision(t.db, path), path).toBe("ok");
    for (const path of [
      "/carros/nao-existe",
      "/carros/fiat/uno",
      "/carros/recife-pe",
      "/carros/Fiat",
      "/carros/fiat/argo/2020",
      "/carros/campinas-sp/bmw",
    ])
      expect(await gateDecision(t.db, path), path).toBe("not-found");
  });

  it("[DSC-FR-005] página que ficou sem veículos continua respondendo", async () => {
    // Arrange
    await t.db
      .update(vehicles)
      .set({ status: "sold" })
      .where(eq(vehicles.id, argo));

    // Act / Assert
    expect(await gateDecision(t.db, "/carros/fiat/argo")).toBe("ok");
  });

  it("[DSC-FR-010] sitemap com o índice e as páginas com veículos; vendido o último, todas saem", async () => {
    // Arrange
    const paths = async () =>
      (await sitemapEntries(t.db, "discovery")).map((e) => e.path).sort();

    // Act / Assert
    expect(await paths()).toEqual([
      "/carros",
      "/carros/campinas-sp",
      "/carros/campinas-sp/fiat",
      "/carros/fiat",
      "/carros/fiat/argo",
    ]);
    await t.db
      .update(vehicles)
      .set({ status: "sold" })
      .where(eq(vehicles.id, argo));
    // O índice vazio fica fora do Google, então sai do sitemap junto
    expect(await paths()).toEqual([]);
  });

  it("[DSC-SEC-002] [DSC-SEC-003] não divulgado não cria página no sitemap; nada de placa", async () => {
    // Arrange
    const other = await liveStore(t.db, "loja-x", { city: "Itu", state: "SP" });
    await car(t.db, other.storeId, {
      make: "BMW",
      model: "X1",
      shareOnCajugo: false,
    });

    // Act
    const json = JSON.stringify(await sitemapEntries(t.db, "discovery"));

    // Assert
    expect(json).not.toContain("bmw");
    expect(json).not.toContain("itu-sp");
    expect(json).not.toContain("ABC1D23");
  });
});
