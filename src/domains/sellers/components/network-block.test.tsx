import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NetworkBlock } from "./network-block";

describe("bloco Rede Caju da Conta [3c]", () => {
  it("[RCL-FR-014] leva a Comissão e Vendedores, com o número de pedidos pendentes", () => {
    // Act
    const html = renderToStaticMarkup(
      <NetworkBlock acceptsSellers pending={2} />,
    );
    const none = renderToStaticMarkup(
      <NetworkBlock acceptsSellers={false} pending={0} />,
    );

    // Assert
    expect(html).toContain('href="/painel/rede/comissao"');
    expect(html).toContain('href="/painel/rede/vendedores"');
    expect(html).toMatch(/data-testid="network-pending"[^>]*>2</);
    expect(none).not.toContain("network-pending");
    expect(none).toContain("não está aceitando vendedores");
  });
});
