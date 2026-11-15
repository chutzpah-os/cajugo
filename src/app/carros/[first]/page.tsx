import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/domains/auth/components/site-header";
import {
  DiscoveryRoute,
  discoveryRouteMetadata,
} from "@/domains/showcase/components/discovery-view";

/** Rota bloqueante: `params` de página não gerada no build, lido sem `<Suspense>`. */
export const instant = false;

/** Valor de validação do build: nunca é uma página de descoberta (não é um slug). */
const BUILD_PLACEHOLDER = "__build__";

/** Páginas geradas no 1º acesso e guardadas em cache (DSC-NFR-005). */
export function generateStaticParams() {
  return [{ first: BUILD_PLACEHOLDER }];
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/carros/[first]">): Promise<Metadata> {
  const { first } = await params;
  return (
    (await discoveryRouteMetadata([first], await searchParams)) ?? {
      title: "Carros | CajuGo",
      robots: { index: false, follow: true },
    }
  );
}

/** Marca (`/carros/fiat`) ou cidade (`/carros/campinas-sp`), ADR 0014. */
export default async function DiscoveryFirstPage({
  params,
  searchParams,
}: PageProps<"/carros/[first]">) {
  const { first } = await params;
  const view = await DiscoveryRoute({
    segments: [first],
    params: await searchParams,
  });
  if (!view) notFound();
  return (
    <>
      <SiteHeader />
      {view}
    </>
  );
}
