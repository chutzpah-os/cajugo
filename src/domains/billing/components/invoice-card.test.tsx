import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InvoiceCard } from "./invoice-card";

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("fatura do mês [10c]", () => {
  it("[SUB-FR-002] mensalidade, taxa com veículo e data, crédito, total, vencimento e status", () => {
    const html = renderToStaticMarkup(
      <InvoiceCard
        invoice={{
          id: "x",
          reference: "12/2026",
          membershipCents: 10_000,
          fees: [
            {
              vehicle: "Fiat ARGO",
              date: new Date("2026-12-05T12:00:00Z"),
              cents: 50_000,
            },
          ],
          creditCents: 0,
          totalCents: 60_000,
          dueAt: new Date("2026-12-10T03:00:00Z"),
          status: "open",
          daysLate: 0,
        }}
      />,
    );

    const t = text(html);
    expect(t).toContain("Mensalidade 12/2026");
    expect(t).toContain("Plano Catálogo R$ 100,00");
    expect(t).toContain("Taxa CajuGo · Fiat ARGO · 05/12/2026 R$ 500,00");
    expect(t).toContain("Crédito R$ 0,00");
    expect(t).toContain("Total R$ 600,00");
    expect(t).toContain("Vencimento 10/12/2026");
    expect(t).toContain("Em aberto");
  });
});
