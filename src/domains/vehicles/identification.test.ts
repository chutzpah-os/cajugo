import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { models } from "@/domains/fipe/service";
import { priceVsFipe } from "./price";
import { saveDraft, vehicleForm } from "./service";
import { storeOwner, vehicleRow } from "./testing/fixtures";
import { fakeFipe } from "./testing/fipe";

describe("identificação do veículo", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = () => ({
    db: t.db,
    fipe: fakeFipe(),
    now: () => new Date("2026-11-08T12:00:00Z"),
  });
  const ONIX = { fipeBrandId: "23", fipeModelId: "1", fipeYearId: "1:2020-1" };

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    await models(deps(), "23");
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[VEH-FR-005] [VEH-FR-007] marca, modelo e versão vêm da FIPE guardada, com a referência do mês", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");

    const { vehicleId } = await saveDraft(deps(), a, {
      ...ONIX,
      yearManufacture: 2019,
    });

    expect(await vehicleForm(t.db, a, vehicleId)).toMatchObject({
      make: "GM - Chevrolet",
      model: "ONIX",
      version: "ONIX HATCH LT 1.0 12V Flex 5p Mec.",
      yearManufacture: 2019,
      yearModel: 2020,
      fipePriceCents: 8000000,
      fipeMonth: "novembro de 2026",
    });
    expect((await vehicleRow(t.db, vehicleId)).fipeCode).toBe("004413-0");
  });

  it("[VEH-FR-005] ano modelo entre o ano de fabricação e o seguinte; versão tem que ser da marca e o ano da versão", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const { vehicleId } = await saveDraft(deps(), a, {});

    for (const [input, field] of [
      [{ ...ONIX, yearManufacture: 2018 }, "yearManufacture"],
      [{ ...ONIX, yearManufacture: 2021 }, "yearManufacture"],
      [{ ...ONIX, fipeModelId: "99" }, "fipeModelId"],
      [{ ...ONIX, fipeYearId: "3:2020-1" }, "fipeYearId"],
    ] as const)
      await expect(
        saveDraft(deps(), a, { vehicleId, ...input }),
      ).rejects.toMatchObject({
        status: 422,
        errors: [expect.objectContaining({ field })],
      });
  });

  it("[VEH-FR-005] [VEH-SEC-002] placa Mercosul ou antiga, guardada para a loja, com o final derivado", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");

    const { vehicleId } = await saveDraft(deps(), a, { plate: "abc-1d23" });

    expect(await vehicleRow(t.db, vehicleId)).toMatchObject({
      plate: "ABC1D23",
      plateEnd: "3",
    });
    await expect(
      saveDraft(deps(), a, { vehicleId, plate: "AB123" }),
    ).rejects.toMatchObject({
      status: 422,
      errors: [expect.objectContaining({ field: "plate" })],
    });
  });

  it("[VEH-FR-007] diferença para a FIPE em texto, com uma casa", () => {
    expect(priceVsFipe(7632000, 8000000)).toBe("4,6% abaixo");
    expect(priceVsFipe(8400000, 8000000)).toBe("5% acima");
    expect(priceVsFipe(8000000, 8000000)).toBe("igual à FIPE");
    expect(priceVsFipe(8000000, null)).toBeNull();
  });
});
