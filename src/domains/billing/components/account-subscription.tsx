import Link from "next/link";
import { Badge, type BadgeTone } from "@/ui/badge";
import { brl, brlWhole } from "@/platform/br/money";
import type { AccountView } from "../service";
import { MONTHLY_PIX_PATH } from "./billing-alert";

const brDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

const STORE_TONE: Record<string, BadgeTone> = {
  active: "ok",
  cancel_scheduled: "caju",
  past_due: "warn",
  suspended: "warn",
  payment_review: "info",
};

const INVOICE_LABEL: Record<string, string> = {
  open: "Em aberto",
  late: "Em atraso",
  paid: "Paga",
  canceled: "Cancelada",
};

const INVOICE_TONE: Record<string, BadgeTone> = {
  open: "info",
  late: "warn",
  paid: "ok",
  canceled: "neutral",
};

/**
 * Assinatura, faturas e Como pagar na Conta do lojista [3c] (SUB-FR-010), como na
 * captura: card escuro "Sua assinatura" com o valor, a próxima cobrança, o pagamento,
 * a ação e a nota de cancelamento; depois a lista de Faturas.
 */
export function AccountSubscription({ view }: { view: AccountView }) {
  const { current } = view;
  const owes = current && current.status !== "paid";
  const rows = [...(current ? [current] : []), ...view.history];
  return (
    <div className="flex flex-col gap-4">
      <section
        aria-labelledby="assinatura"
        data-testid="subscription-card"
        className="flex flex-col gap-3.5 rounded-card bg-ink p-4 text-white"
      >
        <header className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-on-dark-2">Sua assinatura</p>
            <h2 id="assinatura" className="text-[17px] font-extrabold">
              {view.plan}
            </h2>
          </div>
          <Badge tone={STORE_TONE[view.status] ?? "neutral"}>
            {view.statusLabel}
          </Badge>
        </header>
        <p className="flex items-baseline gap-1">
          <span className="text-[30px] leading-none font-extrabold tracking-[-0.02em]">
            {brlWhole(view.membershipCents)}
          </span>
          <span className="text-[13px] text-on-dark-2">/mês</span>
        </p>
        <dl className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5">
            <dt className="text-[11px] text-on-dark-2">Próxima cobrança</dt>
            <dd className="text-sm font-bold">
              {view.nextDueAt ? brDate.format(view.nextDueAt) : "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-[11px] text-on-dark-2">Pagamento</dt>
            <dd className="text-sm font-bold">Pix manual</dd>
          </div>
        </dl>
        <Link
          href={owes ? MONTHLY_PIX_PATH : "/painel/fatura"}
          className="flex h-11 items-center justify-center rounded-xl bg-ink-2 text-sm font-bold"
        >
          {owes ? "Pagar com Pix" : "Ver a fatura"}
        </Link>
        <p className="text-xs leading-snug text-on-dark-2">
          Você pode cancelar a assinatura a qualquer momento. O catálogo fica no
          ar até o fim do mês já pago.
        </p>
      </section>

      <section aria-labelledby="faturas" className="flex flex-col gap-1">
        <header className="flex items-baseline justify-between gap-2">
          <h2 id="faturas" className="text-[17px] font-extrabold">
            Faturas
          </h2>
          <Link
            href="/painel/fatura"
            className="flex min-h-11 items-center text-sm font-bold text-caju-ink"
          >
            Ver a fatura
          </Link>
        </header>
        {rows.length ? (
          <ul className="flex flex-col divide-y divide-line-2">
            {current && (
              <li className="flex items-center justify-between gap-2 py-3 text-sm">
                <span className="flex flex-col">
                  <strong>
                    Mensalidade {current.reference} · {brl(current.totalCents)}
                  </strong>
                  <span className="text-xs text-text-3">
                    Vencimento {brDate.format(current.dueAt)}
                  </span>
                </span>
                <Badge tone={INVOICE_TONE[current.status]} size="sm">
                  {INVOICE_LABEL[current.status]}
                </Badge>
              </li>
            )}
            {view.history.map((h) => (
              <li
                key={h.reference}
                className="flex items-center justify-between gap-2 py-3 text-sm"
              >
                <strong>
                  {h.reference === "1ª mensalidade"
                    ? h.reference
                    : `Mensalidade ${h.reference}`}{" "}
                  · {brl(h.totalCents)}
                </strong>
                <Badge tone={INVOICE_TONE[h.status]} size="sm">
                  {h.statusLabel}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-text-2">
            A próxima fatura aparece 3 dias antes do vencimento.
          </p>
        )}
      </section>

      <section
        aria-labelledby="como-pagar"
        className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
      >
        <h2 id="como-pagar" className="text-base font-extrabold">
          Como pagar
        </h2>
        {view.howToPay.pixKey ? (
          <p className="text-sm text-text-2">
            Pix para a chave{" "}
            <strong className="font-mono break-all text-ink">
              {view.howToPay.pixKey}
            </strong>{" "}
            ({view.howToPay.beneficiary}). Depois, anexe o comprovante na
            fatura.
          </p>
        ) : (
          <p className="text-sm text-text-2">
            A chave Pix ainda não está disponível. Fale com a CajuGo.
          </p>
        )}
        <Link
          href={view.howToPay.supportUrl}
          className="flex min-h-11 items-center text-sm font-bold text-caju-ink"
        >
          Falar com o suporte no WhatsApp
        </Link>
      </section>
    </div>
  );
}
