import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { invoices, payments } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { billingAlert, runBillingCycle } from "./service";
import { payingStore, personWith } from "./testing/fixtures";

const DUE = new Date("2026-12-10T03:00:00Z");
const on = (day: string) => new Date(`2026-12-${day}T12:00:00Z`);

describe("alerta da fatura no painel", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  const store = () =>
    payingStore(t.db, "loja-a", { billingDay: 10, nextDueAt: DUE });

  it("[SUB-FR-006] do dia 7 ao vencimento: 'vence em 10/12 · R$ 100'", async () => {
    // Arrange
    const a = await store();
    await runBillingCycle(t.db, on("07"));

    // Act
    const alert = await billingAlert({ db: t.db, now: () => on("08") }, a);

    // Assert
    expect(alert).toEqual({ kind: "due", dueAt: DUE, totalCents: 10_000 });
  });

  it("[SUB-FR-007] em atraso: dias de atraso e o valor", async () => {
    const a = await store();
    await runBillingCycle(t.db, on("07"));
    await runBillingCycle(t.db, on("11"));

    const alert = await billingAlert({ db: t.db, now: () => on("11") }, a);

    expect(alert).toEqual({ kind: "late", days: 1, totalCents: 10_000 });
  });

  it("[SUB-FR-009] suspensa: dias de atraso e valor; o usuário da loja vê o alerta sem valor nem pagar", async () => {
    const a = await store();
    await runBillingCycle(t.db, on("07"));
    await runBillingCycle(t.db, on("11"));
    await runBillingCycle(t.db, on("16"));
    const staff = await personWith(t.db, "store_staff", a.storeId);

    const owner = await billingAlert({ db: t.db, now: () => on("16") }, a);
    const forStaff = await billingAlert(
      { db: t.db, now: () => on("16") },
      staff,
    );

    expect(owner).toEqual({
      kind: "suspended",
      days: 6,
      totalCents: 10_000,
      canPay: true,
    });
    expect(forStaff).toEqual({
      kind: "suspended",
      days: 0,
      totalCents: 0,
      canPay: false,
    });
  });

  it("[SUB-FR-006] sem fatura aberta, paga ou com comprovante em análise: sem alerta de vencimento", async () => {
    const a = await store();
    const none = await billingAlert({ db: t.db, now: () => on("05") }, a);
    await runBillingCycle(t.db, on("07"));
    const [invoice] = await t.db.select().from(invoices);
    await t.db.insert(payments).values({
      invoiceId: invoice.id,
      storeId: a.storeId,
      paidCents: 10_000,
      amountCents: 10_000,
      status: "submitted",
      submittedBy: a.userId,
      submittedAt: on("08"),
    });

    const inReview = await billingAlert({ db: t.db, now: () => on("08") }, a);

    expect(none).toBeNull();
    expect(inReview).toBeNull();
  });
});
