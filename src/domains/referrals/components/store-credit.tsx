import { brl } from "@/platform/br/money";
import type { creditView } from "@/domains/billing/service";
import { Movements } from "./referral-views";

type CreditView = Awaited<ReturnType<typeof creditView>>;

const row = (label: string, value: string, strong = false) => (
  <div className="flex justify-between gap-3 py-1 text-sm">
    <dt className={strong ? "font-bold" : "text-text-2"}>{label}</dt>
    <dd className={strong ? "font-extrabold" : "font-semibold"}>{value}</dd>
  </div>
);

/** Crédito do lojista [8e] (IND-FR-009), dentro da Conta (012). */
export function StoreCredit({ view }: { view: CreditView }) {
  return (
    <>
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
      <section className="flex flex-col">
        <h3 className="text-[15px] font-extrabold">Próxima fatura</h3>
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
        <h3 className="text-[15px] font-extrabold">Movimentações</h3>
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
    </>
  );
}
