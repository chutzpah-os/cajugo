import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NetworkBlock } from "./network-block";

describe("bloco Rede Caju da Conta [3c]", () => {
  it("[RCL-FR-014] mostra Comissão e Vendedores na própria Conta, com o número de pedidos pendentes", () => {
    // Act
    const html = renderToStaticMarkup(
      <NetworkBlock
        acceptsSellers
        pending={2}
        commission={<p>form-comissao</p>}
        partners={<p>lista-vendedores</p>}
      />,
    );
    const none = renderToStaticMarkup(
      <NetworkBlock
        acceptsSellers={false}
        pending={0}
        commission={null}
        partners={null}
      />,
    );

    // Assert
    expect(html).toContain("form-comissao");
    expect(html).toContain("lista-vendedores");
    expect(html).not.toContain('href="/painel/rede-caju');
    expect(html).toMatch(/data-testid="network-pending"[^>]*>2</);
    expect(none).not.toContain("network-pending");
    expect(none).toContain("não está aceitando vendedores");
  });
});
