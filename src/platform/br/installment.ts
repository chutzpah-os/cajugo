/**
 * Parcela estimada pela tabela Price (PRD §5.9, SHW-FR-003): estimativa, não simulação
 * de banco. Entrada e taxa em centésimos de ponto (20% = 2000; 1,79% = 179).
 */
export function estimatedInstallment(input: {
  priceCents: number;
  downBps: number;
  months: number;
  rateBps: number;
}): number {
  const financed = input.priceCents * (1 - input.downBps / 10000);
  if (financed <= 0) return 0;
  const rate = input.rateBps / 10000;
  if (rate === 0) return Math.round(financed / input.months);
  return Math.round((financed * rate) / (1 - (1 + rate) ** -input.months));
}
