import { describe, expect, it } from "vitest";
import { hoursFromForm, hoursToForm } from "./hours-form";

const form = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

describe("horário no formulário", () => {
  it("[STO-FR-009] converte o formulário em horário por dia (fechado, 1 ou 2 intervalos)", () => {
    const hours = hoursFromForm(
      form({
        "hours.mon.0.from": "08:00",
        "hours.mon.0.to": "12:00",
        "hours.mon.1.from": "13:30",
        "hours.mon.1.to": "18:00",
        "hours.sat.0.from": "08:00",
        "hours.sat.0.to": "12:00",
        "hours.sun.closed": "on",
      }),
    );
    expect(hours.mon).toEqual({
      ranges: [
        { from: "08:00", to: "12:00" },
        { from: "13:30", to: "18:00" },
      ],
    });
    expect(hours.sat).toEqual({ ranges: [{ from: "08:00", to: "12:00" }] });
    expect(hours.sun).toEqual({ closed: true });
    expect(hours.tue).toEqual({ ranges: [] });
  });

  it("[STO-FR-009] o horário salvo volta para o formulário", () => {
    expect(
      hoursToForm({
        mon: { ranges: [{ from: "08:00", to: "18:00" }] },
        tue: { closed: true },
      } as never).mon,
    ).toEqual({
      closed: false,
      ranges: [
        { from: "08:00", to: "18:00" },
        { from: "", to: "" },
      ],
    });
    expect(hoursToForm(null).wed).toEqual({
      closed: false,
      ranges: [
        { from: "", to: "" },
        { from: "", to: "" },
      ],
    });
  });
});
