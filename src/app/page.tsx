import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { HomeView } from "@/domains/showcase/components/home-view";
import { JsonLd, pageMetadata } from "@/platform/seo/seo";
import { websiteJsonLd } from "@/platform/seo/catalog";

export const metadata: Metadata = pageMetadata({
  title: "CajuGo: a sua plataforma automotiva",
  description:
    "Compre, venda e cuide do seu veículo num só lugar: veículos novos e usados das lojas, catálogo para lojistas e consulta veicular. Fale direto com a loja pelo WhatsApp.",
  path: "/",
});

/** Página inicial (017): pré-renderizada; a lista de veículos fica em `/veiculos`. */
export default function Home() {
  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <SiteHeader active="inicio" />
      <HomeView />
    </>
  );
}
