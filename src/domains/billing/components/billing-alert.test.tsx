import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BillingAlertBanner } from "./billing-alert";

const text = (html: string) => html.replace(/<[^>]+>/g, " ");

describe("alerta da fatura no painel", () => {
  it("[SUB-FR-006] vence em breve: data, valor e Pagar agora", () => {
    const html = renderToStaticMarkup(
      <BillingAlertBanner
        alert={{
          kind: "due",
          dueAt: new Date("2026-12-10T03:00:00Z"),
          totalCents: 60_000,
        }}
      />,
    );

    expect(text(html)).toContain("Sua fatura vence em 10/12 · R$ 600,00");
    expect(html).toContain('href="/painel/fatura/pix"');
  });

  it("[SUB-FR-007] em atraso: 'Fatura em atraso há 1 dia'", () => {
    const html = renderToStaticMarkup(
      <BillingAlertBanner
        alert={{ kind: "late", days: 1, totalCents: 10_000 }}
      />,
    );

    expect(text(html)).toContain("Fatura em atraso há 1 dia · R$ 100,00");
    expect(html).toContain('role="alert"');
  });

  it("[SUB-FR-009] [SUB-NFR-001] suspensa: dias, valor e Pagar agora (44 px); sem valor nem botão para o usuário da loja", () => {
    const owner = renderToStaticMarkup(
      <BillingAlertBanner
        alert={{ kind: "suspended", days: 6, totalCents: 60_000 }}
      />,
    );
    const staff = renderToStaticMarkup(
      <BillingAlertBanner alert={{ kind: "suspended_staff" }} />,
    );

    expect(text(owner)).toContain(
      "Loja suspensa · 6 dias de atraso · R$ 600,00",
    );
    expect(owner).toContain("min-h-11");
    expect(text(staff)).toContain("Loja suspensa por falta de pagamento");
    expect(staff).not.toContain("Pagar agora");
    expect(staff).not.toContain("R$");
  });
});
