import Link from "next/link";
import { Badge, type BadgeTone } from "@/ui/badge";
import { ButtonLink } from "@/ui/button";
import { brl } from "@/platform/br/money";
import type { AccountView } from "../service";
import { MONTHLY_PIX_PATH } from "./billing-alert";

const brDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

const STORE_TONE: Record<string, BadgeTone> = {
  active: "ok",
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

/** Assinatura, Como pagar e faturas na Conta do lojista [3c] (SUB-FR-010). */
export function AccountSubscription({ view }: { view: AccountView }) {
  const { current } = view;
  const owes = current && current.status !== "paid";
  return (
    <div className="flex flex-col gap-4">
      <section
        aria-labelledby="assinatura"
        className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
      >
        <header className="flex items-center justify-between gap-2">
          <h2 id="assinatura" className="text-[17px] font-extrabold">
            {view.plan}
          </h2>
          <Badge tone={STORE_TONE[view.status] ?? "neutral"}>
            {view.statusLabel}
          </Badge>
        </header>
        <p className="text-sm text-text-2">
          {brl(view.membershipCents)}/mês
          {view.nextDueAt &&
            ` · Próxima cobrança ${brDate.format(view.nextDueAt)}`}
        </p>
      </section>

      <section
        aria-labelledby="como-pagar"
        className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
      >
        <h2 id="como-pagar" className="text-[17px] font-extrabold">
          Como pagar
        </h2>
        {view.howToPay.pixKey ? (
          <p className="text-sm text-text-2">
            Pix para a chave{" "}
            <strong className="break-all text-ink">
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
          className="flex min-h-11 items-center text-sm font-bold text-caju-ink underline underline-offset-2"
        >
          Falar com o suporte no WhatsApp
        </Link>
      </section>

      <section
        aria-labelledby="fatura"
        className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
      >
        <h2 id="fatura" className="text-[17px] font-extrabold">
          Fatura do mês
        </h2>
        {current ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm">
              <strong className="block">
                Mensalidade {current.reference} · {brl(current.totalCents)}
              </strong>
              <span className="text-text-2">
                Vencimento {brDate.format(current.dueAt)}
              </span>
            </p>
            <Badge tone={INVOICE_TONE[current.status]}>
              {INVOICE_LABEL[current.status]}
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-text-2">
            A próxima fatura aparece 3 dias antes do vencimento.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/painel/fatura" variant="ghost">
            Ver a fatura
          </ButtonLink>
          {owes && (
            <ButtonLink href={MONTHLY_PIX_PATH}>Pagar com Pix</ButtonLink>
          )}
        </div>
      </section>

      {view.history.length > 0 && (
        <section aria-labelledby="anteriores" className="flex flex-col gap-2">
          <h2 id="anteriores" className="text-[17px] font-extrabold">
            Faturas anteriores
          </h2>
          <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
            {view.history.map((h) => (
              <li
                key={h.reference}
                className="flex items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span>
                  {h.reference === "1ª mensalidade"
                    ? h.reference
                    : `Mensalidade ${h.reference}`}{" "}
                  · {brl(h.totalCents)}
                </span>
                <Badge tone={INVOICE_TONE[h.status]}>{h.statusLabel}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
