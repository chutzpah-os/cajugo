/**
 * Contas da fatura mensal (spec 011), sem banco: o serviço lê as linhas e grava o
 * resultado. Tudo em centavos.
 */

export type CreditRow = { id: string; amountCents: number };

export type InvoiceTotals = {
  feesCents: number;
  creditCents: number;
  totalCents: number;
  /** Créditos abatidos inteiros. */
  applied: string[];
  /** Crédito abatido em parte: o resto fica disponível para a próxima fatura. */
  split: { id: string; usedCents: number; leftCents: number } | null;
};

/**
 * Mensalidade + taxas − créditos (do mais antigo), até o subtotal: a fatura nunca
 * fica negativa e o crédito que passa fica para a seguinte (SUB-FR-001).
 */
export function invoiceTotals(input: {
  membershipCents: number;
  fees: number[];
  credits: CreditRow[];
}): InvoiceTotals {
  const feesCents = input.fees.reduce((sum, fee) => sum + fee, 0);
  const subtotal = input.membershipCents + feesCents;
  let creditCents = 0;
  const applied: string[] = [];
  let split: InvoiceTotals["split"] = null;
  for (const credit of input.credits) {
    const room = subtotal - creditCents;
    if (room <= 0) break;
    if (credit.amountCents <= room) {
      applied.push(credit.id);
      creditCents += credit.amountCents;
    } else {
      split = {
        id: credit.id,
        usedCents: room,
        leftCents: credit.amountCents - room,
      };
      creditCents += room;
    }
  }
  return {
    feesCents,
    creditCents,
    totalCents: subtotal - creditCents,
    applied,
    split,
  };
}

/**
 * Quitação da mais antiga para a mais nova (D3): o valor paga faturas inteiras e a
 * sobra vira crédito (SUB-FR-016, SUB-FR-017). Menor que a mais antiga → `null` (o
 * admin recusa com o valor faltante).
 */
export function settleOldestFirst(
  amountCents: number,
  openOldestFirst: { id: string; totalCents: number }[],
): { paid: string[]; surplusCents: number } | null {
  let left = amountCents;
  const paid: string[] = [];
  for (const invoice of openOldestFirst) {
    if (invoice.totalCents > left) break;
    paid.push(invoice.id);
    left -= invoice.totalCents;
  }
  if (!paid.length && openOldestFirst.length) return null;
  return { paid, surplusCents: left };
}

/** MRR [4b]: lojas em dia, em atraso e suspensas × mensalidade vigente (SUB-FR-011). */
export function mrrCents(
  counts: { active: number; past_due: number; suspended: number },
  membershipCents: number,
): number {
  return (counts.active + counts.past_due + counts.suspended) * membershipCents;
}
