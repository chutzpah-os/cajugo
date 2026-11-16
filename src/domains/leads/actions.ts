"use server";

import { headers } from "next/headers";
import { getDb } from "@/platform/db/client";
import { clientIp, hashIp } from "@/platform/http/client-ip";
import { errorMessage, logger } from "@/platform/http/logger";
import {
  contactStore,
  recordWhatsappClick,
  type ContactResult,
} from "./service";

/**
 * "Envie uma mensagem à loja" [1b] (LED-FR-001): o painel lê sem cache, então nada a
 * invalidar; o lead aparece na próxima abertura de [3a] (LED-NFR-003).
 */
export async function contactLeadAction(raw: unknown): Promise<ContactResult> {
  try {
    return await contactStore(getDb(), raw, {
      ipHash: hashIp(clientIp(await headers())),
    });
  } catch (error) {
    logger.error("leads.contact_failed", { error: errorMessage(error) });
    return {
      ok: false,
      message: "Não foi possível enviar agora. Tente de novo em instantes.",
      errors: [],
    };
  }
}

/** Toque no WhatsApp (LED-FR-003): a tela não espera nem mostra erro. */
export async function whatsappClickAction(raw: unknown): Promise<void> {
  try {
    await recordWhatsappClick(getDb(), raw, {
      ipHash: hashIp(clientIp(await headers())),
    });
  } catch (error) {
    logger.error("leads.whatsapp_failed", { error: errorMessage(error) });
  }
}
