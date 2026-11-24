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
  // [1a] modo lojista: sigla em quadrado `ink` 34 px raio 10, nome 16/800 e
  // "Cidade (UF) · catálogo CajuGo" 11 `text-3`.
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex size-[34px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-ink text-sm font-extrabold text-white lg:size-10">
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
      <div className="flex min-w-0 flex-col gap-px">
        <p className="truncate text-base leading-tight font-extrabold">
          {name}
        </p>
        <p className="truncate text-[11px] text-text-3 lg:text-xs">
          {city} ({state}){caption ? ` · ${caption}` : ""}
        </p>
      </div>
    </div>
  );
}
