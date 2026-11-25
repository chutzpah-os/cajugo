import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { signOutAction } from "@/domains/auth/actions";
import { accountMenu, can } from "@/domains/auth/service";
import { Badge } from "@/ui/badge";
import { initialsOf } from "@/ui/initials";
import { SettingsList } from "@/ui/settings-list";
import { AccountSubscription } from "@/domains/billing/components/account-subscription";
import { CancelSubscription } from "@/domains/billing/components/cancellation";
import { accountView, CANCEL_REASONS } from "@/domains/billing/service";
import { NetworkBlock } from "@/domains/sellers/components/network-block";
import { networkSummary, storeNetwork } from "@/domains/sellers/service";
import { CommissionForm } from "@/domains/sellers/components/commission-form";
import { VehicleOverrides } from "@/domains/sellers/components/vehicle-overrides";
import { PartnersView } from "@/domains/sellers/components/partners-view";
import {
  HowItWorks,
  ReferralList,
  ReferralShare,
} from "@/domains/referrals/components/referral-views";
import { StoreCredit } from "@/domains/referrals/components/store-credit";
import { referralPanel, referralsList } from "@/domains/referrals/service";
import { creditView } from "@/domains/billing/service";
import { Disclosure } from "@/ui/disclosure";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = {
  title: "Conta | CajuGo",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

async function Content({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session, allowed, home } = await requireStorePage(
    "/painel/conta",
    "billing.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  const db = getDb();
  const [account, me] = await Promise.all([
    accountView({ db }, session),
    accountMenu(db, session),
  ]);
  const network = can(session, "sellers.manage")
    ? await Promise.all([
        networkSummary(db, session),
        storeNetwork(db, session),
      ])
    : null;
  const params = await searchParams;
  const referral = can(session, "store.referral")
    ? await Promise.all([
        referralPanel(db, session),
        referralsList(db, session, params),
        creditView({ db }, session),
      ])
    : null;
  const cancelBlock =
    account.cancel && account.cancel.kind !== "available"
      ? account.cancel
      : null;
  return (
    <section className="flex flex-col gap-5 pt-6 pb-6 lg:pt-2">
      <header className="flex flex-col gap-4 lg:max-w-3xl">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Conta</h1>
        {me && (
          <div className="flex items-center gap-3 pr-12 lg:pr-0">
            <span
              aria-hidden
              className="flex size-12 flex-none items-center justify-center rounded-full bg-ink text-base font-bold text-white"
            >
              {initialsOf(me.fullName)}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-base font-extrabold">{me.fullName}</p>
              <p className="truncate text-[13px] text-text-3">{me.email}</p>
            </div>
            <Badge tone="caju">Lojista</Badge>
          </div>
        )}
      </header>
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          {cancelBlock && (
            <CancelSubscription cancel={cancelBlock} reasons={CANCEL_REASONS} />
          )}
          <AccountSubscription view={account} />
        </div>
        <div className="flex flex-col gap-5">
          {network && (
            <NetworkBlock
              {...network[0]}
              commission={
                <>
                  <CommissionForm
                    acceptsSellers={network[1].acceptsSellers}
                    commission={network[1].commission}
                    feeBps={network[1].feeBps}
                  />
                  <VehicleOverrides
                    overrides={network[1].overrides}
                    vehicles={network[1].vehicleOptions}
                  />
                </>
              }
              partners={
                <PartnersView
                  pending={network[1].pending}
                  partners={network[1].partners}
                />
              }
            />
          )}
          {referral && (
            <section
              data-testid="referral-block"
              className="flex flex-col rounded-card border border-line bg-surface"
            >
              <div className="flex flex-col gap-1 p-4 pb-2">
                <h2 className="text-[17px] font-extrabold">Caju Indica</h2>
                <p className="text-sm text-text-2">
                  Indique lojas e ganhe crédito na sua fatura.
                </p>
              </div>
              {/* Link, indicações e crédito aqui mesmo, sem outra página (012). */}
              <div className="divide-y divide-line-2 border-t border-line-2">
                <Disclosure title="Meu link" testId="referral-link">
                  <ReferralShare panel={referral[0]} />
                  {referral[0].enabled && (
                    <HowItWorks months={referral[0].months} />
                  )}
                </Disclosure>
                <Disclosure
                  title="Indicações"
                  testId="referral-list"
                  open={params.filtro !== undefined}
                >
                  <ReferralList basePath="/painel/conta" {...referral[1]} />
                </Disclosure>
                <Disclosure title="Crédito" testId="referral-credit">
                  <StoreCredit view={referral[2]} />
                </Disclosure>
              </div>
            </section>
          )}
          <section className="rounded-card border border-line bg-surface px-4">
            <SettingsList
              items={[
                { href: "/painel/loja", label: "Dados da loja" },
                { href: "/conta/senha", label: "Alterar senha" },
                { href: "/termos", label: "Termos e privacidade" },
              ]}
            />
          </section>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex h-[50px] w-full items-center justify-center rounded-button border-[1.5px] border-ink text-[15px] font-bold"
            >
              Sair
            </button>
          </form>
          {account.cancel?.kind === "available" && (
            <div className="flex justify-center">
              <CancelSubscription
                cancel={account.cancel}
                reasons={CANCEL_REASONS}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Conta do lojista [3c] (SUB-FR-010): assinatura, Como pagar, faturas e Rede Caju;
 * Cancelar assinatura [12h], o fim agendado e Reassinar (011b).
 */
export default function Page(props: PageProps<"/painel/conta">) {
  return (
    <AreaPage>
      <Content searchParams={props.searchParams} />
    </AreaPage>
  );
}
