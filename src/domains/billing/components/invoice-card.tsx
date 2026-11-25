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

function Line({
  label,
  hint,
  value,
  tone,
}: {
  label: string;
  hint?: string;
  value: string;
  tone?: "ok";
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <dt className="flex flex-col text-sm">
        {label}
        {hint && <span className="text-xs text-text-3">{hint}</span>}
      </dt>
      <dd
        className={
          tone === "ok"
            ? "text-sm font-extrabold whitespace-nowrap text-ok"
            : "text-sm font-extrabold whitespace-nowrap"
        }
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Uma fatura [10c], como na captura: mensalidade, cada taxa CajuGo com o veículo e a
 * data, o crédito em verde, o total e o vencimento.
 */
export function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const [label, tone] = STATUS[invoice.status];
  return (
    <article className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-base font-extrabold">
          Mensalidade {invoice.reference}
        </h2>
        <Badge tone={tone}>{label}</Badge>
      </header>
      <dl className="flex flex-col border-t border-line-2 pt-1.5">
        <Line label="Plano Catálogo" value={brl(invoice.membershipCents)} />
        {invoice.fees.map((fee, i) => (
          <Line
            key={i}
            label={`Taxa CajuGo · ${fee.vehicle} · ${brDate.format(fee.date)}`}
            hint="Venda via vendedor da Rede Caju"
            value={brl(fee.cents)}
          />
        ))}
        <Line
          label="Crédito"
          hint={
            invoice.creditCents ? "Caju Indica e créditos da loja" : undefined
          }
          value={invoice.creditCents ? `– ${brl(invoice.creditCents)}` : brl(0)}
          tone={invoice.creditCents ? "ok" : undefined}
        />
        <div className="mt-1 flex justify-between gap-3 border-t border-line-2 pt-2">
          <dt className="font-bold">Total</dt>
          <dd className="text-[17px] font-extrabold">
            {brl(invoice.totalCents)}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-text-3">
        Vencimento {brDate.format(invoice.dueAt)}
        {invoice.status === "late" &&
          ` · em atraso há ${invoice.daysLate} ${invoice.daysLate === 1 ? "dia" : "dias"}`}
      </p>
    </article>
  );
}
