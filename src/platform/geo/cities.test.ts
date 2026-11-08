import { describe, expect, it } from "vitest";
import { findCity, searchCities } from "./cities";

describe("cidades do Brasil", () => {
  it("[STO-FR-004] busca sem acento e sem diferenciar maiúsculas, pelo começo do nome", () => {
    // Act
    const result = searchCities("sao jose do r");

    // Assert
    expect(result.map((c) => c.label)).toEqual(
      expect.arrayContaining(["São José do Rio Preto/SP"]),
    );
    expect(result.every((c) => c.label.startsWith("São José do R"))).toBe(true);
  });

  it("[STO-FR-004] limita a quantidade de sugestões e ignora busca curta", () => {
    expect(searchCities("sa", 5)).toHaveLength(5);
    expect(searchCities("a")).toEqual([]);
  });

  it("[STO-FR-004] só aceita cidade que existe, com a UF certa", () => {
    expect(findCity("Aracaju", "SE")).toEqual({
      name: "Aracaju",
      state: "SE",
      label: "Aracaju/SE",
    });
    expect(findCity("aracaju", "se")).toMatchObject({ name: "Aracaju" });
    expect(findCity("Aracaju", "SP")).toBeNull();
    expect(findCity("Cidade Inventada", "SE")).toBeNull();
  });
});
