import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith, storeOwner } from "@/domains/billing/testing/fixtures";
import { car } from "@/domains/showcase/testing/fixtures";
import { adminStoreDetail } from "./service";

const DEC12 = new Date("2026-12-12T12:00:00Z");

describe("detalhe da loja no admin [6g] (012b)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = () => ({ db: t.db, now: () => DEC12 });

  beforeEach(async () => {
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  async function silva() {
    const o = await storeOwner(t.db, "auto-center-silva", "ricardo@x.com", {
      name: "Ricardo Silva",
    });
    await t.db
      .update(stores)
      .set({
        status: "active",
        name: "Auto Center Silva",
        city: "Campinas",
        state: "SP",
        taxId: "12345678000190",
        taxIdType: "cnpj",
        activatedAt: new Date("2026-03-10T12:00:00Z"),
      })
      .where(eq(stores.id, o.storeId));
    await car(t.db, o.storeId);
    await car(t.db, o.storeId, { shareOnCajugo: false });
    return o;
  }

  it("[ADM-FR-008] cabeçalho, KPIs e os cards Dono, Assinatura, Rede Caju e Veículos", async () => {
    // Arrange
    const o = await silva();
    const admin = await personWith(t.db, "admin");

    // Act
    const view = await adminStoreDetail(deps(), admin, o.storeId);

    // Assert
    expect(view.store).toMatchObject({
      name: "Auto Center Silva",
      city: "Campinas (SP)",
      status: "active",
    });
    expect(view.kpis).toEqual({ vehicles: 2, onCajugo: 1, leadsThisMonth: 0 });
    expect(view.owner).toMatchObject({
      name: "Ricardo Silva",
      email: "ricardo@x.com",
      taxIdLabel: "CNPJ",
      taxId: "12.345.678/0001-90",
    });
    expect(view.subscription).toMatchObject({
      plan: "Catálogo",
      totalPaidCents: 0,
    });
    expect(view.network).toMatchObject({ partners: 0, salesThisMonth: 0 });
    expect(view.vehicles).toHaveLength(2);
  });

  it("[ADM-FR-009] [ADM-FR-010] o admin recebe os dados para editar e as ações da loja", async () => {
    // Arrange
    const o = await silva();
    const admin = await personWith(t.db, "admin");

    // Act
    const view = await adminStoreDetail(deps(), admin, o.storeId);

    // Assert
    expect(view.edit).toMatchObject({
      name: "Auto Center Silva",
      city: "Campinas",
      state: "SP",
    });
    expect(view.owner.roles).toContain("store_owner");
    expect(view.canSuspend).toBe(true);
    expect(view.canSetPassword).toBe(true);
  });

  it("[ADM-SEC-004] o suporte vê o CNPJ mascarado", async () => {
    const o = await silva();
    const support = await personWith(t.db, "support");

    const view = await adminStoreDetail(deps(), support, o.storeId);

    expect(view.owner.taxId).toBe("12.***.***/0001-90");
    expect(view.canManage).toBe(false);
    expect(view.edit).toBeNull();
    expect(view.canSuspend).toBe(false);
    expect(view.canSetPassword).toBe(false);
  });

  it("[ADM-SEC-005] id inválido ou loja inexistente → 404; lojista → 403", async () => {
    const o = await silva();
    const admin = await personWith(t.db, "admin");

    await expect(
      adminStoreDetail(deps(), admin, "nao-e-uuid"),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      adminStoreDetail(deps(), admin, "01900000-0000-7000-8000-000000000000"),
    ).rejects.toMatchObject({ status: 404 });
    await expect(adminStoreDetail(deps(), o, o.storeId)).rejects.toMatchObject({
      status: 403,
    });
  });
});
