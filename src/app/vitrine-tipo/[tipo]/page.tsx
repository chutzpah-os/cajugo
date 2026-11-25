import { SiteFooter } from "@/ui/site-footer";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { HeaderSearch } from "@/domains/showcase/components/catalog-toolbar";
import {
  ShowcaseView,
  showcaseMetadata,
} from "@/domains/showcase/components/showcase-view";
import { cachedSearch } from "@/domains/showcase/current";
import { parseFilters } from "@/domains/showcase/filters";
import { isVehicleType } from "@/domains/showcase/vehicle-types";
import { ReferralBanner } from "@/domains/referrals/components/referral-banner";
import { cachedProgramBanner } from "@/domains/referrals/current";

/** Rota bloqueante: os filtros vêm da URL e o conteúdo precisa estar no HTML. */
export const instant = false;

async function filtersOf({
  params,
  searchParams,
}: PageProps<"/vitrine-tipo/[tipo]">) {
  const { tipo } = await params;
  if (!isVehicleType(tipo)) return null;
  return { ...parseFilters(await searchParams), type: tipo };
}

export async function generateMetadata(
  props: PageProps<"/vitrine-tipo/[tipo]">,
): Promise<Metadata> {
  const filters = await filtersOf(props);
  if (!filters) return {};
  return showcaseMetadata(await cachedSearch("showcase", filters), filters);
}

/**
 * Página de cada tipo (`/carros`, `/motos`…): o `proxy.ts` reescreve o endereço do
 * tipo para cá, sem mudar o que o visitante vê (ADR 0013, spec 014).
 */
export default async function TypeShowcase(
  props: PageProps<"/vitrine-tipo/[tipo]">,
) {
  const filters = await filtersOf(props);
  if (!filters) notFound();
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
      <SiteFooter />
    </>
  );
}
