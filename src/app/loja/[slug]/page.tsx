import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { cachedPublicStore } from "@/domains/stores/current";
import { cachedPublicVehicles } from "@/domains/vehicles/current";
import { brl } from "@/platform/br/money";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";

export const metadata: Metadata = {
  // Catálogo simples; a página completa, com SEO, é da spec 006: fora da busca até lá.
  robots: { index: false, follow: true },
};

const km = new Intl.NumberFormat("pt-BR");

/** Rota bloqueante: o `params` de loja não gerada no build é lido sem `<Suspense>`. */
export const instant = false;

/** Valor de validação do build (guia do Next com Cache Components): nunca é uma loja. */
const BUILD_PLACEHOLDER = "__build__";

/**
 * Lojas não são geradas no build (o build não depende do banco): cada uma é gerada
 * no 1º acesso e fica em cache (`cachedPublicStore`).
 */
export function generateStaticParams() {
  return [{ slug: BUILD_PLACEHOLDER }];
}

/**
 * `/loja/{slug}` (D4 do plano 003): endereço antigo → 308 para o novo (STO-FR-013);
 * inexistente → 404 de verdade. Lista os veículos publicados (VEH-FR-010).
 * Resolvido antes do streaming, com cache, para o status HTTP valer (SEO).
 */
export default async function StorePage({ params }: PageProps<"/loja/[slug]">) {
  const { slug } = await params;
  if (slug === BUILD_PLACEHOLDER) notFound();
  const store = await cachedPublicStore(slug);
  if (!store) notFound();
  if (store.redirected) permanentRedirect(`/loja/${store.slug}`);
  const vehicles = await cachedPublicVehicles(store.storeId);
  const cloud = cloudName();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-2 px-4 py-8 md:max-w-5xl">
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">
          {store.name}
        </h1>
        <p className="text-[15px] text-text-2">
          {store.city}/{store.state}
        </p>
        {vehicles.length ? (
          <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {vehicles.map((v) => (
              <li
                key={v.vehicleId}
                className="overflow-hidden rounded-card border border-line bg-surface"
              >
                <div className="aspect-[4/3] bg-line-2">
                  {v.coverPublicId && (
                    // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada
                    <img
                      src={imageUrlFor(
                        cloud,
                        v.coverPublicId,
                        IMAGE_WIDTHS.card,
                      )}
                      alt={v.name}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <h2 className="font-bold">{v.name}</h2>
                  <p className="text-sm text-text-3">
                    {[
                      v.yearModel,
                      v.mileageKm !== null && `${km.format(v.mileageKm)} km`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {v.priceCents !== null && (
                    <p className="text-[17px] font-extrabold">
                      {brl(v.priceCents)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-card bg-neutral-soft p-4 text-sm text-text-2">
            Esta loja ainda não tem veículos publicados.
          </p>
        )}
      </main>
    </>
  );
}
