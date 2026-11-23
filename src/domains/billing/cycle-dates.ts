import { saoPauloDate, saoPauloMidnight } from "./due-date";

/**
 * Datas do ciclo de cobrança (spec 011), sempre pelo dia em São Paulo: o vencimento
 * (`next_due_at`, `due_at`) é a meia-noite local do dia (`due-date.ts`).
 */

const DAY_MS = 86_400_000;
/** A fatura abre 3 dias antes do vencimento (SUB-FR-001, decidido no `/clarify`). */
export const OPEN_DAYS_BEFORE = 3;

/** Dia em São Paulo como número de dias desde 1970 (para contar e comparar). */
function dayNumber(at: Date): number {
  const [y, m, d] = saoPauloDate(at).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

/** Meia-noite em São Paulo do dia `n` (número de `dayNumber`). */
function midnightOf(n: number): Date {
  const date = new Date(n * DAY_MS);
  return saoPauloMidnight(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

/** Hoje é dia de abrir (ou já passou) a fatura que vence em `dueAt`. */
export const opensInvoice = (dueAt: Date, now: Date) =>
  dayNumber(now) >= dayNumber(dueAt) - OPEN_DAYS_BEFORE;

/** Vence de hoje até daqui a 3 dias ("Vencem em 3 dias", aviso do painel). */
export const dueSoon = (dueAt: Date, now: Date) =>
  opensInvoice(dueAt, now) && dayNumber(now) <= dayNumber(dueAt);

/** Período AAAA-MM da fatura, pelo mês do vencimento. */
export const invoicePeriod = (dueAt: Date) => saoPauloDate(dueAt).slice(0, 7);

/** Vencida: já é o dia seguinte ao vencimento (SUB-FR-007). */
export const isOverdue = (dueAt: Date, now: Date) =>
  dayNumber(now) > dayNumber(dueAt);

/** Começo do atraso: a meia-noite do dia seguinte ao vencimento. */
export const pastDueStart = (dueAt: Date) => midnightOf(dayNumber(dueAt) + 1);

/** Dias de atraso desde o vencimento ("em atraso há N dias"). */
export const daysLate = (dueAt: Date, now: Date) =>
  Math.max(0, dayNumber(now) - dayNumber(dueAt));

/** Passou a tolerância contada do começo do atraso (SUB-FR-008, SUB-FR-013). */
export const suspensionDue = (
  pastDueSince: Date,
  toleranceDays: number,
  now: Date,
) => dayNumber(now) >= dayNumber(pastDueSince) + toleranceDays;
