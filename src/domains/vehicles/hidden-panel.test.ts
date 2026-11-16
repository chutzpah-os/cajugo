import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { report } from "@/domains/moderation/testing/fixtures";
import { hideVehicle, listVehicles, vehicleSummary } from "./service";

describe("veículo oculto no painel da loja", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = () => ({ db: t.db });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  async function hiddenArgo() {
    const a = await liveStore(t.db, "loja-a");
    const argo = await car(t.db, a.storeId);
    await report(t.db, argo.id, { details: "Denúncia secreta" });
    await report(t.db, argo.id, { reason: "scam" });
    const admin = await personWith(t.db, "admin");
    await hideVehicle(t.db, admin, argo.id, {
      reason: "other",
      note: "Anúncio duplicado",
    });
    return { a, argo };
  }

  it("[RPT-FR-006] [1c] mostra o selo Oculto e a marca de moderação; vende, não divulga", async () => {
    // Arrange
    const { a, argo } = await hiddenArgo();

    // Act
    const list = await listVehicles(deps(), a, { status: "published" });

    // Assert
    expect(list.items).toEqual([
      expect.objectContaining({
        vehicleId: argo.id,
        status: "hidden",
        statusLabel: "Oculto",
        moderation: { reason: "other", note: "Anúncio duplicado" },
        canSell: true,
        canShare: false,
      }),
    ]);
    expect(list.kpis.onCajugo).toBe(0);
  });

  it("[RPT-FR-006] [6e] traz a marca de moderação no resumo", async () => {
    // Arrange
    const { a, argo } = await hiddenArgo();

    // Act
    const s = await vehicleSummary(deps(), a, argo.id);

    // Assert
    expect(s).toMatchObject({
      status: "hidden",
      statusLabel: "Oculto",
      moderation: { reason: "other", note: "Anúncio duplicado" },
    });
  });

  it("[RPT-SEC-001] nada das denúncias chega ao painel da loja", async () => {
    // Arrange
    const { a, argo } = await hiddenArgo();

    // Act
    const json = JSON.stringify([
      await listVehicles(deps(), a, {}),
      await vehicleSummary(deps(), a, argo.id),
    ]);

    // Assert
    expect(json).not.toContain("Denúncia secreta");
    expect(json).not.toMatch(/report|scam|unreal_price/i);
  });

  it("[RPT-SEC-004] a loja B não lê o resumo do veículo oculto da loja A", async () => {
    // Arrange
    const { argo } = await hiddenArgo();
    const b = await liveStore(t.db, "loja-b");

    // Act / Assert
    await expect(vehicleSummary(deps(), b, argo.id)).rejects.toMatchObject({
      status: 404,
    });
  });
});
