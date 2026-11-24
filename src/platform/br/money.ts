/** Dinheiro em centavos (inteiro) ↔ texto em reais na tela (CLAUDE.md: convenções). */

/** Centavos → texto em reais (5000 → "50,00"). */
export function centsToReais(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Centavos → "R$ 50,00" (espaço comum, para texto e mensagens de WhatsApp). */
export function brl(cents: number): string {
  return `R$ ${centsToReais(cents)}`;
}

/** Preço de veículo sem centavos ("R$ 189.900"), como no card do design (DESIGN.md §2.2). */
export function brlWhole(cents: number): string {
  return `R$ ${Math.round(cents / 100).toLocaleString("pt-BR")}`;
}

/** Texto em reais → centavos ("1.234,56" → 123456; "100" → 10000). Inválido → NaN. */
export function reaisToCents(text: string): number {
  const t = text.trim().replace(/^R\$\s*/, "");
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return t === "" || Number.isNaN(n) ? NaN : Math.round(n * 100);
}
