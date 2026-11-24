import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { ReferralList } from "@/domains/referrals/components/referral-views";
import { referralsList } from "@/domains/referrals/service";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = {
  title: "Minhas indicações | CajuGo",
  robots: { index: false, follow: false },
};

async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, allowed, home } = await requireStorePage(
    "/painel/indica/indicacoes",
    "store.referral",
  );
  if (!allowed) return <NoPermission home={home} />;
  const view = await referralsList(getDb(), session, await searchParams);
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Minhas indicações</h1>
      <ReferralList basePath="/painel/indica/indicacoes" {...view} />
    </section>
  );
}

/** Indicações do lojista [8b] (IND-FR-005). */
export default function Page(props: PageProps<"/painel/indica/indicacoes">) {
  return (
    <AreaPage>
      <Content searchParams={props.searchParams} />
    </AreaPage>
  );
}
