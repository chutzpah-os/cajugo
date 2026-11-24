import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  activityLog,
  billingCredits,
  invoices,
  notices,
} from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { isStoreLive } from "@/domains/stores/service";
import { cancelSubscription, runBillingCycle, undoCancel } from "./service";
import { payingStore, personWith, storeRow } from "./testing/fixtures";

const DEC01 = new Date("2026-12-01T12:00:00Z");
const DUE = new Date("2026-12-10T03:00:00Z");

describe("cancelar e desfazer [12h]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = (now = DEC01) => ({ db: t.db, now: () => now });

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  const storeA = () =>
    payingStore(t.db, "loja-a", { billingDay: 10, nextDueAt: DUE });

  it("[CAN-FR-002] ativa → cancelamento agendado até o próximo vencimento, com o motivo; continua no ar", async () => {
    // Arrange
    const a = await storeA();

    // Act
    const result = await cancelSubscription(deps(), a, {
      reason: "Vou parar de vender",
    });

    // Assert
    expect(result).toEqual({ status: "cancel_scheduled", activeUntil: DUE });
    const store = await storeRow(t.db, a.storeId);
    expect(store).toMatchObject({
      status: "cancel_scheduled",
      cancelRequestedAt: DEC01,
      cancelReason: "Vou parar de vender",
      activeUntil: DUE,
      nextDueAt: DUE,
    });
    expect(isStoreLive(store.status)).toBe(true);
  });

  it("[CAN-FR-002] motivo é opcional; motivo fora da lista é recusado", async () => {
    const a = await storeA();

    await expect(
      cancelSubscription(deps(), a, { reason: "Outra coisa qualquer" }),
    ).rejects.toMatchObject({ status: 422 });
    await cancelSubscription(deps(), a, {});

    expect(await storeRow(t.db, a.storeId)).toMatchObject({
      status: "cancel_scheduled",
      cancelReason: null,
    });
  });

  it("[CAN-FR-003] Desfazer até o fim do período volta a ativa, com o mesmo vencimento e sem fatura nova", async () => {
    // Arrange
    const a = await storeA();
    await cancelSubscription(deps(), a, { reason: "Vou parar de vender" });

    // Act
    await undoCancel(deps(new Date("2026-12-09T20:00:00Z")), a);

    // Assert
    expect(await storeRow(t.db, a.storeId)).toMatchObject({
      status: "active",
      nextDueAt: DUE,
      cancelRequestedAt: null,
      cancelReason: null,
      activeUntil: null,
    });
    expect(await t.db.select().from(invoices)).toHaveLength(0);
  });

  it("[CAN-FR-003] depois do fim do período não dá para desfazer (409); sem cancelamento, também não", async () => {
    const a = await storeA();
    await expect(undoCancel(deps(), a)).rejects.toMatchObject({
      status: 409,
    });
    await cancelSubscription(deps(), a, {});

    await expect(undoCancel(deps(DUE), a)).rejects.toMatchObject({
      status: 409,
    });
    await expect(cancelSubscription(deps(), a, {})).rejects.toMatchObject({
      status: 409,
    });
  });

  it("[CAN-FR-009] em atraso ou suspensa: cancelada na hora, com as faturas mensais abertas canceladas e o crédito expirado", async () => {
    // Arrange: fatura de dezembro aberta e vencida; o job suspende depois da tolerância
    const b = await storeA();
    await runBillingCycle(t.db, new Date("2026-12-07T12:00:00Z"));
    await runBillingCycle(t.db, new Date("2026-12-11T12:00:00Z"));
    const late = await runBillingCycle(t.db, new Date("2026-12-20T12:00:00Z"));
    await t.db
      .insert(billingCredits)
      .values({ storeId: b.storeId, kind: "overpayment", amountCents: 3000 });
    const now = new Date("2026-12-21T12:00:00Z");

    // Act
    const result = await cancelSubscription(deps(now), b, {
      reason: "Está caro para mim",
    });

    // Assert
    expect(late.suspended).toBe(1);
    expect(result).toEqual({ status: "canceled", activeUntil: null });
    expect(await storeRow(t.db, b.storeId)).toMatchObject({
      status: "canceled",
      canceledAt: now,
      cancelReason: "Está caro para mim",
      pastDueSince: null,
    });
    const [invoice] = await t.db.select().from(invoices);
    expect(invoice.status).toBe("canceled");
    expect(await t.db.select().from(billingCredits)).toHaveLength(0);
    expect(isStoreLive("canceled")).toBe(false);
  });

  it("[CAN-FR-012] [CAN-SEC-004] o lojista e os admins são avisados; o registro tem o motivo e nenhum dado pessoal", async () => {
    // Arrange
    const a = await storeA();
    const admin = await personWith(t.db, "admin");

    // Act
    await cancelSubscription(deps(), a, { reason: "Vou parar de vender" });
    await undoCancel(deps(), a);

    // Assert
    const of = async (id: string) =>
      (
        await t.db
          .select({ kind: notices.kind, data: notices.data })
          .from(notices)
          .where(eq(notices.profileId, id))
      ).filter((n) => n.kind !== "payment_confirmed");
    expect(await of(a.userId)).toEqual([
      { kind: "cancel_scheduled", data: { until: "10/12" } },
      { kind: "cancel_undone", data: {} },
    ]);
    expect(await of(admin.userId)).toEqual([
      {
        kind: "cancel_scheduled",
        data: { until: "10/12", store: "Loja loja-a" },
      },
      { kind: "cancel_undone", data: { store: "Loja loja-a" } },
    ]);
    const log = await t.db
      .select({
        userId: activityLog.userId,
        action: activityLog.action,
        data: activityLog.data,
      })
      .from(activityLog)
      .where(eq(activityLog.entityId, a.storeId));
    expect(log.filter((l) => l.action.startsWith("subscription."))).toEqual([
      {
        userId: a.userId,
        action: "subscription.cancel_scheduled",
        data: { reason: "Vou parar de vender", activeUntil: DUE.toISOString() },
      },
      { userId: a.userId, action: "subscription.cancel_undone", data: null },
    ]);
  });

  it("[CAN-SEC-002] usuário da loja, suporte, vendedor e admin não cancelam nem desfazem (403)", async () => {
    const a = await storeA();
    const others = [
      await personWith(t.db, "store_staff", a.storeId),
      await personWith(t.db, "support"),
      await personWith(t.db, "seller"),
      await personWith(t.db, "admin"),
    ];

    for (const s of others) {
      await expect(cancelSubscription(deps(), s, {})).rejects.toMatchObject({
        status: 403,
      });
      await expect(undoCancel(deps(), s)).rejects.toMatchObject({
        status: 403,
      });
    }
    await expect(cancelSubscription(deps(), null, {})).rejects.toMatchObject({
      status: 401,
    });
    expect((await storeRow(t.db, a.storeId)).status).toBe("active");
  });

  it("[CAN-SEC-001] a loja B não cancela nem desfaz a loja A: a entrada não aceita id e a ação vale só para a loja da sessão", async () => {
    // Arrange
    const a = await storeA();
    const b = await payingStore(t.db, "loja-b", {
      billingDay: 10,
      nextDueAt: DUE,
    });
    await cancelSubscription(deps(), a, {});

    // Act
    const withId = cancelSubscription(deps(), b, { storeId: a.storeId });
    const undoB = undoCancel(deps(), b);

    // Assert
    await expect(withId).rejects.toMatchObject({ status: 422 });
    await expect(undoB).rejects.toMatchObject({ status: 409 });
    expect((await storeRow(t.db, a.storeId)).status).toBe("cancel_scheduled");
    expect((await storeRow(t.db, b.storeId)).status).toBe("active");
  });
});
