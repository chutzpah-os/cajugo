import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { can } from "@/domains/auth/service";
import { SubscriptionsAdmin } from "@/domains/billing/components/subscriptions-admin";
import { subscriptionsView } from "@/domains/billing/service";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = { title: "Assinaturas | CajuGo" };

async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, allowed, home } = await requireArea(
    "admin",
    "/admin/assinaturas",
  );
  if (!allowed || !can(session, "subscriptions.view"))
    return <NoPermission home={home} />;
  const view = await subscriptionsView(
    { db: getDb() },
    session,
    await searchParams,
  );
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Assinaturas</h1>
      <SubscriptionsAdmin view={view} />
    </section>
  );
}

/** Assinaturas do admin [4b] (SUB-FR-011, 012, 013): sem cache. */
export default function Page(props: PageProps<"/admin/assinaturas">) {
  return (
    <AreaPage>
      <Content searchParams={props.searchParams} />
    </AreaPage>
  );
}
