import { brDate } from "@/platform/br/date";
import { formatBrPhone } from "@/platform/br/phone";
import { EmptyState } from "@/ui/empty-state";
import type { AdminSeller, SellersAdmin } from "../service";
import { SELLER_STATUS_LABEL } from "../status";
import { ApproveButton, BlockButton, UnblockButton } from "./seller-decisions";

function Card({
  s,
  canDecide,
  kind,
}: {
  s: AdminSeller;
  canDecide: boolean;
  kind: "in_review" | "active" | "blocked";
}) {
  const doc = (side: "front" | "back", label: string) => (
    <a
      href={`/api/v1/sellers/${s.sellerId}/document/${side}`}
      target="_blank"
      rel="noopener"
      className="flex min-h-11 items-center text-sm font-bold text-caju-deep underline"
    >
      {label}
    </a>
  );
  return (
    <li
      data-testid={`seller-${kind}`}
      className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
    >
      <p className="font-bold">{s.name}</p>
      <p className="text-sm text-text-2">
        {s.city} · {s.phone ? formatBrPhone(s.phone) : "sem celular"}
      </p>
      <p className="text-sm text-text-2">
        CPF {s.cpf ?? "—"} · cadastro em {brDate.format(s.createdAt)}
      </p>
      {s.code && <p className="text-sm text-text-2">Código {s.code}</p>}
      {s.blockedReason && (
        <p className="text-sm text-caju-deep">Motivo: {s.blockedReason}</p>
      )}
      {kind === "in_review" &&
        (s.hasDocuments ? (
          <div className="flex gap-4">
            {doc("front", "Frente do documento")}
            {doc("back", "Verso do documento")}
          </div>
        ) : (
          <p className="text-sm text-text-3">Aguardando a foto do documento</p>
        ))}
      {canDecide && kind === "in_review" && (
        <ApproveButton sellerId={s.sellerId} ready={s.hasDocuments} />
      )}
      {canDecide && kind === "active" && (
        <BlockButton sellerId={s.sellerId} name={s.name} />
      )}
      {canDecide && kind === "blocked" && (
        <UnblockButton sellerId={s.sellerId} />
      )}
    </li>
  );
}

/**
 * Vendedores do admin [7h] (SEL-FR-003, 004, 005, SEL-SEC-005): indicadores, em
 * análise primeiro; o suporte vê tudo sem os botões de decisão.
 */
export function SellersAdminView({
  view,
  canDecide,
}: {
  view: SellersAdmin;
  canDecide: boolean;
}) {
  const sections = [
    ["in_review", view.inReview],
    ["active", view.active],
    ["blocked", view.blocked],
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-2 rounded-card bg-ink p-3 text-white">
        {sections.map(([kind]) => (
          <div key={kind} className="flex flex-col">
            <span
              className="text-[22px] font-extrabold"
              data-testid={`sellers-count-${kind}`}
            >
              {view.counts[kind]}
            </span>
            <span className="text-xs text-on-dark-2">
              {SELLER_STATUS_LABEL[kind]}
            </span>
          </div>
        ))}
      </div>
      {sections.map(([kind, list]) => (
        <section key={kind} className="flex flex-col gap-3">
          <h2 className="text-[17px] font-extrabold">
            {SELLER_STATUS_LABEL[kind]} ({list.length})
          </h2>
          {list.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {list.map((s) => (
                <Card
                  key={s.sellerId}
                  s={s}
                  kind={kind}
                  canDecide={canDecide}
                />
              ))}
            </ul>
          ) : kind === "in_review" ? (
            <EmptyState title="Nenhum cadastro em análise">
              Novos vendedores aparecem aqui para a curadoria.
            </EmptyState>
          ) : (
            <p className="text-sm text-text-2">Nenhum.</p>
          )}
        </section>
      ))}
    </div>
  );
}
