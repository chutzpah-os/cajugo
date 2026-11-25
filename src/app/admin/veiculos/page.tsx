import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { can } from "@/domains/auth/service";
import { ShowcaseTab } from "@/domains/admin/components/stores-admin";
import { showcaseAdmin } from "@/domains/moderation/service";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = { title: "Veículos | CajuGo" };

async function Content({ searchParams }: PageProps<"/admin/veiculos">) {
  const { session, allowed, home } = await requireArea(
    "admin",
    "/admin/veiculos",
  );
  if (!allowed || !can(session, "admin.moderate"))
    return <NoPermission home={home} />;
  const view = await showcaseAdmin(getDb(), session, await searchParams);
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Veículos</h1>
      <ShowcaseTab view={view} cloudName={cloudName()} base="/admin/veiculos" />
    </section>
  );
}

/** Veículos CajuGo no menu do admin (ADM-FR-006): a mesma lista da aba de [1d]. */
export default function Page(props: PageProps<"/admin/veiculos">) {
  return (
    <AreaPage>
      <Content {...props} />
    </AreaPage>
  );
}
