import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoices, payments } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { runBillingCycle, subscriptionsView } from "./service";
import { payingStore, personWith } from "./testing/fixtures";

const DEC12 = new Date("2026-12-12T12:00:00Z");

describe("assinaturas do admin [4b]", () => {
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

  /** 3 em dia, 1 em atraso (vencida dia 10) e 1 suspensa. */
  async function five() {
    for (const slug of ["em-dia-1", "em-dia-2", "em-dia-3"])
      await payingStore(t.db, slug, {
        billingDay: 20,
        nextDueAt: new Date("2026-12-20T03:00:00Z"),
      });
    const late = await payingStore(t.db, "atrasada", {
      billingDay: 10,
      nextDueAt: new Date("2026-12-10T03:00:00Z"),
    });
    await runBillingCycle(t.db, new Date("2026-12-07T12:00:00Z"));
    await runBillingCycle(t.db, new Date("2026-12-11T12:00:00Z"));
    const suspended = await payingStore(t.db, "suspensa", {
      billingDay: 1,
      nextDueAt: new Date("2027-01-01T03:00:00Z"),
      status: "suspended",
      pastDueSince: new Date("2026-11-02T03:00:00Z"),
    });
    await t.db.insert(invoices).values({
      storeId: suspended.storeId,
      kind: "monthly",
      period: "2026-12",
      membershipCents: 10_000,
      totalCents: 10_000,
      dueAt: new Date("2026-12-01T03:00:00Z"),
    });
    return { late, suspended };
  }

  it("[SUB-FR-011] MRR e as contagens Em dia, Atrasadas e Suspensas", async () => {
    // Arrange
    await five();
    const admin = await personWith(t.db, "admin");

    // Act
    const view = await subscriptionsView(deps(), admin, {});

    // Assert
    expect(view.mrrCents).toBe(50_000);
    expect(view.counts).toEqual({
      ok: 3,
      late: 1,
      suspended: 1,
      canceling: 0,
      canceled: 0,
    });
    expect(view.plan).toEqual({
      name: "Plano Catálogo",
      membershipCents: 10_000,
      stores: 5,
      upcoming: null,
    });
    expect(view.items).toHaveLength(5);
  });

  it("[SUB-FR-012] filtro Atrasadas: 'Em atraso 2 dias · R$ 100', wa.me e Suspender (só para o admin)", async () => {
    await five();
    const admin = await personWith(t.db, "admin");

    const view = await subscriptionsView(deps(), admin, {
      filtro: "atrasadas",
    });

    expect(view.items).toHaveLength(1);
    expect(view.items[0]).toMatchObject({
      name: "Loja atrasada",
      owner: "Dono",
      line: { kind: "late", days: 2, amountCents: 10_000 },
      canSuspend: true,
      canReactivate: false,
    });
    expect(view.items[0].whatsappUrl).toMatch(/^https:\/\/wa\.me\/55/);
  });

  it("[SUB-FR-012] suspensa: fora do ar e Reativar; em dia: próxima cobrança; com comprovante: em análise", async () => {
    const { late } = await five();
    const admin = await personWith(t.db, "admin");
    const [invoice] = await t.db.select().from(invoices).limit(1);
    await t.db.insert(payments).values({
      invoiceId: invoice.id,
      storeId: late.storeId,
      paidCents: 10_000,
      amountCents: 10_000,
      status: "submitted",
      submittedBy: late.userId,
      submittedAt: new Date("2026-12-11T15:00:00Z"),
    });

    const view = await subscriptionsView(deps(), admin, {});

    const by = (name: string) => view.items.find((i) => i.name === name)!;
    expect(by("Loja suspensa")).toMatchObject({
      line: { kind: "suspended" },
      canReactivate: true,
    });
    expect(by("Loja em-dia-1").line).toEqual({
      kind: "ok",
      nextDueAt: new Date("2026-12-20T03:00:00Z"),
      amountCents: 10_000,
    });
    expect(by("Loja atrasada").line).toEqual({
      kind: "review",
      submittedAt: new Date("2026-12-11T15:00:00Z"),
    });
  });

  it("[SUB-FR-006] vencem em 3 dias: a loja com fatura aberta vencendo, com wa.me", async () => {
    await payingStore(t.db, "vence", {
      billingDay: 14,
      nextDueAt: new Date("2026-12-14T03:00:00Z"),
    });
    await runBillingCycle(t.db, new Date("2026-12-11T12:00:00Z"));
    const support = await personWith(t.db, "support");

    const view = await subscriptionsView(deps(), support, {});

    expect(view.dueSoon).toHaveLength(1);
    expect(view.dueSoon[0]).toMatchObject({
      name: "Loja vence",
      dueAt: new Date("2026-12-14T03:00:00Z"),
      amountCents: 10_000,
    });
    expect(view.dueSoon[0].whatsappUrl).toMatch(/^https:\/\/wa\.me\//);
    expect(view.items[0]).toMatchObject({
      canSuspend: false,
      canReactivate: false,
    });
  });

  it("[SUB-SEC-003] lojista, usuário da loja e vendedor não veem as assinaturas", async () => {
    for (const role of ["store_owner", "store_staff", "seller"] as const) {
      const someone = await personWith(t.db, role);

      await expect(
        subscriptionsView(deps(), someone, {}),
      ).rejects.toMatchObject({ status: 403 });
    }
  });
});
