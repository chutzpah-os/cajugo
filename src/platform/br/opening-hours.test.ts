import { describe, expect, it } from "vitest";
import { openingStatus, type WeekHours } from "./opening-hours";

const weekday = { ranges: [{ from: "08:00", to: "18:00" }] };
const HOURS: WeekHours = {
  mon: weekday,
  tue: weekday,
  wed: weekday,
  thu: weekday,
  fri: weekday,
  sat: { ranges: [{ from: "08:00", to: "12:00" }] },
  sun: { closed: true },
};
// Horários em São Paulo (UTC−3).
const at = (iso: string) => new Date(`${iso}-03:00`);

describe("aberta agora (015, PRC-FR-007)", () => {
  it("[PRC-FR-007] aberta no horário, com a hora de fechar", () => {
    expect(openingStatus(HOURS, at("2026-11-25T10:00:00"))).toEqual({
      open: true,
      label: "Aberta agora · fecha às 18h",
    });
  });

  it("[PRC-FR-007] fechada: abre hoje mais tarde, amanhã ou no próximo dia com horário", () => {
    expect(openingStatus(HOURS, at("2026-11-25T07:00:00"))?.label).toBe(
      "Fechada · abre hoje às 8h",
    );
    expect(openingStatus(HOURS, at("2026-11-25T19:00:00"))?.label).toBe(
      "Fechada · abre amanhã às 8h",
    );
    // Sábado à tarde: domingo fechado, abre segunda.
    expect(openingStatus(HOURS, at("2026-11-28T15:00:00"))?.label).toBe(
      "Fechada · abre segunda às 8h",
    );
  });

  it("[PRC-FR-007] sem horário cadastrado, nada", () => {
    expect(openingStatus(null, new Date())).toBeNull();
  });
});
