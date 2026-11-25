import Link from "next/link";
import type { ReactNode } from "react";
import { brl } from "@/platform/br/money";
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
import { cn } from "@/ui/cn";
import { ButtonLink } from "@/ui/button";
import type { PublicCard as Card, VehiclePage } from "../service";
import { Gallery } from "./gallery";
import { favoriteSnapshot, PublicCard } from "./public-card";
import { ShareButton } from "./share-button";
import { SimulatorSheet, SimulatorTrigger } from "./simulator";
import { StoreIdentity } from "./store-identity";
import { Unavailable } from "./unavailable";

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
  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 pb-24 md:max-w-3xl">
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
      <div className="relative -mt-5 flex flex-col gap-5 rounded-t-[20px] bg-surface p-4">
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
          <h1 className="text-[24px] leading-tight tracking-[-0.02em]">
            {page.make} <strong className="font-extrabold">{page.model}</strong>
          </h1>
          {page.version && (
            <p className="text-sm text-text-3 uppercase">{page.version}</p>
          )}
        </div>
        {page.priceCents !== null && (
          <div>
            <p className="text-[28px] font-extrabold">{brl(page.priceCents)}</p>
            {page.installmentCents !== null && (
              <p className="text-sm text-text-2">
                a partir de {brl(page.installmentCents)}/mês*
              </p>
            )}
            {page.simulator && (
              <SimulatorTrigger className="flex min-h-11 items-center text-sm font-semibold text-caju-deep underline">
                Simular
              </SimulatorTrigger>
            )}
          </div>
        )}
        <dl
          data-testid="vehicle-specs"
          className="grid grid-cols-2 gap-x-3 gap-y-3 rounded-card border border-line p-3"
        >
          <Spec
            wide
            label="Cidade"
            value={`${page.store.city}/${page.store.state}`}
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
          <section className="flex flex-col gap-1.5">
            <h2 className="text-[17px] font-extrabold">Sobre este carro</h2>
            <p className="text-[15px] whitespace-pre-line text-text-2">
              {page.description}
            </p>
          </section>
        )}
        {page.features.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-[17px] font-extrabold">Itens do veículo</h2>
            <ul className="flex flex-wrap gap-1.5">
              {page.features.map((f) => (
                <li
                  key={f}
                  className="rounded-full bg-neutral-soft px-3 py-1.5 text-[13px] font-semibold"
                >
                  {f}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="flex flex-col gap-3 rounded-card border border-line p-3">
          <StoreIdentity {...page.store} cloudName={cloudName} />
          <ButtonLink
            variant="ghost"
            block
            href={`/loja/${page.store.slug}`}
            data-testid="store-link"
          >
            Ver estoque da loja
          </ButtonLink>
        </section>
        <ContactForm {...lead} />
        {related}
        <ReportTrigger />
        {page.installmentCents !== null && (
          <p className="text-xs text-text-3">
            *Parcela estimada. Toque em Simular para calcular a sua.
          </p>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface p-3">
        <div
          className={cn(
            "mx-auto max-w-[480px] md:max-w-3xl",
            page.simulator && "grid grid-cols-2 gap-2",
          )}
        >
          {page.simulator && (
            <SimulatorTrigger className="flex h-[50px] items-center justify-center rounded-button border-[1.5px] border-ink text-[15px] font-bold text-ink">
              Ver parcelas
            </SimulatorTrigger>
          )}
          <WhatsappButton
            href={page.whatsappUrl}
            lead={lead}
            data-testid="whatsapp"
            className="flex h-[50px] items-center justify-center rounded-button bg-whatsapp text-[15px] font-bold text-white"
          >
            WhatsApp
          </WhatsappButton>
        </div>
      </div>
      {page.simulator && (
        <SimulatorSheet
          setup={page.simulator}
          lead={lead}
          cover={
            page.photos[0]
              ? imageUrlFor(cloudName, page.photos[0], IMAGE_WIDTHS.thumb)
              : null
          }
          storeName={page.store.name}
        />
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
