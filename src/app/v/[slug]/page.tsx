import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { StoreIdentity } from "@/domains/showcase/components/store-identity";
import { Unavailable } from "@/domains/showcase/components/unavailable";
import {
  VehicleDetails,
  VehicleSold,
} from "@/domains/showcase/components/vehicle-details";
import { RelatedLinks } from "@/domains/showcase/components/related-links";
import { ViewPing } from "@/domains/leads/components/device-marks";
import {
  cachedDiscoveryLinks,
  cachedVehiclePage,
} from "@/domains/showcase/current";
import { idFromVehicleParam } from "@/domains/showcase/urls";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";
import {
  breadcrumbJsonLd,
  carJsonLd,
  vehicleDescription,
  vehicleTitle,
} from "@/platform/seo/catalog";
import { JsonLd, pageMetadata } from "@/platform/seo/seo";

/** Rota bloqueante: o `params` de veículo não gerado no build é lido sem `<Suspense>`. */
export const instant = false;

/** Valor de validação do build (guia do Next com Cache Components): nunca é um veículo. */
const BUILD_PLACEHOLDER = "__build__";

/** Veículos não são gerados no build: cada um é gerado no 1º acesso e fica em cache. */
export function generateStaticParams() {
  return [{ slug: BUILD_PLACEHOLDER }];
}

const NOT_INDEXED = { index: false, follow: true };

async function load(slug: string) {
  const id = slug === BUILD_PLACEHOLDER ? null : idFromVehicleParam(slug);
  return id ? cachedVehiclePage(id) : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/v/[slug]">): Promise<Metadata> {
  const page = await load((await params).slug);
  if (page?.kind !== "vehicle")
    return {
      title:
        page?.kind === "unavailable"
          ? "Este veículo já foi vendido | CajuGo"
          : "Veículo | CajuGo",
      robots: NOT_INDEXED,
    };
  const place = { city: page.store.city, state: page.store.state };
  const meta = pageMetadata({
    title: vehicleTitle({ ...page, ...place }),
    description: vehicleDescription({
      ...page,
      ...place,
      storeName: page.store.name,
    }),
    path: page.path,
    image: page.photos[0]
      ? imageUrlFor(cloudName(), page.photos[0], IMAGE_WIDTHS.full)
      : undefined,
  });
  // Oculto pela CajuGo: abre pelo catálogo, mas fora do Google (RPT-FR-005, D3).
  return page.indexable ? meta : { ...meta, robots: NOT_INDEXED };
}

/**
 * Página do veículo [1b] (SHW-FR-008, 010, 011, 013). Endereço desatualizado e
 * inexistente são resolvidos antes, no `proxy.ts` (ADR 0013).
 */
export default async function VehiclePage({ params }: PageProps<"/v/[slug]">) {
  const page = await load((await params).slug);
  if (!page) notFound();
  const cloud = cloudName();

  if (page.kind === "suspended")
    return (
      <>
        <SiteHeader />
        <Unavailable title="Catálogo temporariamente indisponível" />
      </>
    );
  if (page.kind === "unavailable")
    return (
      <>
        <SiteHeader />
        {page.soldCar && (
          <JsonLd
            data={carJsonLd({ ...page.soldCar, image: null, sold: true })}
          />
        )}
        <VehicleSold similar={page.similar} cloudName={cloud} />
      </>
    );

  return (
    <>
      {page.shared ? (
        <SiteHeader />
      ) : (
        <header className="border-b border-line bg-surface px-4 py-3">
          <StoreIdentity
            {...page.store}
            cloudName={cloud}
            caption="catálogo CajuGo"
          />
        </header>
      )}
      <JsonLd
        data={carJsonLd({
          ...page,
          image: page.photos[0]
            ? imageUrlFor(cloud, page.photos[0], IMAGE_WIDTHS.full)
            : null,
          storeName: page.store.name,
          sold: false,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Início", path: "/" },
          { name: page.store.name, path: `/loja/${page.store.slug}` },
          {
            name: [page.make, page.model].filter(Boolean).join(" "),
            path: page.path,
          },
        ])}
      />
      <ViewPing vehicleId={page.vehicleId} />
      <VehicleDetails
        page={page}
        cloudName={cloud}
        related={
          <RelatedLinks
            links={await cachedDiscoveryLinks({
              make: page.make,
              makeSlug: page.makeSlug,
              model: page.model,
              modelSlug: page.modelSlug,
              city: page.store.city,
              state: page.store.state,
              citySlug: page.store.citySlug,
            })}
          />
        }
      />
    </>
  );
}
