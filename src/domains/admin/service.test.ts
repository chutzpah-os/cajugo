import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { leads, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { eq } from "drizzle-orm";
import { runBillingCycle } from "@/domains/billing/service";
import {
  payingStore,
  personWith,
  storeOwner,
} from "@/domains/billing/testing/fixtures";
import { car } from "@/domains/showcase/testing/fixtures";
import { adminDashboard, changePct, namesLine } from "./service";

const DEC12 = new Date("2026-12-12T12:00:00Z");

describe("painel do admin [4a] (012b)", () => {
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

  it("[ADM-FR-001] variação só com base no mês anterior", () => {
    expect(changePct(121, 100)).toBe(21);
    expect(changePct(5, 0)).toBeNull();
    expect(namesLine(["A", "B", "C", "D"])).toBe("A, B e mais 2");
    expect(namesLine(["A"])).toBe("A");
  });

  it("[ADM-FR-001] [ADM-FR-002] KPIs e 'Precisa de atenção' só com o que tem pendência", async () => {
    // Arrange: 2 em dia, 1 atrasada (vence dia 10) e 1 cadastrada sem pagamento.
    await payingStore(t.db, "em-dia-1", {
      billingDay: 20,
      nextDueAt: new Date("2026-12-20T03:00:00Z"),
    });
    const ok = await payingStore(t.db, "em-dia-2", {
      billingDay: 20,
      nextDueAt: new Date("2026-12-20T03:00:00Z"),
    });
    await t.db
      .update(stores)
      .set({ activatedAt: new Date("2026-12-05T12:00:00Z") })
      .where(eq(stores.id, ok.storeId));
    await payingStore(t.db, "atrasada", {
      billingDay: 10,
      nextDueAt: new Date("2026-12-10T03:00:00Z"),
    });
    await runBillingCycle(t.db, new Date("2026-12-07T12:00:00Z"));
    await runBillingCycle(t.db, new Date("2026-12-11T12:00:00Z"));
    await storeOwner(t.db, "nova", "nova@x.com");
    await car(t.db, ok.storeId, {
      publishedAt: new Date("2026-12-03T12:00:00Z"),
    });
    await car(t.db, ok.storeId, { status: "pending_approval" });
    const admin = await personWith(t.db, "admin");

    // Act
    const view = await adminDashboard(deps(), admin);

    // Assert
    expect(view.kpis).toMatchObject({
      activeStores: 3,
      newStoresThisMonth: 1,
      mrrCents: 30_000,
      vehiclesOnShowcase: 1,
      publishedThisMonth: 1,
      lateCount: 1,
      lateNames: ["Loja atrasada"],
      leadsThisMonth: 0,
      leadsChangePct: null,
    });
    expect(view.attention.map((a) => [a.key, a.count])).toEqual([
      ["late", 1],
      ["approvals", 1],
      ["registered", 1],
    ]);
    expect(view.attention[0]).toMatchObject({
      title: "Assinaturas atrasadas",
      detail: "Loja atrasada",
      href: "/admin/assinaturas?filtro=atrasadas",
    });
  });

  it("[ADM-FR-003] origem dos leads do mês e as lojas com mais leads, em ordem", async () => {
    // Arrange
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 20,
      nextDueAt: new Date("2026-12-20T03:00:00Z"),
    });
    const b = await payingStore(t.db, "loja-b", {
      billingDay: 20,
      nextDueAt: new Date("2026-12-20T03:00:00Z"),
    });
    const va = await car(t.db, a.storeId);
    const vb = await car(t.db, b.storeId);
    const lead = (
      storeId: string,
      vehicleId: string,
      origin: "cajugo" | "store_catalog",
      at: string,
    ) => ({
      storeId,
      vehicleId,
      origin,
      channel: "whatsapp" as const,
      status: "new" as const,
      createdAt: new Date(at),
    });
    await t.db
      .insert(leads)
      .values([
        lead(a.storeId, va.id, "cajugo", "2026-12-02T12:00:00Z"),
        lead(a.storeId, va.id, "cajugo", "2026-12-03T12:00:00Z"),
        lead(b.storeId, vb.id, "store_catalog", "2026-12-04T12:00:00Z"),
        lead(a.storeId, va.id, "cajugo", "2026-11-05T12:00:00Z"),
        lead(a.storeId, va.id, "cajugo", "2026-11-20T12:00:00Z"),
      ]);
    const support = await personWith(t.db, "support");

    // Act
    const view = await adminDashboard(deps(), support);

    // Assert: dez/1–12 tem 3; nov/1–12 tem 1 → +200%.
    expect(view.kpis.leadsThisMonth).toBe(3);
    expect(view.kpis.leadsChangePct).toBe(200);
    expect(view.leadOrigin).toEqual({ cajugo: 2, catalogs: 1 });
    expect(view.topStores.map((s) => [s.name, s.leads])).toEqual([
      ["Loja loja-a", 2],
      ["Loja loja-b", 1],
    ]);
  });

  it("[ADM-SEC-001] lojista e visitante não abrem o painel", async () => {
    const owner = await storeOwner(t.db, "loja-x", "x@x.com");
    await expect(adminDashboard(deps(), owner)).rejects.toMatchObject({
      status: 403,
    });
    await expect(adminDashboard(deps(), null)).rejects.toMatchObject({
      status: 401,
    });
  });
});
