import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { listVehicles } from "@/domains/vehicles/service";
import { parseFilters } from "./filters";
import { searchShowcase } from "./service";
import { car, liveStore } from "./testing/fixtures";

describe("ordenação e paginação", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let owner: Awaited<ReturnType<typeof liveStore>>;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    owner = await liveStore(t.db, "loja-a");
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  const pages = async (ordem?: string) => {
    const filters = parseFilters(ordem ? { ordem } : {});
    const sizes: number[] = [];
    const ids: string[] = [];
    let cursor: string | null = null;
    do {
      const r: Awaited<ReturnType<typeof searchShowcase>> =
        await searchShowcase(t.db, { scope: "showcase", filters, cursor });
      sizes.push(r.items.length);
      ids.push(...r.items.map((i) => i.vehicleId));
      cursor = r.nextCursor;
    } while (cursor);
    return { sizes, ids };
  };

  it("[SHW-FR-007] de 20 em 20, até acabar, sem repetir, com empates em cada ordem", async () => {
    for (let i = 0; i < 45; i++)
      await car(t.db, owner.storeId, {
        priceCents: 5000000 + (i % 3) * 100000,
        mileageKm: 10000 + (i % 3),
        yearModel: 2018 + (i % 3),
        publishedAt: new Date(Date.UTC(2026, 10, 1 + (i % 3))),
      });

    for (const ordem of [
      undefined,
      "menor-preco",
      "maior-preco",
      "recentes",
      "menor-km",
      "ano-novo",
    ]) {
      const { sizes, ids } = await pages(ordem);
      expect(sizes, String(ordem)).toEqual([20, 20, 5]);
      expect(new Set(ids).size, String(ordem)).toBe(45);
    }
  });

  it("[SHW-FR-006] cada ordem vem na sequência certa; relevância é a padrão", async () => {
    const a = await car(t.db, owner.storeId, {
      priceCents: 3000000,
      mileageKm: 90000,
      yearModel: 2015,
      rankScore: 10,
      publishedAt: new Date("2026-01-01"),
    });
    const b = await car(t.db, owner.storeId, {
      priceCents: 9000000,
      mileageKm: 5000,
      yearModel: 2024,
      rankScore: 30,
      publishedAt: new Date("2026-03-01"),
    });
    const c = await car(t.db, owner.storeId, {
      priceCents: 5000000,
      mileageKm: 40000,
      yearModel: 2020,
      rankScore: 20,
      publishedAt: new Date("2026-02-01"),
    });

    for (const [ordem, expected] of [
      [undefined, [b, c, a]],
      ["menor-preco", [a, c, b]],
      ["maior-preco", [b, c, a]],
      ["recentes", [b, c, a]],
      ["menor-km", [b, c, a]],
      ["ano-novo", [b, c, a]],
    ] as const)
      expect((await pages(ordem)).ids, String(ordem)).toEqual(
        expected.map((v) => v.id),
      );
  });

  it("[SHW-SEC-004] cursor adulterado volta para o início, sem erro", async () => {
    await car(t.db, owner.storeId);

    const r = await searchShowcase(t.db, {
      scope: "showcase",
      filters: parseFilters({}),
      cursor: "lixo%%",
    });

    expect(r.items).toHaveLength(1);
  });

  it("[SHW-FR-007] Meus veículos [1c] também vem de 20 em 20", async () => {
    for (let i = 0; i < 25; i++) await car(t.db, owner.storeId);

    const first = await listVehicles({ db: t.db }, owner, {});
    const second = await listVehicles({ db: t.db }, owner, {
      cursor: first.nextCursor!,
    });

    expect(first.items).toHaveLength(20);
    expect(first.counts.all).toBe(25);
    expect(second.items).toHaveLength(5);
    expect(second.nextCursor).toBeNull();
    expect(
      new Set([...first.items, ...second.items].map((i) => i.vehicleId)).size,
    ).toBe(25);
  });
});
