import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { creditView } from "@/domains/billing/service";
import { Movements } from "@/domains/referrals/components/referral-views";
import { brl } from "@/platform/br/money";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = {
  title: "Meu crédito | CajuGo",
  robots: { index: false, follow: false },
};

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/painel/indica/credito",
    "billing.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  const view = await creditView({ db: getDb() }, session);
  const row = (label: string, value: string, strong = false) => (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <dt className={strong ? "font-bold" : "text-text-2"}>{label}</dt>
      <dd className={strong ? "font-extrabold" : "font-semibold"}>{value}</dd>
    </div>
  );
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Meu crédito</h1>
      <div className="rounded-card bg-ink p-4 text-white">
        <p className="text-sm text-on-dark-2">Crédito disponível</p>
        <p
          className="text-[26px] font-extrabold"
          data-testid="credit-available"
        >
          {brl(view.availableCents)}
        </p>
        <p className="text-sm text-on-dark-2">Abatido na próxima fatura.</p>
      </div>
      <section className="rounded-card border border-line bg-surface p-4">
        <h2 className="text-[17px] font-extrabold">Próxima fatura</h2>
        <dl className="flex flex-col">
          {row("Mensalidade", brl(view.nextInvoice.membershipCents))}
          {row("Crédito", `− ${brl(view.nextInvoice.creditCents)}`)}
          {row("Total", brl(view.nextInvoice.totalCents), true)}
        </dl>
        <p className="mt-1 text-xs text-text-3">
          Sem as taxas da Rede Caju, que entram na fatura quando ela abre.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-[17px] font-extrabold">Movimentações</h2>
        <Movements
          items={view.movements.map((m) => ({
            label: m.label,
            amountCents: m.amountCents,
            date: m.date,
            note: m.appliedIn
              ? `abatido na fatura ${m.appliedIn}`
              : "disponível",
          }))}
        />
      </section>
    </section>
  );
}

/** Crédito do lojista [8e] (IND-FR-009). */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
