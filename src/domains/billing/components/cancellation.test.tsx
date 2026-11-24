import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BillingAlertBanner } from "./billing-alert";
import { CancelSubscription } from "./cancellation";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh() {}, push() {} }),
}));
vi.mock("../actions", () => ({
  cancelSubscriptionAction: vi.fn(),
  undoCancelAction: vi.fn(),
  resubscribeAction: vi.fn(),
}));

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const DUE = new Date("2026-12-10T03:00:00Z");
const REASONS = ["Vou parar de vender", "Outro motivo"];

describe("cancelamento na Conta [3c] e [12h]", () => {
  it("[CAN-FR-001] [CAN-FR-002] [12h]: no ar até o fim do período, retenção, crédito que expira, desfazer até a data e o motivo opcional", () => {
    const html = renderToStaticMarkup(
      <CancelSubscription
        cancel={{
          kind: "available",
          until: DUE,
          retentionDays: 90,
          creditCents: 3000,
        }}
        reasons={REASONS}
      />,
    );

    const t = text(html);
    expect(t).toContain("Cancelar assinatura");
    expect(t).toContain("Sua loja fica no ar até 10/12/2026");
    expect(t).toContain("guardados por 90 dias");
    expect(t).toContain("O crédito não usado (R$ 30,00) expira.");
    expect(t).toContain("Você pode desfazer até 10/12/2026.");
    expect(t).toContain("Motivo (opcional)");
    expect(t).toContain("Vou parar de vender");
  });

  it("[CAN-FR-009] em atraso: sai do ar agora e as faturas em aberto são canceladas, sem data para desfazer", () => {
    const t = text(
      renderToStaticMarkup(
        <CancelSubscription
          cancel={{
            kind: "available",
            until: null,
            retentionDays: 90,
            creditCents: 0,
          }}
          reasons={REASONS}
        />,
      ),
    );

    expect(t).toContain("a loja sai do ar agora");
    expect(t).not.toContain("Você pode desfazer");
  });

  it("[CAN-FR-003] agendado: 'Sua assinatura termina em' com Desfazer cancelamento", () => {
    const t = text(
      renderToStaticMarkup(
        <CancelSubscription
          cancel={{ kind: "scheduled", until: DUE, reason: null }}
          reasons={REASONS}
        />,
      ),
    );

    expect(t).toContain("Sua assinatura termina em 10/12/2026");
    expect(t).toContain("Desfazer cancelamento");
  });

  it("[CAN-FR-006] cancelada: Reassinar", () => {
    const t = text(
      renderToStaticMarkup(
        <CancelSubscription
          cancel={{ kind: "canceled", at: DUE }}
          reasons={REASONS}
        />,
      ),
    );

    expect(t).toContain("Assinatura cancelada em 10/12/2026");
    expect(t).toContain("Reassinar");
  });

  it("[CAN-FR-003] [CAN-FR-012] aviso do painel: termina em dd/mm; Desfazer só para o dono", () => {
    const owner = text(
      renderToStaticMarkup(
        <BillingAlertBanner
          alert={{ kind: "ending", until: DUE, canUndo: true }}
        />,
      ),
    );
    const staff = text(
      renderToStaticMarkup(
        <BillingAlertBanner
          alert={{ kind: "ending", until: DUE, canUndo: false }}
        />,
      ),
    );

    expect(owner).toContain("Sua assinatura termina em 10/12");
    expect(owner).toContain("Desfazer cancelamento");
    expect(owner).not.toContain("Pagar agora");
    expect(staff).toContain("A assinatura da loja termina em 10/12");
    expect(staff).not.toContain("Desfazer");
  });
});
