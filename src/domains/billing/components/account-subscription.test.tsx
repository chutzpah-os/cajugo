import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountSubscription } from "./account-subscription";

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("Conta do lojista [3c]", () => {
  it("[SUB-FR-010] plano, 'Ativa', próxima cobrança, Como pagar, fatura do mês e a anterior paga", () => {
    const html = renderToStaticMarkup(
      <AccountSubscription
        view={{
          plan: "Plano Catálogo",
          status: "active",
          statusLabel: "Ativa",
          membershipCents: 10_000,
          nextDueAt: new Date("2027-01-10T03:00:00Z"),
          howToPay: {
            pixKey: "pix@cajugo.com",
            beneficiary: "CajuGo Tecnologia",
            supportUrl: "https://wa.me/5579999999999",
          },
          current: {
            id: "x",
            reference: "12/2026",
            membershipCents: 10_000,
            fees: [],
            creditCents: 0,
            totalCents: 10_000,
            dueAt: new Date("2026-12-10T03:00:00Z"),
            status: "open",
            daysLate: 0,
          },
          history: [
            {
              reference: "11/2026",
              totalCents: 10_000,
              status: "paid",
              statusLabel: "Paga",
            },
          ],
        }}
      />,
    );

    const t = text(html);
    expect(t).toContain("Plano Catálogo");
    expect(t).toContain("Ativa");
    expect(t).toContain("Próxima cobrança 10/01/2027");
    expect(t).toContain("pix@cajugo.com");
    expect(html).toContain('href="https://wa.me/5579999999999"');
    expect(t).toContain("Mensalidade 12/2026 · R$ 100,00");
    expect(html).toContain('href="/painel/fatura/pix"');
    expect(t).toContain("Mensalidade 11/2026 · R$ 100,00 Paga");
  });
});
