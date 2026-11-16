"use client";

import { useEffect } from "react";
import { viewAction } from "../actions";
import { browserStorage } from "@/platform/browser/marks";
import { claimView, markCatalogVisit } from "../device";

/**
 * Conta a visualização da página do veículo (LED-FR-015): depois da hidratação, uma vez
 * por veículo por dia do aparelho. Não muda nada na tela (LED-NFR-002).
 */
export function ViewPing({ vehicleId }: { vehicleId: string }) {
  useEffect(() => {
    if (claimView(browserStorage("local"), vehicleId, new Date()))
      void viewAction({ vehicleId });
  }, [vehicleId]);
  return null;
}

/** O catálogo da loja aberto nesta aba marca a origem "Seu catálogo" (LED-FR-004, D1). */
export function CatalogVisit({ storeSlug }: { storeSlug: string }) {
  useEffect(() => {
    markCatalogVisit(browserStorage("session"), storeSlug);
  }, [storeSlug]);
  return null;
}
