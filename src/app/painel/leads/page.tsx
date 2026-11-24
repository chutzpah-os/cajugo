import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { LeadsBoardView } from "@/domains/leads/components/leads-board";
import { leadsBoard, type LeadFilter } from "@/domains/leads/service";
import { LEAD_FILTERS } from "@/domains/leads/status";
import { storeIdentity } from "@/domains/stores/service";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = { title: "Leads | CajuGo" };

async function Content({ searchParams }: PageProps<"/painel/leads">) {
  const { session, allowed, home } = await requireStorePage(
    "/painel/leads",
    "leads.view",
  );
  if (!allowed) return <NoPermission home={home} />;
  const sp = await searchParams;
  const filter: LeadFilter = LEAD_FILTERS.find((f) => f === sp.status) ?? "all";
  const now = new Date();
  const [board, store] = await Promise.all([
    leadsBoard(getDb(), session, filter, now),
    storeIdentity(getDb(), session),
  ]);
  return (
    <LeadsBoardView
      board={board}
      filter={filter}
      now={now}
      storeName={store?.name}
    />
  );
}

/** Leads [3a] (LED-FR-005 a 010, 014): sem cache, o lead aparece na hora (LED-NFR-003). */
export default function LeadsPage(props: PageProps<"/painel/leads">) {
  return (
    <AreaPage>
      <Content {...props} />
    </AreaPage>
  );
}
