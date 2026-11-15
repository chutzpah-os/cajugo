import { describe, expect, it } from "vitest";
import {
  discoveryDescription,
  discoveryEmptyHeading,
  discoveryIntro,
  discoveryTitle,
} from "./discovery";

const ARGO = { make: "Fiat", model: "Argo" };
const STATS = {
  total: 3,
  stores: 2,
  cities: 2,
  minPriceCents: 5_000_000,
  maxPriceCents: 7_000_000,
};

describe("SEO das páginas de descoberta", () => {
  it("[DSC-FR-006] título no formato do SEO.md para marca, modelo, cidade e marca na cidade", () => {
    expect(discoveryTitle(ARGO)).toBe("Fiat Argo usados à venda");
    expect(discoveryTitle({ make: "Fiat" })).toBe("Fiat usados à venda");
    expect(discoveryTitle({ city: "Campinas", state: "SP" })).toBe(
      "Carros usados à venda em Campinas/SP",
    );
    expect(
      discoveryTitle({ make: "Fiat", city: "Campinas", state: "SP" }),
    ).toBe("Fiat usados à venda em Campinas/SP");
  });

  it("[DSC-FR-006] parágrafo com número de veículos, de cidades e faixa de preço", () => {
    expect(discoveryIntro(ARGO, STATS)).toBe(
      "3 Fiat Argo usados à venda em 2 cidades, de R$ 50.000 a R$ 70.000.",
    );
  });

  it("[DSC-FR-006] na cidade conta lojas; um veículo só fica no singular e com um preço", () => {
    // Act
    const city = discoveryIntro(
      { city: "Campinas", state: "SP" },
      { ...STATS, total: 1, stores: 1, cities: 1, maxPriceCents: 5_000_000 },
    );

    // Assert
    expect(city).toBe(
      "1 carro usado à venda em Campinas/SP, em 1 loja, por R$ 50.000.",
    );
  });

  it("[DSC-FR-006] descrição única, com contagem, faixa e o convite", () => {
    // Act
    const text = discoveryDescription(ARGO, STATS);

    // Assert
    expect(text).toContain("3 Fiat Argo usados à venda");
    expect(text).toContain("de R$ 50.000 a R$ 70.000");
    expect(text.length).toBeLessThanOrEqual(160);
  });

  it("[DSC-FR-006] sem preço informado, a faixa não aparece", () => {
    expect(
      discoveryIntro(ARGO, {
        ...STATS,
        minPriceCents: null,
        maxPriceCents: null,
      }),
    ).toBe("3 Fiat Argo usados à venda em 2 cidades.");
  });

  it("[DSC-FR-005] página vazia diz o que falta, sem contar zero", () => {
    // Arrange
    const empty = { ...STATS, total: 0, stores: 0, cities: 0 };
    const mobi = { make: "Fiat", model: "Mobi" };

    // Act / Assert
    expect(discoveryEmptyHeading(mobi)).toBe("Nenhum Fiat Mobi à venda agora");
    expect(
      discoveryEmptyHeading({ make: "Fiat", city: "Campinas", state: "SP" }),
    ).toBe("Nenhum Fiat à venda agora em Campinas/SP");
    expect(discoveryEmptyHeading({})).toBe("Nenhum carro à venda agora");
    expect(discoveryDescription(mobi, empty)).toBe(
      "Nenhum Fiat Mobi à venda agora. Veja outros veículos usados na CajuGo, com contato direto com a loja pelo WhatsApp.",
    );
  });
});
