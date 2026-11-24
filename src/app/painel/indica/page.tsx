import type { Metadata } from "next";
import Link from "next/link";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import {
  HowItWorks,
  ReferralShare,
} from "@/domains/referrals/components/referral-views";
import { referralPanel } from "@/domains/referrals/service";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = {
  title: "Caju Indica | CajuGo",
  robots: { index: false, follow: false },
};

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/painel/indica",
    "store.referral",
  );
  if (!allowed) return <NoPermission home={home} />;
  const panel = await referralPanel(getDb(), session);
  const link =
    "flex min-h-11 items-center justify-between rounded-card border border-line bg-surface px-4 font-bold";
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Caju Indica</h1>
      <ReferralShare panel={panel} />
      <nav className="flex flex-col gap-2" aria-label="Caju Indica">
        <Link href="/painel/indica/indicacoes" className={link}>
          Minhas indicações <span aria-hidden>›</span>
        </Link>
        <Link href="/painel/indica/credito" className={link}>
          Meu crédito <span aria-hidden>›</span>
        </Link>
      </nav>
      {panel.enabled && <HowItWorks months={panel.months} />}
    </section>
  );
}

/** Caju Indica do lojista [8a] (IND-FR-001). */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
