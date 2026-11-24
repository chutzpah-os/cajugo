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

/** Vitrine sem filtros: pré-renderizada, a principal página de SEO. */
export default async function Home() {
  return (
    <>
      <SiteHeader
        joined
        search={<HeaderSearch filters={NONE} basePath="/" />}
      />
      <ShowcaseView
        promo={
          <ReferralBanner banner={await cachedProgramBanner()} variant="card" />
        }
        promoFooter={
          <ReferralBanner
            banner={await cachedProgramBanner()}
            variant="footer"
          />
        }
        filters={NONE}
        result={await cachedSearch("showcase", NONE)}
      />
    </>
  );
}
