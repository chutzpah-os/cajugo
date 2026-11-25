import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { vehiclePage } from "./service";
import { car, liveStore } from "./testing/fixtures";

const COROLLA = {
  make: "Toyota",
  model: "COROLLA",
  version: "Corolla Altis 1.8 16V Aut. (Híbrido)",
  yearModel: 2025,
  fipeYearId: "9984:2025-6",
  fipePriceCents: 17_208_200,
  fipeMonth: "novembro de 2026",
};

describe("Compare os preços na página do veículo (015)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[PRC-FR-001] anunciado, média CajuGo dos iguais (3 ou mais) e Tabela FIPE com o mês", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId, {
      ...COROLLA,
      priceCents: 16_500_000,
    });
    for (const price of [17_000_000, 17_200_000, 17_400_000])
      await car(t.db, a.storeId, { ...COROLLA, priceCents: price });

    // Act
    const page = await vehiclePage(t.db, v.id);

    // Assert
    expect(page).toMatchObject({
      priceCompare: {
        priceCents: 16_500_000,
        averageCents: 17_200_000,
        fipe: { priceCents: 17_208_200, month: "novembro de 2026" },
      },
    });
  });

  it("[PRC-FR-001] [PRC-SEC-002] com só 2 iguais na vitrine a média some; oculto e loja fora do ar não contam", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const off = await liveStore(t.db, "loja-b", { status: "suspended" });
    const v = await car(t.db, a.storeId, {
      ...COROLLA,
      priceCents: 16_500_000,
    });
    await car(t.db, a.storeId, { ...COROLLA, priceCents: 17_000_000 });
    await car(t.db, a.storeId, { ...COROLLA, priceCents: 17_200_000 });
    await car(t.db, a.storeId, {
      ...COROLLA,
      priceCents: 1_000_000,
      status: "hidden",
    });
    await car(t.db, off.storeId, { ...COROLLA, priceCents: 1_000_000 });

    // Act
    const page = await vehiclePage(t.db, v.id);

    // Assert
    expect(page).toMatchObject({
      priceCompare: { averageCents: null, fipe: { priceCents: 17_208_200 } },
    });
  });

  it("[PRC-FR-001] sem FIPE guardada, só o valor anunciado", async () => {
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId, {
      fipePriceCents: null,
      fipeMonth: null,
      fipeYearId: null,
    });

    expect(await vehiclePage(t.db, v.id)).toMatchObject({
      priceCompare: { averageCents: null, fipe: null },
    });
  });
});
