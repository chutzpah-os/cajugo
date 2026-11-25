import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { accountMenu, usersAdmin } from "@/domains/auth/service";
import {
  ShowcaseTab,
  StoresTab,
  UsersTab,
} from "@/domains/admin/components/stores-admin";
import { storesKpis } from "@/domains/admin/service";
import { showcaseAdmin } from "@/domains/moderation/service";
import { storesAdmin } from "@/domains/stores/service";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { getDb } from "@/platform/db/client";
import { Avatar } from "@/ui/initials";
import { LightHeader } from "@/ui/page-header";

export const metadata: Metadata = { title: "Lojas | CajuGo" };

const TABS = [
  ["lojas", "Lojas", "/admin/lojas"],
  ["veiculos", "Veículos CajuGo", "/admin/lojas?aba=veiculos"],
  ["usuarios", "Usuários", "/admin/lojas?aba=usuarios"],
] as const;
type Tab = (typeof TABS)[number][0];

async function Content({ searchParams }: PageProps<"/admin/lojas">) {
  const { session, allowed, home } = await requireArea("admin", "/admin/lojas");
  if (!allowed) return <NoPermission home={home} />;
  const params = await searchParams;
  const tab: Tab =
    TABS.find(([key]) => key === params.aba)?.[0] ?? ("lojas" as Tab);
  const db = getDb();
  const me = await accountMenu(db, session);

  let body;
  if (tab === "veiculos")
    body = (
      <ShowcaseTab
        view={await showcaseAdmin(db, session, params)}
        cloudName={cloudName()}
        base="/admin/lojas"
        keep={{ aba: "veiculos" }}
      />
    );
  else if (tab === "usuarios")
    body = <UsersTab view={await usersAdmin(db, session, params)} />;
  else {
    const [view, kpis] = await Promise.all([
      storesAdmin(db, session, params),
      storesKpis({ db }, session),
    ]);
    body = <StoresTab view={view} kpis={kpis} />;
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <LightHeader
        title="Lojas"
        titleOnMobile={false}
        avatar={me ? <Avatar name={me.name} /> : undefined}
        tabs={TABS.map(([key, label, href]) => ({
          href,
          label,
          current: key === tab,
        }))}
      />
      {body}
    </div>
  );
}

/** Lojas [1d] com as abas Lojas, Veículos CajuGo e Usuários (ADM-FR-004, 006, 007). */
export default function Page(props: PageProps<"/admin/lojas">) {
  return (
    <AreaPage>
      <Content {...props} />
    </AreaPage>
  );
}
