"use server";

import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { currentSession } from "@/domains/auth/service";
import { VEHICLES_TAG } from "@/domains/vehicles/service";
import { getDb } from "@/platform/db/client";
import { AppError, type FieldError } from "@/platform/http/errors";
import { clientIp, hashIp } from "@/platform/http/client-ip";
import { errorMessage, logger } from "@/platform/http/logger";
import { hide, keep, reportVehicle, type ReportResult } from "./service";

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

export type DecisionResult =
  { ok: true } | { ok: false; message: string; errors?: FieldError[] };

/** Erro de decisão vira mensagem para a tela; o resto vai para o log. */
function decisionFailed(event: string, error: unknown): DecisionResult {
  if (error instanceof AppError)
    return { ok: false, message: error.title, errors: error.errors };
  logger.error(event, { error: errorMessage(error) });
  return { ok: false, message: "Não foi possível concluir agora." };
}

/**
 * **Manter** em [14e] (RPT-FR-003): a fila e o contador são lidos sem cache, e o anúncio
 * não muda, então nada a invalidar.
 */
export async function keepReportsAction(raw: unknown): Promise<DecisionResult> {
  try {
    return (await keep(getDb(), await currentSession(), raw))
      ? { ok: true }
      : { ok: false, message: "Este anúncio já saiu da fila." };
  } catch (error) {
    return decisionFailed("moderation.keep_failed", error);
  }
}

/**
 * **Ocultar** em [14e] (RPT-FR-004, RPT-NFR-003): a vitrine sai do cache na hora, para o
 * anúncio sumir sem esperar.
 */
export async function hideVehicleAction(raw: unknown): Promise<DecisionResult> {
  try {
    const done = await hide(getDb(), await currentSession(), raw);
    updateTag(VEHICLES_TAG);
    return done
      ? { ok: true }
      : { ok: false, message: "Este anúncio já saiu do ar." };
  } catch (error) {
    return decisionFailed("moderation.hide_failed", error);
  }
}
