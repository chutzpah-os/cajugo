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
import Link from "next/link";

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
      {can(session, "store.referral") && (
        <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
          <h2 className="text-[17px] font-extrabold">Caju Indica</h2>
          <p className="text-sm text-text-2">
            Indique lojas e ganhe crédito na sua fatura.
          </p>
          <div className="flex flex-wrap gap-4 text-sm font-bold text-caju-ink">
            <Link
              href="/painel/indica"
              className="flex min-h-11 items-center underline"
            >
              Meu link
            </Link>
            <Link
              href="/painel/indica/indicacoes"
              className="flex min-h-11 items-center underline"
            >
              Indicações
            </Link>
            <Link
              href="/painel/indica/credito"
              className="flex min-h-11 items-center underline"
            >
              Crédito
            </Link>
          </div>
        </section>
      )}
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
