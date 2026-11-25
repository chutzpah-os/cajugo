import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReferralBanner } from "./referral-banner";
import { Movements, ReferralList, ReferralShare } from "./referral-views";

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const BANNER = { pctBps: 3000, months: 3, rewardCents: 3_000 };

describe("banner do Caju Indica na vitrine [9a]", () => {
  it("[IND-FR-014] banner e rodapé com a recompensa das regras, levando ao cadastro do indicador", () => {
    const top = renderToStaticMarkup(
      <ReferralBanner banner={BANNER} variant="banner" />,
    );
    const footer = renderToStaticMarkup(
      <ReferralBanner banner={BANNER} variant="footer" />,
    );

    expect(text(top)).toContain("Indique uma loja e ganhe");
    expect(text(top)).toContain(
      "30% da mensalidade (R$ 30,00) por até 3 meses",
    );
    expect(top).toContain('href="/indica/cadastro"');
    expect(text(footer)).toContain("Indique e ganhe R$ 30,00 por mês");
  });

  it("[IND-FR-014] programa desligado: nada aparece", () => {
    expect(
      renderToStaticMarkup(<ReferralBanner banner={null} variant="banner" />),
    ).toBe("");
  });
});

describe("telas do Caju Indica", () => {
  it("[IND-FR-001] [IND-FR-002] chamada com as regras, código, link, Copiar e WhatsApp", () => {
    const html = renderToStaticMarkup(
      <ReferralShare
        panel={{
          enabled: true,
          code: "RICARDO10",
          url: "https://cajugo.test/i/ricardo10",
          pctBps: 3000,
          months: 3,
        }}
      />,
    );

    const t = text(html);
    expect(t).toContain("Ganhe 30% da mensalidade de cada loja indicada");
    expect(t).toContain("Por até 3 meses");
    expect(t).toContain("RICARDO10");
    expect(t).toContain("https://cajugo.test/i/ricardo10");
    expect(html).toContain("https://wa.me/?text=");
    expect(t).toContain("Copiar");
  });

  it("[IND-FR-015] programa pausado: aviso, sem código", () => {
    const html = renderToStaticMarkup(
      <ReferralShare panel={{ enabled: false }} />,
    );

    expect(text(html)).toContain("O Caju Indica está pausado no momento.");
    expect(html).not.toContain("Copiar");
  });

  it("[IND-FR-005] [IND-FR-017] filtros com contagens; rendeu, meses que faltam e não válida", () => {
    const html = renderToStaticMarkup(
      <ReferralList
        basePath="/painel/conta"
        filter="todas"
        counts={{ all: 2, earning: 1, registered: 0, paused: 0 }}
        items={[
          {
            store: "Loja Boa",
            status: "active",
            earnedCents: 3_000,
            monthsLeft: 2,
          },
          {
            store: "Loja Mesma",
            status: "invalid",
            earnedCents: 0,
            monthsLeft: null,
          },
        ]}
      />,
    );

    const t = text(html);
    expect(t).toContain("Rendendo 1");
    expect(t).toContain("Rendeu R$ 30,00 · faltam 2 meses");
    expect(t).toContain("Não válida");
    expect(html).toContain('href="/painel/conta?filtro=pausadas"');
  });

  it("[IND-FR-009] [IND-FR-010] movimentações com data e valor", () => {
    const html = renderToStaticMarkup(
      <Movements
        items={[
          {
            label: "Indicação",
            amountCents: 3_000,
            date: new Date("2026-11-20T12:00:00Z"),
            note: "disponível",
          },
        ]}
      />,
    );

    expect(text(html)).toContain(
      "Indicação 20/11/2026 · disponível + R$ 30,00",
    );
  });
});
