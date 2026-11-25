import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminUserItem } from "@/domains/auth/service";
import { HideSheet } from "@/domains/moderation/components/hide-sheet";
import { ModeratedVehicle } from "@/domains/moderation/components/moderated-vehicle";
import type {
  ShowcaseAdminItem,
  ShowcaseFilter,
} from "@/domains/moderation/service";
import type {
  AdminStoreItem,
  AdminStoresView,
  StoreFilter,
} from "@/domains/stores/service";
import { brl } from "@/platform/br/money";
import { Badge, type BadgeTone } from "@/ui/badge";
import { EmptyState } from "@/ui/empty-state";
import { Initials } from "@/ui/initials";
import { Kpi } from "@/ui/kpi";
import { StoreCard } from "@/ui/store-card";

type Params = Record<string, string | undefined>;

/** Link da mesma tela com outros parâmetros (vazios saem da URL). */
function hrefWith(base: string, params: Params): string {
  const q = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => !!e[1]),
  ).toString();
  return q ? `${base}?${q}` : base;
}

/** Busca por GET: mantém a aba e o filtro, recomeça da 1ª página. */
function SearchForm({
  action,
  q,
  keep,
  placeholder,
}: {
  action: string;
  q: string;
  keep: Params;
  placeholder: string;
}) {
  return (
    <form action={action} role="search" className="flex gap-2">
      {Object.entries(keep).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-12 min-w-0 flex-1 rounded-input border border-field bg-surface px-3.5 text-[15px]"
      />
      <button
        type="submit"
        className="h-12 flex-none rounded-input bg-ink px-4 text-sm font-bold text-white"
      >
        Buscar
      </button>
    </form>
  );
}

function FilterChips<T extends string>({
  label,
  options,
  current,
  hrefOf,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  current: T;
  hrefOf: (value: T) => string;
}) {
  return (
    <nav
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0"
    >
      {options.map(([value, text]) => (
        <Link
          key={value}
          href={hrefOf(value)}
          aria-current={current === value ? "page" : undefined}
          className="group flex h-11 flex-none items-center"
        >
          <span className="flex h-[34px] items-center rounded-full border border-field bg-surface px-3.5 text-[13px] font-semibold group-aria-[current=page]:border-ink group-aria-[current=page]:bg-ink group-aria-[current=page]:text-white">
            {text}
          </span>
        </Link>
      ))}
    </nav>
  );
}

function NextPage({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <Link
      href={href}
      className="flex h-12 items-center justify-center rounded-input border border-field bg-surface text-sm font-bold"
    >
      Ver mais
    </Link>
  );
}

// ---------------------------------------------------------------- Lojas

const STORE_FILTERS: readonly (readonly [StoreFilter, string])[] = [
  ["todas", "Todas"],
  ["em-dia", "Em dia"],
  ["atrasadas", "Atrasadas"],
  ["suspensas", "Suspensas"],
  ["cadastradas", "Cadastradas"],
  ["cancelamento", "Cancelamento agendado"],
  ["canceladas", "Canceladas"],
];

const STORE_BADGE: Record<AdminStoreItem["status"], [string, BadgeTone]> = {
  registered: ["Cadastrada", "neutral"],
  payment_review: ["Em análise", "info"],
  active: ["Em dia", "ok"],
  past_due: ["Atrasada", "warn"],
  suspended: ["Suspensa", "neutral"],
  cancel_scheduled: ["Cancelando", "info"],
  canceled: ["Cancelada", "neutral"],
  archived: ["Arquivada", "neutral"],
};

const vehiclesLine = (s: AdminStoreItem) =>
  `${s.vehicles} ${s.vehicles === 1 ? "veículo" : "veículos"} · ${s.onCajugo} na CajuGo`;

/** Aba **Lojas** [1d] (ADM-FR-004): KPIs, Nova loja, busca, filtros e os cards. */
export function StoresTab({
  view,
  kpis,
  newStore,
}: {
  view: AdminStoresView;
  kpis: { active: number; mrrCents: number };
  /** Formulário recolhível de Nova loja (só admin). */
  newStore?: ReactNode;
}) {
  const base = "/admin/lojas";
  const keep = { filtro: view.filter === "todas" ? undefined : view.filter };
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 lg:max-w-xl lg:gap-3">
        <Kpi
          testId="kpi-active"
          value={kpis.active}
          label="Assinaturas ativas"
        />
        <Kpi
          testId="kpi-mrr"
          value={brl(kpis.mrrCents).replace(/,00$/, "")}
          label="Receita mensal"
        />
      </div>
      <h2 className="pt-2 text-lg font-extrabold">Lojas</h2>
      {newStore}
      <SearchForm
        action={base}
        q={view.q}
        keep={keep}
        placeholder="Buscar loja, cidade ou dono"
      />
      <FilterChips
        label="Filtrar lojas"
        options={STORE_FILTERS}
        current={view.filter}
        hrefOf={(f) =>
          hrefWith(base, { filtro: f === "todas" ? undefined : f, q: view.q })
        }
      />
      {view.items.length ? (
        <ul className="grid gap-3 md:grid-cols-2" data-testid="stores-list">
          {view.items.map((s) => {
            const [label, tone] = STORE_BADGE[s.status];
            return (
              <StoreCard
                key={s.storeId}
                testId="admin-store"
                name={s.name}
                subtitle={`${s.owner} · ${s.city}`}
                badge={
                  <Badge tone={tone} size="sm">
                    {label}
                  </Badge>
                }
                footer={vehiclesLine(s)}
                action={
                  <Link
                    href={`/admin/lojas/${s.storeId}`}
                    className="flex h-11 items-center text-[13px] font-bold text-caju-ink"
                    aria-label={`Gerenciar ${s.name}`}
                  >
                    Gerenciar
                  </Link>
                }
              />
            );
          })}
        </ul>
      ) : (
        <EmptyState icon="🏪" title="Nenhuma loja aqui">
          Nenhuma loja com essa busca ou filtro.
        </EmptyState>
      )}
      <NextPage
        href={
          view.next
            ? hrefWith(base, { ...keep, q: view.q, depois: view.next })
            : null
        }
      />
    </div>
  );
}

// ---------------------------------------------------------- Veículos CajuGo

export type ShowcaseAdminView = {
  items: ShowcaseAdminItem[];
  next: string | null;
  filter: ShowcaseFilter;
  q: string;
  counts: { reported: number; pending: number };
};

const reports = (n: number) => `${n} ${n === 1 ? "denúncia" : "denúncias"}`;

/**
 * Aba **Veículos CajuGo** [1d] (ADM-FR-006): texto do design, filtros Denunciados e
 * Aguardando aprovação, busca e a lista com **Ocultar** (o mesmo de [14e]).
 * `base` é a tela onde está (`/admin/lojas?aba=veiculos` ou `/admin/veiculos`).
 */
export function ShowcaseTab({
  view,
  cloudName,
  base,
  keep = {},
}: {
  view: ShowcaseAdminView;
  cloudName: string;
  base: string;
  keep?: Params;
}) {
  const filter = view.filter === "todos" ? undefined : view.filter;
  const options = [
    ["todos", "Na vitrine"],
    ["denunciados", `Denunciados ${view.counts.reported}`],
    ["aguardando", `Aguardando aprovação ${view.counts.pending}`],
  ] as const;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-2">
        Os veículos que as lojas divulgam na vitrine CajuGo. Oculte o que
        quebrar as regras: a loja é avisada com o motivo, e o veículo continua
        no catálogo dela.
      </p>
      <SearchForm
        action={base}
        q={view.q}
        keep={{ ...keep, filtro: filter }}
        placeholder="Buscar marca, modelo ou loja"
      />
      <FilterChips
        label="Filtrar veículos"
        options={options}
        current={view.filter}
        hrefOf={(f) =>
          hrefWith(base, {
            ...keep,
            filtro: f === "todos" ? undefined : f,
            q: view.q,
          })
        }
      />
      {view.items.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {view.items.map((i) => (
            <li
              key={i.vehicle.id}
              data-testid="admin-vehicle"
              className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3.5"
            >
              <ModeratedVehicle vehicle={i.vehicle} cloudName={cloudName} />
              {(i.openReports > 0 || i.pendingApproval) && (
                <div className="flex flex-wrap gap-1.5">
                  {i.openReports > 0 && (
                    <Link href="/admin/denuncias" className="flex h-8">
                      <Badge tone="caju" size="sm">
                        {reports(i.openReports)}
                      </Badge>
                    </Link>
                  )}
                  {i.pendingApproval && (
                    <Badge tone="warn" size="sm">
                      Aguardando aprovação
                    </Badge>
                  )}
                </div>
              )}
              {!i.pendingApproval && <HideSheet vehicleId={i.vehicle.id} />}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="🚗" title="Nenhum veículo aqui">
          Nenhum veículo com essa busca ou filtro.
        </EmptyState>
      )}
      <NextPage
        href={
          view.next
            ? hrefWith(base, {
                ...keep,
                filtro: filter,
                q: view.q,
                depois: view.next,
              })
            : null
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------- Usuários

/** Aba **Usuários** [1d] (ADM-FR-007): sigla, nome, loja ou informação e os selos. */
export function UsersTab({
  view,
}: {
  view: { items: AdminUserItem[]; next: string | null; q: string };
}) {
  const base = "/admin/lojas";
  return (
    <div className="flex flex-col gap-3">
      <SearchForm
        action={base}
        q={view.q}
        keep={{ aba: "usuarios" }}
        placeholder="Buscar por nome ou e-mail"
      />
      {view.items.length ? (
        <ul className="flex flex-col gap-2">
          {view.items.map((u) => {
            const body = (
              <>
                <Initials name={u.name} />
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-[15px] font-extrabold">
                    {u.name}
                  </span>
                  <span className="truncate text-xs text-text-3">{u.info}</span>
                </span>
                <span className="flex flex-wrap justify-end gap-1">
                  {u.badges.map((b) => (
                    <Badge key={b} tone="neutral" size="sm">
                      {b}
                    </Badge>
                  ))}
                </span>
              </>
            );
            const box =
              "flex min-h-16 items-center gap-3 rounded-card border border-line bg-surface p-3.5";
            return (
              <li key={u.profileId} data-testid="admin-user">
                {u.href ? (
                  <Link href={u.href} className={box}>
                    {body}
                  </Link>
                ) : (
                  <div className={box}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon="👤" title="Nenhuma conta aqui">
          Nenhuma conta com essa busca.
        </EmptyState>
      )}
      <NextPage
        href={
          view.next
            ? hrefWith(base, { aba: "usuarios", q: view.q, depois: view.next })
            : null
        }
      />
    </div>
  );
}
