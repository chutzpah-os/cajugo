import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { LeadCard, LeadsBoard } from "../service";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock("../actions", () => ({ moveLeadAction: vi.fn() }));
const { LeadsBoardView } = await import("./leads-board");

const NOW = new Date("2026-11-16T12:00:00Z");
const HOUR = 3_600_000;

const card = (over: Partial<LeadCard> = {}): LeadCard => ({
  id: "l1",
  status: "new",
  channel: "form",
  origin: "cajugo",
  sellerName: null,
  name: "Ana Souza",
  initials: "AS",
  message: "Olá, tenho interesse.",
  createdAt: new Date(NOW.getTime() - 2 * HOUR),
  highlight: false,
  whatsappUrl: "https://wa.me/5579999990000?text=oi",
  telUrl: "tel:+5579999990000",
  vehicle: {
    id: "v1",
    title: "Fiat ARGO",
    priceCents: 7_000_000,
    deleted: false,
  },
  ...over,
});

const board = (
  cards: LeadCard[],
  over: Partial<LeadsBoard> = {},
): LeadsBoard => ({
  cards,
  counts: { all: 4, new: 2, contacting: 1, negotiating: 1 },
  newCount: 2,
  cajugoShare: 75,
  ...over,
});

const render = (b: LeadsBoard, filter: "all" | "new" = "all") =>
  renderToStaticMarkup(<LeadsBoardView board={b} filter={filter} now={NOW} />);

describe("tela Leads", () => {
  it("[LED-FR-005] [LED-FR-006] indicadores e filtros com contagem", () => {
    // Act
    const html = render(board([card()]), "new");

    // Assert
    expect(html).toContain("Novos, sem resposta");
    expect(html).toContain("75%");
    expect(html).toMatch(/Novo <span[^>]*>2<\/span>/);
    expect(html).toMatch(/aria-current="page"[^>]*>Novo/);
    expect(html).toContain('href="/painel/leads?status=negotiating"');
  });

  it("[LED-FR-007] [LED-FR-008] card com sigla, tempo, veículo, selos, mensagem e ações", () => {
    // Act
    const html = render(board([card()]));

    // Assert
    for (const text of [
      "AS",
      "Ana Souza",
      "há 2 h",
      "Fiat ARGO",
      "R$",
      "via CajuGo",
      "Olá, tenho interesse.",
      "WhatsApp",
      "Ligar",
      "→ Em contato",
      "Perdido",
    ])
      expect(html).toContain(text);
    expect(html).toContain('href="/painel/veiculos/v1"');
  });

  it("[LED-FR-009] [LED-FR-010] destaque do Novo com mais de 24 h; veículo excluído sem link", () => {
    // Act
    const html = render(
      board([
        card({ highlight: true }),
        card({
          id: "l2",
          vehicle: {
            id: "v2",
            title: "Fiat UNO",
            priceCents: null,
            deleted: true,
          },
        }),
      ]),
    );

    // Assert
    expect(html).toContain('data-highlight="true"');
    expect(html).toContain("Sem resposta há mais de 24 horas");
    expect(html).toContain("Fiat UNO · Veículo excluído");
    expect(html).not.toContain('href="/painel/veiculos/v2"');
  });

  it("[LED-FR-014] lead via WhatsApp sem WhatsApp nem Ligar; Vendido sem ações", () => {
    // Act
    const html = render(
      board([
        card({
          channel: "whatsapp",
          status: "contacting",
          name: null,
          initials: null,
          message: null,
          whatsappUrl: null,
          telUrl: null,
        }),
      ]),
    );
    const sold = render(board([card({ status: "sold" })]));

    // Assert
    expect(html).toContain("Contato pelo WhatsApp");
    expect(html).not.toContain(">Ligar<");
    expect(html).toContain("→ Negociando");
    expect(sold).not.toContain("→");
  });

  it("[LED-FR-005] sem leads, explica de onde eles vêm", () => {
    // Act
    const html = render(
      board([], {
        counts: { all: 0, new: 0, contacting: 0, negotiating: 0 },
        newCount: 0,
        cajugoShare: null,
      }),
    );

    // Assert
    expect(html).toContain("Nenhum lead ainda");
    expect(html).toContain("–");
  });
});
