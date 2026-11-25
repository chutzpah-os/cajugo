import { SiteFooter } from "@/ui/site-footer";
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
  return [{ first: BUILD_PLACEHOLDER, second: BUILD_PLACEHOLDER }];
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/carros/[first]/[second]">): Promise<Metadata> {
  const { first, second } = await params;
  return (
    (await discoveryRouteMetadata([first, second], await searchParams)) ?? {
      title: "Carros | CajuGo",
      robots: { index: false, follow: true },
    }
  );
}

/** Modelo (`/carros/fiat/argo`) ou marca na cidade (`/carros/campinas-sp/fiat`). */
export default async function DiscoverySecondPage({
  params,
  searchParams,
}: PageProps<"/carros/[first]/[second]">) {
  const { first, second } = await params;
  const view = await DiscoveryRoute({
    segments: [first, second],
    params: await searchParams,
  });
  if (!view) notFound();
  return (
    <>
      <SiteHeader />
      {view}
      <SiteFooter />
    </>
  );
}
