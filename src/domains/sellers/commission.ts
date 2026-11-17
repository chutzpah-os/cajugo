/**
 * Comissão do vendedor (PRD §5.7, SEL-FR-008): `pct` em pontos-base sobre o preço,
 * `fixed` em centavos. Calculada só no servidor (SEL-SEC-008). Sem regra ou sem
 * preço: nenhuma.
 */
export function commissionFor(
  rule: { type: "pct" | "fixed" | null; value: number | null },
  priceCents: number | null,
): number | null {
  if (!rule.type || rule.value === null) return null;
  if (rule.type === "fixed") return rule.value;
  return priceCents === null
    ? null
    : Math.round((priceCents * rule.value) / 10_000);
}

/** Taxa CajuGo (PRD §5.7): pontos-base das regras sobre o valor final. */
export const feeFor = (finalPriceCents: number, bps: number): number =>
  Math.round((finalPriceCents * bps) / 10_000);
