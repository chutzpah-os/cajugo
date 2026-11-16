import Link from "next/link";
import { brl } from "@/platform/br/money";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";
import type { ModeratedCard } from "../service";

/** Foto, nome com link para o anúncio, loja e preço, nos cards de [14e]. */
export function ModeratedVehicle({
  vehicle,
  cloudName,
}: {
  vehicle: ModeratedCard;
  cloudName: string;
}) {
  return (
    <div className="flex gap-3">
      {vehicle.coverPublicId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrlFor(
            cloudName,
            vehicle.coverPublicId,
            IMAGE_WIDTHS.thumb,
          )}
          alt={vehicle.title}
          width={96}
          height={72}
          loading="lazy"
          className="h-[72px] w-24 shrink-0 rounded-input object-cover"
        />
      ) : (
        <div className="h-[72px] w-24 shrink-0 rounded-input bg-neutral-soft" />
      )}
      <div className="flex min-w-0 flex-col">
        <Link
          href={vehicle.path}
          target="_blank"
          className="flex min-h-11 items-center font-bold text-caju-deep underline"
        >
          {vehicle.title}
        </Link>
        <p className="text-sm text-text-2">
          {vehicle.storeName}
          {vehicle.priceCents !== null && ` · ${brl(vehicle.priceCents)}`}
        </p>
      </div>
    </div>
  );
}
