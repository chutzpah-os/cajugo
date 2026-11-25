import { brDate } from "@/platform/br/date";
import { EmptyState } from "@/ui/empty-state";
import { REASON_LABEL } from "../reasons";
import type { ReportCard } from "../service";
import { HideSheet } from "./hide-sheet";
import { KeepButton } from "./keep-button";
import { ModeratedVehicle } from "./moderated-vehicle";

const plural = (n: number) => `${n} ${n === 1 ? "denúncia" : "denúncias"}`;

/**
 * Fila "Denúncias" [14e] (RPT-FR-002, 003): um card por anúncio, da denúncia mais
 * antiga, com a contagem por motivo e as descrições; nada de quem denunciou.
 */
export function ReportQueue({
  cards,
  cloudName,
}: {
  cards: ReportCard[];
  cloudName: string;
}) {
  if (!cards.length)
    return (
      <EmptyState title="Nenhuma denúncia aberta">
        Quando alguém denunciar um anúncio, ele aparece aqui.
      </EmptyState>
    );
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {cards.map((c) => (
        <li
          key={c.vehicle.id}
          data-testid="report-card"
          className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
        >
          <ModeratedVehicle vehicle={c.vehicle} cloudName={cloudName} />
          <p className="text-sm">
            <strong data-testid="report-count">{plural(c.open)}</strong>
            <span className="text-text-2">
              {" "}
              · desde {brDate.format(c.firstAt)}
            </span>
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {c.byReason.map((r) => (
              <li
                key={r.reason}
                className="rounded-full bg-neutral-soft px-3 py-1.5 text-[13px] font-semibold"
              >
                {REASON_LABEL[r.reason]} {r.count}
              </li>
            ))}
          </ul>
          {c.details.length > 0 && (
            <ul className="flex flex-col gap-1.5 text-sm text-text-2">
              {c.details.map((d, i) => (
                <li key={i} className="border-l-2 border-line pl-2">
                  {d}
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-2 gap-2">
            <KeepButton vehicleId={c.vehicle.id} />
            <HideSheet vehicleId={c.vehicle.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}
