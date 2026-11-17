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

/** Texto da tela → valor guardado: "2,5" % → 250 bps; "1.500,00" → 150000 centavos. */
export function commissionFromText(
  type: "pct" | "fixed",
  text: string,
): number {
  const n = Number(text.trim().replace(/\./g, "").replace(",", "."));
  if (!text.trim() || !Number.isFinite(n)) return Number.NaN;
  return Math.round(n * 100);
}

/** Valor guardado → texto da tela, sem símbolo: 250 bps → "2,5"; 150000 → "1.500,00". */
export function commissionToText(type: "pct" | "fixed", value: number): string {
  return type === "pct"
    ? (value / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })
    : (value / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}
