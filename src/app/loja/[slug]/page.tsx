import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { CatalogView } from "@/domains/showcase/components/catalog-view";
import { Unavailable } from "@/domains/showcase/components/unavailable";
import { cachedSearch, cachedStorePage } from "@/domains/showcase/current";
import { parseFilters } from "@/domains/showcase/filters";
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
}: PageProps<"/loja/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = slug === BUILD_PLACEHOLDER ? null : await cachedStorePage(slug);
  if (page?.kind !== "store")
    return { title: "Loja | CajuGo", robots: { index: false, follow: true } };
  const image = page.coverPublicId ?? page.logoPublicId;
  return pageMetadata({
    title: storeTitle(page),
    description:
      page.about?.slice(0, 155) ??
      `Veja o estoque de ${page.name} em ${page.city}/${page.state}: carros usados e seminovos, com preço e contato pelo WhatsApp.`,
    path: `/loja/${page.slug}`,
    image: image
      ? imageUrlFor(cloudName(), image, IMAGE_WIDTHS.full)
      : undefined,
  });
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

  const result = await cachedSearch(
    { storeId: page.storeId },
    parseFilters(await searchParams),
  );
  const cloud = cloudName();
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
        <header className="flex items-center gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-card bg-caju-soft font-extrabold text-caju-deep">
            {page.logoPublicId ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada
              <img
                src={imageUrlFor(cloud, page.logoPublicId, IMAGE_WIDTHS.thumb)}
                alt={`Logo de ${page.name}`}
                className="size-full object-cover"
              />
            ) : (
              page.initials
            )}
          </div>
          <div>
            <p className="font-bold">{page.name}</p>
            <p className="text-sm text-text-3">
              {page.city}/{page.state} · catálogo CajuGo
            </p>
          </div>
        </header>
        <CatalogView
          title={`Estoque ${page.name}`}
          count={`${result.total} ${result.total === 1 ? "veículo disponível" : "veículos disponíveis"}`}
          result={result}
          cloudName={cloud}
          showStore={false}
          empty={
            <p className="rounded-card bg-neutral-soft p-4 text-sm text-text-2">
              Esta loja ainda não tem veículos publicados.
            </p>
          }
        />
      </main>
    </>
  );
}
