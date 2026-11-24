import type { Metadata } from "next";
import Link from "next/link";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { accountView, subscriptionCard } from "@/domains/billing/service";
import { leadsThisMonth } from "@/domains/leads/service";
import { Onboarding } from "@/domains/stores/components/onboarding";
import { onboardingStatus, storeIdentity } from "@/domains/stores/service";
import { VehicleList } from "@/domains/vehicles/components/vehicle-list";
import { storeAcceptsSellers } from "@/domains/sellers/service";
import { hasPublishedVehicle, listVehicles } from "@/domains/vehicles/service";
import { brl } from "@/platform/br/money";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";
import { Badge, type BadgeTone } from "@/ui/badge";
import { ButtonLink } from "@/ui/button";
import { cn } from "@/ui/cn";
import { EmptyState } from "@/ui/empty-state";
import { PlusIcon, SearchIcon } from "@/ui/icons";
import { Kpi } from "@/ui/kpi";
import { DarkHeader } from "@/ui/page-header";

export const metadata: Metadata = { title: "Meus veículos | CajuGo" };

const brDay = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});
const brMonth = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  month: "long",
});

const FILTERS = [
  ["all", "Todos"],
  ["published", "Publicados"],
  ["draft", "Rascunhos"],
  ["sold", "Vendidos"],
] as const;

/** Selo do card da assinatura no cabeçalho [1c]. */
const SUBSCRIPTION_BADGE: Record<string, [string, BadgeTone]> = {
  active: ["Em dia", "ok"],
  past_due: ["Atrasada", "warn"],
  suspended: ["Suspensa", "neutral"],
  cancel_scheduled: ["Cancelamento agendado", "caju"],
};

/** Ignora o 403 do usuário da loja: cobrança e leads do mês são do dono. */
const ownerOnly = <T,>(p: Promise<T>) =>
  p.catch((error: unknown) => {
    if (error instanceof AppError && error.status === 403) return null;
    throw error;
  });

async function Content({ searchParams }: PageProps<"/painel/veiculos">) {
  const { session, allowed, home } = await requireStorePage(
    "/painel/veiculos",
    "vehicles.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "all";
  const q = typeof sp.q === "string" ? sp.q : "";
  const db = getDb();
  const now = new Date();
  const [list, network, onboarding, card, account, contacts, store] =
    await Promise.all([
      listVehicles({ db }, session, { status, q }),
      // Rede Caju (009): "Vendido" leva à Confirmar venda em [6e].
      storeAcceptsSellers(db, session),
      onboardingStatus(db, session, {
        firstVehicle: session.storeId
          ? await hasPublishedVehicle(db, session.storeId)
          : false,
      }),
      ownerOnly(subscriptionCard({ db }, session)),
      ownerOnly(accountView({ db }, session)),
      ownerOnly(leadsThisMonth(db, session, now)),
      storeIdentity(db, session),
    ]);
  const cloud = cloudName();
  const href = (s: string) => {
    const p = new URLSearchParams();
    if (s !== "all") p.set("status", s);
    if (q) p.set("q", q);
    return `/painel/veiculos${p.size ? `?${p}` : ""}`;
  };
  const badge = card ? SUBSCRIPTION_BADGE[card.status] : undefined;
  const prevMonth = brMonth.format(
    new Date(now.getFullYear(), now.getMonth() - 1, 15),
  );
  const contactsHint =
    contacts && contacts.previous
      ? `${contacts.count >= contacts.previous ? "+" : ""}${contacts.count - contacts.previous} vs. ${prevMonth}`
      : undefined;
  const invoice = account?.current;

  return (
    <>
      <DarkHeader
        eyebrow={store?.name}
        title="Meus veículos"
        action={
          <ButtonLink href="/painel/veiculos/novo" size="sm">
            <PlusIcon size={16} />
            Novo veículo
          </ButtonLink>
        }
      >
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-4 lg:gap-3">
          <Kpi
            tone="dark"
            value={list.kpis.published}
            label="Publicados"
            hint={`${list.kpis.onCajugo} na vitrine CajuGo`}
            hintTone="muted"
            testId="kpi-Publicados"
          />
          <Kpi
            tone="dark"
            value={list.kpis.onCajugo}
            label="Na CajuGo"
            className="lg:hidden"
          />
          {contacts && (
            <Kpi
              tone="dark"
              value={contacts.count}
              label="Contatos no mês"
              hint={contactsHint}
              className="hidden lg:flex"
            />
          )}
          <Kpi
            tone="dark"
            value={list.kpis.soldThisMonth}
            label="Vendidos no mês"
          />
          {card && (
            <Kpi
              tone="dark"
              value={brl(invoice?.totalCents ?? card.membershipCents)}
              label="Próxima fatura"
              hint={
                (invoice?.dueAt ?? card.nextDueAt) &&
                `Vence ${brDay.format(invoice?.dueAt ?? card.nextDueAt!)} · Pix`
              }
              hintTone="warn"
              className="hidden lg:flex"
            />
          )}
        </div>
        {card && (
          <div
            data-testid="subscription-card"
            className="flex items-center justify-between gap-2.5 rounded-xl bg-ink-2 p-3 lg:hidden"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-[13px] font-bold">
                {card.plan} · {brl(card.membershipCents)}/mês
              </p>
              <p className="text-xs text-on-dark-2">
                {card.statusLabel}
                {card.nextDueAt &&
                  ` · próxima cobrança ${brDay.format(card.nextDueAt)}`}
              </p>
            </div>
            {badge && <Badge tone={badge[1]}>{badge[0]}</Badge>}
          </div>
        )}
      </DarkHeader>

      <section className="flex flex-col gap-3 pt-4 lg:pt-5">
        <Onboarding status={onboarding} />

        <form role="search">
          {status !== "all" && (
            <input type="hidden" name="status" value={status} />
          )}
          <label className="flex h-[46px] items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 text-text-3 focus-within:border-ink lg:max-w-md">
            <SearchIcon size={18} />
            <span className="sr-only">Buscar por modelo ou placa</span>
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Buscar por modelo ou placa"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-text-3"
            />
          </label>
        </form>

        <nav
          aria-label="Filtrar veículos"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0"
        >
          {FILTERS.map(([key, label]) => {
            const on =
              status === key ||
              (key === "all" &&
                !["published", "draft", "sold"].includes(status));
            return (
              <Link
                key={key}
                href={href(key)}
                aria-current={on ? "page" : undefined}
                className="flex h-11 flex-none items-center"
              >
                <span
                  className={cn(
                    "flex h-[34px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold",
                    on
                      ? "border-ink bg-ink text-white"
                      : "border-field bg-surface text-ink",
                  )}
                >
                  {label}
                  <span className="opacity-60">{list.counts[key]}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        {list.items.length ? (
          <VehicleList
            key={`${status}-${q}`}
            initial={list.items}
            nextCursor={list.nextCursor}
            status={status}
            q={q}
            cloudName={cloud}
            sellOnPage={network}
          />
        ) : q || status !== "all" ? (
          <p className="rounded-card border border-line bg-surface p-4 text-sm text-text-2">
            Nenhum veículo encontrado.
          </p>
        ) : (
          <EmptyState
            icon="🚗"
            title="Seu catálogo está vazio"
            action={
              <ButtonLink href="/painel/veiculos/novo">
                <PlusIcon size={18} />
                Cadastrar primeiro veículo
              </ButtonLink>
            }
          >
            Cadastre o primeiro veículo para ele aparecer no seu link e, se
            quiser, na vitrine CajuGo.
          </EmptyState>
        )}

        <Link
          href="/painel/veiculos/novo"
          className="fixed right-4 bottom-24 z-10 flex h-[54px] items-center gap-2 rounded-full bg-caju px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(232,85,30,.6)] lg:hidden"
        >
          <PlusIcon size={18} />
          Novo veículo
        </Link>
      </section>
    </>
  );
}

/** Meus veículos [1c]/[15b] com o onboarding [5e] (VEH-FR-001, 002, 010, 015). */
export default function VehiclesPage(props: PageProps<"/painel/veiculos">) {
  return (
    <AreaPage>
      <Content {...props} />
    </AreaPage>
  );
}
