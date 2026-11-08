"use server";

import { updateTag } from "next/cache";
import { currentSession } from "@/domains/auth/current";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";
import { logger } from "@/platform/http/logger";
import { requestAuthProvider } from "@/platform/supabase/next";
import { SETTING_KEYS, SETTINGS, type SettingGroup } from "./definitions";
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

const GROUPS: readonly SettingGroup[] = [
  "showcase",
  "network",
  "payment",
  "approval",
  "data",
  "referral",
];

/** Salva um grupo de regras de [4c]/[8f] (CFG-FR-002). A chave Pix tem fluxo próprio. */
export async function saveSettingsAction(
  _prev: SaveSettingsState,
  form: FormData,
): Promise<SaveSettingsState> {
  const group = GROUPS.find((g) => g === form.get("group"));
  if (!group) return { ok: false, message: "Grupo inválido.", errors: {} };
  const keys = SETTING_KEYS.filter(
    (k) => SETTINGS[k].group === group && SETTINGS[k].input !== "pix",
  );

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
