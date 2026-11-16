/** Data na tela em dd/mm/aaaa, no horário de Brasília (CLAUDE.md: convenções). */
export const brDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

const isoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
});

/** Dia de Brasília em `aaaa-mm-dd` (contagens por dia, como as visualizações). */
export const brDay = (date: Date): string => isoDay.format(date);
