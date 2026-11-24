import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReferralBanner } from "./referral-banner";

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
