import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  activityLog,
  billingCredits,
  invoices,
  notices,
  partnerships,
} from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { storePage } from "@/domains/showcase/service";
import { activeSeller } from "@/domains/sellers/testing/fixtures";
import { cancelSubscription, runBillingCycle } from "./service";
import { payingStore, personWith, storeRow } from "./testing/fixtures";

const DEC01 = new Date("2026-12-01T12:00:00Z");
const DUE = new Date("2026-12-10T03:00:00Z");
const at = (day: number) => new Date(Date.UTC(2026, 11, day, 12));

describe("ciclo de cobrança: fim do período depois do cancelamento", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  /** Loja A com cancelamento agendado para 10/12. */
  async function scheduled() {
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: DUE,
    });
    await cancelSubscription({ db: t.db, now: () => DEC01 }, a, {
      reason: "Vou parar de vender",
    });
    return a;
  }

  it("[CAN-FR-004] com o cancelamento agendado, a fatura do vencimento não é aberta", async () => {
    await scheduled();

    const result = await runBillingCycle(t.db, at(7));

    expect(result.opened).toBe(0);
    expect(await t.db.select().from(invoices)).toHaveLength(0);
  });

  it("[CAN-FR-005] no fim do período: cancelada, crédito expira, parcerias encerradas, fora do ar", async () => {
    // Arrange
    const a = await scheduled();
    await t.db
      .insert(billingCredits)
      .values({ storeId: a.storeId, kind: "referral", amountCents: 3000 });
    const ana = await activeSeller(t.db, "ana");
    await t.db.insert(partnerships).values({
      sellerId: ana.userId,
      storeId: a.storeId,
      origin: "request",
      status: "active",
    });
    const before = await runBillingCycle(t.db, at(9));

    // Act
    const result = await runBillingCycle(t.db, at(10));

    // Assert
    expect(before.ended).toBe(0);
    expect(result.ended).toBe(1);
    expect(await storeRow(t.db, a.storeId)).toMatchObject({
      status: "canceled",
      canceledAt: at(10),
    });
    expect(await t.db.select().from(billingCredits)).toHaveLength(0);
    const [p] = await t.db.select().from(partnerships);
    expect(p).toMatchObject({ status: "ended", endedAt: at(10) });
    expect((await storePage(t.db, "loja-a"))?.kind).not.toBe("store");
  });

  it("[CAN-FR-012] [CAN-SEC-004] [CAN-NFR-002] avisa o lojista e os admins, registra sem dado pessoal e rodar 2× não repete", async () => {
    // Arrange
    const a = await scheduled();
    const admin = await personWith(t.db, "admin");

    // Act
    await runBillingCycle(t.db, at(10));
    const again = await runBillingCycle(t.db, at(11));

    // Assert
    expect(again.ended).toBe(0);
    const kinds = async (id: string) =>
      (
        await t.db
          .select({ kind: notices.kind, data: notices.data })
          .from(notices)
          .where(eq(notices.profileId, id))
      ).filter((n) => n.kind === "store_canceled");
    expect(await kinds(a.userId)).toEqual([
      { kind: "store_canceled", data: {} },
    ]);
    expect(await kinds(admin.userId)).toEqual([
      { kind: "store_canceled", data: { store: "Loja loja-a" } },
    ]);
    const log = await t.db
      .select({ userId: activityLog.userId, data: activityLog.data })
      .from(activityLog)
      .where(eq(activityLog.action, "store.canceled"));
    expect(log).toEqual([
      {
        userId: null,
        data: { by: "period_end", expiredCreditCents: 0, partnerships: 0 },
      },
    ]);
  });
});
