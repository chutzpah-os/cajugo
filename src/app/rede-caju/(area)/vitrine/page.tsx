import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { SellerShowcaseList } from "@/domains/sellers/components/seller-showcase-list";
import { sellerShowcase } from "@/domains/sellers/service";
import { CatalogToolbar } from "@/domains/showcase/components/catalog-toolbar";
import { cachedFacets } from "@/domains/showcase/current";
import { filtersToQuery, parseFilters } from "@/domains/showcase/filters";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";

export const metadata: Metadata = { title: "Vitrine | Rede Caju" };

const BASE_PATH = "/rede-caju/vitrine";

async function Content({ searchParams }: PageProps<"/rede-caju/vitrine">) {
  const { session, allowed, home } = await requireArea("rede", BASE_PATH);
  if (!allowed) return <NoPermission home={home} />;
  const filters = parseFilters(await searchParams);
  // Só o vendedor ativo usa a vitrine; em análise ou bloqueado vê o status (SEL-FR-002).
  const view = await sellerShowcase(getDb(), session, { filters }).catch(
    (error: unknown) => {
      if (error instanceof AppError && error.status === 403)
        redirect("/rede-caju");
      throw error;
    },
  );
  const { makes } = await cachedFacets("showcase");
  return (
    <section className="flex flex-col gap-4 py-6">
      <div>
        <h1 className="text-[22px] font-extrabold">Vitrine</h1>
        <p className="text-sm text-text-2">
          {view.total} veículos. Compartilhe o link: o contato que vier dele é
          seu nas lojas parceiras.
        </p>
      </div>
      <CatalogToolbar
        filters={filters}
        makes={makes}
        total={view.total}
        basePath={BASE_PATH}
        source={null}
      />
      <SellerShowcaseList
        key={filtersToQuery(filters)}
        initial={view.items}
        nextCursor={view.nextCursor}
        query={filtersToQuery(filters)}
        cloudName={cloudName()}
      />
    </section>
  );
}

/** Vitrine do vendedor [7c] (SEL-FR-007, 008, 009): sem cache (parceria e comissão). */
export default function Page(props: PageProps<"/rede-caju/vitrine">) {
  return (
    <AreaPage>
      <Content {...props} />
    </AreaPage>
  );
}
