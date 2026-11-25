import type { Metadata } from "next";
import { AreaLayout } from "@/domains/auth/components/area-layout";
import type { NavCounts } from "@/domains/auth/components/area-shell";
import { can } from "@/domains/auth/service";
import { cachedPendingAlerts } from "@/domains/buyers/current";
import { pendingContactsCount } from "@/domains/contacts/service";
import { openReportsCount } from "@/domains/moderation/service";
import { getDb } from "@/platform/db/client";

/**
 * "Alertas" com o número de pedidos com veículo para avisar (ALR-FR-003) e "Denúncias"
 * com os anúncios na fila, lidos sem cache (RPT-FR-007; 0 sem permissão).
 */
const navCounts: NavCounts = async (session) => {
  const counts: Record<string, number> = {
    "/admin/denuncias": await openReportsCount(getDb(), session),
    "/admin/contatos": await pendingContactsCount(getDb(), session),
  };
  if (can(session, "alerts.notify"))
    counts["/admin/alertas"] = await cachedPendingAlerts();
  return counts;
};

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AreaLayout area="admin" navCounts={navCounts}>
      {children}
    </AreaLayout>
  );
}
