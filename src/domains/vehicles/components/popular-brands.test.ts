import { describe, expect, it } from "vitest";
import { popularBrands } from "./vehicle-form";

describe("marcas mais procuradas no cadastro [2a]", () => {
  it("[DSG-FR-011] as mais vendidas no Brasil vêm primeiro, com o nome da FIPE", () => {
    const fipe = [
      ["1", "Acura"],
      ["2", "Caoa Chery"],
      ["3", "Fiat"],
      ["4", "GM - Chevrolet"],
      ["5", "Mercury"],
      ["6", "VW - VolksWagen"],
      ["7", "Toyota"],
    ] as const;

    expect(popularBrands([...fipe]).map(([, n]) => n)).toEqual([
      "Fiat",
      "VW - VolksWagen",
      "GM - Chevrolet",
      "Toyota",
      "Caoa Chery",
    ]);
  });
});
