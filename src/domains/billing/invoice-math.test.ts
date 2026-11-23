import { describe, expect, it } from "vitest";
import { invoiceTotals, mrrCents, settleOldestFirst } from "./invoice-math";

describe("total da fatura", () => {
  it("[SUB-FR-001] mensalidade + taxas, sem crédito", () => {
    // Arrange
    const input = { membershipCents: 10000, fees: [50000], credits: [] };

    // Act
    const totals = invoiceTotals(input);

    // Assert
    expect(totals).toEqual({
      feesCents: 50000,
      creditCents: 0,
      totalCents: 60000,
      applied: [],
      split: null,
    });
  });

  it("[SUB-FR-001] créditos abatem até o subtotal; o que passa fica para a próxima", () => {
    const totals = invoiceTotals({
      membershipCents: 10000,
      fees: [],
      credits: [
        { id: "a", amountCents: 3000 },
        { id: "b", amountCents: 9000 },
      ],
    });

    expect(totals.totalCents).toBe(0);
    expect(totals.creditCents).toBe(10000);
    expect(totals.applied).toEqual(["a"]);
    expect(totals.split).toEqual({ id: "b", usedCents: 7000, leftCents: 2000 });
  });

  it("[SUB-FR-001] crédito exato fecha a fatura em zero, sem sobra", () => {
    const totals = invoiceTotals({
      membershipCents: 10000,
      fees: [500],
      credits: [{ id: "a", amountCents: 10500 }],
    });

    expect(totals).toMatchObject({
      totalCents: 0,
      applied: ["a"],
      split: null,
    });
  });
});

describe("quitação da mais antiga", () => {
  const open = [
    { id: "nov", totalCents: 10000 },
    { id: "dez", totalCents: 10000 },
  ];

  it("[SUB-FR-016] o valor do total em aberto quita todas", () => {
    expect(settleOldestFirst(20000, open)).toEqual({
      paid: ["nov", "dez"],
      surplusCents: 0,
    });
  });

  it("[SUB-FR-016] valor de uma fatura quita só a mais antiga", () => {
    expect(settleOldestFirst(10000, open)).toEqual({
      paid: ["nov"],
      surplusCents: 0,
    });
  });

  it("[SUB-FR-017] sobra vira crédito; só faturas inteiras", () => {
    expect(settleOldestFirst(15000, open)).toEqual({
      paid: ["nov"],
      surplusCents: 5000,
    });
    expect(settleOldestFirst(65000, [{ id: "a", totalCents: 60000 }])).toEqual({
      paid: ["a"],
      surplusCents: 5000,
    });
  });

  it("[SUB-FR-017] valor menor que a mais antiga não quita nada", () => {
    expect(
      settleOldestFirst(55000, [{ id: "a", totalCents: 60000 }]),
    ).toBeNull();
  });
});

describe("MRR", () => {
  it("[SUB-FR-011] lojas que pagam × mensalidade vigente", () => {
    expect(mrrCents({ active: 3, past_due: 1, suspended: 1 }, 10000)).toBe(
      50000,
    );
  });
});
