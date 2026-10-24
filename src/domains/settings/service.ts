import { desc, lte } from "drizzle-orm";
import { settingValues } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import {
  parseSettingValue,
  SETTINGS,
  SETTING_KEYS,
  settingValueJson,
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
