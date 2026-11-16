import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { can } from "@/domains/auth/service";
import { ReportQueue } from "@/domains/moderation/components/report-queue";
import { reportQueue } from "@/domains/moderation/service";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = { title: "Denúncias | CajuGo" };

async function Content() {
  const { session, allowed, home } = await requireArea(
    "admin",
    "/admin/denuncias",
  );
  if (!allowed || !can(session, "admin.moderate"))
    return <NoPermission home={home} />;
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Denúncias</h1>
      <p className="text-sm text-text-2">
        Anúncios denunciados, do mais antigo. A loja não sabe quem denunciou.
      </p>
      <ReportQueue
        cards={await reportQueue(getDb(), session)}
        cloudName={cloudName()}
      />
    </section>
  );
}

/** Fila de denúncias da equipe [14e] (RPT-FR-002, 003, RPT-SEC-003): sem cache. */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
