import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RelatedLinks } from "./related-links";
import { DiscoveryIndexList, discoveryIndexMetadata } from "./discovery-index";

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

describe("links para a descoberta", () => {
  it("[DSC-FR-008] [DSC-FR-009] mostra os links recebidos; sem links, nada", () => {
    // Act
    const html = renderToStaticMarkup(
      <RelatedLinks links={[{ name: "Fiat usados", path: "/carros/fiat" }]} />,
    );

    // Assert
    expect(html).toContain('href="/carros/fiat"');
    expect(html).toContain("Fiat usados");
    expect(renderToStaticMarkup(<RelatedLinks links={[]} />)).toBe("");
  });
});
