import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { activityLog, invoices, notices } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { saoPauloDate } from "./due-date";
import { runBillingCycle } from "./service";
import { payingStore, personWith, storeRow } from "./testing/fixtures";

const DUE = new Date("2026-12-10T03:00:00Z");
const on = (day: string) => new Date(`2026-12-${day}T12:00:00Z`);

describe("ciclo de cobrança: atraso e suspensão", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  it("[SUB-FR-007] no dia seguinte ao vencimento sem pagamento, a loja fica em atraso desde o dia 11", async () => {
    // Arrange
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: DUE,
    });
    await runBillingCycle(t.db, on("07"));
    const onDueDay = await runBillingCycle(t.db, on("10"));

    // Act
    const result = await runBillingCycle(t.db, on("11"));

    // Assert
    expect(onDueDay.pastDue).toBe(0);
    expect(result.pastDue).toBe(1);
    const store = await storeRow(t.db, a.storeId);
    expect(store.status).toBe("past_due");
    expect(saoPauloDate(store.pastDueSince!)).toBe("2026-12-11");
  });

  it("[SUB-FR-007] fatura paga antes do vencimento: segue ativa", async () => {
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: DUE,
    });
    await runBillingCycle(t.db, on("07"));
    await t.db.update(invoices).set({ status: "paid", paidAt: on("08") });

    await runBillingCycle(t.db, on("11"));

    expect((await storeRow(t.db, a.storeId)).status).toBe("active");
  });

  it("[SUB-FR-008] [SUB-FR-015] [SUB-SEC-004] passada a tolerância (5 dias), suspende, avisa lojista e admins e registra pelo sistema", async () => {
    // Arrange
    const admin = await personWith(t.db, "admin");
    const support = await personWith(t.db, "support");
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: new Date("2027-01-10T03:00:00Z"),
      status: "past_due",
      pastDueSince: new Date("2026-12-11T03:00:00Z"),
    });
    const before = await runBillingCycle(t.db, on("15"));

    // Act
    const result = await runBillingCycle(t.db, on("16"));

    // Assert
    expect(before.suspended).toBe(0);
    expect(result.suspended).toBe(1);
    expect((await storeRow(t.db, a.storeId)).status).toBe("suspended");
    const sent = await t.db.select().from(notices);
    expect(sent.find((n) => n.profileId === a.userId)).toMatchObject({
      kind: "store_suspended",
      data: {},
    });
    expect(sent.find((n) => n.profileId === admin.userId)).toMatchObject({
      kind: "store_suspended",
      data: { store: "Loja loja-a" },
    });
    expect(sent.some((n) => n.profileId === support.userId)).toBe(false);
    const [log] = await t.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "store.suspended"));
    expect(log).toMatchObject({ userId: null, entityId: a.storeId });
  });

  it("[SUB-NFR-002] rodar 2× não repete atraso, suspensão nem aviso", async () => {
    await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: DUE,
    });
    await runBillingCycle(t.db, on("07"));
    await runBillingCycle(t.db, on("11"));
    const again = await runBillingCycle(t.db, on("11"));
    await runBillingCycle(t.db, on("16"));
    const twice = await runBillingCycle(t.db, on("16"));

    expect(again.pastDue).toBe(0);
    expect(twice.suspended).toBe(0);
    const kinds = (await t.db.select().from(notices)).map((n) => n.kind);
    expect(kinds.filter((k) => k === "store_suspended")).toHaveLength(1);
  });
});
