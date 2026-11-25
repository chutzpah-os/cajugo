import type { ReactNode } from "react";
import type { Metadata } from "next";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  websiteJsonLd,
} from "@/platform/seo/catalog";
import { JsonLd, pageMetadata } from "@/platform/seo/seo";
import { ButtonLink } from "@/ui/button";
import { cachedFacets } from "../current";
import { filtersToQuery, type Filters } from "../filters";
import type { SearchResult } from "../service";
import { CatalogToolbar } from "./catalog-toolbar";
import { CatalogView, showcaseCount } from "./catalog-view";
import { FiltersSide } from "./filters-side";
import { NoResults } from "./no-results";
import { SortSelect } from "./sort-select";

const TITLE = "Veículos usados e seminovos à venda";
const BASE_PATH = "/";

/**
 * Metadados da vitrine, com ou sem filtros: canônica sempre `/` (SEO.md) e fora do
 * Google quando a lista vem vazia (SHW-FR-001, SHW-FR-012).
 */
export function showcaseMetadata(result: SearchResult): Metadata {
  const cover = result.items[0]?.coverPublicId;
  const meta = pageMetadata({
    title: TITLE,
    description:
      "Encontre veículos usados e seminovos das melhores lojas, com preço, fotos e contato direto pelo WhatsApp.",
    path: BASE_PATH,
    image: cover
      ? imageUrlFor(cloudName(), cover, IMAGE_WIDTHS.full)
      : undefined,
  });
  return result.total
    ? meta
    : { ...meta, robots: { index: false, follow: true } };
}

/** Vitrine CajuGo [1a]: `/` pré-renderizada e `/vitrine` com filtros (ADR 0013). */
export async function ShowcaseView({
  filters,
  result,
  promo,
  promoFooter,
}: {
  filters: Filters;
  result: SearchResult;
  /** Card montado pela rota dentro da grade e a linha do rodapé (Caju Indica [9a], 010). */
  promo?: ReactNode;
  promoFooter?: ReactNode;
}) {
  const { makes, cities } = await cachedFacets("showcase");
  const filtered = filtersToQuery(filters) !== "";
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 pb-8 md:max-w-3xl lg:max-w-none lg:px-8 lg:pb-0">
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Início", path: BASE_PATH }])} />
      {result.total > 0 && (
        <JsonLd data={itemListJsonLd(result.items.map((c) => c.path))} />
      )}
      <CatalogView
        promo={promo}
        title={TITLE}
        count={
          result.total || filtered
            ? showcaseCount(result.total, result.stores)
            : ""
        }
        result={result}
        filters={filters}
        source={null}
        cloudName={cloudName()}
        showStore
        toolbar={
          makes.length > 0 || filtered ? (
            <CatalogToolbar
              filters={filters}
              makes={makes}
              cities={cities}
              total={result.total}
              basePath={BASE_PATH}
              source={null}
            />
          ) : undefined
        }
        sidebar={
          makes.length > 0 || filtered ? (
            <FiltersSide
              filters={filters}
              makes={makes}
              cities={cities}
              total={result.total}
              basePath={BASE_PATH}
              source={null}
            />
          ) : undefined
        }
        sort={
          result.total > 1 ? (
            <SortSelect filters={filters} basePath={BASE_PATH} />
          ) : undefined
        }
        empty={
          filtered ? (
            <NoResults
              filters={filters}
              basePath={BASE_PATH}
              alert={{ source: null }}
            />
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-5">
              <p className="text-[17px] font-extrabold">
                Os primeiros veículos estão chegando
              </p>
              <p className="text-sm text-text-2">
                Tem uma loja de veículos? Coloque o seu estoque na CajuGo.
              </p>
              <ButtonLink href="/lojistas">Anunciar minha loja</ButtonLink>
            </div>
          )
        }
      />
      <div className="lg:hidden">{promoFooter}</div>
    </main>
  );
}
