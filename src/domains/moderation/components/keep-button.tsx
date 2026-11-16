"use client";

import { keepReportsAction } from "../actions";
import { DecisionButton } from "./decision-button";

/** **Manter** (RPT-FR-003): arquiva as denúncias abertas; o anúncio não muda. */
export function KeepButton({ vehicleId }: { vehicleId: string }) {
  return (
    <DecisionButton
      testId="report-keep"
      run={() => keepReportsAction({ vehicleId })}
    >
      Manter
    </DecisionButton>
  );
}
