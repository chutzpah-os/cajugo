import { brDate } from "@/platform/br/date";
import { formatBrPhone } from "@/platform/br/phone";
import { EmptyState } from "@/ui/empty-state";
import type { ContactInboxItem } from "../service";
import { MarkHandledButton } from "./mark-handled-button";

/** Pedidos de contato pendentes [Contatos]: chamar no WhatsApp e marcar como atendido. */
export function ContactInbox({ items }: { items: ContactInboxItem[] }) {
  if (!items.length)
    return (
      <EmptyState title="Nenhum pedido pendente">
        Quando alguém pedir para ser avisado de um serviço ou pedir ajuda com a
        senha, o pedido aparece aqui.
      </EmptyState>
    );
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((c) => (
        <li
          key={c.id}
          data-testid="contact-request"
          className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
        >
          <p className="text-[12px] font-bold tracking-[0.06em] text-caju-deep uppercase">
            {c.topicLabel}
          </p>
          <p className="font-bold">{c.name}</p>
          <p className="text-sm text-text-2">
            {formatBrPhone(c.phone)}
            {c.email && ` · ${c.email}`}
          </p>
          <p className="text-sm text-text-3">
            Pedido em {brDate.format(c.createdAt)}
          </p>
          <a
            href={c.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[50px] items-center justify-center rounded-button bg-whatsapp text-[15px] font-bold text-white"
          >
            Chamar no WhatsApp
          </a>
          <MarkHandledButton requestId={c.id} />
        </li>
      ))}
    </ul>
  );
}
