import type { Metadata } from "next";
import { appUrl } from "../http/urls";

const SITE = "CajuGo";

/**
 * Metadata de página pública (SEO.md §2): título único com a marca, descrição,
 * canônica absoluta sem parâmetros e Open Graph/Twitter para a prévia do link.
 */
export function pageMetadata(input: {
  title: string;
  description: string;
  /** Caminho da página; query e fragmento são descartados na canônica. */
  path: string;
  image?: string;
}): Metadata {
  const title = `${input.title} | ${SITE}`;
  const url = `${appUrl()}${input.path.split(/[?#]/)[0]}`;
  const images = input.image ? [{ url: input.image }] : undefined;
  return {
    title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: input.description,
      url,
      siteName: SITE,
      locale: "pt_BR",
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: input.description,
      images: input.image ? [input.image] : undefined,
    },
  };
}

/** JSON-LD seguro para `<script>`: `<` vira `<` (guia do Next). */
export function jsonLdText(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Dados estruturados (schema.org) da página. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Conteúdo escapado por jsonLdText: nunca HTML do usuário (SECURITY.md §6).
      dangerouslySetInnerHTML={{ __html: jsonLdText(data) }}
    />
  );
}
