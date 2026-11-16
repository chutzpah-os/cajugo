"use server";

import { cookies, headers } from "next/headers";
import { REF_COOKIE } from "@/domains/showcase/service";
import { currentSession } from "@/domains/auth/service";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";
import { clientIp, hashIp } from "@/platform/http/client-ip";
import { errorMessage, logger } from "@/platform/http/logger";
import {
  contactStore,
  moveLead,
  recordView,
  recordWhatsappClick,
  type ContactResult,
} from "./service";
import type { LeadStatus } from "./status";

/** Rede de quem chamou, só como hash (LED-SEC-002). */
const requestIpHash = async () => hashIp(clientIp(await headers()));

/** Código do link do vendedor guardado pelo proxy (`httpOnly`, SEL-FR-011). */
const refCode = async () => (await cookies()).get(REF_COOKIE)?.value ?? null;

/**
 * "Envie uma mensagem à loja" [1b] (LED-FR-001): o painel lê sem cache, então nada a
 * invalidar; o lead aparece na próxima abertura de [3a] (LED-NFR-003).
 */
export async function contactLeadAction(raw: unknown): Promise<ContactResult> {
  try {
    return await contactStore(getDb(), raw, {
      ipHash: await requestIpHash(),
      refCode: await refCode(),
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
      ipHash: await requestIpHash(),
      refCode: await refCode(),
    });
  } catch (error) {
    logger.error("leads.whatsapp_failed", { error: errorMessage(error) });
  }
}

/** Abertura da página do veículo (LED-FR-015): a tela não espera nem mostra erro. */
export async function viewAction(raw: unknown): Promise<void> {
  try {
    await recordView(getDb(), raw, {
      ipHash: await requestIpHash(),
      userAgent: (await headers()).get("user-agent"),
    });
  } catch (error) {
    logger.error("leads.view_failed", { error: errorMessage(error) });
  }
}

export type MoveLeadResult =
  { ok: true; status: LeadStatus } | { ok: false; message: string };

/** "→ próximo status" e "Perdido" em [3a] (LED-FR-008): sem cache a invalidar. */
export async function moveLeadAction(raw: unknown): Promise<MoveLeadResult> {
  try {
    return {
      ok: true,
      status: await moveLead(getDb(), await currentSession(), raw),
    };
  } catch (error) {
    if (error instanceof AppError) return { ok: false, message: error.title };
    logger.error("leads.move_failed", { error: errorMessage(error) });
    return { ok: false, message: "Não foi possível concluir agora." };
  }
}
