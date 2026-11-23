import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  activityLog,
  billingCredits,
  invoices,
  notices,
  sales,
} from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car } from "@/domains/showcase/testing/fixtures";
import { saoPauloDate } from "./due-date";
import { runBillingCycle } from "./service";
import { payingStore, storeRow } from "./testing/fixtures";

// Vencimento dia 10/12 em São Paulo; a fatura abre no dia 7.
const DUE = new Date("2026-12-10T03:00:00Z");
const DAY7 = new Date("2026-12-07T12:00:00Z");

describe("ciclo de cobrança: abertura da fatura mensal", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  async function sale(
    storeId: string,
    ownerId: string,
    set: Partial<typeof sales.$inferInsert> = {},
  ) {
    const v = await car(t.db, storeId);
    const [row] = await t.db
      .insert(sales)
      .values({
        vehicleId: v.id,
        storeId,
        finalPriceCents: 5_000_000,
        attribution: "other_partner",
        feeBps: 100,
        feeCents: 50_000,
        confirmedBy: ownerId,
        createdAt: new Date("2026-12-05T12:00:00Z"),
        ...set,
      })
      .returning();
    return row;
  }

  it("[SUB-FR-001] abre no dia 7 com mensalidade, taxa, crédito R$ 0 e total, vencendo dia 10", async () => {
    // Arrange
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: DUE,
    });
    const s = await sale(a.storeId, a.userId);

    // Act
    const result = await runBillingCycle(t.db, DAY7);

    // Assert
    expect(result.opened).toBe(1);
    const [invoice] = await t.db.select().from(invoices);
    expect(invoice).toMatchObject({
      kind: "monthly",
      period: "2026-12",
      membershipCents: 10_000,
      feesCents: 50_000,
      creditCents: 0,
      totalCents: 60_000,
      dueAt: DUE,
      status: "open",
    });
    const [linked] = await t.db.select().from(sales).where(eq(sales.id, s.id));
    expect(linked.invoiceId).toBe(invoice.id);
    expect(saoPauloDate((await storeRow(t.db, a.storeId)).nextDueAt!)).toBe(
      "2027-01-10",
    );
  });

  it("[SUB-FR-001] antes do dia 7 não abre; loja ainda sem 1º pagamento nunca abre", async () => {
    await payingStore(t.db, "loja-a", { billingDay: 10, nextDueAt: DUE });

    const result = await runBillingCycle(
      t.db,
      new Date("2026-12-06T12:00:00Z"),
    );

    expect(result.opened).toBe(0);
    expect(await t.db.select().from(invoices)).toHaveLength(0);
  });

  it("[SUB-FR-014] venda desfeita ou já faturada não entra; sem taxa (venda da loja) também não", async () => {
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: DUE,
    });
    await sale(a.storeId, a.userId, { canceledAt: new Date("2026-12-06") });
    await sale(a.storeId, a.userId, {
      attribution: "store",
      feeBps: null,
      feeCents: null,
    });

    await runBillingCycle(t.db, DAY7);

    const [invoice] = await t.db.select().from(invoices);
    expect(invoice.feesCents).toBe(0);
    expect(invoice.totalCents).toBe(10_000);
  });

  it("[SUB-FR-014] taxa entra uma vez só: a fatura seguinte não repete", async () => {
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: DUE,
    });
    await sale(a.storeId, a.userId);
    await runBillingCycle(t.db, DAY7);

    await runBillingCycle(t.db, new Date("2027-01-07T12:00:00Z"));

    const rows = await t.db
      .select()
      .from(invoices)
      .where(eq(invoices.period, "2027-01"));
    expect(rows[0].feesCents).toBe(0);
  });

  it("[SUB-FR-001] créditos abatem até o total; a sobra fica para a próxima; total 0 nasce paga", async () => {
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: DUE,
    });
    await t.db.insert(billingCredits).values({
      storeId: a.storeId,
      kind: "overpayment",
      amountCents: 15_000,
    });

    await runBillingCycle(t.db, DAY7);

    const [invoice] = await t.db.select().from(invoices);
    expect(invoice).toMatchObject({
      creditCents: 10_000,
      totalCents: 0,
      status: "paid",
    });
    const open = (await t.db.select().from(billingCredits)).filter(
      (c) => !c.appliedInvoiceId,
    );
    expect(open.map((c) => c.amountCents)).toEqual([5_000]);
  });

  it("[SUB-FR-006] avisa o lojista: 'Sua fatura vence em 10/12 · R$ 600,00'", async () => {
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: DUE,
    });
    await sale(a.storeId, a.userId);

    await runBillingCycle(t.db, DAY7);

    const [notice] = await t.db
      .select()
      .from(notices)
      .where(eq(notices.profileId, a.userId));
    expect(notice.kind).toBe("invoice_due");
    expect(notice.data).toEqual({ due: "10/12", totalCents: 60_000 });
  });

  it("[SUB-NFR-002] [SUB-SEC-004] rodar 2× no mesmo dia não repete fatura nem aviso; abertura no registro", async () => {
    await payingStore(t.db, "loja-a", { billingDay: 10, nextDueAt: DUE });
    await payingStore(t.db, "loja-b", {
      billingDay: 8,
      nextDueAt: new Date("2026-12-08T03:00:00Z"),
      status: "past_due",
    });

    const first = await runBillingCycle(t.db, DAY7);
    const second = await runBillingCycle(t.db, DAY7);

    expect(first.opened).toBe(2);
    expect(second.opened).toBe(0);
    expect(await t.db.select().from(invoices)).toHaveLength(2);
    expect(await t.db.select().from(notices)).toHaveLength(2);
    const log = await t.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "invoice.opened"));
    expect(log).toHaveLength(2);
    expect(log[0].userId).toBeNull();
  });
});
