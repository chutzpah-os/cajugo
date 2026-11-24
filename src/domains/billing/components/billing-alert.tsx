import Link from "next/link";
import { brl } from "@/platform/br/money";
import type { BillingAlert } from "../service";
import { UndoCancelButton } from "./cancellation";

const brDay = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

const days = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

/** Onde o lojista paga a fatura mensal ([6c] da 011). */
export const MONTHLY_PIX_PATH = "/painel/fatura/pix";

/** Alerta da fatura no topo do painel (SUB-FR-006, 007, 009; [12f]). */
export function BillingAlertBanner({ alert }: { alert: BillingAlert | null }) {
  if (!alert) return null;
  // Cancelamento agendado (CAN-FR-003): o fim e o Desfazer, só para o dono.
  if (alert.kind === "ending")
    return (
      <div
        role="status"
        className="mt-3 flex flex-col gap-1 rounded-card bg-warn-soft p-4 text-sm text-warn"
      >
        <strong className="block">
          {alert.canUndo
            ? `Sua assinatura termina em ${brDay.format(alert.until)}`
            : `A assinatura da loja termina em ${brDay.format(alert.until)}`}
        </strong>
        A loja continua no ar até lá. Depois, catálogo e veículos saem do ar.
        {alert.canUndo && <UndoCancelButton />}
      </div>
    );
  const [title, text] =
    alert.kind === "due"
      ? [
          `Sua fatura vence em ${brDay.format(alert.dueAt)} · ${brl(alert.totalCents)}`,
          "Pague até o vencimento para a sua loja continuar no ar.",
        ]
      : alert.kind === "late"
        ? [
            `Fatura em atraso há ${days(alert.days)} · ${brl(alert.totalCents)}`,
            "Sua loja continua no ar por enquanto. Pague para evitar a suspensão.",
          ]
        : [
            alert.kind === "suspended"
              ? `Loja suspensa · ${days(alert.days)} de atraso · ${brl(alert.totalCents)}`
              : "Loja suspensa por falta de pagamento",
            "Seus veículos não aparecem para o público até o pagamento ser confirmado. Você continua editando a loja e os veículos.",
          ];
  const canPay = alert.kind !== "suspended_staff";
  return (
    <div
      role="alert"
      className={`mt-3 rounded-card p-4 text-sm ${
        alert.kind === "due"
          ? "bg-info-soft text-info"
          : "bg-warn-soft text-warn"
      }`}
    >
      <strong className="block">{title}</strong>
      {text}
      {canPay && (
        <Link
          href={MONTHLY_PIX_PATH}
          className="mt-1 flex min-h-11 items-center font-bold underline underline-offset-2"
        >
          Pagar agora
        </Link>
      )}
    </div>
  );
}
