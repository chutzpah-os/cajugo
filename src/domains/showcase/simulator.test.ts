import { describe, expect, it } from "vitest";
import { simulateInstallment } from "@/platform/br/installment";
import { simulationMessage, simulatorOptions } from "./simulator";

const SETUP = {
  priceCents: 6_000_000,
  downBps: 2000,
  months: 48,
  rateBps: 179,
  whatsappNumber: "5579999990000",
  title: "Fiat Argo Drive 1.0 2022",
  url: "https://cajugo.test/v/abc-fiat-argo-2022-aracaju-se",
};

describe("simulador [14b]", () => {
  it("[BUY-FR-001] opções fixas, com as regras já incluídas e marcadas", () => {
    expect(simulatorOptions(SETUP)).toEqual({
      downs: [0, 2000, 3000, 5000],
      months: [24, 36, 48, 60],
    });
    // Regras fora da lista entram nela, em ordem (D2)
    expect(simulatorOptions({ ...SETUP, downBps: 2500, months: 72 })).toEqual({
      downs: [0, 2000, 2500, 3000, 5000],
      months: [24, 36, 48, 60, 72],
    });
  });

  it("[BUY-FR-003] mensagem pronta com veículo, link, entrada, prazo e parcela", () => {
    // Arrange
    const choice = { downBps: 3000, months: 36 };
    const sim = simulateInstallment({ ...SETUP, ...choice });

    // Act
    const text = simulationMessage(SETUP, choice, sim);

    // Assert
    expect(text).toBe(
      "Olá! Simulei na CajuGo o Fiat Argo Drive 1.0 2022 (https://cajugo.test/v/abc-fiat-argo-2022-aracaju-se): entrada de 30% (R$ 18.000,00) e 36x de R$ 1.592,72. É uma estimativa; pode me passar as condições de financiamento?",
    );
  });

  it("[BUY-FR-003] entrada com fração e sem entrada", () => {
    const at = (downBps: number) =>
      simulationMessage(
        SETUP,
        { downBps, months: 24 },
        simulateInstallment({ ...SETUP, downBps, months: 24 }),
      );
    expect(at(1750)).toContain("entrada de 17,5% (R$ 10.500,00)");
    expect(at(0)).toContain("sem entrada e 24x de");
  });
});
