import Link from "next/link";
import type { ReactNode } from "react";
import { brlWhole } from "@/platform/br/money";
import { cn } from "@/ui/cn";
import { ChevronRightIcon } from "@/ui/icons";
import { Kpi } from "@/ui/kpi";
import type { AdminDashboard, AttentionTone } from "../service";

const TONE: Record<AttentionTone, string> = {
  caju: "bg-caju-soft text-caju-deep",
  warn: "bg-warn-soft text-warn",
  danger: "bg-caju-soft text-caju-deep",
  info: "bg-info-soft text-info",
  neutral: "bg-neutral-soft text-text-2",
};

const n = new Intl.NumberFormat("pt-BR");

/** "+13% vs. novembro" / "−5% vs. novembro"; sem base, nada. */
function vs(pct: number | null, previousMonth: string): string | undefined {
  if (pct === null) return undefined;
  const sign = pct >= 0 ? "+" : "−";
  return `${sign}${Math.abs(pct)}% vs. ${previousMonth}`;
}

function Card({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        "flex flex-col gap-3 rounded-card border border-line bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-extrabold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * Painel do admin [4a] no celular e Visão geral [15c] no desktop (ADM-FR-001…003,
 * ADM-FR-013). As filas inline do desktop chegam prontas da rota (`queues`).
 */
export function AdminDashboardView({
  view,
  previousMonth,
  queues,
}: {
  view: AdminDashboard;
  /** Nome do mês anterior, para "vs. novembro". */
  previousMonth: string;
  queues?: ReactNode;
}) {
  const k = view.kpis;
  const total = view.leadOrigin.cajugo + view.leadOrigin.catalogs;
  const cajugoPct = total
    ? Math.round((view.leadOrigin.cajugo / total) * 100)
    : 0;
  return (
    <div className="flex flex-col gap-3 pt-3 lg:gap-5 lg:pt-5">
      {/* KPIs: [4a] Lojas, Receita, Veículos, Leads; [15c] troca Leads por Em atraso. */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        <Kpi
          testId="kpi-stores"
          value={n.format(k.activeStores)}
          label="Lojas ativas"
          hint={
            k.newStoresThisMonth ? `+${k.newStoresThisMonth} no mês` : undefined
          }
        />
        <Kpi
          testId="kpi-mrr"
          value={brlWhole(k.mrrCents)}
          label="Receita mensal"
          hint={vs(k.revenueChangePct, previousMonth)}
          hintTone={
            k.revenueChangePct !== null && k.revenueChangePct < 0
              ? "caju"
              : "ok"
          }
        />
        <Kpi
          testId="kpi-late"
          className="hidden lg:flex"
          value={n.format(k.lateCount)}
          label="Em atraso"
          hint={
            k.lateNames.length ? k.lateNames.slice(0, 2).join(", ") : undefined
          }
          hintTone="caju"
        />
        <Kpi
          testId="kpi-showcase"
          value={n.format(k.vehiclesOnShowcase)}
          label="Veículos na vitrine"
          hint={
            k.openReports
              ? `${k.openReports} ${k.openReports === 1 ? "denúncia aberta" : "denúncias abertas"}`
              : k.publishedThisMonth
                ? `+${k.publishedThisMonth} no mês`
                : undefined
          }
          hintTone={k.openReports ? "warn" : "ok"}
        />
        <Kpi
          testId="kpi-leads"
          className="lg:hidden"
          value={n.format(k.leadsThisMonth)}
          label="Leads no mês"
          hint={vs(k.leadsChangePct, previousMonth)}
          hintTone={
            k.leadsChangePct !== null && k.leadsChangePct < 0 ? "caju" : "ok"
          }
        />
      </div>

      {/* Desktop em 2 colunas sem buraco: filas e atenção à esquerda, leads à direita. */}
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
        <div className="flex flex-col gap-3 lg:gap-5">
          {queues && <div className="hidden lg:contents">{queues}</div>}
          {view.attention.length > 0 && (
            <Card title="Precisa de atenção">
              <ul className="-mx-4 divide-y divide-line-2 border-t border-line-2">
                {view.attention.map((a) => (
                  <li key={a.key}>
                    <Link
                      href={a.href}
                      data-testid={`attention-${a.key}`}
                      className="flex min-h-14 items-center gap-3 px-4 py-2.5"
                    >
                      <span
                        className={cn(
                          "flex size-8 flex-none items-center justify-center rounded-lg text-sm font-extrabold",
                          TONE[a.tone],
                        )}
                      >
                        {a.count}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[15px] font-bold">{a.title}</span>
                        <span className="truncate text-xs text-text-3">
                          {a.detail}
                        </span>
                      </span>
                      <ChevronRightIcon
                        size={16}
                        className="flex-none text-text-3"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:gap-5">
          <Card
            title="Origem dos leads"
            aside={
              <span className="text-xs text-text-3">
                {n.format(total)} no mês
              </span>
            }
          >
            <div
              role="img"
              aria-label={`Vitrine CajuGo ${cajugoPct}%, Catálogos ${total ? 100 - cajugoPct : 0}%`}
              className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-line-2"
            >
              {total > 0 && (
                <>
                  <span
                    className="bg-caju"
                    style={{ width: `${cajugoPct}%` }}
                  />
                  <span className="flex-1 bg-ink" />
                </>
              )}
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-sm bg-caju" />
                Vitrine CajuGo <strong>{cajugoPct}%</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-sm bg-ink" />
                Catálogos <strong>{total ? 100 - cajugoPct : 0}%</strong>
              </span>
            </div>
          </Card>

          <Card title="Lojas com mais leads">
            {view.topStores.length === 0 ? (
              <p className="text-sm text-text-2">Nenhum lead no mês ainda.</p>
            ) : (
              <ol className="-mx-4 divide-y divide-line-2 border-t border-line-2">
                {view.topStores.map((s, i) => (
                  <li key={s.storeId}>
                    <div className="flex min-h-11 items-center gap-3 px-4 text-sm">
                      <span className="w-5 text-text-3">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {s.name}
                      </span>
                      <span className="font-extrabold">
                        {n.format(s.leads)}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
