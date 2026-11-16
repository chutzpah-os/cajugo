import type { Metadata } from "next";
import { AreaLayout } from "@/domains/auth/components/area-layout";
import type { NavCounts } from "@/domains/auth/components/area-shell";
import { can } from "@/domains/auth/service";
import { cachedPendingAlerts } from "@/domains/buyers/current";

/** "Alertas" com o número de pedidos com veículo para avisar (ALR-FR-003). */
const navCounts: NavCounts = async (session) => {
  const counts: Record<string, number> = {};
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
