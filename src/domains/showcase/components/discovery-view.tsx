import type { Metadata } from "next";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { breadcrumbJsonLd, itemListJsonLd } from "@/platform/seo/catalog";
import { discoveryIntro, discoveryTitle } from "@/platform/seo/discovery";
import { JsonLd } from "@/platform/seo/seo";
import { cachedDiscoveryPage, cachedFacets, cachedSearch } from "../current";
import { parseDiscoveryPath } from "../discovery-urls";
import { discoveryFilters, filtersToQuery, parseFilters } from "../filters";
import type { DiscoveryPage } from "../service";
import { Breadcrumbs } from "./breadcrumbs";
import { CatalogToolbar } from "./catalog-toolbar";
import { CatalogView, showcaseCount } from "./catalog-view";
import { DiscoveryEmpty, discoveryMetadata } from "./discovery-parts";
import { FiltersSide } from "./filters-side";
import { NoResults } from "./no-results";
import { PublicCard } from "./public-card";
import { SortSelect } from "./sort-select";

type Params = Record<string, string | string[] | undefined>;

const MAIN =
  "mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 py-6 md:max-w-5xl lg:max-w-6xl";

/** Endereço → página e filtros; `null` quando o endereço não é de descoberta. */
async function load(segments: string[], params: Params) {
  const key = parseDiscoveryPath(segments);
  const page = key ? await cachedDiscoveryPage(key) : null;
  if (!page) return null;
  return { page, filters: discoveryFilters(page.key, parseFilters(params)) };
}

export async function discoveryRouteMetadata(
  segments: string[],
  params: Params,
): Promise<Metadata | null> {
  const loaded = await load(segments, params);
  if (!loaded) return null;
  const { page, filters } = loaded;
  // A prévia do link usa a 1ª foto da lista que a página mostra (SEO.md §6).
  const shown =
    page.kind === "listing"
      ? await cachedSearch({ discovery: page.key }, filters)
      : await fallbackSearch(page);
  return discoveryMetadata(page, {
    filtered: filtersToQuery(filters) !== "",
    total: page.kind === "listing" ? shown.total : 0,
    coverPublicId: shown.items[0]?.coverPublicId,
  });
}

/** Veículos da página acima, mostrados quando esta está vazia (DSC-FR-005). */
function fallbackSearch(page: DiscoveryPage) {
  const up = page.fallback?.key;
  return cachedSearch(up ? { discovery: up } : "showcase", parseFilters({}));
}

/** Página de descoberta [1a] (DSC-FR-001 a 007); `null` vira 404 na rota. */
export async function DiscoveryRoute({
  segments,
  params,
}: {
  segments: string[];
  params: Params;
}) {
  const loaded = await load(segments, params);
  if (!loaded) return null;
  return loaded.page.kind === "empty" ? (
    <EmptyDiscovery page={loaded.page} />
  ) : (
    <ListingDiscovery page={loaded.page} filters={loaded.filters} />
  );
}

async function ListingDiscovery({
  page,
  filters,
}: {
  page: DiscoveryPage;
  filters: ReturnType<typeof parseFilters>;
}) {
  const scope = { discovery: page.key };
  const [result, { makes }] = await Promise.all([
    cachedSearch(scope, filters),
    cachedFacets(scope),
  ]);
  const source = { kind: "discovery" as const, path: page.path };
  const lockMake = Boolean(page.key.makeSlug);
  return (
    <main className={MAIN}>
      <JsonLd data={breadcrumbJsonLd(page.crumbs)} />
      {result.total > 0 && (
        <JsonLd data={itemListJsonLd(result.items.map((c) => c.path))} />
      )}
      <Breadcrumbs crumbs={page.crumbs} />
      <CatalogView
        title={discoveryTitle(page.names)}
        intro={
          <p className="text-[15px] text-text-2" data-testid="discovery-intro">
            {discoveryIntro(page.names, page.stats)}
          </p>
        }
        count={showcaseCount(result.total, result.stores)}
        result={result}
        filters={filters}
        source={source}
        cloudName={cloudName()}
        showStore
        toolbar={
          <CatalogToolbar
            filters={filters}
            makes={makes}
            total={result.total}
            basePath={page.path}
            source={source}
            lockMake={lockMake}
          />
        }
        sidebar={
          <FiltersSide
            filters={filters}
            makes={makes}
            total={result.total}
            basePath={page.path}
            source={source}
            lockMake={lockMake}
          />
        }
        sort={
          result.total > 1 ? (
            <SortSelect filters={filters} basePath={page.path} />
          ) : undefined
        }
        empty={
          <NoResults
            filters={filters}
            basePath={page.path}
            alert={{ source: { kind: "discovery", path: page.path } }}
          />
        }
      />
    </main>
  );
}

/** Ficou sem veículos: mensagem e os veículos da página acima (DSC-FR-005). */
async function EmptyDiscovery({ page }: { page: DiscoveryPage }) {
  const others = await fallbackSearch(page);
  const cloud = cloudName();
  return (
    <main className={MAIN}>
      <JsonLd data={breadcrumbJsonLd(page.crumbs)} />
      <Breadcrumbs crumbs={page.crumbs} />
      <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">
        {discoveryTitle(page.names)}
      </h1>
      <DiscoveryEmpty page={page} />
      {others.items.length > 0 && (
        <ul
          data-testid="catalog-list"
          className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
        >
          {others.items.map((card) => (
            <PublicCard
              key={card.vehicleId}
              card={card}
              cloudName={cloud}
              showStore
            />
          ))}
        </ul>
      )}
    </main>
  );
}
