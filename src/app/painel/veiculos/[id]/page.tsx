import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { STATUS_TONE } from "@/domains/vehicles/captions";
import { VehicleActions } from "@/domains/vehicles/components/vehicle-actions";
import { vehicleSummary } from "@/domains/vehicles/service";
import { brl } from "@/platform/br/money";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";
import { Badge } from "@/ui/badge";

export const metadata: Metadata = { title: "Editar veículo | CajuGo" };

const km = new Intl.NumberFormat("pt-BR");

const SECTIONS = [
  ["fotos", "Fotos"],
  ["identificacao", "Identificação"],
  ["ficha", "Ficha técnica"],
  ["preco", "Preço"],
  ["condicoes", "Condições"],
  ["itens", "Itens"],
  ["descricao", "Descrição"],
  ["divulgacao", "Contato"],
] as const;

async function Content({ params }: PageProps<"/painel/veiculos/[id]">) {
  const { id } = await params;
  const { session, allowed, home } = await requireStorePage(
    `/painel/veiculos/${id}`,
    "vehicles.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  const v = await vehicleSummary({ db: getDb() }, session, id).catch(
    (error: unknown) => {
      if (error instanceof AppError && error.status === 404) notFound();
      throw error;
    },
  );
  const editable = ["draft", "pending_approval", "published"].includes(
    v.status,
  );

  return (
    <section className="flex flex-col gap-4 py-6">
      <header className="flex items-center gap-2">
        <Link
          href="/painel/veiculos"
          aria-label="Voltar para Meus veículos"
          className="-ml-2 flex size-11 items-center justify-center text-xl"
        >
          ‹
        </Link>
        <h1 className="text-[22px] font-extrabold">Editar veículo</h1>
      </header>

      <div className="flex gap-3 rounded-card border border-line bg-surface p-3">
        <div className="size-24 shrink-0 overflow-hidden rounded-input bg-line-2">
          {v.coverPublicId && (
            // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada
            <img
              src={imageUrlFor(
                cloudName(),
                v.coverPublicId,
                IMAGE_WIDTHS.thumb,
              )}
              alt=""
              className="size-full object-cover"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-bold">{v.name}</p>
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
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[v.status]}>{v.statusLabel}</Badge>
            {v.daysOnAir !== null && (
              <span className="text-sm text-text-3" data-testid="days-on-air">
                {v.daysOnAir === 1
                  ? "1 dia no ar"
                  : `${v.daysOnAir} dias no ar`}
              </span>
            )}
          </div>
        </div>
      </div>

      {editable && (
        <nav
          aria-label="Seções do veículo"
          className="rounded-card border border-line bg-surface"
        >
          <ul>
            {SECTIONS.map(([anchor, label]) => (
              <li key={anchor} className="border-b border-line-2 last:border-0">
                <Link
                  href={`/painel/veiculos/${v.vehicleId}/editar#${anchor}`}
                  aria-label={`Editar ${label}`}
                  className="flex min-h-11 items-center justify-between px-4 text-[15px]"
                >
                  {label}
                  <span className="text-sm font-bold text-caju-ink">
                    Editar
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <VehicleActions key={`${v.status}-${v.shareOnCajugo}`} v={v} />
    </section>
  );
}

/** Editar veículo [6e] (VEH-FR-011, 013, 014). */
export default function VehicleSummaryPage(
  props: PageProps<"/painel/veiculos/[id]">,
) {
  return (
    <AreaPage>
      <Content {...props} />
    </AreaPage>
  );
}
