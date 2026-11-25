import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicCard as Card } from "../service";
import { favoriteSnapshot, PublicCard } from "./public-card";

const CARD: Card = {
  vehicleId: "00000000-0000-4000-8000-000000000001",
  path: "/v/00000000-fiat-argo-2022-aracaju-se",
  make: "Fiat",
  model: "Argo",
  version: "DRIVE 1.0",
  yearManufacture: 2021,
  yearModel: 2022,
  mileageKm: 30000,
  city: "Aracaju",
  state: "SE",
  storeName: "Silva Autos",
  priceCents: 7_632_000,
  badge: null,
  coverPublicId: null,
  photoCount: 0,
};

describe("coração no card", () => {
  it("[BUY-FR-004] [BUY-NFR-002] sai desmarcado no HTML do servidor, igual para todos, fora do link", () => {
    // Act
    const html = renderToStaticMarkup(
      <PublicCard card={CARD} cloudName="demo" showStore />,
    );

    // Assert
    expect(html).toContain('aria-label="Favoritar Fiat Argo 2022"');
    expect(html).toContain('aria-pressed="false"');
    // O único link do card ("Ver detalhes") vem depois do coração e não o contém
    expect(html.indexOf('data-testid="favorite"')).toBeLessThan(
      html.indexOf("<a "),
    );
  });

  it("[BUY-FR-006] guarda o preço do momento e o endereço da página", () => {
    expect(favoriteSnapshot(CARD)).toEqual({
      id: CARD.vehicleId,
      path: CARD.path,
      title: "Fiat Argo 2022",
      priceCents: 7_632_000,
    });
  });
});
