import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { CatalogToolbar } from "@/domains/showcase/components/catalog-toolbar";
import { CatalogView } from "@/domains/showcase/components/catalog-view";
import { FiltersSide } from "@/domains/showcase/components/filters-side";
import { NoResults } from "@/domains/showcase/components/no-results";
import { RelatedLinks } from "@/domains/showcase/components/related-links";
import { SortSelect } from "@/domains/showcase/components/sort-select";
import { StoreIdentity } from "@/domains/showcase/components/store-identity";
import { Unavailable } from "@/domains/showcase/components/unavailable";
import {
  cachedDiscoveryLinks,
  cachedFacets,
  cachedSearch,
  cachedStorePage,
} from "@/domains/showcase/current";
import { filtersToQuery, parseFilters } from "@/domains/showcase/filters";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";
import {
  autoDealerJsonLd,
  breadcrumbJsonLd,
  itemListJsonLd,
  storeTitle,
} from "@/platform/seo/catalog";
import { JsonLd, pageMetadata } from "@/platform/seo/seo";

/** Rota bloqueante: o `params` de loja não gerada no build é lido sem `<Suspense>`. */
export const instant = false;

/** Valor de validação do build (guia do Next com Cache Components): nunca é uma loja. */
const BUILD_PLACEHOLDER = "__build__";

/** Lojas não são geradas no build: cada uma é gerada no 1º acesso e fica em cache. */
export function generateStaticParams() {
  return [{ slug: BUILD_PLACEHOLDER }];
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/loja/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = slug === BUILD_PLACEHOLDER ? null : await cachedStorePage(slug);
  if (page?.kind !== "store")
    return { title: "Loja | CajuGo", robots: { index: false, follow: true } };
  const image = page.coverPublicId ?? page.logoPublicId;
  const meta = pageMetadata({
    title: storeTitle(page),
    description:
      page.about?.slice(0, 155) ??
      `Veja o estoque de ${page.name} em ${page.city}/${page.state}: carros usados e seminovos, com preço e contato pelo WhatsApp.`,
    path: `/loja/${page.slug}`,
    image: image
      ? imageUrlFor(cloudName(), image, IMAGE_WIDTHS.full)
      : undefined,
  });
  const filters = parseFilters(await searchParams);
  if (filtersToQuery(filters) === "") return meta;
  // Filtro sem resultado fica fora do Google (SEO.md, SHW-FR-012).
  const { total } = await cachedSearch({ storeId: page.storeId }, filters);
  return total ? meta : { ...meta, robots: { index: false, follow: true } };
}

/**
 * Catálogo da loja [1a] (SHW-FR-002, 011, 013). O status real (308/404) vem do
 * `proxy.ts`; aqui é a segunda barreira (ADR 0013).
 */
export default async function StorePage({
  params,
  searchParams,
}: PageProps<"/loja/[slug]">) {
  const { slug } = await params;
  if (slug === BUILD_PLACEHOLDER) notFound();
  const page = await cachedStorePage(slug);
  if (!page) notFound();
  if (page.kind === "redirect") permanentRedirect(page.to);
  if (page.kind === "suspended")
    return (
      <>
        <SiteHeader />
        <Unavailable title="Catálogo temporariamente indisponível" />
      </>
    );

  const scope = { storeId: page.storeId };
  const filters = parseFilters(await searchParams);
  const [result, { makes }, cityLinks] = await Promise.all([
    cachedSearch(scope, filters),
    cachedFacets(scope),
    cachedDiscoveryLinks({
      city: page.city,
      state: page.state,
      citySlug: page.citySlug,
    }),
  ]);
  const filtered = filtersToQuery(filters) !== "";
  const cloud = cloudName();
  const source = { kind: "store" as const, slug: page.slug };
  const path = `/loja/${page.slug}`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 py-6 md:max-w-5xl lg:max-w-6xl">
        <JsonLd
          data={autoDealerJsonLd({
            name: page.name,
            path,
            city: page.city,
            state: page.state,
            telephone: page.whatsapp,
            hours: page.hours,
            image: page.logoPublicId
              ? imageUrlFor(cloud, page.logoPublicId, IMAGE_WIDTHS.card)
              : null,
          })}
        />
        <JsonLd
          data={breadcrumbJsonLd([
            { name: "Início", path: "/" },
            { name: page.name, path },
          ])}
        />
        {result.total > 0 && (
          <JsonLd data={itemListJsonLd(result.items.map((c) => c.path))} />
        )}
        <StoreIdentity
          name={page.name}
          city={page.city}
          state={page.state}
          initials={page.initials}
          logoPublicId={page.logoPublicId}
          cloudName={cloud}
          caption="catálogo CajuGo"
        />
        <RelatedLinks links={cityLinks} title="Mais carros na cidade" />
        <CatalogView
          title={`Estoque ${page.name}`}
          count={`${result.total} ${result.total === 1 ? "veículo disponível" : "veículos disponíveis"}`}
          result={result}
          filters={filters}
          source={source}
          cloudName={cloud}
          showStore={false}
          toolbar={
            makes.length > 0 || filtered ? (
              <CatalogToolbar
                filters={filters}
                makes={makes}
                total={result.total}
                basePath={path}
                source={source}
              />
            ) : undefined
          }
          sidebar={
            makes.length > 0 || filtered ? (
              <FiltersSide
                filters={filters}
                makes={makes}
                total={result.total}
                basePath={path}
                source={source}
              />
            ) : undefined
          }
          sort={
            result.total > 1 ? (
              <SortSelect filters={filters} basePath={path} />
            ) : undefined
          }
          empty={
            filtered ? (
              <NoResults filters={filters} basePath={path} />
            ) : (
              <p className="rounded-card bg-neutral-soft p-4 text-sm text-text-2">
                Esta loja ainda não tem veículos publicados.
              </p>
            )
          }
        />
      </main>
    </>
  );
}
