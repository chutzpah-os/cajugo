import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { can } from "@/domains/auth/service";
import { AccountSubscription } from "@/domains/billing/components/account-subscription";
import { accountView } from "@/domains/billing/service";
import { NetworkBlock } from "@/domains/sellers/components/network-block";
import { networkSummary } from "@/domains/sellers/service";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = {
  title: "Conta | CajuGo",
  robots: { index: false, follow: false },
};

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/painel/conta",
    "billing.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  const db = getDb();
  const account = await accountView({ db }, session);
  const network = can(session, "sellers.manage")
    ? await networkSummary(db, session)
    : null;
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Conta</h1>
      <AccountSubscription view={account} />
      {network && <NetworkBlock {...network} />}
    </section>
  );
}

/** Conta do lojista [3c] (SUB-FR-010): assinatura, Como pagar, faturas e Rede Caju. */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
