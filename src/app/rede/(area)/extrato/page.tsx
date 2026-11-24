import type { Metadata } from "next";
import Link from "next/link";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { StatementList } from "@/domains/sellers/components/statement-list";
import {
  sellerStatement,
  type StatementFilter,
} from "@/domains/sellers/service";
import { getDb } from "@/platform/db/client";
import { EmptyState } from "@/ui/empty-state";

export const metadata: Metadata = { title: "Extrato | CajuGo" };

const FILTERS: [StatementFilter, string, "all" | "toReceive" | "paid"][] = [
  ["todas", "Todas", "all"],
  ["a-receber", "A receber", "toReceive"],
  ["pagas", "Pagas", "paid"],
];

async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, allowed, home } = await requireArea("rede", "/rede/extrato");
  if (!allowed) return <NoPermission home={home} />;
  const view = await sellerStatement(getDb(), session, await searchParams);
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Extrato</h1>
      {view.counts.all === 0 ? (
        <EmptyState icon="🧾" title="Nenhuma venda ainda">
          Suas vendas aparecem aqui quando a loja confirmar.
        </EmptyState>
      ) : (
        <>
          <nav aria-label="Filtrar vendas" className="flex flex-wrap gap-2">
            {FILTERS.map(([value, label, key]) => (
              <Link
                key={value}
                href={
                  value === "todas"
                    ? "/rede/extrato"
                    : `/rede/extrato?filtro=${value}`
                }
                aria-current={view.filter === value ? "page" : undefined}
                className={`inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold ${
                  view.filter === value
                    ? "border-ink bg-ink text-white"
                    : "border-field bg-surface text-ink"
                }`}
              >
                {label}
                <span className="opacity-60">{view.counts[key]}</span>
              </Link>
            ))}
          </nav>
          {view.items.length ? (
            <StatementList
              key={view.filter}
              initial={view.items}
              nextCursor={view.nextCursor}
              filter={view.filter}
            />
          ) : (
            <p className="text-sm text-text-2">Nenhuma venda neste filtro.</p>
          )}
        </>
      )}
    </section>
  );
}

/** Extrato do vendedor [7d] (EXT-FR-001, 002, 003, 008, 009): sem cache. */
export default function Page(props: PageProps<"/rede/extrato">) {
  return (
    <AreaPage>
      <Content searchParams={props.searchParams} />
    </AreaPage>
  );
}
