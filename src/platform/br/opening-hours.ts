/**
 * "Aberta agora" a partir do horário semanal da loja (STO-FR-009), no fuso de São
 * Paulo. Função pura: roda no navegador, porque as páginas públicas ficam em cache.
 */
type Range = { from: string; to: string };
type Day = { closed: true } | { ranges: Range[] };
export type WeekHours = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  Day
>;

const ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const NAME: Record<(typeof ORDER)[number], string> = {
  sun: "domingo",
  mon: "segunda",
  tue: "terça",
  wed: "quarta",
  thu: "quinta",
  fri: "sexta",
  sat: "sábado",
};

/** "08:00" → "8h"; "08:30" → "8h30". */
const hour = (t: string) => {
  const [h, m] = t.split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
};

function saoPauloNow(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    get("weekday"),
  );
  return { dayIndex, time: `${get("hour")}:${get("minute")}` };
}

const rangesOf = (d: Day | undefined) =>
  d && "ranges" in d ? d.ranges : ([] as Range[]);

/** `{ open, label }`, ou `null` sem horário cadastrado. */
export function openingStatus(
  hours: WeekHours | null,
  now: Date,
): { open: boolean; label: string } | null {
  if (!hours) return null;
  const { dayIndex, time } = saoPauloNow(now);
  const today = rangesOf(hours[ORDER[dayIndex]]);
  const current = today.find((r) => r.from <= time && time < r.to);
  if (current)
    return { open: true, label: `Aberta agora · fecha às ${hour(current.to)}` };
  const laterToday = today.find((r) => r.from > time);
  if (laterToday)
    return {
      open: false,
      label: `Fechada · abre hoje às ${hour(laterToday.from)}`,
    };
  for (let i = 1; i <= 7; i++) {
    const key = ORDER[(dayIndex + i) % 7];
    const first = rangesOf(hours[key])[0];
    if (first)
      return {
        open: false,
        label: `Fechada · abre ${i === 1 ? "amanhã" : NAME[key]} às ${hour(first.from)}`,
      };
  }
  return null;
}
