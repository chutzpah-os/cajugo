import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { vehiclePage } from "./service";
import { car, liveStore } from "./testing/fixtures";

describe("página do veículo [1b]", () => {
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

  it("[SHW-FR-008] traz galeria, ficha, condições, itens, loja e WhatsApp com o veículo e o link", async () => {
    const a = await liveStore(t.db, "loja-a");
    const v = await car(
      t.db,
      a.storeId,
      {
        color: "Prata",
        body: "hatchback",
        doors: 4,
        description: "Revisado.",
        conditions: { singleOwner: true, ipvaPaid: true, armored: false },
        features: ["airbag", "abs"],
        priceCents: 7632000,
        fipePriceCents: 8000000,
      },
      2,
    );

    const page = await vehiclePage(t.db, v.id);

    expect(page).toMatchObject({
      kind: "vehicle",
      shared: true,
      photos: [
        `staging/vehicles/${v.id}/photo-0`,
        `staging/vehicles/${v.id}/photo-1`,
      ],
      plateEnd: "3",
      transmission: "Manual",
      fuel: "Flex",
      body: "Hatchback",
      conditions: ["Único dono", "IPVA pago"],
      features: ["Airbag", "Freio ABS"],
      badges: ["Abaixo da FIPE", "Único dono"],
      store: {
        name: "Loja loja-a",
        slug: "loja-a",
        city: "Aracaju",
        initials: "LL",
      },
    });
    if (page?.kind !== "vehicle") throw new Error("esperava veículo");
    expect(page.whatsappUrl).toMatch(/^https:\/\/wa\.me\/5579999990000\?text=/);
    const text = decodeURIComponent(
      new URL(page.whatsappUrl).searchParams.get("text")!,
    );
    expect(text).toContain("R$ 76.320,00");
    expect(text).toContain(`https://cajugo.test${page.path}`);
  });

  it("[SHW-SEC-001] sem placa completa, chassi nem documento da loja", async () => {
    const a = await liveStore(t.db, "loja-a", {
      taxId: "12345678000195",
      taxIdType: "cnpj",
    });
    const v = await car(t.db, a.storeId);

    const json = JSON.stringify(await vehiclePage(t.db, v.id));

    for (const secret of ["ABC1D23", "9BWZZZ", "12345678000195"])
      expect(json).not.toContain(secret);
  });

  it("[DSC-FR-008] traz marca, modelo e cidade nos endereços de descoberta", async () => {
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId, {
      make: "GM - Chevrolet",
      model: "ONIX",
    });

    expect(await vehiclePage(t.db, v.id)).toMatchObject({
      kind: "vehicle",
      makeSlug: "chevrolet",
      modelSlug: "onix",
      store: { citySlug: "aracaju-se" },
    });
  });

  it("[BUY-FR-001] [BUY-FR-003] simulador com as regras, o contato e o link; sem a opção, nenhum", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const on = await car(t.db, a.storeId, {
      make: "Fiat",
      model: "Argo",
      version: "DRIVE 1.0",
      yearModel: 2022,
      priceCents: 6_000_000,
      showInstallment: true,
      contactWhatsapp: "5579988887777",
    });
    const off = await car(t.db, a.storeId, { showInstallment: false });
    const noPrice = await car(t.db, a.storeId, {
      showInstallment: true,
      priceCents: null,
    });

    // Act
    const page = await vehiclePage(t.db, on.id);

    // Assert
    expect(page).toMatchObject({
      simulator: {
        priceCents: 6_000_000,
        downBps: 2000,
        months: 48,
        rateBps: 179,
        whatsappNumber: "5579988887777",
        title: "Fiat DRIVE 1.0 2022",
        url: expect.stringMatching(
          /^https:\/\/cajugo\.test\/v\/.+-fiat-argo-2022-/,
        ),
      },
    });
    expect(await vehiclePage(t.db, off.id)).toMatchObject({ simulator: null });
    expect(await vehiclePage(t.db, noPrice.id)).toMatchObject({
      simulator: null,
    });
  });

  it("[SHW-FR-008] veículo não divulgado abre pelo mesmo endereço", async () => {
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId, { shareOnCajugo: false });

    expect(await vehiclePage(t.db, v.id)).toMatchObject({
      kind: "vehicle",
      shared: false,
    });
  });

  it("[SHW-FR-010] vendido ou excluído: indisponível, com parecidos da mesma marca e sem ele mesmo", async () => {
    const a = await liveStore(t.db, "loja-a");
    const sold = await car(t.db, a.storeId, { status: "sold" });
    const gone = await car(t.db, a.storeId, { status: "deleted" });
    const same = await car(t.db, a.storeId);
    await car(t.db, a.storeId, {
      make: "BMW",
      model: "X1",
      makeSlug: "bmw",
      shareOnCajugo: false,
    });

    const page = await vehiclePage(t.db, sold.id);

    expect(page).toMatchObject({ kind: "unavailable" });
    if (page?.kind !== "unavailable") throw new Error("esperava indisponível");
    expect(page.similar.map((c) => c.vehicleId)).toEqual([same.id]);
    expect(page.soldCar).toMatchObject({ storeName: expect.any(String) });
    expect(await vehiclePage(t.db, gone.id)).toMatchObject({
      kind: "unavailable",
      soldCar: null,
    });
  });

  it("[SHW-FR-011] loja suspensa: aviso sem motivo", async () => {
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    await t.db
      .update(stores)
      .set({ status: "suspended" })
      .where(eq(stores.id, a.storeId));

    expect(await vehiclePage(t.db, v.id)).toEqual({ kind: "suspended" });
  });

  it("[SHW-SEC-003] rascunho, loja fora do ar ou id inexistente não têm página", async () => {
    const a = await liveStore(t.db, "loja-a");
    const draft = await car(t.db, a.storeId, { status: "draft" });
    const off = await liveStore(t.db, "loja-off");
    const v = await car(t.db, off.storeId);
    await t.db
      .update(stores)
      .set({ status: "registered" })
      .where(eq(stores.id, off.storeId));

    expect(await vehiclePage(t.db, draft.id)).toBeNull();
    expect(await vehiclePage(t.db, v.id)).toBeNull();
    expect(await vehiclePage(t.db, crypto.randomUUID())).toBeNull();
  });
});
