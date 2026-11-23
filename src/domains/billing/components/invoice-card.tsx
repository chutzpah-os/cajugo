import { Badge, type BadgeTone } from "@/ui/badge";
import { brl } from "@/platform/br/money";
import type { InvoiceCard as Invoice } from "../service";

const brDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

const STATUS: Record<Invoice["status"], [string, BadgeTone]> = {
  open: ["Em aberto", "info"],
  late: ["Em atraso", "warn"],
  paid: ["Paga", "ok"],
  canceled: ["Cancelada", "neutral"],
};

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <dt className="text-text-2">{label}</dt>
      <dd className="font-semibold whitespace-nowrap">{value}</dd>
    </div>
  );
}

/** Uma fatura [10c]: mensalidade, cada taxa CajuGo, crédito, total e vencimento. */
export function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const [label, tone] = STATUS[invoice.status];
  return (
    <article className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-extrabold">
          Mensalidade {invoice.reference}
        </h2>
        <Badge tone={tone}>{label}</Badge>
      </header>
      <dl className="flex flex-col">
        <Line label="Plano Catálogo" value={brl(invoice.membershipCents)} />
        {invoice.fees.map((fee, i) => (
          <Line
            key={i}
            label={`Taxa CajuGo · ${fee.vehicle} · ${brDate.format(fee.date)}`}
            value={brl(fee.cents)}
          />
        ))}
        <Line
          label="Crédito"
          value={invoice.creditCents ? `− ${brl(invoice.creditCents)}` : brl(0)}
        />
        <div className="mt-1 flex justify-between gap-3 border-t border-line pt-2">
          <dt className="font-bold">Total</dt>
          <dd className="text-[17px] font-extrabold">
            {brl(invoice.totalCents)}
          </dd>
        </div>
      </dl>
      <p className="text-sm text-text-2">
        Vencimento {brDate.format(invoice.dueAt)}
        {invoice.status === "late" &&
          ` · em atraso há ${invoice.daysLate} ${invoice.daysLate === 1 ? "dia" : "dias"}`}
      </p>
    </article>
  );
}
