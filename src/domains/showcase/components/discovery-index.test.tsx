import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DiscoveryIndexList,
  DiscoveryShortcuts,
  discoveryIndexMetadata,
} from "./discovery-index";

const INDEX = {
  makes: [
    { path: "/carros/chevrolet", name: "Chevrolet", count: 1 },
    { path: "/carros/fiat", name: "Fiat", count: 2 },
  ],
  cities: [{ path: "/carros/campinas-sp", name: "Campinas/SP", count: 3 }],
};

describe("índice de descoberta [1a]", () => {
  it("[DSC-FR-013] lista marcas e cidades com a contagem e o link de cada", () => {
    // Act
    const html = renderToStaticMarkup(<DiscoveryIndexList index={INDEX} />);

    // Assert
    expect(html).toContain('id="marcas"');
    expect(html).toContain('id="cidades"');
    expect(html).toContain('href="/carros/fiat"');
    expect(html).toMatch(/Fiat.*2/);
    expect(html).toContain('href="/carros/campinas-sp"');
  });

  it("[DSC-FR-013] a vitrine leva ao índice por marca e por cidade", () => {
    // Act
    const html = renderToStaticMarkup(<DiscoveryShortcuts />);

    // Assert
    expect(html).toContain('href="/carros#marcas"');
    expect(html).toContain("Buscar por marca");
    expect(html).toContain('href="/carros#cidades"');
    expect(html).toContain("Buscar por cidade");
  });

  it("[DSC-FR-013] índice vazio fica fora do Google; com páginas, indexável", () => {
    expect(discoveryIndexMetadata({ makes: [], cities: [] }).robots).toEqual({
      index: false,
      follow: true,
    });
    expect(discoveryIndexMetadata(INDEX).robots).toBeUndefined();
    expect(discoveryIndexMetadata(INDEX).alternates?.canonical).toMatch(
      /\/carros$/,
    );
  });
});
