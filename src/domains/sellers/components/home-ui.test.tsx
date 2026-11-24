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
          toReceiveCents: 0,
          salesThisMonth: 0,
          recentSales: [],
        }}
      />,
    );

    // Assert
    expect(html).toContain(">12<");
    expect(html).toContain("Loja A");
    expect(html).toContain("Parceiro");
    expect(html).toContain("Pendente");
  });

  it("[EXT-FR-005] [EXT-FR-008] a receber, vendas do mês, últimas vendas e Ver extrato; sem vendas, R$ 0 e 0", () => {
    const base = {
      kind: "panel" as const,
      code: "ANA",
      clicksThisMonth: 3,
      stores: [],
    };
    const html = renderToStaticMarkup(
      <SellerHome
        home={{
          ...base,
          toReceiveCents: 116_000,
          salesThisMonth: 2,
          recentSales: [
            {
              saleId: "s1",
              vehicle: "Fiat Argo",
              store: "Loja A",
              date: new Date("2026-11-20T12:00:00Z"),
              finalPriceCents: 5_800_000,
              commissionCents: 116_000,
              status: "to_receive",
              canUndoUntil: null,
            },
          ],
        }}
      />,
    );
    const empty = renderToStaticMarkup(
      <SellerHome
        home={{
          ...base,
          toReceiveCents: 0,
          salesThisMonth: 0,
          recentSales: [],
        }}
      />,
    );

    expect(html).toContain("R$ 1.160,00");
    expect(html).toContain(">2<");
    expect(html).toContain("Fiat Argo");
    expect(html).toContain('href="/rede/extrato"');
    expect(empty).toContain("R$ 0,00");
    expect(empty).toContain(
      "Suas vendas aparecem aqui quando a loja confirmar.",
    );
  });
});
