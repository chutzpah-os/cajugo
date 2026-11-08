import { describe, expect, it } from "vitest";
import { brl, centsToReais, reaisToCents } from "./money";

describe("dinheiro", () => {
  it("[PIX-FR-005] converte reais digitados em centavos e de volta", () => {
    expect(reaisToCents("100")).toBe(10000);
    expect(reaisToCents("1.234,56")).toBe(123456);
    expect(reaisToCents("R$ 90,5")).toBe(9050);
    expect(reaisToCents("")).toBeNaN();
    expect(reaisToCents("abc")).toBeNaN();
    expect(centsToReais(5000)).toBe("50,00");
    expect(brl(123456)).toBe("R$ 1.234,56");
  });
});
