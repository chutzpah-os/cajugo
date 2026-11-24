import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { StatementItem } from "../service";
import { StatementCard } from "./statement-list";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock("../actions", () => ({
  loadMoreStatementAction: vi.fn(),
  setCommissionReceivedAction: vi.fn(),
}));

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const item = (over: Partial<StatementItem> = {}): StatementItem => ({
  saleId: "s1",
  vehicle: "Fiat Argo",
  store: "Loja A",
  date: new Date("2026-11-20T12:00:00Z"),
  finalPriceCents: 5_800_000,
  commissionCents: 116_000,
  status: "to_receive",
  canUndoUntil: null,
  ...over,
});

describe("extrato do vendedor [7d]", () => {
  it("[EXT-FR-001] [EXT-FR-003] venda A receber: veículo, loja, data, valor final, comissão e Recebi", () => {
    const html = renderToStaticMarkup(
      <StatementCard item={item()} busy={false} onReceived={() => {}} />,
    );

    const t = text(html);
    expect(t).toContain("Fiat Argo");
    expect(t).toContain("Loja A · 20/11/2026");
    expect(t).toContain("Vendido por R$ 58.000,00");
    expect(t).toContain("Comissão R$ 1.160,00");
    expect(t).toContain("A receber");
    expect(t).toContain("Recebi");
  });

  it("[EXT-FR-009] paga pelo vendedor há pouco: sem Recebi, com Desfazer e o prazo", () => {
    const html = renderToStaticMarkup(
      <StatementCard
        item={item({
          status: "paid",
          canUndoUntil: new Date("2026-11-24T15:00:00Z"),
        })}
        busy={false}
        onReceived={() => {}}
        onUndo={() => {}}
      />,
    );

    const t = text(html);
    expect(t).toContain("Paga");
    expect(t).not.toContain("Recebi");
    expect(t).toContain("Desfazer");
    expect(t).toContain("Dá para desfazer até 24/11, 12:00");
  });

  it("[EXT-FR-004] paga sem prazo de desfazer: nenhum botão", () => {
    const html = renderToStaticMarkup(
      <StatementCard
        item={item({ status: "paid" })}
        busy={false}
        onReceived={() => {}}
        onUndo={() => {}}
      />,
    );

    expect(html).not.toContain("<button");
  });
});
