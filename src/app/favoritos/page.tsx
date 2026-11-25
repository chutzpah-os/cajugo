import { SiteFooter } from "@/ui/site-footer";
import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { FavoritesView } from "@/domains/buyers/components/favorites-view";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { pageMetadata } from "@/platform/seo/seo";

/** Lista pessoal, do aparelho: fora do Google e do sitemap (SEO.md §6). */
export const metadata: Metadata = {
  ...pageMetadata({
    title: "Favoritos",
    description: "Os veículos que você guardou na CajuGo, neste aparelho.",
    path: "/favoritos",
  }),
  robots: { index: false, follow: true },
};

/** Favoritos [14a]: casca pré-renderizada; a lista vem do aparelho (BUY-FR-005). */
export default function FavoritesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 py-6 md:max-w-5xl lg:max-w-6xl">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">
          Favoritos
        </h1>
        <FavoritesView cloudName={cloudName()} />
      </main>
      <SiteFooter />
    </>
  );
}
