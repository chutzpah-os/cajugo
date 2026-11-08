import { describe, expect, it } from "vitest";
import { firstDueDate, nextDueAfter, saoPauloDate } from "./due-date";

describe("vencimento da assinatura", () => {
  it("[PIX-FR-009] confirmada em 26/11, vence todo dia 26 a partir de 26/12", () => {
    const { billingDay, nextDueAt } = firstDueDate(
      new Date("2026-11-26T15:00:00Z"),
    );

    expect(billingDay).toBe(26);
    expect(saoPauloDate(nextDueAt)).toBe("2026-12-26");
  });

  it("[PIX-FR-009] dia 31: vence no último dia do mês que não tem esse dia e volta ao 31", () => {
    const { billingDay, nextDueAt } = firstDueDate(
      new Date("2027-01-31T15:00:00Z"),
    );
    const march = nextDueAfter(nextDueAt, billingDay);

    expect(billingDay).toBe(31);
    expect(saoPauloDate(nextDueAt)).toBe("2027-02-28");
    expect(saoPauloDate(march)).toBe("2027-03-31");
  });

  it("[PIX-FR-009] ano bissexto: 31/01/2028 vence em 29/02/2028", () => {
    const { nextDueAt } = firstDueDate(new Date("2028-01-31T15:00:00Z"));

    expect(saoPauloDate(nextDueAt)).toBe("2028-02-29");
  });

  it("[PIX-FR-009] o dia é o de São Paulo: 01h UTC de 27/11 ainda é 26/11 lá", () => {
    const { billingDay, nextDueAt } = firstDueDate(
      new Date("2026-11-27T01:00:00Z"),
    );

    expect(billingDay).toBe(26);
    expect(saoPauloDate(nextDueAt)).toBe("2026-12-26");
    // O vencimento é o começo do dia em São Paulo.
    expect(nextDueAt.toISOString()).toBe("2026-12-26T03:00:00.000Z");
  });

  it("[PIX-FR-009] dezembro vira janeiro do ano seguinte", () => {
    const { nextDueAt } = firstDueDate(new Date("2026-12-10T15:00:00Z"));

    expect(saoPauloDate(nextDueAt)).toBe("2027-01-10");
  });
});
