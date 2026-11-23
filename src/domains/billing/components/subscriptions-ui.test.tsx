import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SubscriptionItem, SubscriptionsView } from "../service";
import { SubscriptionsAdmin } from "./subscriptions-admin";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock("../actions", () => ({
  suspendStoreAction: vi.fn(),
  reactivateStoreAction: vi.fn(),
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
  counts: { ok: 3, late: 1, suspended: 1 },
  plan: { name: "Plano Catálogo", membershipCents: 10_000, stores: 5 },
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
    expect(t).toContain("MRR R$ 500,00");
    expect(t).toContain("Em dia 3");
    expect(t).toContain("Atrasadas 1");
    expect(t).toContain("Suspensas 1");
    expect(t).toContain("R$ 100,00/mês · 5 lojas");
    expect(html).toContain('href="/admin/assinaturas?filtro=atrasadas"');
  });

  it("[SUB-FR-012] [SUB-FR-013] linhas por status, wa.me, Conferir, Suspender e Reativar", () => {
    const html = renderToStaticMarkup(<SubscriptionsAdmin view={view(true)} />);

    const t = text(html);
    expect(t).toContain("Em atraso 2 dias · R$ 100,00");
    expect(t).toContain("Catálogo e vitrine · Fora do ar");
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
});
