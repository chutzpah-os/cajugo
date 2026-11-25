import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SubscriptionItem, SubscriptionsView } from "../service";
import { SubscriptionsAdmin } from "./subscriptions-admin";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock("../actions", () => ({
  suspendStoreAction: vi.fn(),
  reactivateStoreAction: vi.fn(),
  editPlanAction: vi.fn(),
}));

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const item = (
  over: Partial<SubscriptionItem> & Pick<SubscriptionItem, "line" | "status">,
): SubscriptionItem => ({
  storeId: crypto.randomUUID(),
  name: "Loja B",
  slug: "loja-b",
  owner: "Bia",
  since: new Date("2026-03-01T12:00:00Z"),
  whatsappUrl: "https://wa.me/5579999990000?text=oi",
  canSuspend: false,
  canReactivate: false,
  ...over,
});

const view = (decide: boolean): SubscriptionsView => ({
  filter: "todas",
  mrrCents: 50_000,
  counts: { ok: 3, late: 1, suspended: 1, canceling: 0, canceled: 0 },
  plan: {
    name: "Plano Catálogo",
    membershipCents: 10_000,
    stores: 5,
    upcoming: null,
    canEdit: decide,
    earliestChange: "2027-01-14",
  },
  dueSoon: [],
  items: [
    item({
      status: "past_due",
      line: { kind: "late", days: 2, amountCents: 10_000 },
      canSuspend: decide,
    }),
    item({
      name: "Loja S",
      status: "suspended",
      line: { kind: "suspended", days: 9, amountCents: 10_000 },
      canReactivate: decide,
    }),
    item({
      name: "Loja R",
      status: "active",
      line: { kind: "review", submittedAt: new Date("2026-12-11T15:00:00Z") },
    }),
  ],
});

describe("assinaturas do admin [4b]", () => {
  it("[SUB-FR-011] MRR, contagens, plano e os filtros", () => {
    const html = renderToStaticMarkup(<SubscriptionsAdmin view={view(true)} />);

    const t = text(html);
    expect(t).toContain("R$ 500,00 receita mensal recorrente");
    expect(t).toContain("3 Em dia");
    expect(t).toContain("1 Atrasadas");
    expect(t).toContain("1 Suspensas");
    expect(t).toContain("R$ 100,00/mês · 5 lojas");
    expect(html).toContain('href="/admin/assinaturas?filtro=atrasadas"');
  });

  it("[SUB-FR-012] [SUB-FR-013] linhas por status, wa.me, Conferir, Suspender e Reativar", () => {
    const html = renderToStaticMarkup(<SubscriptionsAdmin view={view(true)} />);

    const t = text(html);
    expect(t).toContain("Em atraso 2 dias · R$ 100,00");
    expect(t).toContain("Catálogo e vitrine Fora do ar");
    expect(t).toContain("Comprovante enviado 11/12");
    expect(html).toContain('href="/admin/pagamentos"');
    expect(html).toContain('href="https://wa.me/5579999990000?text=oi"');
    expect(html).toContain('data-testid="subscription-suspend"');
    expect(html).toContain('data-testid="subscription-reactivate"');
  });

  it("[SUB-SEC-003] suporte vê tudo sem Suspender nem Reativar", () => {
    const html = renderToStaticMarkup(
      <SubscriptionsAdmin view={view(false)} />,
    );

    expect(html).not.toContain("subscription-suspend");
    expect(html).not.toContain("subscription-reactivate");
    expect(html).toContain("wa.me");
  });

  it("[CAN-FR-010] [CAN-NFR-001] filtros Cancelamento agendado e Canceladas; linha com o fim e o motivo", () => {
    const html = renderToStaticMarkup(
      <SubscriptionsAdmin
        view={{
          ...view(true),
          filter: "cancelamento",
          items: [
            item({
              name: "Loja A",
              status: "cancel_scheduled",
              whatsappUrl: null,
              line: {
                kind: "canceling",
                until: new Date("2026-12-10T03:00:00Z"),
                reason: "Vou parar de vender",
              },
            }),
            item({
              name: "Loja C",
              status: "canceled",
              whatsappUrl: null,
              line: {
                kind: "canceled",
                at: new Date("2026-11-30T12:00:00Z"),
                reason: null,
              },
            }),
          ],
        }}
      />,
    );

    const t = text(html);
    expect(html).toContain('href="/admin/assinaturas?filtro=cancelamento"');
    expect(html).toContain('href="/admin/assinaturas?filtro=canceladas"');
    expect(t).toContain("Cancelamento agendado");
    expect(t).toContain("Termina em 10/12 Vou parar de vender");
    expect(t).toContain("Cancelada em 30/11");
  });

  it("[CAN-FR-011] [CAN-SEC-002] Editar plano só para o admin; mudança agendada aparece para todos", () => {
    const upcoming = {
      membershipCents: 12_000,
      validFrom: new Date("2027-02-01T03:00:00Z"),
    };
    const admin = renderToStaticMarkup(
      <SubscriptionsAdmin
        view={{ ...view(true), plan: { ...view(true).plan, upcoming } }}
      />,
    );
    const support = renderToStaticMarkup(
      <SubscriptionsAdmin
        view={{ ...view(false), plan: { ...view(false).plan, upcoming } }}
      />,
    );

    expect(admin).toContain('data-testid="edit-plan"');
    expect(admin).toContain('min="2027-01-14"');
    expect(text(support)).toContain("Passa a R$ 120,00 a partir de 01/02/2027");
    expect(support).not.toContain('data-testid="edit-plan"');
  });
});
