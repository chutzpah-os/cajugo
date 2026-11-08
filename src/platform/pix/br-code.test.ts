import { describe, expect, it } from "vitest";
import { brCode, crc16 } from "./br-code";

describe("BR Code do Pix estático", () => {
  it("[PIX-FR-004] gera o payload do exemplo do manual do BR Code (BACEN)", () => {
    expect(
      brCode({
        key: "123e4567-e12b-12d1-a456-426655440000",
        name: "Fulano de Tal",
        city: "BRASILIA",
      }),
    ).toBe(
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
    );
  });

  it("[PIX-FR-004] inclui o valor com duas casas e termina com o CRC do próprio texto", () => {
    const code = brCode({
      key: "cajugo@exemplo.com",
      name: "CajuGo Tecnologia",
      city: "Aracaju",
      amountCents: 10000,
    });

    expect(code).toContain("5406100.00");
    expect(code.slice(-4)).toBe(crc16(code.slice(0, -4)));
  });

  it("[PIX-FR-004] tira acentos e corta nome (25) e cidade (15) no limite do padrão", () => {
    const code = brCode({
      key: "+5579981360206",
      name: "Concessionária São João de Aracaju Ltda",
      city: "São Cristóvão do Norte",
    });

    expect(code).toContain("5925Concessionaria Sao Joao ");
    expect(code).toContain("6015Sao Cristovao d");
  });
});
