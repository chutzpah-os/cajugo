import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { billingCredits, invoices } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { creditView } from "./service";
import { payingStore, personWith } from "./testing/fixtures";

describe("crédito do lojista [8e]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  const store = (slug: string) =>
    payingStore(t.db, slug, {
      billingDay: 10,
      nextDueAt: new Date("2026-12-10T03:00:00Z"),
    });

  it("[IND-FR-009] crédito disponível, próxima fatura com o abatimento e as movimentações", async () => {
    // Arrange
    const r = await store("loja-r");
    const [inv] = await t.db
      .insert(invoices)
      .values({
        storeId: r.storeId,
        kind: "monthly",
        period: "2026-11",
        membershipCents: 10_000,
        creditCents: 1_000,
        totalCents: 9_000,
        dueAt: new Date("2026-11-10T03:00:00Z"),
        status: "paid",
      })
      .returning();
    await t.db.insert(billingCredits).values([
      {
        storeId: r.storeId,
        kind: "referral",
        amountCents: 3_000,
        createdAt: new Date("2026-11-20T12:00:00Z"),
      },
      {
        storeId: r.storeId,
        kind: "overpayment",
        amountCents: 1_000,
        appliedInvoiceId: inv.id,
        createdAt: new Date("2026-11-01T12:00:00Z"),
      },
    ]);

    // Act
    const view = await creditView({ db: t.db }, r);

    // Assert
    expect(view.availableCents).toBe(3_000);
    expect(view.nextInvoice).toEqual({
      membershipCents: 10_000,
      creditCents: 3_000,
      totalCents: 7_000,
    });
    expect(view.movements).toEqual([
      {
        label: "Indicação",
        amountCents: 3_000,
        date: new Date("2026-11-20T12:00:00Z"),
        appliedIn: null,
      },
      {
        label: "Sobra de pagamento",
        amountCents: 1_000,
        date: new Date("2026-11-01T12:00:00Z"),
        appliedIn: "11/2026",
      },
    ]);
  });

  it("[IND-SEC-001] cada loja vê só o próprio crédito; usuário da loja não abre", async () => {
    const a = await store("loja-a");
    const b = await store("loja-b");
    await t.db
      .insert(billingCredits)
      .values({ storeId: a.storeId, kind: "referral", amountCents: 3_000 });
    const staff = await personWith(t.db, "store_staff", a.storeId);

    expect((await creditView({ db: t.db }, b)).availableCents).toBe(0);
    await expect(creditView({ db: t.db }, staff)).rejects.toMatchObject({
      status: 403,
    });
  });
});
