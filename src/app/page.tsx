import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import {
  ShowcaseView,
  showcaseMetadata,
} from "@/domains/showcase/components/showcase-view";
import { cachedSearch } from "@/domains/showcase/current";
import { parseFilters } from "@/domains/showcase/filters";

const NONE = parseFilters({});

export async function generateMetadata(): Promise<Metadata> {
  return showcaseMetadata(await cachedSearch("showcase", NONE));
}

/** Vitrine sem filtros: pré-renderizada, a principal página de SEO. */
export default async function Home() {
  return (
    <>
      <SiteHeader />
      <ShowcaseView
        filters={NONE}
        result={await cachedSearch("showcase", NONE)}
      />
    </>
  );
}
