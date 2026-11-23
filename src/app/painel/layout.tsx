import type { Metadata } from "next";
import { AreaLayout } from "@/domains/auth/components/area-layout";
import type { Banner, NavCounts } from "@/domains/auth/components/area-shell";
import { BillingAlertBanner } from "@/domains/billing/components/billing-alert";
import { billingAlert } from "@/domains/billing/service";
import { newLeadsCount } from "@/domains/leads/service";
import { getDb } from "@/platform/db/client";

/** "Leads" com o número de leads novos da loja, sem cache (LED-FR-011, LED-NFR-003). */
const navCounts: NavCounts = async (session) => ({
  "/painel/leads": await newLeadsCount(getDb(), session),
});

/** Alerta da fatura: vence em 3 dias, em atraso ou loja suspensa [12f] (011). */
const banner: Banner = async (session) => (
  <BillingAlertBanner alert={await billingAlert({ db: getDb() }, session)} />
);

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AreaLayout area="painel" navCounts={navCounts} banner={banner}>
      {children}
    </AreaLayout>
  );
}
