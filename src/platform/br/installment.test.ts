import { describe, expect, it } from "vitest";
import { estimatedInstallment } from "./installment";

describe("parcela estimada", () => {
  it("[SHW-FR-003] calcula pela tabela Price sobre o valor financiado, em centavos", () => {
    // R$ 80.000, entrada 20%, 48x, 1,79% a.m.: financia R$ 64.000
    expect(
      estimatedInstallment({
        priceCents: 8000000,
        downBps: 2000,
        months: 48,
        rateBps: 179,
      }),
    ).toBe(199836);
  });

  it("[SHW-FR-003] sem juros, divide; entrada de 100% não tem parcela", () => {
    expect(
      estimatedInstallment({
        priceCents: 480000,
        downBps: 0,
        months: 48,
        rateBps: 0,
      }),
    ).toBe(10000);
    expect(
      estimatedInstallment({
        priceCents: 480000,
        downBps: 10000,
        months: 48,
        rateBps: 179,
      }),
    ).toBe(0);
  });
});
