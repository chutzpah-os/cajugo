import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  billingCredits,
  invoices,
  notices,
  payments,
  profiles,
  stores,
} from "./schema";
import { createTestDb } from "./testing/test-db";
import { uuidv7 } from "./uuid";

describe("faturas e pagamentos no banco", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let storeId: string;
  let ownerId: string;

  beforeEach(async () => {
    t = await createTestDb();
    ownerId = uuidv7();
    await t.db
      .insert(profiles)
      .values({ id: ownerId, email: "dono@x.com", name: "Dono" });
    [{ id: storeId }] = await t.db
      .insert(stores)
      .values({
        name: "Loja",
        slug: "loja",
        city: "Aracaju",
        state: "SE",
        whatsapp: "5579981360206",
        ownerId,
      })
      .returning({ id: stores.id });
  });
  afterEach(() => t.close());

  const firstInvoice = () =>
    t.db
      .insert(invoices)
      .values({
        storeId,
        kind: "first",
        membershipCents: 10000,
        totalCents: 10000,
        dueAt: new Date(),
      })
      .returning({ id: invoices.id });

  const submitted = (invoiceId: string) =>
    t.db.insert(payments).values({
      invoiceId,
      storeId,
      paidCents: 10000,
      amountCents: 10000,
      status: "submitted",
      submittedBy: ownerId,
      submittedAt: new Date(),
    });

  it("[PIX-SEC-007] [CAN-FR-006] uma só 1ª mensalidade aberta por loja; paga, quem reassina abre outra", async () => {
    const [{ id }] = await firstInvoice();

    await expect(firstInvoice()).rejects.toThrow();
    await t.db
      .update(invoices)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(invoices.id, id));
    await expect(firstInvoice()).resolves.toHaveLength(1);
  });

  it("[PIX-FR-006] [PIX-SEC-007] um só comprovante em análise por fatura; recusado não conta", async () => {
    // Arrange
    const [{ id }] = await firstInvoice();
    await submitted(id);

    // Act + Assert
    await expect(submitted(id)).rejects.toThrow();
    await t.db.update(payments).set({ status: "rejected" });
    await expect(submitted(id)).resolves.toBeDefined();
  });

  it("[PIX-SEC-007] no máximo um pagamento confirmado por fatura", async () => {
    const [{ id }] = await firstInvoice();
    const confirmed = () =>
      t.db.insert(payments).values({
        invoiceId: id,
        storeId,
        amountCents: 10000,
        status: "confirmed",
        submittedBy: ownerId,
        submittedAt: new Date(),
      });
    await confirmed();

    await expect(confirmed()).rejects.toThrow();
  });

  it("[SUB-FR-017] [SUB-FR-014] crédito da loja nasce disponível e guarda a fatura em que foi abatido", async () => {
    const [{ id: invoiceId }] = await firstInvoice();

    const [credit] = await t.db
      .insert(billingCredits)
      .values({ storeId, kind: "overpayment", amountCents: 5000 })
      .returning();
    await t.db
      .update(billingCredits)
      .set({ appliedInvoiceId: invoiceId })
      .where(eq(billingCredits.id, credit.id));

    const [row] = await t.db.select().from(billingCredits);
    expect(credit.appliedInvoiceId).toBeNull();
    expect(row.appliedInvoiceId).toBe(invoiceId);
  });

  it("[SUB-FR-007] [SUB-FR-015] loja guarda desde quando está em atraso; avisos do ciclo existem", async () => {
    const since = new Date("2026-12-11T03:00:00Z");

    await t.db
      .update(stores)
      .set({ status: "past_due", pastDueSince: since })
      .where(eq(stores.id, storeId));
    for (const kind of [
      "invoice_due",
      "store_suspended",
      "store_reactivated",
    ] as const)
      await t.db.insert(notices).values({ profileId: ownerId, kind, data: {} });

    const [store] = await t.db.select().from(stores);
    expect(store.pastDueSince).toEqual(since);
    expect(await t.db.select().from(notices)).toHaveLength(3);
  });

  it("[CAN-FR-002] [CAN-FR-005] loja guarda o cancelamento (pedido, motivo, fim, cancelada); avisos do cancelamento existem", async () => {
    const at = new Date("2026-12-01T12:00:00Z");
    const until = new Date("2026-12-10T03:00:00Z");

    await t.db
      .update(stores)
      .set({
        status: "cancel_scheduled",
        cancelRequestedAt: at,
        cancelReason: "Vou parar de vender",
        activeUntil: until,
        canceledAt: until,
      })
      .where(eq(stores.id, storeId));
    for (const kind of [
      "cancel_scheduled",
      "cancel_undone",
      "store_canceled",
      "plan_changed",
    ] as const)
      await t.db.insert(notices).values({ profileId: ownerId, kind, data: {} });

    const [store] = await t.db.select().from(stores);
    expect(store).toMatchObject({
      cancelRequestedAt: at,
      cancelReason: "Vou parar de vender",
      activeUntil: until,
      canceledAt: until,
    });
    expect(await t.db.select().from(notices)).toHaveLength(4);
  });
});
