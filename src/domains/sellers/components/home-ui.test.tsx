import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SellerHome } from "./seller-home";

describe("início do vendedor [7b]", () => {
  it("[SEL-FR-002] em análise e bloqueado mostram só o status", () => {
    // Act
    const review = renderToStaticMarkup(
      <SellerHome
        home={{
          kind: "status",
          status: "in_review",
          reason: null,
          documentsMissing: false,
        }}
      />,
    );
    const blocked = renderToStaticMarkup(
      <SellerHome
        home={{
          kind: "status",
          status: "blocked",
          reason: "Cobrou sinal por fora",
          documentsMissing: false,
        }}
      />,
    );

    // Assert
    expect(review).toContain("Cadastro em análise");
    expect(review).toContain("Você não paga nada");
    expect(blocked).toContain("Conta bloqueada");
    expect(blocked).toContain("Cobrou sinal por fora");
    expect(review + blocked).not.toContain('vitrine">');
  });

  it("[SEL-FR-006] painel com cliques do mês e lojas Parceiro e Pendente", () => {
    // Act
    const html = renderToStaticMarkup(
      <SellerHome
        home={{
          kind: "panel",
          code: "ANA",
          clicksThisMonth: 12,
          stores: [
            { storeId: "a", name: "Loja A", status: "partner" },
            { storeId: "b", name: "Loja B", status: "pending" },
          ],
        }}
      />,
    );

    // Assert
    expect(html).toContain(">12<");
    expect(html).toContain("Loja A");
    expect(html).toContain("Parceiro");
    expect(html).toContain("Pendente");
  });
});
