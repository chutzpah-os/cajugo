"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { brl } from "@/platform/br/money";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { ConfirmSheet } from "@/ui/confirm-sheet";
import { Toggle } from "@/ui/toggle";
import { markSoldAction, setShareAction } from "../actions";
import { STATUS_TONE } from "../captions";
import type { VehicleCard as Card } from "../service";

const km = new Intl.NumberFormat("pt-BR");

/** Card de Meus veículos [1c] (VEH-FR-002, VEH-FR-010, VEH-FR-013). */
export function VehicleCard({ v, cloudName }: { v: Card; cloudName: string }) {
  const router = useRouter();
  const [share, setShare] = useState(v.shareOnCajugo);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <li className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3">
      <div className="flex gap-3">
        <div className="size-20 shrink-0 overflow-hidden rounded-input bg-line-2">
          {v.coverPublicId && (
            // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada
            <img
              src={imageUrlFor(cloudName, v.coverPublicId, IMAGE_WIDTHS.thumb)}
              alt=""
              className="size-full object-cover"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate font-bold">{v.name}</p>
          <Badge tone={STATUS_TONE[v.status]}>{v.statusLabel}</Badge>
          <p className="text-sm text-text-3">
            {[
              v.yearModel,
              v.mileageKm !== null && `${km.format(v.mileageKm)} km`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {v.priceCents !== null && (
            <p className="font-extrabold">{brl(v.priceCents)}</p>
          )}
        </div>
      </div>
      <Toggle
        title="Divulgar na CajuGo"
        caption={v.shareCaption}
        checked={share}
        disabled={!v.canShare || busy}
        onChange={async (e) => {
          const on = e.target.checked;
          setShare(on);
          const r = await setShareAction(v.vehicleId, on);
          if (!r.ok) {
            setShare(!on);
            setError(r.message);
          } else router.refresh();
        }}
      />
      <div className="grid grid-cols-2 gap-2">
        {v.canSell ? (
          <Button variant="ghost" onClick={() => setConfirm(true)}>
            Vendido
          </Button>
        ) : (
          <span />
        )}
        <Link
          href={`/painel/veiculos/${v.vehicleId}`}
          className="flex min-h-11 items-center justify-center rounded-button border border-field bg-surface text-sm font-bold"
          aria-label={`Editar ${v.name}`}
        >
          ✎ Editar
        </Link>
      </div>
      {error && (
        <p role="alert" className="text-sm text-caju-deep">
          {error}
        </p>
      )}
      <ConfirmSheet
        open={confirm}
        title="Marcar como vendido?"
        confirmLabel="Marcar como vendido"
        busy={busy}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          setBusy(true);
          const r = await markSoldAction(v.vehicleId);
          setBusy(false);
          setConfirm(false);
          if (!r.ok) return setError(r.message);
          router.refresh();
        }}
      >
        Sai do seu catálogo, da vitrine CajuGo e dos links de vendedor na hora.
        Dá para desfazer em até 7 dias.
      </ConfirmSheet>
    </li>
  );
}
