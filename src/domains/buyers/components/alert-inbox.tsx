import Link from "next/link";
import { brDate } from "@/platform/br/date";
import { brl } from "@/platform/br/money";
import { EmptyState } from "@/ui/empty-state";
import type { AlertInbox as Inbox } from "../service";
import { MarkNotifiedButton } from "./mark-notified-button";

const card =
  "flex flex-col gap-2 rounded-card border border-line bg-surface p-4";

/**
 * Tela "Alertas" do admin (ALR-FR-002, ALR-FR-003): primeiro os que já têm veículo,
 * com o WhatsApp da pessoa; depois os que esperam, sem nome nem celular.
 */
export function AlertInbox({ inbox }: { inbox: Inbox }) {
  if (!inbox.matched.length && !inbox.waiting.length)
    return (
      <EmptyState icon="🔔" title="Nenhum alerta pendente">
        Quando alguém pedir &quot;Avisar quando chegar&quot; numa busca sem
        resultado, o pedido aparece aqui.
      </EmptyState>
    );
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="matched-title" className="flex flex-col gap-3">
        <h2 id="matched-title" className="text-[17px] font-extrabold">
          Com veículo ({inbox.matched.length})
        </h2>
        {inbox.matched.length === 0 && (
          <p className="text-sm text-text-2">
            Nenhum alerta com veículo compatível agora.
          </p>
        )}
        <ul className="grid gap-3 md:grid-cols-2">
          {inbox.matched.map((m) => {
            const v = m.vehicle;
            const title = [v.make, v.version ?? v.model, v.yearModel]
              .filter(Boolean)
              .join(" ");
            return (
              <li key={m.alertId} data-testid="alert-matched" className={card}>
                <p className="text-sm text-text-2">
                  {m.name} pediu em {brDate.format(m.createdAt)}
                </p>
                <p className="font-bold">{m.label}</p>
                <Link
                  href={v.path}
                  className="flex min-h-11 items-center text-sm font-semibold text-caju-deep underline"
                >
                  {title}
                  {v.priceCents !== null && ` · ${brl(v.priceCents)}`}
                </Link>
                <a
                  href={m.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="alert-whatsapp"
                  className="flex h-[50px] items-center justify-center rounded-button bg-whatsapp text-[15px] font-bold text-white"
                >
                  Avisar no WhatsApp
                </a>
                <MarkNotifiedButton alertId={m.alertId} />
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-labelledby="waiting-title" className="flex flex-col gap-3">
        <h2 id="waiting-title" className="text-[17px] font-extrabold">
          Aguardando ({inbox.waiting.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {inbox.waiting.map((w) => (
            <li key={w.alertId} data-testid="alert-waiting" className={card}>
              <p className="font-bold">{w.label}</p>
              <p className="text-sm text-text-2">
                Pedido em {brDate.format(w.createdAt)} · vence em{" "}
                {brDate.format(w.expiresAt)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
