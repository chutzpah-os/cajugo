import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { can } from "@/domains/auth/service";
import Link from "next/link";
import { HiddenList } from "@/domains/moderation/components/hidden-list";
import { ReportQueue } from "@/domains/moderation/components/report-queue";
import { hiddenList, reportQueue } from "@/domains/moderation/service";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = { title: "Denúncias | CajuGo" };

const TABS = [
  ["denuncias", "Denúncias", "/admin/denuncias"],
  ["ocultados", "Ocultados", "/admin/denuncias?aba=ocultados"],
] as const;

async function Content({ searchParams }: PageProps<"/admin/denuncias">) {
  const { session, allowed, home } = await requireArea(
    "admin",
    "/admin/denuncias",
  );
  if (!allowed || !can(session, "admin.moderate"))
    return <NoPermission home={home} />;
  const tab =
    (await searchParams).aba === "ocultados" ? "ocultados" : "denuncias";
  const db = getDb();
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Denúncias</h1>
      <nav aria-label="Abas de denúncias" className="flex gap-2">
        {TABS.map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            aria-current={tab === key ? "page" : undefined}
            className="flex h-11 shrink-0 items-center rounded-full border border-field bg-surface px-3.5 text-sm font-semibold aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === "ocultados" ? (
        <HiddenList
          cards={await hiddenList(db, session)}
          cloudName={cloudName()}
        />
      ) : (
        <>
          <p className="text-sm text-text-2">
            Anúncios denunciados, do mais antigo. A loja não sabe quem
            denunciou.
          </p>
          <ReportQueue
            cards={await reportQueue(db, session)}
            cloudName={cloudName()}
          />
        </>
      )}
    </section>
  );
}

/**
 * Fila de denúncias da equipe [14e] e a aba "Ocultados" (RPT-FR-002, 003, 008,
 * RPT-SEC-003): sem cache.
 */
export default function Page(props: PageProps<"/admin/denuncias">) {
  return (
    <AreaPage>
      <Content {...props} />
    </AreaPage>
  );
}
