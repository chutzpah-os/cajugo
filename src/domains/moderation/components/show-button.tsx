"use client";

import { showVehicleAction } from "../actions";
import { DecisionButton } from "./decision-button";

/** **Mostrar de novo** (RPT-FR-008): devolve o anúncio à vitrine e avisa a loja. */
export function ShowButton({ vehicleId }: { vehicleId: string }) {
  return (
    <DecisionButton
      testId="report-show"
      run={() => showVehicleAction({ vehicleId })}
    >
      Mostrar de novo
    </DecisionButton>
  );
}
