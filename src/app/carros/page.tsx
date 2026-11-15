import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import {
  DiscoveryIndexView,
  discoveryIndexMetadata,
} from "@/domains/showcase/components/discovery-index";
import { cachedDiscoveryIndex, cachedSearch } from "@/domains/showcase/current";
import { parseFilters } from "@/domains/showcase/filters";

export async function generateMetadata(): Promise<Metadata> {
  const [index, showcase] = await Promise.all([
    cachedDiscoveryIndex(),
    cachedSearch("showcase", parseFilters({})),
  ]);
  return discoveryIndexMetadata(index, showcase.items[0]?.coverPublicId);
}

/** Índice das páginas de descoberta (DSC-FR-013), pré-renderizado. */
export default function DiscoveryIndexPage() {
  return (
    <>
      <SiteHeader />
      <DiscoveryIndexView />
    </>
  );
}
