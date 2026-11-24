import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import {
  HowItWorks,
  Movements,
  ReferralList,
  ReferralShare,
} from "@/domains/referrals/components/referral-views";
import {
  balanceView,
  referralPanel,
  referralsList,
} from "@/domains/referrals/service";
import { brl } from "@/platform/br/money";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = { title: "Caju Indica | CajuGo" };

async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, allowed, home } = await requireArea("indica", "/indica");
  if (!allowed) return <NoPermission home={home} />;
  const db = getDb();
  const [panel, balance, list] = await Promise.all([
    referralPanel(db, session),
    balanceView(db, session),
    referralsList(db, session, await searchParams),
  ]);
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Caju Indica</h1>
      <div className="flex flex-col gap-2 rounded-card bg-ink p-4 text-white">
        <p className="text-sm text-on-dark-2">Saldo</p>
        <p
          className="text-[26px] font-extrabold"
          data-testid="referral-balance"
        >
          {brl(balance.balanceCents)}
        </p>
        <div
          role="progressbar"
          aria-label="Até o resgate mínimo"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(balance.progress * 100)}
          className="h-2 overflow-hidden rounded-full bg-ink-3"
        >
          <span
            className="block h-full bg-castanha"
            style={{ width: `${Math.round(balance.progress * 100)}%` }}
          />
        </div>
        <p className="text-xs text-on-dark-2">
          Resgate por Pix a partir de {brl(balance.minCents)}.
        </p>
      </div>
      <ReferralShare panel={panel} />
      <section className="flex flex-col gap-2">
        <h2 className="text-[17px] font-extrabold">Indicações</h2>
        <ReferralList basePath="/indica" {...list} />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-[17px] font-extrabold">Movimentações</h2>
        <Movements
          items={balance.movements.map((m) => ({
            label: `Indicação ${m.store}`,
            amountCents: m.amountCents,
            date: m.date,
          }))}
        />
      </section>
      {panel.enabled && <HowItWorks months={panel.months} />}
    </section>
  );
}

/** Painel do indicador e do vendedor [9d] (IND-FR-002, 005, 010). */
export default function Page(props: PageProps<"/indica">) {
  return (
    <AreaPage>
      <Content searchParams={props.searchParams} />
    </AreaPage>
  );
}
