import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { invoices, payments, profiles, stores } from "./schema";
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

  it("[PIX-SEC-007] uma só fatura da 1ª mensalidade por loja", async () => {
    await firstInvoice();

    await expect(firstInvoice()).rejects.toThrow();
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
});
