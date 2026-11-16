import type { Metadata } from "next";
import { AreaLayout } from "@/domains/auth/components/area-layout";
import type { NavCounts } from "@/domains/auth/components/area-shell";
import { can } from "@/domains/auth/service";
import { newLeadsCount } from "@/domains/leads/service";
import { getDb } from "@/platform/db/client";

/** "Leads" com o número de leads novos da loja, sem cache (LED-FR-011, LED-NFR-003). */
const navCounts: NavCounts = async (session) => {
  const counts: Record<string, number> = {};
  if (can(session, "leads.view") && session.storeId)
    counts["/painel/leads"] = await newLeadsCount(getDb(), session);
  return counts;
};

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AreaLayout area="painel" navCounts={navCounts}>
      {children}
    </AreaLayout>
  );
}
