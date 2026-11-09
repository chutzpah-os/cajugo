import { describe, expect, it } from "vitest";
import { plainText, slugify } from "./slug";

describe("texto sem acento", () => {
  it("[SHW-FR-004] tira acentos e deixa em minúsculas para a busca", () => {
    expect(plainText("Citroën C3 Tendance 1.6 Flex")).toBe(
      "citroen c3 tendance 1.6 flex",
    );
  });

  it("[SHW-FR-005] slug para filtros e endereços: só letras, números e hífen", () => {
    expect(slugify("GM - Chevrolet")).toBe("gm-chevrolet");
    expect(slugify("São José do Rio Preto")).toBe("sao-jose-do-rio-preto");
    expect(slugify("  --A/B  ")).toBe("a-b");
  });
});
