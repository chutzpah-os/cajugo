"use client";

import Link from "next/link";
import { useState } from "react";
import { brl } from "@/platform/br/money";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";
import { whatsappShareLink } from "@/platform/whatsapp/link";
import { Button } from "@/ui/button";
import { LoadMoreButton, useLoadMore } from "@/ui/load-more";
import {
  loadMoreSellerShowcaseAction,
  requestPartnershipAction,
} from "../actions";
import type { SellerCard } from "../service";
import type { PartnerState } from "../status";

const idOf = (c: SellerCard) => c.card.vehicleId;
const titleOf = (c: SellerCard) =>
  [c.card.make, c.card.model, c.card.yearModel].filter(Boolean).join(" ");

/** Compartilhar (SEL-FR-008): copiar o link do vendedor ou abrir o WhatsApp. */
function Share({ item }: { item: SellerCard }) {
  const [copied, setCopied] = useState(false);
  const text = `${titleOf(item)}${item.card.priceCents !== null ? ` por ${brl(item.card.priceCents)}` : ""}: ${item.shareUrl}`;
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="min-h-11"
        data-testid="seller-copy"
        data-url={item.shareUrl}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(item.shareUrl);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Link copiado" : "Copiar link"}
      </Button>
      <a
        href={whatsappShareLink(text)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center justify-center rounded-button bg-whatsapp text-sm font-bold text-white"
      >
        WhatsApp
      </a>
    </div>
  );
}

/**
 * Card da vitrine do vendedor [7c] (SEL-FR-008, 009): veículo, "Você ganha R$ X" na loja
 * parceira, Compartilhar em todos e Pedir parceria na loja sem parceria.
 */
function SellerVehicle({
  item,
  partner,
  cloudName,
  onRequest,
  busy,
}: {
  item: SellerCard;
  partner: PartnerState | "none";
  cloudName: string;
  onRequest: () => void;
  busy: boolean;
}) {
  const c = item.card;
  return (
    <li
      data-testid="seller-card"
      className="flex flex-col gap-3 overflow-hidden rounded-card border border-line bg-surface pb-3"
    >
      <Link href={c.path} className="flex flex-col gap-1">
        <div className="aspect-[4/3] bg-line-2">
          {c.coverPublicId && (
            // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada
            <img
              src={imageUrlFor(cloudName, c.coverPublicId, IMAGE_WIDTHS.card)}
              alt={titleOf(item)}
              loading="lazy"
              className="size-full object-cover"
            />
          )}
        </div>
        <div className="flex flex-col px-3 pt-2">
          <span className="font-bold">{titleOf(item)}</span>
          <span className="text-sm text-text-3">
            {c.storeName} · {c.city}/{c.state}
          </span>
          {c.priceCents !== null && (
            <span className="text-[17px] font-extrabold">
              {brl(c.priceCents)}
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-col gap-2 px-3">
        {partner === "partner" && item.earnCents !== null && (
          <p
            data-testid="seller-earn"
            className="rounded-input bg-ok-soft px-3 py-2 text-sm font-bold text-ok"
          >
            Você ganha {brl(item.earnCents)}
          </p>
        )}
        <Share item={item} />
        {partner === "none" && (
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            disabled={busy}
            onClick={onRequest}
          >
            Pedir parceria
          </Button>
        )}
        {partner === "pending" && (
          <p className="flex min-h-11 items-center text-sm text-text-2">
            Parceria pedida · aguardando a loja
          </p>
        )}
      </div>
    </li>
  );
}

/** Vitrine do vendedor [7c] com "Carregar mais" (SEL-NFR-003). */
export function SellerShowcaseList({
  initial,
  nextCursor,
  query,
  cloudName,
}: {
  initial: SellerCard[];
  nextCursor: string | null;
  query: string;
  cloudName: string;
}) {
  const list = useLoadMore<SellerCard>({
    initial,
    nextCursor,
    idOf,
    fetchPage: (cursor) => loadMoreSellerShowcaseAction({ query, cursor }),
  });
  // Pedido feito agora vale para todos os carros da mesma loja.
  const [asked, setAsked] = useState<Record<string, PartnerState>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request(storeId: string) {
    setBusy(storeId);
    setError(null);
    const r = await requestPartnershipAction({ storeId });
    setBusy(null);
    if (r.ok) setAsked((a) => ({ ...a, [storeId]: r.state }));
    else setError(r.message);
  }

  if (!list.items.length)
    return (
      <p className="text-sm text-text-2">Nenhum veículo com esses filtros.</p>
    );
  return (
    <>
      {error && (
        <p role="alert" className="text-sm text-caju-deep">
          {error}
        </p>
      )}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {list.items.map((item) => (
          <SellerVehicle
            key={item.card.vehicleId}
            item={item}
            partner={asked[item.storeId] ?? item.partner}
            cloudName={cloudName}
            busy={busy === item.storeId}
            onRequest={() => request(item.storeId)}
          />
        ))}
      </ul>
      {list.hasMore && (
        <LoadMoreButton
          busy={list.busy}
          failed={list.failed}
          onClick={list.load}
        />
      )}
    </>
  );
}
