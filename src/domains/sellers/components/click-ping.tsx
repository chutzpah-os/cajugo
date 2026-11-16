"use client";

import { useEffect } from "react";
import { browserStorage, claimOncePer } from "@/platform/browser/marks";
import { sellerClickAction } from "../actions";

const CLICKS_KEY = "cajugo:seller-clicks:v1";
const DAY_MS = 86_400_000;

/**
 * Conta a abertura do link do vendedor (`?ref=`, SEL-FR-010): depois da hidratação, uma
 * vez por aparelho a cada 24 h por vendedor e veículo. Não muda nada na tela e não tira
 * a página do cache (SEL-NFR-002); o servidor confere o código.
 */
export function SellerClickPing({ vehicleId }: { vehicleId: string }) {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (!code || !/^[A-Za-z0-9]{3,20}$/.test(code)) return;
    const mark = `${code.toUpperCase()}:${vehicleId}`;
    if (
      claimOncePer(
        browserStorage("local"),
        CLICKS_KEY,
        mark,
        new Date(),
        DAY_MS,
      )
    )
      void sellerClickAction({ vehicleId, code });
  }, [vehicleId]);
  return null;
}
