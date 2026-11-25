import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SellerCard } from "../service";
import { SellerShowcaseList } from "./seller-showcase-list";

vi.mock("../actions", () => ({
  loadMoreSellerShowcaseAction: vi.fn(),
  requestPartnershipAction: vi.fn(),
}));

const card = (over: Partial<SellerCard>, id: string): SellerCard => ({
  storeId: `store-${id}`,
  partner: "none",
  earnCents: null,
  shareUrl: `https://cajugo.test/v/${id}-carro?ref=ANA`,
  card: {
    vehicleId: id,
    path: `/v/${id}-carro`,
    make: "Fiat",
    model: "Argo",
    version: null,
    yearManufacture: 2022,
    yearModel: 2022,
    mileageKm: 10000,
    city: "Aracaju",
    state: "SE",
    storeName: "Loja A",
    priceCents: 6_000_000,
    badge: null,
    coverPublicId: null,
    photoCount: 1,
  },
  ...over,
});

describe("vitrine do vendedor [7c]", () => {
  it("[SEL-FR-008] [SEL-FR-009] parceira mostra 'Você ganha'; todos compartilham; sem parceria pede; pendente avisa", () => {
    // Act
    const html = renderToStaticMarkup(
      <SellerShowcaseList
        initial={[
          card({ partner: "partner", earnCents: 120_000 }, "a"),
          card({}, "b"),
          card({ partner: "pending" }, "c"),
          card({ partner: "closed" }, "d"),
        ]}
        nextCursor={null}
        query=""
        cloudName="demo"
      />,
    );

    // Assert
    expect(html.match(/Você ganha/g)).toHaveLength(1);
    expect(html).toContain("1.200,00");
    expect(html.match(/Copiar link/g)).toHaveLength(4);
    expect(html).toMatch(/disabled="">Esta loja não aceita vendedores/);
    expect(html).toContain('data-url="https://cajugo.test/v/a-carro?ref=ANA"');
    expect(html.match(/Pedir parceria/g)).toHaveLength(1);
    expect(html).toContain("aguardando a loja");
    expect(html).toContain("https://wa.me/?text=");
  });
});
