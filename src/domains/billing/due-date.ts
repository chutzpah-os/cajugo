/**
 * Vencimento da assinatura (PRD §5.1, PIX-FR-009): no dia do mês da 1ª confirmação,
 * contado em São Paulo; se o mês não tem esse dia, vence no último dia do mês. O
 * vencimento é o começo do dia em São Paulo. A spec 011 usa as mesmas funções.
 */

const ZONE = "America/Sao_Paulo";

const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data em São Paulo, `AAAA-MM-DD`. */
export function saoPauloDate(at: Date): string {
  return parts.format(at);
}

function ymd(at: Date): [number, number, number] {
  const [y, m, d] = saoPauloDate(at).split("-").map(Number);
  return [y, m, d];
}

const daysInMonth = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Meia-noite de `y-m-d` em São Paulo, com o fuso daquela data. */
function saoPauloMidnight(y: number, m: number, d: number): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, 12));
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    timeZoneName: "longOffset",
  })
    .formatToParts(guess)
    .find((p) => p.type === "timeZoneName")!
    .value.replace("GMT", "");
  return new Date(
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00${offset || "+00:00"}`,
  );
}

/** Mesmo `billingDay` no mês seguinte ao de `after` (ou o último dia desse mês). */
export function nextDueAfter(after: Date, billingDay: number): Date {
  const [y, m] = ymd(after);
  const [ny, nm] = m === 12 ? [y + 1, 1] : [y, m + 1];
  return saoPauloMidnight(ny, nm, Math.min(billingDay, daysInMonth(ny, nm)));
}

/** Na 1ª confirmação: o dia do vencimento e o próximo vencimento. */
export function firstDueDate(confirmedAt: Date): {
  billingDay: number;
  nextDueAt: Date;
} {
  const billingDay = ymd(confirmedAt)[2];
  return { billingDay, nextDueAt: nextDueAfter(confirmedAt, billingDay) };
}

/** Começo do mês (em São Paulo) da data `at`, para totais "no mês". */
export function saoPauloMonthStart(at: Date): Date {
  const [y, m] = ymd(at);
  return saoPauloMidnight(y, m, 1);
}
