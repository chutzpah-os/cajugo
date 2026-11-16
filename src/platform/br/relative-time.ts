import { brDate } from "./date";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "agora", "há 5 min", "há 2 h", "há 3 dias"; depois de uma semana, a data dd/mm/aaaa. */
export function relativeTime(date: Date, now: Date): string {
  const ms = Math.max(0, now.getTime() - date.getTime());
  if (ms < MIN) return "agora";
  if (ms < HOUR) return `há ${Math.floor(ms / MIN)} min`;
  if (ms < DAY) return `há ${Math.floor(ms / HOUR)} h`;
  const days = Math.floor(ms / DAY);
  if (days < 7) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  return brDate.format(date);
}
