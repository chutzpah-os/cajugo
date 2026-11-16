"use server";

import { headers } from "next/headers";
import { getDb } from "@/platform/db/client";
import { clientIp, hashIp } from "@/platform/http/client-ip";
import { errorMessage, logger } from "@/platform/http/logger";
import { reportVehicle, type ReportResult } from "./service";

/**
 * "Denunciar anúncio" [14d] (RPT-FR-001): a fila lê sem cache, então nada a invalidar.
 * O IP entra só como hash, no limite de envios (RPT-SEC-002, 006).
 */
export async function reportVehicleAction(raw: unknown): Promise<ReportResult> {
  try {
    return await reportVehicle(getDb(), raw, {
      ipHash: hashIp(clientIp(await headers())),
    });
  } catch (error) {
    logger.error("moderation.report_failed", { error: errorMessage(error) });
    return {
      ok: false,
      message: "Não foi possível enviar agora. Tente de novo em instantes.",
      errors: [],
    };
  }
}
