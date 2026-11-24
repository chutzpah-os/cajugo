import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { billingCredits, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { storePage } from "@/domains/showcase/service";
import {
  accountView,
  billingAlert,
  cancelSubscription,
  editPlan,
  runBillingCycle,
  subscriptionsView,
} from "./service";
import { payingStore, personWith } from "./testing/fixtures";

const DEC01 = new Date("2026-12-01T12:00:00Z");
const DUE = new Date("2026-12-10T03:00:00Z");

describe("telas com o cancelamento", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = (now = DEC01) => ({ db: t.db, now: () => now });

  beforeEach(async () => {
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  const store = (slug: string, nextDueAt = DUE) =>
    payingStore(t.db, slug, { billingDay: 10, nextDueAt });

  it("[CAN-FR-010] [4b] filtra Cancelamento agendado (data do fim e motivo) e Canceladas; Todas não mostra as canceladas", async () => {
    // Arrange
    const admin = await personWith(t.db, "admin");
    const a = await store("loja-a");
    const b = await store("loja-b", new Date("2026-11-30T03:00:00Z"));
    await store("loja-c", new Date("2026-12-20T03:00:00Z"));
    await cancelSubscription(deps(), a, { reason: "Vou parar de vender" });
    await cancelSubscription(deps(new Date("2026-11-20T12:00:00Z")), b, {});
    await runBillingCycle(t.db, new Date("2026-11-30T12:00:00Z"));

    // Act
    const canceling = await subscriptionsView(deps(), admin, {
      filtro: "cancelamento",
    });
    const canceled = await subscriptionsView(deps(), admin, {
      filtro: "canceladas",
    });
    const all = await subscriptionsView(deps(), admin, {});

    // Assert
    expect(canceling.items.map((i) => [i.name, i.line])).toEqual([
      [
        "Loja loja-a",
        { kind: "canceling", until: DUE, reason: "Vou parar de vender" },
      ],
    ]);
    expect(canceled.items.map((i) => [i.name, i.line])).toEqual([
      [
        "Loja loja-b",
        {
          kind: "canceled",
          at: new Date("2026-11-30T12:00:00Z"),
          reason: null,
        },
      ],
    ]);
    expect(all.items.map((i) => i.name)).toEqual([
      "Loja loja-a",
      "Loja loja-c",
    ]);
    expect(all.counts).toMatchObject({ canceling: 1, canceled: 1, ok: 1 });
    expect(canceling.items[0]).toMatchObject({
      canSuspend: false,
      canReactivate: false,
      whatsappUrl: null,
    });
  });

  it("[CAN-FR-011] [4b] mostra a mudança de mensalidade agendada", async () => {
    const admin = await personWith(t.db, "admin");
    await editPlan(deps(), admin, {
      membershipCents: 12000,
      validFrom: "2027-02-01",
    });

    const view = await subscriptionsView(deps(), admin, {});

    expect(view.plan).toMatchObject({
      membershipCents: 10000,
      upcoming: {
        membershipCents: 12000,
        validFrom: new Date("2027-02-01T03:00:00Z"),
      },
    });
  });

  it("[CAN-FR-001] Conta: ativa pode cancelar (no ar até o vencimento, retenção, crédito); agendada mostra o fim; cancelada, reassinar", async () => {
    // Arrange
    const a = await store("loja-a");
    await t.db
      .insert(billingCredits)
      .values({ storeId: a.storeId, kind: "referral", amountCents: 3000 });

    // Act
    const active = await accountView(deps(), a);
    await cancelSubscription(deps(), a, { reason: "Vou parar de vender" });
    const scheduled = await accountView(deps(), a);
    await runBillingCycle(t.db, new Date("2026-12-10T12:00:00Z"));
    const canceled = await accountView(deps(), a);

    // Assert
    expect(active.cancel).toEqual({
      kind: "available",
      until: DUE,
      retentionDays: 90,
      creditCents: 3000,
    });
    expect(scheduled.cancel).toEqual({
      kind: "scheduled",
      until: DUE,
      reason: "Vou parar de vender",
    });
    expect(canceled.cancel).toEqual({
      kind: "canceled",
      at: new Date("2026-12-10T12:00:00Z"),
    });
  });

  it("[CAN-FR-009] Conta: em atraso, cancelar vale agora (sem data do fim)", async () => {
    const b = await store("loja-b");
    await t.db
      .update(stores)
      .set({ status: "past_due", pastDueSince: DUE })
      .where(eq(stores.id, b.storeId));

    expect((await accountView(deps(), b)).cancel).toEqual({
      kind: "available",
      until: null,
      retentionDays: 90,
      creditCents: 0,
    });
  });

  it("[CAN-FR-003] [CAN-FR-012] painel: aviso do fim com Desfazer para o dono; o usuário da loja vê o aviso sem Desfazer", async () => {
    const a = await store("loja-a");
    const staff = await personWith(t.db, "store_staff", a.storeId);
    await cancelSubscription(deps(), a, {});

    expect(await billingAlert(deps(), a)).toEqual({
      kind: "ending",
      until: DUE,
      canUndo: true,
    });
    expect(await billingAlert(deps(), staff)).toEqual({
      kind: "ending",
      until: DUE,
      canUndo: false,
    });
  });

  it("[CAN-SEC-005] página pública da loja cancelada: `gone`, sem o motivo; arquivada ou inexistente: null", async () => {
    const a = await store("loja-a");
    await cancelSubscription(deps(), a, { reason: "Vou parar de vender" });
    const scheduled = await storePage(t.db, "loja-a");
    await runBillingCycle(t.db, new Date("2026-12-10T12:00:00Z"));

    expect(scheduled?.kind).toBe("store");
    expect(await storePage(t.db, "loja-a")).toEqual({ kind: "gone" });
    await t.db
      .update(stores)
      .set({ status: "archived", slug: "arquivada-x" })
      .where(eq(stores.id, a.storeId));
    expect(await storePage(t.db, "loja-a")).toBeNull();
    expect(await storePage(t.db, "nao-existe")).toBeNull();
  });
});
