import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { parseFilters } from "./filters";
import { pickBadges, searchShowcase } from "./service";
import { car, liveStore } from "./testing/fixtures";

describe("vitrine [1a]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const NONE = parseFilters({});

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[SHW-FR-001] publicados e divulgados de lojas no ar, com total, número de lojas e nome da loja", async () => {
    const a = await liveStore(t.db, "loja-a");
    const b = await liveStore(t.db, "loja-b");
    await car(t.db, a.storeId);
    await car(t.db, a.storeId);
    await car(t.db, b.storeId);
    await car(t.db, a.storeId, { shareOnCajugo: false });

    const r = await searchShowcase(t.db, { scope: "showcase", filters: NONE });

    expect(r).toMatchObject({ total: 3, stores: 2 });
    expect(r.items).toHaveLength(3);
    expect(r.items.map((i) => i.storeName).sort()).toEqual([
      "Loja loja-a",
      "Loja loja-a",
      "Loja loja-b",
    ]);
  });

  it("[SHW-FR-003] card com capa, número de fotos, endereço, cidade, selo e parcela só quando ativada", async () => {
    const a = await liveStore(t.db, "loja-a");
    const v = await car(
      t.db,
      a.storeId,
      { priceCents: 7632000, fipePriceCents: 8000000, showInstallment: true },
      3,
    );
    await car(t.db, a.storeId, {
      priceCents: 9000000,
      fipePriceCents: 8000000,
      showInstallment: false,
    });

    const { items } = await searchShowcase(t.db, {
      scope: "showcase",
      filters: NONE,
    });
    const cheap = items.find((i) => i.vehicleId === v.id)!;
    const other = items.find((i) => i.vehicleId !== v.id)!;

    expect(cheap).toMatchObject({
      photoCount: 3,
      coverPublicId: `staging/vehicles/${v.id}/photo-0`,
      city: "Aracaju",
      state: "SE",
      badge: "Abaixo da FIPE",
      installmentCents: expect.any(Number),
    });
    expect(cheap.path).toMatch(
      new RegExp(`^/v/${v.id}-gm-chevrolet-onix-2020-aracaju-se$`),
    );
    expect(other.badge).toBeNull();
    expect(other.installmentCents).toBeNull();
  });

  it("[SHW-FR-003] um selo por card, na ordem de prioridade", () => {
    const base = { priceCents: 9000000, fipePriceCents: 8000000 };

    expect(
      pickBadges({
        ...base,
        conditions: { singleOwner: true, acceptsTrade: true },
      }),
    ).toEqual(["Único dono", "Aceita troca"]);
    expect(
      pickBadges({
        priceCents: 1,
        fipePriceCents: 2,
        conditions: { factoryWarranty: true },
      }),
    ).toEqual(["Abaixo da FIPE", "Garantia de fábrica"]);
    expect(
      pickBadges({ priceCents: 1, fipePriceCents: null, conditions: {} }),
    ).toEqual([]);
  });

  it("[SHW-SEC-001] o card não leva placa, chassi nem nada da cobrança", async () => {
    const a = await liveStore(t.db, "loja-a", {
      taxId: "12345678000195",
      taxIdType: "cnpj",
    });
    await car(t.db, a.storeId);

    const json = JSON.stringify(
      await searchShowcase(t.db, { scope: "showcase", filters: NONE }),
    );

    for (const secret of ["ABC1D23", "9BWZZZ", "12345678000195"])
      expect(json).not.toContain(secret);
    expect(json).not.toMatch(/plate|chassis|taxId/i);
  });

  it("[SHW-SEC-002] [SHW-SEC-003] rascunho, vendido, excluído, não divulgado e loja fora do ar ficam de fora", async () => {
    const a = await liveStore(t.db, "loja-a");
    const off = await liveStore(t.db, "loja-off");
    await car(t.db, off.storeId);
    await t.db
      .update(stores)
      .set({ status: "registered" })
      .where(eq(stores.id, off.storeId));
    for (const status of ["draft", "sold", "deleted", "hidden"] as const)
      await car(t.db, a.storeId, { status });
    await car(t.db, a.storeId, { shareOnCajugo: false });

    expect(
      (await searchShowcase(t.db, { scope: "showcase", filters: NONE })).items,
    ).toEqual([]);
  });
});
