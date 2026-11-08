import { describe, expect, it } from "vitest";
import { hoursSchema, WEEK } from "./hours";

const weekday = { ranges: [{ from: "08:00", to: "18:00" }] };
const fullWeek = {
  mon: weekday,
  tue: weekday,
  wed: weekday,
  thu: weekday,
  fri: weekday,
  sat: { ranges: [{ from: "08:00", to: "12:00" }] },
  sun: { closed: true },
};

describe("horário de atendimento", () => {
  it('[STO-FR-009] aceita intervalos por dia e "Fechado"', () => {
    expect(hoursSchema.parse(fullWeek)).toEqual(fullWeek);
    expect(WEEK).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  });

  it("[STO-FR-009] aceita até 3 intervalos (ex.: almoço) e devolve em ordem", () => {
    const split = {
      ...fullWeek,
      mon: {
        ranges: [
          { from: "13:30", to: "18:00" },
          { from: "08:00", to: "12:00" },
        ],
      },
    };
    expect(hoursSchema.parse(split).mon).toEqual({
      ranges: [
        { from: "08:00", to: "12:00" },
        { from: "13:30", to: "18:00" },
      ],
    });
  });

  it("[STO-FR-009] recusa fim antes do início, horário inválido, sobreposição e dia faltando", () => {
    const bad = [
      { ...fullWeek, mon: { ranges: [{ from: "18:00", to: "08:00" }] } },
      { ...fullWeek, mon: { ranges: [{ from: "25:00", to: "26:00" }] } },
      {
        ...fullWeek,
        mon: {
          ranges: [
            { from: "08:00", to: "12:00" },
            { from: "11:00", to: "14:00" },
          ],
        },
      },
      { ...fullWeek, mon: { ranges: [] } },
      {
        ...fullWeek,
        mon: { ranges: Array(4).fill({ from: "08:00", to: "09:00" }) },
      },
      (({ sun: _sun, ...rest }) => rest)(fullWeek),
    ];
    for (const h of bad) expect(hoursSchema.safeParse(h).success).toBe(false);
    const message = hoursSchema.safeParse(bad[0]);
    expect(message.success ? "" : message.error.issues[0].message).toBe(
      "O fim precisa ser depois do início.",
    );
  });
});
