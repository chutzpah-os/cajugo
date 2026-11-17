import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConfirmSaleButton, UndoSaleButton } from "./confirm-sale";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock("../actions", () => ({
  confirmSaleAction: vi.fn(),
  saleTermsAction: vi.fn(),
  undoSaleAction: vi.fn(),
}));

const TERMS = {
  suggested: { sellerId: "s1", name: "Ana" },
  partners: [
    { sellerId: "s1", name: "Ana" },
    { sellerId: "s2", name: "Beto" },
  ],
  commissionCents: 116_000,
  feeCents: 58_000,
  feeBps: 100,
};

describe("Confirmar venda [7g]", () => {
  it("[RCL-FR-009] [RCL-FR-010] [RCL-FR-013] valor final, quem vendeu com o sugerido marcado, comissão, taxa e 'Já paguei'", () => {
    // Act
    const html = renderToStaticMarkup(
      <ConfirmSaleButton vehicleId="v1" initial={TERMS} />,
    );

    // Assert
    expect(html).toContain("Marcar como vendido");
    expect(html).toContain("Confirmar venda");
    expect(html).toContain(">Valor final</label>");
    expect(html).toMatch(/checked="" value="link"/);
    expect(html).toContain("Ana (pelo link)");
    expect(html).toContain("Outro parceiro");
    expect(html).toContain("Venda da loja");
    expect(html).toContain("Comissão do vendedor: R$ 1.160,00");
    expect(html).toContain("Taxa CajuGo (1%): R$ 580,00");
    expect(html).toContain("Já paguei a comissão");
  });

  it("[RCL-FR-013] sem vendedor sugerido, começa em 'Venda da loja' e sem comissão", () => {
    // Act
    const html = renderToStaticMarkup(
      <ConfirmSaleButton
        vehicleId="v1"
        initial={{
          ...TERMS,
          suggested: null,
          partners: [],
          commissionCents: null,
          feeCents: null,
        }}
      />,
    );

    // Assert
    expect(html).toMatch(/checked="" value="store"/);
    expect(html).not.toContain("Outro parceiro");
    expect(html).not.toContain("Já paguei a comissão");
  });

  it("[RCL-FR-015] desfazer pela venda", () => {
    // Act / Assert
    expect(renderToStaticMarkup(<UndoSaleButton vehicleId="v1" />)).toContain(
      "Desfazer venda",
    );
  });
});
