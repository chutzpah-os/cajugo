import { SiteFooter } from "@/ui/site-footer";
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

const NONE = parseFilters({});

export async function generateMetadata(): Promise<Metadata> {
  return showcaseMetadata(await cachedSearch("showcase", NONE));
}

/** Vitrine sem filtros em `/veiculos`: pré-renderizada, a principal lista de SEO (017). */
export default async function Showcase() {
  return (
    <>
      <SiteHeader
        joined
        active="comprar"
        search={<HeaderSearch filters={NONE} basePath="/veiculos" />}
      />
      <ShowcaseView
        promo={<ReferralBanner banner={await cachedProgramBanner()} />}
        filters={NONE}
        result={await cachedSearch("showcase", NONE)}
      />
      <SiteFooter />
    </>
  );
}
