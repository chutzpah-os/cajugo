import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreDetailView } from "@/domains/admin/components/store-detail";
import { adminStoreDetail } from "@/domains/admin/service";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";
import { storeUrl } from "@/platform/http/urls";

export const metadata: Metadata = {
  title: "Loja | CajuGo",
  robots: { index: false, follow: false },
};

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, allowed, home } = await requireArea(
    "admin",
    `/admin/lojas/${id}`,
  );
  if (!allowed) return <NoPermission home={home} />;
  const view = await adminStoreDetail({ db: getDb() }, session, id).catch(
    (error: unknown) => {
      if (error instanceof AppError && error.status === 404) notFound();
      throw error;
    },
  );
  return <StoreDetailView view={view} catalogUrl={storeUrl(view.store.slug)} />;
}

/** Detalhe da loja [6g] (012b · ADM-FR-008…010, ADM-SEC-002/004/005). */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AreaPage>
      <Content params={params} />
    </AreaPage>
  );
}
