import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import {
  DiscoveryIndexView,
  discoveryIndexMetadata,
} from "@/domains/showcase/components/discovery-index";
import { cachedDiscoveryIndex } from "@/domains/showcase/current";

export async function generateMetadata(): Promise<Metadata> {
  return discoveryIndexMetadata(await cachedDiscoveryIndex());
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
