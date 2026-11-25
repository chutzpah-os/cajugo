"use server";

import { headers } from "next/headers";
import { currentSession } from "@/domains/auth/service";
import { getDb } from "@/platform/db/client";
import { clientIp, hashIp } from "@/platform/http/client-ip";
import { AppError } from "@/platform/http/errors";
import { errorMessage, logger } from "@/platform/http/logger";
import {
  markContactHandled,
  requestContact,
  type ContactRequestResult,
} from "./service";

/** Formulário público de pedido de contato: vai para o admin [Contatos]. */
export async function requestContactAction(
  raw: unknown,
): Promise<ContactRequestResult> {
  try {
    return await requestContact(getDb(), raw, {
      ipHash: hashIp(clientIp(await headers())),
    });
  } catch (error) {
    logger.error("contacts.request_failed", { error: errorMessage(error) });
    return {
      ok: false,
      message: "Não foi possível enviar agora. Tente de novo em instantes.",
      errors: [],
    };
  }
}

/** "Marcar como atendido" em [Contatos]: admin e suporte. */
export async function markContactHandledAction(input: {
  requestId: string;
}): Promise<{ ok: boolean; message?: string }> {
  try {
    const done = await markContactHandled(
      getDb(),
      await currentSession(),
      input,
    );
    return done
      ? { ok: true }
      : { ok: false, message: "Este pedido já tinha sido atendido." };
  } catch (error) {
    if (error instanceof AppError) return { ok: false, message: error.title };
    logger.error("contacts.handle_failed", { error: errorMessage(error) });
    return { ok: false, message: "Não foi possível concluir agora." };
  }
}
