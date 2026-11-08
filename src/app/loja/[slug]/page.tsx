import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { cachedPublicStore } from "@/domains/stores/current";

export const metadata: Metadata = {
  // Página mínima até o catálogo da spec 005: fora da busca por enquanto (D4).
  robots: { index: false, follow: true },
};

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
 * inexistente → 404 de verdade. Por enquanto, nome e cidade; o catálogo é da 005.
 * Resolvido antes do streaming, com cache, para o status HTTP valer (SEO).
 */
export default async function StorePage({ params }: PageProps<"/loja/[slug]">) {
  const { slug } = await params;
  if (slug === BUILD_PLACEHOLDER) notFound();
  const store = await cachedPublicStore(slug);
  if (!store) notFound();
  if (store.redirected) permanentRedirect(`/loja/${store.slug}`);

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
        <p className="mt-4 rounded-card bg-neutral-soft p-4 text-sm text-text-2">
          Catálogo em construção. Em breve, os veículos desta loja aparecem
          aqui.
        </p>
      </main>
    </>
  );
}
