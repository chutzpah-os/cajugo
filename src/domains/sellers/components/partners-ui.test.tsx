import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PartnersView } from "./partners-view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock("../actions", () => ({ decidePartnershipAction: vi.fn() }));

describe("Vendedores [7f]", () => {
  it("[RCL-FR-004] [RCL-FR-006] [RCL-FR-007] pedidos com Aprovar e Recusar; parceiros com celular, Pix, vendas e bloqueado", () => {
    // Act
    const html = renderToStaticMarkup(
      <PartnersView
        pending={[
          {
            partnershipId: "p1",
            sellerName: "Ana",
            city: "Aracaju",
            requestedAt: new Date("2026-11-16T12:00:00Z"),
          },
        ]}
        partners={[
          {
            partnershipId: "p2",
            sellerName: "Beto",
            city: "Aracaju",
            phone: "5579999990000",
            pixKey: "beto@pix.com",
            sales: 2,
            blocked: false,
          },
          {
            partnershipId: "p3",
            sellerName: "Caio",
            city: "Recife",
            phone: null,
            pixKey: null,
            sales: 0,
            blocked: true,
          },
        ]}
      />,
    );

    // Assert
    expect(html).toContain("Ana");
    expect(html).toContain("16/11/2026");
    expect(html).toContain("Aprovar");
    expect(html).toContain("Recusar");
    expect(html).toContain("(79) 99999-0000");
    expect(html).toContain("Pix: beto@pix.com");
    expect(html).toContain("2 vendas com a loja");
    expect(html).toContain("Bloqueado pela CajuGo");
    expect(html).toContain("Encerrar parceria");
  });
});
