/** Preço × referência FIPE em texto (VEH-FR-007): "4,6% abaixo", "5% acima". */
export function priceVsFipe(
  priceCents: number | null,
  fipeCents: number | null,
): string | null {
  if (!priceCents || !fipeCents) return null;
  const pct =
    Math.round((Math.abs(priceCents - fipeCents) / fipeCents) * 1000) / 10;
  if (pct === 0) return "igual à FIPE";
  const text = pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${text}% ${priceCents < fipeCents ? "abaixo" : "acima"}`;
}
