import { desc, lte } from "drizzle-orm";
import { z } from "zod";
import type { AuthDeps } from "@/domains/auth/service";
import { authorizeTo } from "@/domains/auth/permissions";
import { settingValues } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import type { Session } from "@/platform/http/session";
import {
  parseSettingValue,
  SETTINGS,
  SETTING_KEYS,
  settingValueJson,
  type SettingKey,
  type Settings,
} from "./definitions";

/**
 * Todas as regras, tipadas, com o valor vigente em `at` (padrão: agora). Cada regra
 * vale da sua alteração até a próxima (CFG-FR-009); as specs que calculam passam a
 * data do fato. Sem valor para alguma regra é erro de dados: a migration `0005` cria
 * todas (CFG-FR-003).
 */
export async function getSettings(
  db: Db,
  at: Date = new Date(),
): Promise<Settings> {
  const rows = await db
    .selectDistinctOn([settingValues.key], {
      key: settingValues.key,
      value: settingValueJson,
    })
    .from(settingValues)
    .where(lte(settingValues.validFrom, at))
    .orderBy(settingValues.key, desc(settingValues.validFrom));
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  const settings: Record<string, unknown> = {};
  for (const key of SETTING_KEYS) {
    if (!byKey.has(key)) throw new Error(`Regra sem valor: ${key}`);
    settings[key] = SETTINGS[key].schema.parse(
      parseSettingValue(byKey.get(key) ?? null),
    );
  }
  return settings as Settings;
}

/** O que das regras pode ir para página pública (montado à mão: nunca a chave Pix, CFG-SEC-004). */
export type PublicSettings = {
  supportWhatsapp: string;
  installmentRateBps: number;
  referral: { enabled: boolean; pctBps: number; months: number };
};

export function publicSettings(s: Settings): PublicSettings {
  return {
    supportWhatsapp: s.support_whatsapp,
    installmentRateBps: s.installment_rate_bps,
    referral: {
      enabled: s.referral_enabled,
      pctBps: s.referral_pct_bps,
      months: s.referral_months,
    },
  };
}

/**
 * Entrada de `updateSettings`: qualquer subconjunto das regras, cada uma com o seu
 * formato; regra desconhecida é recusada (API.md §2). A chave Pix entra na T008,
 * com confirmação por senha.
 */
const EDITABLE_KEYS = SETTING_KEYS.filter((k) => k !== "pix");
const updateSchema = z
  .object(
    Object.fromEntries(
      EDITABLE_KEYS.map((k) => [k, SETTINGS[k].schema.optional()]),
    ) as { [K in SettingKey]?: z.ZodOptional<(typeof SETTINGS)[K]["schema"]> },
  )
  .strict();

/**
 * Admin altera regras (CFG-FR-002): valida cada uma (CFG-FR-004), grava só as que
 * mudaram, todas numa transação, vigentes a partir de agora (CFG-FR-009), com
 * auditoria. Só `admin` (CFG-SEC-001, CFG-SEC-002).
 */
export async function updateSettings(
  deps: AuthDeps,
  session: Session | null,
  input: unknown,
): Promise<{ changed: SettingKey[] }> {
  const admin = authorizeTo(session, "settings.edit");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const now = deps.now?.() ?? new Date();

  const current = await getSettings(deps.db, now);
  const next = parsed.data as Partial<Settings>;
  const changed = (Object.keys(next) as SettingKey[]).filter(
    (k) => JSON.stringify(next[k]) !== JSON.stringify(current[k]),
  );
  if (changed.length === 0) return { changed };

  await deps.db.transaction(async (tx) => {
    await tx.insert(settingValues).values(
      changed.map((key) => ({
        key,
        value: next[key],
        validFrom: now,
        changedBy: admin.userId,
      })),
    );
    // Só as chaves: valores (ex.: chave Pix) não vão para a auditoria.
    await logActivity(tx, {
      userId: admin.userId,
      action: "settings.updated",
      entity: "settings",
      data: { keys: changed },
    });
  });
  return { changed };
}
