import { imageUrlFor, IMAGE_WIDTHS } from "@/platform/cloudinary/urls";

/** Logo ou sigla, nome e cidade da loja: catálogo [1a] e veículo não divulgado. */
export function StoreIdentity({
  name,
  city,
  state,
  initials,
  logoPublicId,
  cloudName,
  caption,
}: {
  name: string;
  city: string;
  state: string;
  initials: string;
  logoPublicId: string | null;
  cloudName: string;
  caption?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-card bg-caju-soft font-extrabold text-caju-deep">
        {logoPublicId ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada
          <img
            src={imageUrlFor(cloudName, logoPublicId, IMAGE_WIDTHS.thumb)}
            alt={`Logo de ${name}`}
            className="size-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-bold">{name}</p>
        <p className="text-sm text-text-3">
          {city}/{state}
          {caption ? ` · ${caption}` : ""}
        </p>
      </div>
    </div>
  );
}
