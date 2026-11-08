import { asc, desc, eq, lte } from "drizzle-orm";
import { z } from "zod";
import {
  authorizeTo,
  verifyOwnPassword,
  type AuthDeps,
} from "@/domains/auth/service";
import { profiles, settingValues } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import type { Session } from "@/platform/http/session";
import {
  parseSettingValue,
  pixWriteSchema,
  sameSettingValue,
  SETTINGS,
  SETTING_KEYS,
  settingValueJson,
  type SettingKey,
  type Settings,
} from "./definitions";

/**
 * Todas as regras, tipadas, com o valor vigente em `at` (padrão: agora). Cada regra
 * vale da sua alteração até a próxima (CFG-FR-009); as specs que calculam passam a
 * data do fato. Data anterior a qualquer alteração recebe o valor provisório (o mais
 * antigo de cada regra): o sistema nunca fica sem valor (CFG-FR-003).
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
  if (byKey.size < SETTING_KEYS.length) {
    const earliest = await db
      .selectDistinctOn([settingValues.key], {
        key: settingValues.key,
        value: settingValueJson,
      })
      .from(settingValues)
      .orderBy(settingValues.key, asc(settingValues.validFrom));
    for (const r of earliest) if (!byKey.has(r.key)) byKey.set(r.key, r.value);
  }

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
 * formato; regra desconhecida é recusada (API.md §2). A chave Pix só pode ser trocada
 * por outra (não apagada) e pede `password` (CFG-FR-008).
 */
const updateSchema = z
  .object({
    ...(Object.fromEntries(
      SETTING_KEYS.map((k) => [k, SETTINGS[k].schema.optional()]),
    ) as { [K in SettingKey]?: z.ZodOptional<(typeof SETTINGS)[K]["schema"]> }),
    pix: pixWriteSchema.optional(),
    password: z.string().max(200).optional(),
  })
  .strict();

/**
 * Admin altera regras (CFG-FR-002): valida cada uma (CFG-FR-004), grava só as que
 * mudaram, todas numa transação, vigentes a partir de agora (CFG-FR-009), com
 * auditoria. Só `admin` (CFG-SEC-001, CFG-SEC-002). Trocar a chave Pix exige a senha
 * do admin, com o bloqueio do login (CFG-FR-008, CFG-SEC-005); `ctx.ipHash` é o IP
 * com hash, para esse bloqueio.
 */
export async function updateSettings(
  deps: AuthDeps,
  session: Session | null,
  input: unknown,
  ctx?: { ipHash: string },
): Promise<{ changed: SettingKey[] }> {
  const admin = authorizeTo(session, "settings.edit");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const now = deps.now?.() ?? new Date();

  const current = await getSettings(deps.db, now);
  const { password, ...next } = parsed.data as Partial<Settings> & {
    password?: string;
  };
  const changed = (Object.keys(next) as SettingKey[]).filter(
    (k) => !sameSettingValue(next[k], current[k]),
  );
  if (changed.length === 0) return { changed };

  if (changed.includes("pix")) {
    if (!password)
      throw AppError.validation([
        {
          field: "password",
          code: "required",
          message: "Confirme com a sua senha.",
        },
      ]);
    if (!ctx)
      throw new Error(
        "updateSettings: ctx.ipHash é obrigatório para a chave Pix.",
      );
    await verifyOwnPassword(deps, admin, password, ctx);
  }

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

/** Uma alteração de regra na tela de histórico (saída montada à mão). */
export type SettingChange = {
  at: Date;
  /** Nome de quem alterou. */
  by: string | null;
  from: unknown;
  to: unknown;
};

/**
 * Histórico de uma regra (CFG-FR-006), da alteração mais recente à mais antiga.
 * O valor provisório da migration é o ponto de partida, não uma alteração; voltas ao
 * provisório feitas pelo sistema (seed de teste) aparecem como "Sistema".
 * Leitura: admin e suporte (CFG-SEC-001, CFG-SEC-002).
 */
export async function settingHistory(
  db: Db,
  session: Session | null,
  key: unknown,
): Promise<SettingChange[]> {
  authorizeTo(session, "admin.read");
  const parsedKey = z
    .enum(SETTING_KEYS as [SettingKey, ...SettingKey[]])
    .safeParse(key);
  if (!parsedKey.success) throw AppError.notFound();
  const definition = SETTINGS[parsedKey.data];

  const rows = await db
    .select({
      at: settingValues.validFrom,
      value: settingValueJson,
      changedBy: settingValues.changedBy,
      by: profiles.name,
    })
    .from(settingValues)
    .leftJoin(profiles, eq(profiles.id, settingValues.changedBy))
    .where(eq(settingValues.key, parsedKey.data))
    .orderBy(asc(settingValues.validFrom));

  const values = rows.map((r) =>
    definition.schema.parse(parseSettingValue(r.value)),
  );
  const changes: SettingChange[] = [];
  rows.forEach((row, i) => {
    if (i === 0) return;
    changes.push({
      at: row.at,
      // Sem autor depois do valor inicial = volta ao provisório feita pelo sistema.
      by: row.changedBy === null ? "Sistema" : row.by,
      from: values[i - 1],
      to: values[i],
    });
  });
  return changes.reverse();
}

/**
 * Volta ao valor provisório toda regra que estiver diferente (só testes: `pnpm
 * e2e:seed`). O histórico é só de inserção: entra como alteração nova, do "Sistema".
 */
export async function restoreInitialSettings(db: Db): Promise<SettingKey[]> {
  const current = await getSettings(db);
  const changed = SETTING_KEYS.filter(
    (k) => !sameSettingValue(current[k], SETTINGS[k].initial),
  );
  if (changed.length)
    await db
      .insert(settingValues)
      .values(changed.map((key) => ({ key, value: SETTINGS[key].initial })));
  return changed;
}
