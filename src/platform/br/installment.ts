type InstallmentInput = {
  priceCents: number;
  /** Entrada em centésimos de ponto (20% = 2000). */
  downBps: number;
  months: number;
  /** Taxa ao mês em centésimos de ponto (1,79% = 179). */
  rateBps: number;
};

export type Simulation = {
  downCents: number;
  financedCents: number;
  installmentCents: number;
  /** Entrada + todas as parcelas. */
  totalCents: number;
};

/**
 * Simulação pela tabela Price (PRD §5.9, BUY-FR-002): estimativa, não simulação de
 * banco. Uma conta só para o simulador [14b] e a parcela do card (BUY-NFR-003).
 */
export function simulateInstallment(input: InstallmentInput): Simulation {
  const downCents = Math.round((input.priceCents * input.downBps) / 10000);
  const financedCents = Math.max(input.priceCents - downCents, 0);
  const rate = input.rateBps / 10000;
  const installmentCents =
    financedCents === 0
      ? 0
      : rate === 0
        ? Math.round(financedCents / input.months)
        : Math.round(
            (financedCents * rate) / (1 - (1 + rate) ** -input.months),
          );
  return {
    downCents,
    financedCents,
    installmentCents,
    totalCents: downCents + installmentCents * input.months,
  };
}

/** Parcela estimada do card e da página do veículo (SHW-FR-003). */
export function estimatedInstallment(input: InstallmentInput): number {
  return simulateInstallment(input).installmentCents;
}
