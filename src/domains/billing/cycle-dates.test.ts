import { describe, expect, it } from "vitest";
import {
  daysLate,
  dueSoon,
  invoicePeriod,
  isOverdue,
  opensInvoice,
  pastDueStart,
  suspensionDue,
} from "./cycle-dates";
import { saoPauloDate } from "./due-date";

// Vencimento dia 10/12 em São Paulo (meia-noite local = 03:00 UTC).
const due = new Date("2026-12-10T03:00:00Z");
const at = (day: string, hour = "12") =>
  new Date(`2026-12-${day}T${hour}:00:00Z`);

describe("datas do ciclo de cobrança", () => {
  it("[SUB-FR-001] a fatura abre 3 dias antes do vencimento, em São Paulo", () => {
    expect(opensInvoice(due, at("06"))).toBe(false);
    // 07/12 00:30 em São Paulo ainda é 07 (03:30 UTC).
    expect(opensInvoice(due, new Date("2026-12-07T03:30:00Z"))).toBe(true);
    // 07/12 02:00 UTC ainda é 06/12 em São Paulo.
    expect(opensInvoice(due, new Date("2026-12-07T02:00:00Z"))).toBe(false);
    expect(opensInvoice(due, at("12"))).toBe(true);
  });

  it("[SUB-FR-001] período AAAA-MM do vencimento", () => {
    expect(invoicePeriod(due)).toBe("2026-12");
    expect(invoicePeriod(new Date("2027-01-01T03:00:00Z"))).toBe("2027-01");
  });

  it("[SUB-FR-006] vence em até 3 dias: do dia da abertura ao vencimento", () => {
    expect(dueSoon(due, at("06"))).toBe(false);
    expect(dueSoon(due, at("07"))).toBe(true);
    expect(dueSoon(due, at("10"))).toBe(true);
    expect(dueSoon(due, at("11"))).toBe(false);
  });

  it("[SUB-FR-007] em atraso no dia seguinte ao vencimento; atraso começa no dia 11", () => {
    expect(isOverdue(due, at("10", "23"))).toBe(false);
    expect(isOverdue(due, at("11"))).toBe(true);
    expect(saoPauloDate(pastDueStart(due))).toBe("2026-12-11");
  });

  it("[SUB-FR-007] dias de atraso contados do vencimento", () => {
    expect(daysLate(due, at("11"))).toBe(1);
    expect(daysLate(due, at("16"))).toBe(6);
    expect(daysLate(due, at("09"))).toBe(0);
  });

  it("[SUB-FR-008] em atraso desde o dia 11 com 5 dias de tolerância: suspende no dia 16", () => {
    const since = pastDueStart(due);

    expect(suspensionDue(since, 5, at("15"))).toBe(false);
    expect(suspensionDue(since, 5, at("16"))).toBe(true);
  });

  it("[SUB-FR-008] fim de mês e virada do ano", () => {
    const jan31 = new Date("2027-01-31T03:00:00Z");

    expect(saoPauloDate(pastDueStart(jan31))).toBe("2027-02-01");
    expect(opensInvoice(new Date("2027-01-02T03:00:00Z"), at("30"))).toBe(true);
    expect(daysLate(jan31, new Date("2027-02-03T12:00:00Z"))).toBe(3);
  });
});
