import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { billingCredits, invoices, sales } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car } from "@/domains/showcase/testing/fixtures";
import { refundSaleFee, runBillingCycle } from "./service";
import { payingStore } from "./testing/fixtures";

const DUE = new Date("2026-12-10T03:00:00Z");
const DAY7 = new Date("2026-12-07T12:00:00Z");
const DAY8 = new Date("2026-12-08T12:00:00Z");

describe("taxa CajuGo de venda desfeita", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  async function withSale() {
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: DUE,
    });
    const v = await car(t.db, a.storeId);
    const [sale] = await t.db
      .insert(sales)
      .values({
        vehicleId: v.id,
        storeId: a.storeId,
        finalPriceCents: 5_000_000,
        attribution: "other_partner",
        feeBps: 100,
        feeCents: 50_000,
        confirmedBy: a.userId,
        createdAt: new Date("2026-12-05T12:00:00Z"),
      })
      .returning();
    return { a, sale };
  }

  const cancel = (id: string) =>
    t.db.update(sales).set({ canceledAt: DAY8 }).where(eq(sales.id, id));

  it("[SUB-FR-014] desfeita antes de entrar numa fatura: nada a devolver", async () => {
    // Arrange
    const { sale } = await withSale();
    await cancel(sale.id);

    // Act
    await refundSaleFee(t.db, sale.id, DAY8);
    await runBillingCycle(t.db, DAY7);

    // Assert
    const [invoice] = await t.db.select().from(invoices);
    expect(invoice.feesCents).toBe(0);
    expect(await t.db.select().from(billingCredits)).toHaveLength(0);
  });

  it("[SUB-FR-014] desfeita com a fatura aberta: a taxa sai e o total volta a ser só a mensalidade", async () => {
    const { sale } = await withSale();
    await runBillingCycle(t.db, DAY7);
    await cancel(sale.id);

    await refundSaleFee(t.db, sale.id, DAY8);

    const [invoice] = await t.db.select().from(invoices);
    expect(invoice).toMatchObject({
      feesCents: 0,
      totalCents: 10_000,
      status: "open",
    });
    const [row] = await t.db.select().from(sales);
    expect(row.invoiceId).toBeNull();
  });

  it("[SUB-FR-014] desfeita com a fatura paga: a taxa volta como crédito na próxima fatura", async () => {
    const { a, sale } = await withSale();
    await runBillingCycle(t.db, DAY7);
    await t.db.update(invoices).set({ status: "paid", paidAt: DAY8 });
    await cancel(sale.id);

    await refundSaleFee(t.db, sale.id, DAY8);
    const [credit] = await t.db.select().from(billingCredits);
    await runBillingCycle(t.db, new Date("2027-01-07T12:00:00Z"));

    expect(credit).toMatchObject({
      storeId: a.storeId,
      kind: "fee_refund",
      amountCents: 50_000,
      sourceId: sale.id,
    });
    const [jan] = await t.db
      .select()
      .from(invoices)
      .where(eq(invoices.period, "2027-01"));
    expect(jan).toMatchObject({ creditCents: 10_000, totalCents: 0 });
  });
});
