import type { Metadata } from "next";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";
import {
  discoveryDescription,
  discoveryEmptyHeading,
  discoveryTitle,
} from "@/platform/seo/discovery";
import { pageMetadata } from "@/platform/seo/seo";
import { ButtonLink } from "@/ui/button";
import type { DiscoveryPage } from "../service";

const NOT_INDEXED = { index: false, follow: true };

/**
 * Metadados da página de descoberta (DSC-FR-006): canônica sem filtros; fora do Google
 * quando está vazia (DSC-FR-005) ou quando o filtro não acha nada (SEO.md).
 */
export function discoveryMetadata(
  page: DiscoveryPage,
  list: { filtered: boolean; total: number; coverPublicId?: string | null },
): Metadata {
  const meta = pageMetadata({
    title: discoveryTitle(page.names),
    description: discoveryDescription(page.names, page.stats),
    path: page.path,
    image: list.coverPublicId
      ? imageUrlFor(cloudName(), list.coverPublicId, IMAGE_WIDTHS.full)
      : undefined,
  });
  const hidden = page.kind === "empty" || (list.filtered && !list.total);
  return hidden ? { ...meta, robots: NOT_INDEXED } : meta;
}

/** Página que ficou sem veículos [12a] (DSC-FR-005): diz o que falta e leva acima. */
export function DiscoveryEmpty({ page }: { page: DiscoveryPage }) {
  return (
    <div
      data-testid="discovery-empty"
      className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-5"
    >
      <p className="text-[17px] font-extrabold">
        {discoveryEmptyHeading(page.names)}
      </p>
      <p className="text-sm text-text-2">
        Veja abaixo outros veículos que podem interessar.
      </p>
      {page.fallback && (
        <ButtonLink href={page.fallback.path} variant="ghost">
          Ver {page.fallback.name}
        </ButtonLink>
      )}
    </div>
  );
}
