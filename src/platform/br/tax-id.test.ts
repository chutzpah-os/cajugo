import { describe, expect, it } from "vitest";
import { isValidCnpj, isValidCpf, maskTaxId, parseTaxId } from "./tax-id";

describe("CPF e CNPJ", () => {
  it("[PIX-FR-002] aceita CPF e CNPJ com dígitos verificadores corretos, com ou sem pontuação", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCnpj("12.345.678/0001-95")).toBe(true);
    expect(parseTaxId("529.982.247-25")).toEqual({
      type: "cpf",
      digits: "52998224725",
    });
    expect(parseTaxId(" 12345678000195 ")).toEqual({
      type: "cnpj",
      digits: "12345678000195",
    });
  });

  it("[PIX-FR-002] recusa dígito errado, sequência repetida e tamanho errado", () => {
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCnpj("12.345.678/0001-94")).toBe(false);
    expect(isValidCnpj("00.000.000/0000-00")).toBe(false);
    expect(parseTaxId("1234567890")).toBeNull();
    expect(parseTaxId("111.111.111-11")).toBeNull();
  });

  it("[PIX-SEC-005] mascara o documento para exibição", () => {
    expect(maskTaxId("cpf", "52998224725")).toBe("529.***.***-25");
    expect(maskTaxId("cnpj", "12345678000195")).toBe("12.***.***/0001-95");
  });
});
