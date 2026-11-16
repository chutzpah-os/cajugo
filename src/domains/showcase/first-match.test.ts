import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { firstMatch } from "./service";
import { car, liveStore } from "./testing/fixtures";

const CREATED = new Date("2026-11-15T10:00:00Z");
const after = (minutes: number) =>
  new Date(CREATED.getTime() + minutes * 60_000);
const TORO = {
  make: "Fiat",
  model: "Toro",
  transmission: "automatic" as const,
};
const search = (query: string, discoveryPath: string | null = null) => ({
  query,
  discoveryPath,
});

describe("veículo compatível com o alerta", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let a: string;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    a = (await liveStore(t.db, "loja-a", { city: "Aracaju", state: "SE" }))
      .storeId;
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[ALR-FR-002] a mesma regra da lista: filtros e só o que entrou depois do alerta", async () => {
    // Arrange
    await car(t.db, a, {
      ...TORO,
      priceCents: 11_000_000,
      publishedAt: after(-60),
    });
    await car(t.db, a, {
      ...TORO,
      transmission: "manual",
      publishedAt: after(10),
    });
    await car(t.db, a, {
      ...TORO,
      priceCents: 13_000_000,
      publishedAt: after(20),
    });
    const match = await car(t.db, a, {
      ...TORO,
      priceCents: 11_000_000,
      publishedAt: after(30),
    });
    await car(t.db, a, {
      ...TORO,
      priceCents: 10_000_000,
      publishedAt: after(40),
    });

    // Act
    const found = await firstMatch(
      t.db,
      search("cambio=automatico&preco_ate=120000&q=fiat+toro"),
      CREATED,
    );

    // Assert: o mais antigo depois do alerta
    expect(found?.vehicleId).toBe(match.id);
    expect(
      await firstMatch(t.db, search("q=fiat+toro&marca=bmw"), CREATED),
    ).toBeNull();
  });

  it("[ALR-FR-002] na descoberta, o recorte da página vale", async () => {
    // Arrange
    const recife = (
      await liveStore(t.db, "loja-r", { city: "Recife", state: "PE" })
    ).storeId;
    await car(t.db, a, { ...TORO, publishedAt: after(10) });
    const inRecife = await car(t.db, recife, {
      ...TORO,
      publishedAt: after(20),
    });

    // Act / Assert
    expect(
      (await firstMatch(t.db, search("", "/carros/recife-pe/fiat"), CREATED))
        ?.vehicleId,
    ).toBe(inRecife.id);
    expect(
      await firstMatch(t.db, search("", "/carros/sao-paulo-sp"), CREATED),
    ).toBeNull();
  });

  it("[ALR-SEC-003] não divulgado e loja suspensa nunca casam", async () => {
    // Arrange
    const b = (await liveStore(t.db, "loja-b")).storeId;
    await car(t.db, a, {
      ...TORO,
      shareOnCajugo: false,
      publishedAt: after(10),
    });
    await car(t.db, b, { ...TORO, publishedAt: after(20) });
    await t.db
      .update(stores)
      .set({ status: "suspended" })
      .where(eq(stores.id, b));

    // Act / Assert
    expect(await firstMatch(t.db, search("q=toro"), CREATED)).toBeNull();
  });
});
