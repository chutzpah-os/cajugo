import type { Metadata } from "next";
import Link from "next/link";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";
import { breadcrumbJsonLd, itemListJsonLd } from "@/platform/seo/catalog";
import { JsonLd, pageMetadata } from "@/platform/seo/seo";
import { cachedDiscoveryIndex } from "../current";
import { Breadcrumbs } from "./breadcrumbs";

type Entry = { path: string; name: string; count: number };
type Index = { makes: Entry[]; cities: Entry[] };

const CRUMBS = [
  { name: "Início", path: "/" },
  { name: "Carros", path: "/carros" },
];

/** `coverPublicId`: 1ª foto da vitrine, para a prévia do link (SEO.md §6). */
export function discoveryIndexMetadata(
  index: Index,
  coverPublicId?: string | null,
): Metadata {
  const meta = pageMetadata({
    title: "Carros usados por marca e por cidade",
    description:
      "Encontre carros usados e seminovos à venda pela marca ou pela cidade, com fotos, preço e contato direto com a loja.",
    path: "/carros",
    image: coverPublicId
      ? imageUrlFor(cloudName(), coverPublicId, IMAGE_WIDTHS.full)
      : undefined,
  });
  return index.makes.length || index.cities.length
    ? meta
    : { ...meta, robots: { index: false, follow: true } };
}

function Section({
  id,
  title,
  entries,
}: {
  id: string;
  title: string;
  entries: Entry[];
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-4 flex-col gap-3"
    >
      <h2 id={`${id}-title`} className="text-[19px] font-extrabold">
        {title}
      </h2>
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        {entries.map((e) => (
          <li key={e.path}>
            <Link
              href={e.path}
              className="flex min-h-11 items-center justify-between gap-2 rounded-input border border-line bg-surface px-3 text-[15px] font-semibold"
            >
              <span className="truncate">{e.name}</span>
              <span className="text-sm text-text-3">{e.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Marcas e cidades com veículos na vitrine, com a contagem (DSC-FR-013). */
export function DiscoveryIndexList({ index }: { index: Index }) {
  return (
    <>
      {index.makes.length > 0 && (
        <Section id="marcas" title="Por marca" entries={index.makes} />
      )}
      {index.cities.length > 0 && (
        <Section id="cidades" title="Por cidade" entries={index.cities} />
      )}
    </>
  );
}

/** Índice `/carros` (DSC-FR-013): sem parâmetros, pré-renderizado e em cache. */
export async function DiscoveryIndexView() {
  const index = await cachedDiscoveryIndex();
  const paths = [...index.makes, ...index.cities].map((e) => e.path);
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-5 px-4 py-6 md:max-w-5xl lg:max-w-6xl">
      <JsonLd data={breadcrumbJsonLd(CRUMBS)} />
      {paths.length > 0 && <JsonLd data={itemListJsonLd(paths)} />}
      <Breadcrumbs crumbs={CRUMBS} />
      <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">
        Carros usados por marca e por cidade
      </h1>
      {paths.length ? (
        <DiscoveryIndexList index={index} />
      ) : (
        <p className="rounded-card bg-neutral-soft p-4 text-sm text-text-2">
          Os primeiros veículos estão chegando.
        </p>
      )}
    </main>
  );
}
