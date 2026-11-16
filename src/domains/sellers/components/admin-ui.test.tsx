import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SellersAdmin } from "../service";
import { SellersAdminView } from "./sellers-admin";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock("../actions", () => ({
  approveSellerAction: vi.fn(),
  blockSellerAction: vi.fn(),
  unblockSellerAction: vi.fn(),
}));

const base = {
  city: "Aracaju",
  phone: "5579999990000",
  cpf: "52998224725",
  code: null,
  blockedReason: null,
  createdAt: new Date("2026-11-10T12:00:00Z"),
};
const VIEW: SellersAdmin = {
  counts: { in_review: 2, active: 1, blocked: 1 },
  inReview: [
    { ...base, sellerId: "a", name: "Ana", hasDocuments: true },
    { ...base, sellerId: "b", name: "Beto", hasDocuments: false },
  ],
  active: [
    { ...base, sellerId: "c", name: "Caio", code: "CAIO", hasDocuments: true },
  ],
  blocked: [
    {
      ...base,
      sellerId: "d",
      name: "Duda",
      code: "DUDA",
      blockedReason: "Cobrou por fora",
      hasDocuments: true,
    },
  ],
};

describe("vendedores do admin [7h]", () => {
  it("[SEL-FR-003] [SEL-FR-004] indicadores, em análise primeiro, CPF completo e as fotos", () => {
    // Act
    const html = renderToStaticMarkup(
      <SellersAdminView view={VIEW} canDecide />,
    );

    // Assert
    expect(html.indexOf("Ana")).toBeLessThan(html.indexOf("Caio"));
    expect(html).toContain("529.982.247-25");
    expect(html).toContain("(79) 99999-0000");
    expect(html).toContain('href="/api/v1/sellers/a/document/front"');
    expect(html).toContain("Aguardando a foto do documento");
    expect(html).toContain("Cobrou por fora");
    expect(html.match(/data-testid="seller-approve"/g)).toHaveLength(2);
    expect(html).toContain('data-testid="seller-block"');
    expect(html).toContain('data-testid="seller-unblock"');
  });

  it("[SEL-SEC-005] o suporte vê sem Aprovar, Bloquear nem Desbloquear", () => {
    // Act
    const html = renderToStaticMarkup(
      <SellersAdminView view={VIEW} canDecide={false} />,
    );

    // Assert
    expect(html).toContain("Ana");
    expect(html).not.toMatch(/"seller-(approve|block|unblock)"/);
  });
});
