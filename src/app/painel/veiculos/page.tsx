import type { Metadata } from "next";
import Link from "next/link";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { subscriptionCard } from "@/domains/billing/service";
import { Onboarding } from "@/domains/stores/components/onboarding";
import { onboardingStatus } from "@/domains/stores/service";
import { VehicleCard } from "@/domains/vehicles/components/vehicle-card";
import { hasPublishedVehicle, listVehicles } from "@/domains/vehicles/service";
import { brl } from "@/platform/br/money";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";
import { ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";

export const metadata: Metadata = { title: "Meus veículos | CajuGo" };

const brDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

const FILTERS = [
  ["all", "Todos"],
  ["published", "Publicados"],
  ["draft", "Rascunhos"],
  ["sold", "Vendidos"],
] as const;

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
  const [list, onboarding, card] = await Promise.all([
    listVehicles({ db }, session, { status, q }),
    onboardingStatus(db, session, {
      firstVehicle: session.storeId
        ? await hasPublishedVehicle(db, session.storeId)
        : false,
    }),
    // Cobrança é só do lojista; o usuário da loja não vê o card.
    subscriptionCard({ db }, session).catch((error: unknown) => {
      if (error instanceof AppError && error.status === 403) return null;
      throw error;
    }),
  ]);
  const cloud = cloudName();
  const href = (s: string) => {
    const p = new URLSearchParams();
    if (s !== "all") p.set("status", s);
    if (q) p.set("q", q);
    return `/painel/veiculos${p.size ? `?${p}` : ""}`;
  };

  return (
    <section className="flex flex-col gap-4 py-6 pb-24">
      <h1 className="text-[22px] font-extrabold">Meus veículos</h1>
      <Onboarding status={onboarding} />

      <div className="grid grid-cols-3 gap-2 rounded-card bg-ink p-3 text-white">
        {(
          [
            ["Publicados", list.kpis.published],
            ["Na CajuGo", list.kpis.onCajugo],
            ["Vendidos no mês", list.kpis.soldThisMonth],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="flex flex-col">
            <span
              className="text-[22px] font-extrabold"
              data-testid={`kpi-${label}`}
            >
              {n}
            </span>
            <span className="text-xs text-on-dark-2">{label}</span>
          </div>
        ))}
      </div>

      {card && (
        <p
          className="rounded-card border border-line bg-surface p-3 text-sm"
          data-testid="subscription-card"
        >
          <strong>{card.plan}</strong> · {brl(card.membershipCents)}/mês ·{" "}
          {card.statusLabel}
          {card.nextDueAt && (
            <> · próxima cobrança {brDate.format(card.nextDueAt)}</>
          )}
        </p>
      )}

      <form role="search" className="flex gap-2">
        {status !== "all" && (
          <input type="hidden" name="status" value={status} />
        )}
        <label htmlFor="q" className="sr-only">
          Buscar por modelo ou placa
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Buscar por modelo ou placa"
          className="h-11 min-w-0 flex-1 rounded-input border border-field bg-surface px-3 text-[15px]"
        />
        <button
          type="submit"
          className="h-11 rounded-button bg-ink px-4 text-sm font-bold text-white"
        >
          Buscar
        </button>
      </form>

      <nav aria-label="Filtrar veículos" className="flex gap-2 overflow-x-auto">
        {FILTERS.map(([key, label]) => (
          <Link
            key={key}
            href={href(key)}
            aria-current={
              status === key ||
              (key === "all" &&
                !["published", "draft", "sold"].includes(status))
                ? "page"
                : undefined
            }
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-field bg-surface px-3.5 text-sm font-semibold aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
          >
            {label} <span className="opacity-60">{list.counts[key]}</span>
          </Link>
        ))}
      </nav>

      {list.items.length ? (
        <ul className="flex flex-col gap-3">
          {list.items.map((v) => (
            <VehicleCard
              key={`${v.vehicleId}-${v.status}-${v.shareOnCajugo}`}
              v={v}
              cloudName={cloud}
            />
          ))}
        </ul>
      ) : q || status !== "all" ? (
        <p className="rounded-card border border-line bg-surface p-4 text-sm text-text-2">
          Nenhum veículo encontrado.
        </p>
      ) : (
        <EmptyState
          icon="🚗"
          title="Nenhum veículo cadastrado"
          action={
            <ButtonLink href="/painel/veiculos/novo">
              Cadastrar primeiro veículo
            </ButtonLink>
          }
        >
          Cadastre o primeiro veículo para ele aparecer no seu catálogo.
        </EmptyState>
      )}

      <Link
        href="/painel/veiculos/novo"
        className="fixed right-4 bottom-20 flex h-14 items-center gap-2 rounded-full bg-caju px-5 font-bold text-white shadow-lg lg:bottom-6"
      >
        + Novo veículo
      </Link>
    </section>
  );
}

/** Meus veículos [1c] com o onboarding [5e] (VEH-FR-001, 002, 010, 015). */
export default function VehiclesPage(props: PageProps<"/painel/veiculos">) {
  return (
    <AreaPage>
      <Content {...props} />
    </AreaPage>
  );
}
