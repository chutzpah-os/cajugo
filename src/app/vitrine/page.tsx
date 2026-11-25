import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import {
  ShowcaseView,
  showcaseMetadata,
} from "@/domains/showcase/components/showcase-view";
import { HeaderSearch } from "@/domains/showcase/components/catalog-toolbar";
import { cachedSearch } from "@/domains/showcase/current";
import { ReferralBanner } from "@/domains/referrals/components/referral-banner";
import { cachedProgramBanner } from "@/domains/referrals/current";
import { parseFilters } from "@/domains/showcase/filters";

/** Rota bloqueante: os filtros vêm da URL e o conteúdo precisa estar no HTML. */
export const instant = false;

/**
 * Vitrine com filtros (`/veiculos?marca=…`): o `proxy.ts` reescreve para cá e o endereço visível
 * não muda; o cache é por filtros normalizados (ADR 0013, SHW-NFR-005).
 */
export async function generateMetadata({
  searchParams,
}: PageProps<"/vitrine">): Promise<Metadata> {
  return showcaseMetadata(
    await cachedSearch("showcase", parseFilters(await searchParams)),
  );
}

export default async function FilteredShowcase({
  searchParams,
}: PageProps<"/vitrine">) {
  const filters = parseFilters(await searchParams);
  return (
    <>
      <SiteHeader
        joined
        active="comprar"
        search={<HeaderSearch filters={filters} basePath="/veiculos" />}
      />
      <ShowcaseView
        promo={<ReferralBanner banner={await cachedProgramBanner()} />}
        filters={filters}
        result={await cachedSearch("showcase", filters)}
      />
    </>
  );
}
