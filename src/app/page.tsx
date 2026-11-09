import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import {
  CatalogView,
  showcaseCount,
} from "@/domains/showcase/components/catalog-view";
import { cachedSearch } from "@/domains/showcase/current";
import { parseFilters } from "@/domains/showcase/filters";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  websiteJsonLd,
} from "@/platform/seo/catalog";
import { JsonLd, pageMetadata } from "@/platform/seo/seo";
import { ButtonLink } from "@/ui/button";

const NONE = parseFilters({});
const TITLE = "Carros usados e seminovos à venda";

/** Fora do Google enquanto não houver veículo; volta sozinha no 1º (SHW-FR-001). */
export async function generateMetadata(): Promise<Metadata> {
  const r = await cachedSearch("showcase", NONE);
  const cover = r.items[0]?.coverPublicId;
  const meta = pageMetadata({
    title: TITLE,
    description:
      "Encontre carros usados e seminovos das melhores lojas, com preço, fotos e contato direto pelo WhatsApp.",
    path: "/",
    image: cover
      ? imageUrlFor(cloudName(), cover, IMAGE_WIDTHS.full)
      : undefined,
  });
  return r.total ? meta : { ...meta, robots: { index: false, follow: true } };
}

/** Vitrine CajuGo [1a] sem filtros: pré-renderizada, a principal página de SEO. */
export default async function Home() {
  const result = await cachedSearch("showcase", NONE);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 py-6 md:max-w-5xl lg:max-w-6xl">
        <JsonLd data={websiteJsonLd()} />
        <JsonLd data={breadcrumbJsonLd([{ name: "Início", path: "/" }])} />
        {result.total > 0 && (
          <JsonLd data={itemListJsonLd(result.items.map((c) => c.path))} />
        )}
        <CatalogView
          title={TITLE}
          count={result.total ? showcaseCount(result.total, result.stores) : ""}
          result={result}
          cloudName={cloudName()}
          showStore
          empty={
            <div className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-5">
              <p className="text-[17px] font-extrabold">
                Os primeiros veículos estão chegando
              </p>
              <p className="text-sm text-text-2">
                Tem uma loja de veículos? Coloque o seu estoque na CajuGo.
              </p>
              <ButtonLink href="/lojistas">Anunciar minha loja</ButtonLink>
            </div>
          }
        />
      </main>
    </>
  );
}
