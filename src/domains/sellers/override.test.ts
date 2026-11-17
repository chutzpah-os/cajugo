import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog, partnerships } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { parseFilters } from "@/domains/showcase/service";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { vehicleRow } from "@/domains/vehicles/testing/fixtures";
import { sellerShowcase, setVehicleCommission, storeNetwork } from "./service";
import { acceptSellers, activeSeller } from "./testing/fixtures";

describe("ajuste da comissão por veículo [7e]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  async function setup() {
    const a = await liveStore(t.db, "loja-a");
    await acceptSellers(t.db, a.storeId, { type: "pct", value: 200 });
    const argo = await car(t.db, a.storeId, {
      make: "Fiat",
      model: "ARGO",
      priceCents: 6_000_000,
    });
    const onix = await car(t.db, a.storeId, { priceCents: 6_000_000 });
    const ana = await activeSeller(t.db, "ANA");
    await t.db.insert(partnerships).values({
      sellerId: ana.userId,
      storeId: a.storeId,
      origin: "request",
      status: "active",
    });
    return { a, argo, onix, ana };
  }

  it("[RCL-FR-003] o ajuste vale no lugar da padrão em 'Você ganha'; remover volta à padrão", async () => {
    // Arrange
    const { a, argo, onix, ana } = await setup();
    const earn = async (id: string) =>
      (
        await sellerShowcase(t.db, ana, { filters: parseFilters({}) })
      ).items.find((i) => i.card.vehicleId === id)?.earnCents;

    // Act
    await setVehicleCommission(t.db, a, {
      vehicleId: argo.id,
      type: "fixed",
      value: 150_000,
    });
    const withOverride = [await earn(argo.id), await earn(onix.id)];
    const listed = (await storeNetwork(t.db, a)).overrides;
    await setVehicleCommission(t.db, a, {
      vehicleId: argo.id,
      type: null,
      value: null,
    });

    // Assert
    expect(withOverride).toEqual([150_000, 120_000]);
    expect(listed).toEqual([
      { vehicleId: argo.id, title: "Fiat ARGO", type: "fixed", value: 150_000 },
    ]);
    expect(await earn(argo.id)).toBe(120_000);
    const log = await t.db.select().from(activityLog);
    expect(log.map((l) => l.action)).toContain("vehicle.commission_override");
  });

  it("[RCL-SEC-001] [RCL-SEC-002] loja B → 404; usuário da loja → 403; nada muda", async () => {
    // Arrange
    const { a, argo } = await setup();
    const b = await liveStore(t.db, "loja-b");
    const staff = await personWith(t.db, "store_staff", a.storeId);

    // Act / Assert
    await expect(
      setVehicleCommission(t.db, b, {
        vehicleId: argo.id,
        type: "fixed",
        value: 1,
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      setVehicleCommission(t.db, staff, {
        vehicleId: argo.id,
        type: "fixed",
        value: 1,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect((await vehicleRow(t.db, argo.id)).commissionOverrideType).toBeNull();
  });
});
