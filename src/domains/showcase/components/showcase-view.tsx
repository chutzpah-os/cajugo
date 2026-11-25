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
import { FiltersSheet } from "./filters-sheet";
import { SearchBox } from "./search-box";
import { SellPitch } from "./sell-pitch";
import { ShowcasePanel } from "./showcase-panel";
import { TypeChip, TypeList } from "./type-strip";
import { vehicleType } from "../vehicle-types";
import { CatalogView, showcaseCount } from "./catalog-view";
import type { MakeOption } from "./filters-form";
import { FiltersSide } from "./filters-side";
import { NoResults } from "./no-results";
import { SortSelect } from "./sort-select";

const TITLE = "Veículos novos e seminovos à venda";
const BASE_PATH = "/veiculos";

const CONDITION_TITLE = {
  novo: "Veículos novos (0 km) à venda",
  seminovo: "Veículos seminovos à venda",
  usado: "Veículos usados à venda",
} as const;

/** Título da lista: o do tipo, o do estado (novo, seminovo, usado) ou o geral. */
function titleOf(f: Filters): string {
  if (f.type) return vehicleType(f.type).title;
  if (f.condition) return CONDITION_TITLE[f.condition];
  return TITLE;
}

/**
 * Metadados da vitrine, com ou sem filtros: canônica sempre `/` (SEO.md) e fora do
 * Google quando a lista vem vazia (SHW-FR-001, SHW-FR-012).
 */
export function showcaseMetadata(result: SearchResult): Metadata {
  const cover = result.items[0]?.coverPublicId;
  const meta = pageMetadata({
    title: TITLE,
    description:
      "Encontre veículos novos e seminovos das melhores lojas, com preço, fotos e contato direto pelo WhatsApp.",
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
}: {
  filters: Filters;
  result: SearchResult;
  /** Faixa do Caju Indica ao lado do quadro Comprar · Vender (010, pedido do dono). */
  promo?: ReactNode;
}) {
  const { makes, cities } = await cachedFacets("showcase");
  const filtered = filtersToQuery(filters) !== "";
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 pb-8 md:max-w-3xl lg:max-w-none lg:px-8 lg:pb-0">
      <JsonLd data={websiteJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Início", path: "/" },
          { name: "Veículos", path: BASE_PATH },
        ])}
      />
      {result.total > 0 && (
        <JsonLd data={itemListJsonLd(result.items.map((c) => c.path))} />
      )}
      <CatalogView
        title={titleOf(filters)}
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
        toolbarOnDesktop
        toolbar={
          <div className="flex flex-col gap-3 lg:mx-auto lg:w-full lg:max-w-5xl">
            <ShowcasePanel
              search={
                <ShowcaseSearch
                  filters={filters}
                  makes={makes}
                  cities={cities}
                  total={result.total}
                />
              }
              sell={<SellPitch />}
            />
            {promo}
          </div>
        }
        sidebar={
          makes.length > 0 || filtered ? (
            <FiltersSide
              types
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
    </main>
  );
}

/** Aba Buscar: a busca e a faixa de tipos (sem tipo) ou a barra de filtros. */
function ShowcaseSearch({
  filters,
  makes,
  cities,
  total,
}: {
  filters: Filters;
  makes: MakeOption[];
  cities: MakeOption[];
  total: number;
}) {
  return (
    <>
      <SearchBox
        filters={filters}
        basePath={BASE_PATH}
        hidden={[
          ...new URLSearchParams(filtersToQuery({ ...filters, q: undefined })),
        ]}
      />
      <FiltersSheet
        lead={<TypeChip filters={filters} basePath={BASE_PATH} />}
        top={
          <TypeList filters={filters} basePath={BASE_PATH} id="tipo-folha" />
        }
        filters={filters}
        makes={makes}
        cities={cities}
        total={total}
        basePath={BASE_PATH}
        source={null}
      />
    </>
  );
}
