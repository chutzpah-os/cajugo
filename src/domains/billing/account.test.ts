import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { invoices, sales } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car } from "@/domains/showcase/testing/fixtures";
import { accountView, invoiceView, runBillingCycle } from "./service";
import { configurePix, payingStore, personWith, PIX } from "./testing/fixtures";

const DUE = new Date("2026-12-10T03:00:00Z");
const DAY7 = new Date("2026-12-07T12:00:00Z");

describe("fatura e Conta do lojista", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
    await configurePix(t.db);
  });
  afterEach(() => t.close());

  async function storeWithInvoice(slug = "loja-a") {
    const a = await payingStore(t.db, slug, { billingDay: 10, nextDueAt: DUE });
    const v = await car(t.db, a.storeId, { make: "Fiat", model: "ARGO" });
    await t.db.insert(sales).values({
      vehicleId: v.id,
      storeId: a.storeId,
      finalPriceCents: 5_000_000,
      attribution: "other_partner",
      feeBps: 100,
      feeCents: 50_000,
      confirmedBy: a.userId,
      createdAt: new Date("2026-12-05T12:00:00Z"),
    });
    await runBillingCycle(t.db, DAY7);
    return a;
  }

  it("[SUB-FR-002] a fatura do mês mostra mensalidade, cada taxa (veículo, data, valor), crédito, total e vencimento", async () => {
    // Arrange
    const a = await storeWithInvoice();

    // Act
    const view = await invoiceView({ db: t.db, now: () => DAY7 }, a);

    // Assert
    expect(view.openTotalCents).toBe(60_000);
    expect(view.open).toHaveLength(1);
    expect(view.open[0]).toMatchObject({
      reference: "12/2026",
      membershipCents: 10_000,
      creditCents: 0,
      totalCents: 60_000,
      dueAt: DUE,
      status: "open",
      daysLate: 0,
      fees: [
        {
          vehicle: "Fiat ARGO",
          date: new Date("2026-12-05T12:00:00Z"),
          cents: 50_000,
        },
      ],
    });
  });

  it("[SUB-FR-016] com duas faturas abertas, mais antiga primeiro e o total em aberto", async () => {
    const a = await storeWithInvoice();
    await runBillingCycle(t.db, new Date("2027-01-07T12:00:00Z"));

    const view = await invoiceView(
      { db: t.db, now: () => new Date("2027-01-08T12:00:00Z") },
      a,
    );

    expect(view.open.map((i) => i.reference)).toEqual(["12/2026", "01/2027"]);
    expect(view.open[0]).toMatchObject({ status: "late", daysLate: 29 });
    expect(view.openTotalCents).toBe(70_000);
  });

  it("[SUB-FR-010] Conta: plano, status, valor, próxima cobrança, Como pagar, fatura do mês e anteriores", async () => {
    // Arrange
    const a = await storeWithInvoice();
    await t.db.insert(invoices).values({
      storeId: a.storeId,
      kind: "monthly",
      period: "2026-11",
      membershipCents: 10_000,
      totalCents: 10_000,
      dueAt: new Date("2026-11-10T03:00:00Z"),
      status: "paid",
      paidAt: new Date("2026-11-09T12:00:00Z"),
    });

    // Act
    const view = await accountView({ db: t.db, now: () => DAY7 }, a);

    // Assert
    expect(view).toMatchObject({
      plan: "Plano Catálogo",
      status: "active",
      statusLabel: "Ativa",
      membershipCents: 10_000,
      howToPay: { pixKey: PIX.key, beneficiary: PIX.beneficiary },
      current: { reference: "12/2026", totalCents: 60_000, status: "open" },
    });
    expect(view.nextDueAt?.toISOString()).toBe("2027-01-10T03:00:00.000Z");
    expect(view.howToPay.supportUrl).toMatch(/^https:\/\/wa\.me\//);
    expect(view.history).toEqual([
      {
        reference: "11/2026",
        totalCents: 10_000,
        status: "paid",
        statusLabel: "Paga",
      },
    ]);
  });

  it("[SUB-SEC-001] o lojista B só vê a fatura da própria loja", async () => {
    await storeWithInvoice("loja-a");
    const b = await payingStore(t.db, "loja-b", {
      billingDay: 20,
      nextDueAt: new Date("2026-12-20T03:00:00Z"),
    });

    const view = await invoiceView({ db: t.db, now: () => DAY7 }, b);
    const account = await accountView({ db: t.db, now: () => DAY7 }, b);

    expect(view.open).toEqual([]);
    expect(view.openTotalCents).toBe(0);
    expect(account.current).toBeNull();
    expect(account.history).toEqual([]);
  });

  it("[SUB-SEC-003] usuário da loja, suporte e vendedor não abrem a fatura nem a Conta", async () => {
    const a = await storeWithInvoice();
    for (const role of ["store_staff", "support", "seller"] as const) {
      const someone = await personWith(t.db, role, a.storeId);

      await expect(invoiceView({ db: t.db }, someone)).rejects.toMatchObject({
        status: 403,
      });
      await expect(accountView({ db: t.db }, someone)).rejects.toMatchObject({
        status: 403,
      });
    }
  });
});
