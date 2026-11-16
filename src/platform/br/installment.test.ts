import { describe, expect, it } from "vitest";
import { estimatedInstallment, simulateInstallment } from "./installment";

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

  it("[BUY-FR-002] simulação: entrada, financiado, parcela e total pagos", () => {
    // Arrange: R$ 60.000, entrada 30%, 36x, 1,79% a.m.
    const input = {
      priceCents: 6_000_000,
      downBps: 3000,
      months: 36,
      rateBps: 179,
    };

    // Act
    const s = simulateInstallment(input);

    // Assert
    expect(s).toEqual({
      downCents: 1_800_000,
      financedCents: 4_200_000,
      installmentCents: 159_272,
      totalCents: 1_800_000 + 159_272 * 36,
    });
  });

  it("[BUY-FR-002] entrada de 50% e sem juros: total igual ao preço", () => {
    expect(
      simulateInstallment({
        priceCents: 4_800_000,
        downBps: 5000,
        months: 24,
        rateBps: 0,
      }),
    ).toEqual({
      downCents: 2_400_000,
      financedCents: 2_400_000,
      installmentCents: 100_000,
      totalCents: 4_800_000,
    });
  });

  it("[BUY-NFR-003] o card e o simulador dão a mesma parcela para as mesmas regras", () => {
    for (const downBps of [0, 2000, 2500, 3000, 5000])
      for (const months of [24, 36, 48, 60, 72]) {
        const input = { priceCents: 7_632_000, downBps, months, rateBps: 179 };
        expect(estimatedInstallment(input)).toBe(
          simulateInstallment(input).installmentCents,
        );
      }
  });
});
