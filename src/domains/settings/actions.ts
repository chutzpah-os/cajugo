"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { currentSession } from "@/domains/auth/service";
import { getDb } from "@/platform/db/client";
import { clientIp, hashIp } from "@/platform/http/client-ip";
import { AppError } from "@/platform/http/errors";
import { logger } from "@/platform/http/logger";
import { requestAuthProvider } from "@/platform/supabase/next";
import { editableKeys, SETTING_GROUPS } from "./definitions";
import { SETTINGS_TAG } from "./current";
import { formToSettings } from "./form";
import { updateSettings } from "./service";

export type SaveSettingsState = {
  ok: boolean;
  message?: string;
  errors: Record<string, string>;
  /** O que foi digitado, para o campo não voltar ao valor antigo depois de um erro. */
  typed?: Record<string, string>;
} | null;

/** Salva um grupo de regras de [4c]/[8f] (CFG-FR-002). A chave Pix tem fluxo próprio. */
export async function saveSettingsAction(
  _prev: SaveSettingsState,
  form: FormData,
): Promise<SaveSettingsState> {
  const group = SETTING_GROUPS.find((g) => g === form.get("group"));
  if (!group) return { ok: false, message: "Grupo inválido.", errors: {} };
  const keys = editableKeys(group);

  try {
    const { changed } = await updateSettings(
      { db: getDb(), auth: await requestAuthProvider() },
      await currentSession(),
      formToSettings(keys, form),
    );
    // Quem salva vê o valor novo na hora; as demais telas, em até 1 min (CFG-NFR-001).
    if (changed.length) updateTag(SETTINGS_TAG);
    return {
      ok: true,
      message: changed.length ? "Alterações salvas." : "Nada mudou.",
      errors: {},
    };
  } catch (error) {
    if (error instanceof AppError)
      return {
        ok: false,
        message: error.errors.length ? undefined : error.title,
        errors: Object.fromEntries(
          error.errors.map((e) => [e.field.split(".")[0], e.message]),
        ),
        typed: Object.fromEntries(
          keys.map((k) => [k, String(form.get(k) ?? "")]),
        ),
      };
    logger.error("settings.save_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      message: "Não foi possível salvar agora. Tente de novo em instantes.",
      errors: {},
    };
  }
}

export type SavePixState = {
  ok: boolean;
  message?: string;
  /** Erros por campo: `type`, `key`, `beneficiary`, `city` (passo 1) ou `password` (passo 2). */
  errors: Record<string, string>;
} | null;

/** Troca da chave Pix com a senha do admin (CFG-FR-008, CFG-SEC-005). */
export async function savePixAction(
  _prev: SavePixState,
  form: FormData,
): Promise<SavePixState> {
  try {
    const { changed } = await updateSettings(
      { db: getDb(), auth: await requestAuthProvider() },
      await currentSession(),
      {
        pix: {
          type: String(form.get("type") ?? ""),
          key: String(form.get("key") ?? ""),
          beneficiary: String(form.get("beneficiary") ?? ""),
          city: String(form.get("city") ?? ""),
        },
        password: String(form.get("password") ?? "") || undefined,
      },
      { ipHash: hashIp(clientIp(await headers())) },
    );
    if (!changed.length)
      return {
        ok: true,
        message: "Essa já é a chave atual: nada mudou.",
        errors: {},
      };
    updateTag(SETTINGS_TAG);
    return { ok: true, message: "Chave Pix atualizada.", errors: {} };
  } catch (error) {
    if (error instanceof AppError)
      return {
        ok: false,
        message:
          error.type === "too-many-requests"
            ? "Muitas tentativas. Aguarde alguns minutos e tente de novo."
            : error.errors.length
              ? undefined
              : error.title,
        errors: Object.fromEntries(
          error.errors.map((e) => [e.field.replace(/^pix\./, ""), e.message]),
        ),
      };
    logger.error("settings.pix_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      message: "Não foi possível salvar agora. Tente de novo em instantes.",
      errors: {},
    };
  }
}
