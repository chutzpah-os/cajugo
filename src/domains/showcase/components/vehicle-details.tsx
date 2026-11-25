import Link from "next/link";
import type { ReactNode } from "react";
import { brlWhole } from "@/platform/br/money";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";
import { vehicleAlt } from "@/platform/seo/catalog";
import { FavoriteButton } from "@/domains/buyers/components/favorite-button";
import { ContactForm } from "@/domains/leads/components/contact-form";
import { WhatsappButton } from "@/domains/leads/components/whatsapp-button";
import {
  ReportSheet,
  ReportTrigger,
} from "@/domains/moderation/components/report-sheet";
import { Badge } from "@/ui/badge";
import { ButtonLink } from "@/ui/button";
import type { PublicCard as Card, VehiclePage } from "../service";
import { Gallery } from "./gallery";
import { favoriteSnapshot, PublicCard } from "./public-card";
import { ShareButton } from "./share-button";
import { Unavailable } from "./unavailable";
import { FinancingNotice, PriceCompare, StoreAbout } from "./vehicle-blocks";

type Live = Extract<VehiclePage, { kind: "vehicle" }>;

const km = new Intl.NumberFormat("pt-BR");
const overlayPill =
  "flex h-11 items-center rounded-full bg-[rgba(28,27,32,.7)] px-4 text-sm font-semibold text-white";
const overlayButton = `absolute top-3 ${overlayPill}`;

function Spec({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | number;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-xs text-text-3">{label}</dt>
      <dd className="text-[15px] font-semibold">{value}</dd>
    </div>
  );
}

function specs(p: Live): [string, string | number | null][] {
  return [
    ["Ano", [p.yearManufacture, p.yearModel].filter(Boolean).join("/") || null],
    ["KM", p.mileageKm === null ? null : km.format(p.mileageKm)],
    ["Câmbio", p.transmission],
    ["Carroceria", p.body],
    ["Combustível", p.fuel],
    ["Final de placa", p.plateEnd],
    ["Cor", p.color],
    ["Portas", p.doors],
    ["Motor", p.engine],
  ];
}

/** Página do veículo [1b] (SHW-FR-008). A placa só aparece como final. */
export function VehicleDetails({
  page,
  cloudName,
  related,
}: {
  page: Live;
  cloudName: string;
  /** Links para as páginas de descoberta (DSC-FR-008). */
  related?: ReactNode;
}) {
  const alt = vehicleAlt(page);
  const backHref = page.shared ? "/veiculos" : `/loja/${page.store.slug}`;
  const lead = {
    vehicleId: page.vehicleId,
    storeSlug: page.store.slug,
    shared: page.shared,
  };
  const whatsapp = (
    <WhatsappButton
      href={page.whatsappUrl}
      lead={lead}
      data-testid="whatsapp"
      className="flex h-12 items-center justify-center rounded-button bg-whatsapp text-[15px] font-bold text-white"
    >
      WhatsApp
    </WhatsappButton>
  );
  const parcelas = (
    <a
      href="#parcelas"
      data-testid="see-installments"
      className="flex h-12 flex-none items-center justify-center rounded-button bg-caju px-5 text-[15px] font-bold text-white"
    >
      Ver parcelas
    </a>
  );
  return (
    <main className="w-full flex-1 pb-12">
      {/* Galeria contida na coluna do conteúdo, para não esticar as fotos (pedido do dono). */}
      <div className="mx-auto w-full max-w-[480px] md:max-w-3xl lg:mt-6 lg:max-w-6xl lg:px-6">
        <Gallery
          images={page.photos.map((id) =>
            imageUrlFor(cloudName, id, IMAGE_WIDTHS.full),
          )}
          alt={alt}
        >
          <Link href={backHref} className={`${overlayButton} left-3`}>
            Voltar
          </Link>
          <div className="absolute top-3 right-3 flex gap-2">
            <ShareButton path={page.path} title={alt} className={overlayPill} />
            <FavoriteButton
              snapshot={favoriteSnapshot(page)}
              className="bg-[rgba(28,27,32,.7)] text-white"
            />
          </div>
        </Gallery>
      </div>
      {/* Desktop: blocos à esquerda e a coluna fixa à direita (015, PRC-FR-006). */}
      <div className="relative mx-auto -mt-5 grid w-full max-w-[480px] gap-4 md:max-w-3xl lg:mt-6 lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 lg:px-6">
        <div className="flex flex-col gap-5 rounded-t-[20px] bg-surface p-4 lg:col-start-1 lg:row-start-1 lg:rounded-card lg:border lg:border-line lg:p-8">
          {page.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {page.badges.map((b) => (
                <Badge key={b} tone="ok">
                  {b}
                </Badge>
              ))}
            </div>
          )}
          <div>
            <h1 className="text-[24px] leading-tight tracking-[-0.02em] uppercase lg:text-[32px]">
              {page.make}{" "}
              <strong className="font-extrabold text-caju">{page.model}</strong>
            </h1>
            {page.version && (
              <p className="text-sm text-text-3 uppercase">{page.version}</p>
            )}
          </div>
          {/* Celular: preço, Ver parcelas e WhatsApp logo abaixo do título. */}
          <div className="flex flex-col gap-3 lg:hidden">
            {page.priceCents !== null && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[28px] font-extrabold whitespace-nowrap">
                  {brlWhole(page.priceCents)}
                </p>
                {parcelas}
              </div>
            )}
            {whatsapp}
          </div>
          <dl
            data-testid="vehicle-specs"
            className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-4"
          >
            <Spec
              wide
              label="Cidade"
              value={`${page.store.city} - ${page.store.state}`}
            />
            {specs(page).map(([label, value]) =>
              value === null || value === "" ? null : (
                <Spec key={label} label={label} value={value} />
              ),
            )}
            {page.conditions.map((c) => (
              <Spec key={c} label={c} value="Sim" />
            ))}
          </dl>
          {page.description && (
            <section className="flex flex-col gap-1.5 border-t border-line pt-5">
              <h2 className="text-[13px] text-text-3">Sobre este veículo</h2>
              <p className="text-[15px] whitespace-pre-line text-text-2">
                {page.description}
              </p>
            </section>
          )}
          {page.features.length > 0 && (
            <section className="flex flex-col gap-3 border-t border-line pt-5">
              <h2 className="text-[13px] text-text-3">Itens do veículo</h2>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-3 text-[15px] font-semibold lg:grid-cols-4">
                {page.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
        {/* Coluna da direita: acompanha a rolagem no desktop; no celular, o formulário. */}
        <aside className="flex flex-col gap-4 bg-surface p-4 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:rounded-card lg:border lg:border-line lg:p-6">
          <div className="hidden flex-col gap-3 lg:flex">
            {page.priceCents !== null && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[30px] font-extrabold tracking-[-0.02em] whitespace-nowrap">
                  {brlWhole(page.priceCents)}
                </p>
                {parcelas}
              </div>
            )}
            {whatsapp}
          </div>
          <ContactForm {...lead} />
        </aside>
        <div className="flex flex-col gap-4 px-4 lg:col-start-1 lg:row-start-2 lg:px-0">
          <StoreAbout store={page.store} />
          <PriceCompare compare={page.priceCompare} />
          <FinancingNotice />
          {related}
          <ReportTrigger />
        </div>
      </div>
      {page.similar.length > 0 && (
        <section
          aria-labelledby="parecidos"
          className="mx-auto mt-10 flex w-full max-w-[480px] flex-col gap-4 px-4 md:max-w-3xl lg:max-w-6xl lg:px-6"
        >
          <h2 id="parecidos" className="text-[22px] font-extrabold">
            Você também pode gostar
          </h2>
          <ul
            data-testid="similar-list"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {page.similar.map((card) => (
              <PublicCard
                key={card.vehicleId}
                card={card}
                cloudName={cloudName}
                showStore
              />
            ))}
          </ul>
        </section>
      )}
      <ReportSheet vehicleId={page.vehicleId} />
    </main>
  );
}

/** Veículo vendido ou excluído [12d] (SHW-FR-010). */
export function VehicleSold({
  similar,
  cloudName,
}: {
  similar: Card[];
  cloudName: string;
}) {
  return (
    <Unavailable title="Este veículo já foi vendido">
      {similar.length > 0 && (
        <>
          <h2 className="text-[17px] font-extrabold">Veículos parecidos</h2>
          <ul
            data-testid="similar-list"
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            {similar.map((card) => (
              <PublicCard
                key={card.vehicleId}
                card={card}
                cloudName={cloudName}
                showStore
              />
            ))}
          </ul>
        </>
      )}
      <ButtonLink href="/veiculos" variant="ghost">
        Ver mais veículos
      </ButtonLink>
    </Unavailable>
  );
}
