import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { personWith } from "@/domains/billing/testing/fixtures";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { vehicleReports } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { uuidv7 } from "@/platform/db/uuid";
import { SHOWCASE_PAGE_SIZE, showcaseAdmin } from "./service";

describe("Veículos CajuGo do admin [1d] (012b)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[ADM-FR-006] lista os da vitrine com loja e preço; filtros Denunciados, Aguardando aprovação e Ocultados", async () => {
    // Arrange
    const silva = await liveStore(t.db, "auto-silva");
    const onix = await car(t.db, silva.storeId, { model: "ONIX" });
    const hb20 = await car(t.db, silva.storeId, {
      make: "Hyundai",
      model: "HB20",
    });
    await car(t.db, silva.storeId, { shareOnCajugo: false });
    const hidden = await car(t.db, silva.storeId, { status: "hidden" });
    const pending = await car(t.db, silva.storeId, {
      status: "pending_approval",
      model: "KWID",
    });
    await t.db.insert(vehicleReports).values({
      id: uuidv7(),
      vehicleId: hb20.id,
      reason: "unreal_price",
    });
    const support = await personWith(t.db, "support");

    // Act
    const all = await showcaseAdmin(t.db, support, {});
    const reported = await showcaseAdmin(t.db, support, {
      filtro: "denunciados",
    });
    const waiting = await showcaseAdmin(t.db, support, {
      filtro: "aguardando",
    });
    const hiddenOnes = await showcaseAdmin(t.db, support, {
      filtro: "ocultados",
    });

    // Assert
    expect(all.items.map((i) => i.vehicle.id)).toEqual([hb20.id, onix.id]);
    expect(all.items[0]).toMatchObject({
      openReports: 1,
      vehicle: { storeName: "Loja auto-silva", priceCents: 5000000 },
    });
    expect(all.counts).toEqual({ reported: 1, pending: 1, hidden: 1 });
    expect(reported.items.map((i) => i.vehicle.id)).toEqual([hb20.id]);
    expect(waiting.items).toEqual([
      expect.objectContaining({ pendingApproval: true }),
    ]);
    expect(waiting.items[0].vehicle.id).toBe(pending.id);
    expect(hiddenOnes.items).toEqual([
      expect.objectContaining({ hidden: true }),
    ]);
    expect(hiddenOnes.items[0].vehicle.id).toBe(hidden.id);
  });

  it("[ADM-FR-006] busca por marca, modelo ou loja, 20 por vez", async () => {
    // Arrange
    const a = await liveStore(t.db, "garagem-77", { name: "Garagem 77" });
    for (let i = 0; i < SHOWCASE_PAGE_SIZE + 1; i++) await car(t.db, a.storeId);
    const b = await liveStore(t.db, "outra-loja");
    await car(t.db, b.storeId, { make: "Fiat", model: "UNO" });
    const admin = await personWith(t.db, "admin");

    // Act
    const first = await showcaseAdmin(t.db, admin, { q: "garagem" });
    const second = await showcaseAdmin(t.db, admin, {
      q: "garagem",
      depois: first.next!,
    });
    const uno = await showcaseAdmin(t.db, admin, { q: "uno" });

    // Assert
    expect(first.items).toHaveLength(SHOWCASE_PAGE_SIZE);
    expect(second.items).toHaveLength(1);
    expect(second.next).toBeNull();
    expect(uno.items).toHaveLength(1);
  });

  it("[ADM-SEC-001] lojista e visitante não veem a aba", async () => {
    // Arrange
    const owner = await personWith(t.db, "store_owner");

    // Act + Assert
    await expect(showcaseAdmin(t.db, owner, {})).rejects.toMatchObject({
      status: 403,
    });
    await expect(showcaseAdmin(t.db, null, {})).rejects.toMatchObject({
      status: 401,
    });
  });
});
