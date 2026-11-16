import { describe, expect, it } from "vitest";
import { highlighted, isOpen, nextStatus, STATUS_LABEL } from "./status";

const HOUR = 3_600_000;

describe("status do lead", () => {
  it("[LED-FR-008] avança Novo → Em contato → Negociando → Vendido; fechado não avança", () => {
    // Arrange / Act / Assert
    expect(nextStatus("new")).toBe("contacting");
    expect(nextStatus("contacting")).toBe("negotiating");
    expect(nextStatus("negotiating")).toBe("sold");
    expect(nextStatus("sold")).toBeNull();
    expect(nextStatus("lost")).toBeNull();
    expect(STATUS_LABEL.contacting).toBe("Em contato");
  });

  it("[LED-FR-008] Perdido vale de qualquer status aberto", () => {
    // Arrange / Act / Assert
    expect(
      ["new", "contacting", "negotiating"].every((s) => isOpen(s as never)),
    ).toBe(true);
    expect(isOpen("sold")).toBe(false);
    expect(isOpen("lost")).toBe(false);
  });

  it("[LED-FR-009] destaca só o Novo com mais de 24 horas", () => {
    // Arrange
    const now = new Date("2026-11-16T12:00:00Z");
    const ago = (h: number) => new Date(now.getTime() - h * HOUR);

    // Act / Assert
    expect(highlighted("new", ago(25), now)).toBe(true);
    expect(highlighted("new", ago(1), now)).toBe(false);
    expect(highlighted("contacting", ago(25), now)).toBe(false);
  });
});
