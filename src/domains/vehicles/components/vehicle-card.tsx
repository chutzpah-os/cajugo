"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { brlWhole } from "@/platform/br/money";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";
import { Badge } from "@/ui/badge";
import { ConfirmSheet } from "@/ui/confirm-sheet";
import { PencilIcon } from "@/ui/icons";
import { cn } from "@/ui/cn";
// Exceção de tela (ARCHITECTURE §3): o motivo do Ocultar com os rótulos da moderação.
import { hiddenReasonText } from "@/domains/moderation/reasons";
import { markSoldAction, setShareAction } from "../actions";
import { STATUS_TONE } from "../captions";
import type { VehicleCard as Card } from "../service";

const km = new Intl.NumberFormat("pt-BR");

/** "2019/2020" (fabricação/modelo), como no design. */
const years = (v: Card) =>
  v.yearManufacture && v.yearModel && v.yearManufacture !== v.yearModel
    ? `${v.yearManufacture}/${v.yearModel}`
    : String(v.yearModel ?? v.yearManufacture ?? "");
const mileage = (v: Card) =>
  v.mileageKm !== null ? `${km.format(v.mileageKm)} km` : "";

/** Estado e ações de um veículo (divulgar, vender), comuns ao card e à linha. */
function useVehicle(v: Card, onChanged?: () => void) {
  const router = useRouter();
  const [share, setShare] = useState(v.shareOnCajugo);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const refresh = () => {
    router.refresh();
    onChanged?.();
  };
  const toggle = async (on: boolean) => {
    setShare(on);
    const r = await setShareAction(v.vehicleId, on);
    if (!r.ok) {
      setShare(!on);
      setError(r.message);
    } else refresh();
  };
  const sell = async () => {
    setBusy(true);
    const r = await markSoldAction(v.vehicleId);
    setBusy(false);
    setConfirm(false);
    if (!r.ok) return setError(r.message);
    refresh();
  };
  return { share, toggle, confirm, setConfirm, busy, error, sell };
}

type Controls = ReturnType<typeof useVehicle>;

function Thumb({
  v,
  cloudName,
  className,
}: {
  v: Card;
  cloudName: string;
  className: string;
}) {
  return (
    <div
      className={cn(
        "relative flex-none overflow-hidden bg-[repeating-linear-gradient(135deg,#E4E0D9_0_10px,#DDD8D0_10px_20px)]",
        className,
      )}
    >
      {v.coverPublicId && (
        // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada
        <img
          src={imageUrlFor(cloudName, v.coverPublicId, IMAGE_WIDTHS.thumb)}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </div>
  );
}

/** Toggle "Divulgar na CajuGo" do card de gestão (44 × 26, DESIGN.md §3). */
function ShareSwitch({
  v,
  c,
  title,
}: {
  v: Card;
  c: Controls;
  title?: string;
}) {
  const disabled = !v.canShare || c.busy;
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2.5",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        // Vendido, rascunho e oculto aparecem desligados, como no design.
        checked={c.share && v.canShare}
        disabled={disabled}
        aria-label={title ? undefined : `Divulgar ${v.name} na CajuGo`}
        onChange={(e) => c.toggle(e.target.checked)}
      />
      <span
        aria-hidden
        className="relative h-[26px] w-11 flex-none rounded-full bg-field transition-colors duration-200 peer-checked:bg-caju peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink peer-checked:[&>span]:translate-x-[18px]"
      >
        <span className="absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.25)] transition-transform duration-200" />
      </span>
      <span className="flex flex-col gap-px">
        {title && <span className="text-[13px] font-bold">{title}</span>}
        <span className="text-[11px] text-text-3">{v.shareCaption}</span>
      </span>
    </label>
  );
}

/** Vendido + editar (botões pequenos de 34 px, DESIGN.md §3). */
function Actions({
  v,
  c,
  sellOnPage,
}: {
  v: Card;
  c: Controls;
  sellOnPage: boolean;
}) {
  const hidden = v.status === "hidden";
  // Área de toque de 44 px (DESIGN.md §4) com o botão visível de 34 px (§3).
  const hit = "group flex h-11 min-w-11 items-center justify-center";
  const face =
    "flex h-[34px] items-center justify-center rounded-[9px] border border-field bg-surface px-2.5 text-xs font-bold group-hover:border-ink";
  return (
    <div className="flex flex-none gap-0.5">
      {v.canSell &&
        (sellOnPage ? (
          <Link
            href={`/painel/veiculos/${v.vehicleId}?vender=1`}
            className={hit}
          >
            <span className={face}>Vendido</span>
          </Link>
        ) : (
          <button
            type="button"
            className={hit}
            onClick={() => c.setConfirm(true)}
          >
            <span className={face}>Vendido</span>
          </button>
        ))}
      <Link
        href={`/painel/veiculos/${v.vehicleId}`}
        className={hit}
        aria-label={`${hidden ? "Ver" : "Editar"} ${v.name}`}
      >
        <span className={cn(face, "w-[34px] px-0")}>
          <PencilIcon size={15} />
        </span>
      </Link>
    </div>
  );
}

function SoldSheet({ v, c }: { v: Card; c: Controls }) {
  return (
    <ConfirmSheet
      open={c.confirm}
      kind="sold"
      title={`Marcar ${v.name} como vendido?`}
      confirmLabel="Marcar como vendido"
      busy={c.busy}
      onClose={() => c.setConfirm(false)}
      onConfirm={c.sell}
    >
      O veículo sai do seu catálogo, da vitrine CajuGo e dos links dos
      vendedores na hora. Você pode desfazer em até 7 dias.
    </ConfirmSheet>
  );
}

function Problem({ v, c }: { v: Card; c: Controls }): ReactNode {
  return (
    <>
      {v.status === "hidden" && v.moderation && (
        <p data-testid="hidden-reason" className="text-xs text-caju-deep">
          Motivo: {hiddenReasonText(v.moderation.reason, v.moderation.note)}
        </p>
      )}
      {c.error && (
        <p role="alert" className="text-sm text-caju-deep">
          {c.error}
        </p>
      )}
    </>
  );
}

/** Card de gestão de Meus veículos no celular [1c] (VEH-FR-002, 010, 013). */
export function VehicleCard({
  v,
  cloudName,
  onChanged,
  sellOnPage = false,
}: {
  v: Card;
  cloudName: string;
  onChanged?: () => void;
  /** Loja na Rede Caju: "Vendido" abre a Confirmar venda em [6e] (009). */
  sellOnPage?: boolean;
}) {
  const c = useVehicle(v, onChanged);
  return (
    <li
      data-testid="vehicle-card"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3"
    >
      <div className="flex gap-3">
        <Thumb
          v={v}
          cloudName={cloudName}
          className="h-[68px] w-[88px] rounded-input"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] leading-tight font-extrabold uppercase">
              {v.name}
            </p>
            <Badge tone={STATUS_TONE[v.status]} size="sm">
              {v.statusLabel}
            </Badge>
          </div>
          <p className="text-xs text-text-3">
            {[years(v), mileage(v)].filter(Boolean).join(" · ")}
          </p>
          {v.priceCents !== null && (
            <p className="text-base font-extrabold">{brlWhole(v.priceCents)}</p>
          )}
        </div>
      </div>
      <Problem v={v} c={c} />
      <div className="flex items-center justify-between gap-2.5 border-t border-line-2 pt-2.5">
        {v.status === "hidden" ? (
          <span />
        ) : (
          <ShareSwitch v={v} c={c} title="Divulgar na CajuGo" />
        )}
        <Actions v={v} c={c} sellOnPage={sellOnPage} />
      </div>
      <SoldSheet v={v} c={c} />
    </li>
  );
}

/** Linha da tabela de Meus veículos no desktop [15b] (DSG-FR-005). */
export function VehicleRow({
  v,
  cloudName,
  onChanged,
  sellOnPage = false,
}: {
  v: Card;
  cloudName: string;
  onChanged?: () => void;
  sellOnPage?: boolean;
}) {
  const c = useVehicle(v, onChanged);
  return (
    <tr
      data-testid="vehicle-row"
      className="border-b border-line-2 align-middle last:border-0"
    >
      <td className="py-3 pr-3 pl-4">
        <div className="flex items-center gap-3">
          <Thumb
            v={v}
            cloudName={cloudName}
            className="h-[34px] w-[46px] rounded-md"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-[13px] font-extrabold uppercase">
              {v.name}
            </span>
            <Problem v={v} c={c} />
          </span>
        </div>
      </td>
      <td className="px-3 text-[13px] text-text-2">
        <span className="block">{years(v)}</span>
        <span className="block">{mileage(v)}</span>
      </td>
      <td className="px-3 text-[13px] font-extrabold whitespace-nowrap">
        {v.priceCents !== null ? brlWhole(v.priceCents) : "—"}
      </td>
      <td className="px-3">
        <Badge tone={STATUS_TONE[v.status]} size="sm">
          {v.statusLabel}
        </Badge>
      </td>
      <td className="px-3">
        {v.status !== "hidden" && <ShareSwitch v={v} c={c} />}
      </td>
      <td className="py-3 pr-4 pl-3">
        <div className="flex justify-end">
          <Actions v={v} c={c} sellOnPage={sellOnPage} />
        </div>
        <SoldSheet v={v} c={c} />
      </td>
    </tr>
  );
}
