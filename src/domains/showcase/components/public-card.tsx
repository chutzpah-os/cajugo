import Link from "next/link";
import { brlWhole } from "@/platform/br/money";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";
import { vehicleAlt } from "@/platform/seo/catalog";
import { FavoriteButton } from "@/domains/buyers/components/favorite-button";
import { Badge } from "@/ui/badge";
import type { PublicCard as Card } from "../service";

const km = new Intl.NumberFormat("pt-BR");

/** O que o aparelho guarda ao favoritar (BUY-FR-004): o preço é o do momento. */
export function favoriteSnapshot(
  v: Pick<
    Card,
    "vehicleId" | "path" | "make" | "model" | "yearModel" | "priceCents"
  >,
) {
  return {
    id: v.vehicleId,
    path: v.path,
    title:
      [v.make, v.model, v.yearModel].filter(Boolean).join(" ") || "Veículo",
    priceCents: v.priceCents,
  };
}

/**
 * Card do veículo na vitrine e no catálogo da loja ([15a], [9a]; SHW-FR-003): foto,
 * nome em caixa alta (marca e modelo), versão, preço sem centavos, parcela e, depois
 * da divisória, ano · km · cidade. O card inteiro é o link. `showStore`: vitrine
 * CajuGo ("Anunciado por", conteúdo da 006).
 */
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
  const title = [card.make, card.model].filter(Boolean).join(" ");
  const meta = [
    card.yearManufacture && card.yearModel
      ? `${card.yearManufacture}/${card.yearModel}`
      : card.yearModel,
    card.mileageKm !== null ? `${km.format(card.mileageKm)} km` : null,
    `${card.city} (${card.state})`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li
      data-testid="public-card"
      className="relative flex flex-col overflow-hidden rounded-card border border-line bg-surface"
    >
      <div className="relative aspect-[390/220] bg-[repeating-linear-gradient(135deg,#E4E0D9_0_12px,#DDD8D0_12px_24px)] lg:aspect-auto lg:h-[190px]">
        {card.coverPublicId && (
          // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada
          <img
            src={imageUrlFor(cloudName, card.coverPublicId, IMAGE_WIDTHS.card)}
            alt={vehicleAlt({ ...card, color: null })}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {card.photoCount > 1 && (
          <span className="absolute bottom-2.5 left-2.5 rounded-xl bg-ink/70 px-2 py-1 text-xs font-semibold text-white">
            1/{card.photoCount}
          </span>
        )}
        {card.badge && (
          <span className="absolute top-2.5 left-2.5">
            <Badge tone="ok">{card.badge}</Badge>
          </span>
        )}
        <FavoriteButton
          snapshot={favoriteSnapshot(card)}
          className="absolute top-2 right-2 z-[1] bg-surface/90 text-ink"
        />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 px-4 pt-3.5 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-base leading-tight font-extrabold tracking-[-0.01em] uppercase">
              <Link
                href={card.path}
                className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-card focus-visible:after:outline-2 focus-visible:after:outline-ink"
              >
                {title || card.version}
              </Link>
            </h2>
            {card.version && (
              <p className="truncate text-[13px] text-text-3">{card.version}</p>
            )}
            {card.priceCents !== null && (
              <p className="mt-1.5 text-xl leading-tight font-extrabold tracking-[-0.02em]">
                {brlWhole(card.priceCents)}
              </p>
            )}
          </div>
          {/* O card inteiro é o link da página do veículo; o botão só o deixa à vista. */}
          <span
            aria-hidden
            data-testid="card-talk"
            className="flex h-10 flex-none items-center rounded-button bg-ink px-4 text-sm font-bold text-white"
          >
            Conversar
          </span>
        </div>
        <p className="mt-2.5 border-t border-line-2 pt-2.5 text-xs text-text-3">
          {meta}
        </p>
        {showStore && (
          <p className="text-xs text-text-3">
            Anunciado por{" "}
            <span className="font-semibold text-ink">{card.storeName}</span>
          </p>
        )}
      </div>
    </li>
  );
}
