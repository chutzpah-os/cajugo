import { brDate } from "@/platform/br/date";
import { EmptyState } from "@/ui/empty-state";
import type { HiddenCard } from "../service";
import { ModeratedVehicle } from "./moderated-vehicle";
import { ShowButton } from "./show-button";

/** Aba "Ocultados" de [14e] (RPT-FR-008): motivo, quando e "Mostrar de novo". */
export function HiddenList({
  cards,
  cloudName,
}: {
  cards: HiddenCard[];
  cloudName: string;
}) {
  if (!cards.length)
    return (
      <EmptyState icon="👁" title="Nenhum anúncio oculto">
        Os anúncios ocultados pela equipe aparecem aqui.
      </EmptyState>
    );
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {cards.map((c) => (
        <li
          key={c.vehicle.id}
          data-testid="hidden-card"
          className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
        >
          <ModeratedVehicle vehicle={c.vehicle} cloudName={cloudName} />
          <p className="text-sm">
            <strong>{c.reason}</strong>
            <span className="text-text-2">
              {" "}
              · ocultado em {brDate.format(c.hiddenAt)}
            </span>
          </p>
          <ShowButton vehicleId={c.vehicle.id} />
        </li>
      ))}
    </ul>
  );
}
