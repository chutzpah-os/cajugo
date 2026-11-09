import Link from "next/link";
import { brl } from "@/platform/br/money";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";
import { vehicleAlt } from "@/platform/seo/catalog";
import { Badge } from "@/ui/badge";
import type { PublicCard as Card } from "../service";

const km = new Intl.NumberFormat("pt-BR");

/** Card do veículo [1a] (SHW-FR-003). `showStore`: vitrine CajuGo; catálogo da loja, não. */
export function PublicCard({
  card,
  cloudName,
  showStore,
  priority = false,
}: {
  card: Card;
  cloudName: string;
  showStore: boolean;
  priority?: boolean;
}) {
  return (
    <li className="flex flex-col overflow-hidden rounded-card border border-line bg-surface">
      <div className="relative aspect-[4/3] bg-line-2">
        {card.coverPublicId && (
          // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada
          <img
            src={imageUrlFor(cloudName, card.coverPublicId, IMAGE_WIDTHS.card)}
            alt={vehicleAlt({ ...card, color: null })}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            className="size-full object-cover"
          />
        )}
        {card.photoCount > 0 && (
          <span className="absolute right-2 bottom-2 rounded-full bg-ink/75 px-2 py-0.5 text-xs font-semibold text-white">
            1/{card.photoCount}
          </span>
        )}
        {card.badge && (
          <span className="absolute top-2 left-2">
            <Badge tone="ok">{card.badge}</Badge>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs font-bold tracking-wide text-text-3 uppercase">
          {card.make}
        </p>
        <h2 className="line-clamp-2 font-bold">{card.version ?? card.model}</h2>
        <p className="text-sm text-text-3">
          {[
            card.yearManufacture && card.yearModel
              ? `${card.yearManufacture}/${card.yearModel}`
              : null,
            card.mileageKm !== null ? `${km.format(card.mileageKm)} km` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="text-sm text-text-3">
          {card.city} ({card.state})
        </p>
        {showStore && (
          <p className="text-sm text-text-2">Anunciado por {card.storeName}</p>
        )}
        {card.priceCents !== null && (
          <p className="mt-1 text-[19px] font-extrabold">
            {brl(card.priceCents)}
          </p>
        )}
        {card.installmentCents !== null && (
          <p className="text-sm text-text-2">
            a partir de {brl(card.installmentCents)}/mês*
          </p>
        )}
        <Link
          href={card.path}
          aria-label={`Ver detalhes de ${card.version ?? card.model}`}
          className="mt-2 flex min-h-11 items-center justify-center rounded-button bg-ink text-sm font-bold text-white"
        >
          Ver detalhes
        </Link>
      </div>
    </li>
  );
}
