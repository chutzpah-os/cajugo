import {
  and,
  desc,
  eq,
  gte,
  inArray,
  like,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Db } from "../db/types";
import { activityLog } from "../db/schema";

export type ActivityEntry = {
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string;
  data?: Record<string, unknown>;
};

/**
 * Registra uma ação de auditoria. Só existe insert: nenhum código atualiza ou apaga `activity_log`.
 * Não coloque dado pessoal em `data` (use ids).
 */
export async function logActivity(db: Db, entry: ActivityEntry) {
  await db.insert(activityLog).values(entry);
}

export type ActivityFilter = {
  /** Ações aceitas: nomes exatos e prefixos (`store.`). Sem os dois, todas. */
  actions?: { exact: string[]; prefixes: string[] };
  /** Período: `from` inclusivo, `to` exclusivo. */
  from?: Date;
  to?: Date;
  /** Só os registros da loja: a própria loja ou `data.storeId`. */
  storeId?: string;
  /** Cursor: registros anteriores a este id (uuid v7, em ordem de criação). */
  before?: string;
  limit: number;
};

export type ActivityRow = {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: Date;
};

/** Leitura do registro, do mais recente ao mais antigo; nunca devolve `data`. */
export async function readActivity(
  db: Db,
  f: ActivityFilter,
): Promise<ActivityRow[]> {
  const where: SQL[] = [];
  if (f.actions) {
    const any: SQL[] = f.actions.prefixes.map((p) =>
      like(activityLog.action, `${p}%`),
    );
    if (f.actions.exact.length)
      any.push(inArray(activityLog.action, f.actions.exact));
    where.push(or(...any) ?? sql`false`);
  }
  if (f.from) where.push(gte(activityLog.createdAt, f.from));
  if (f.to) where.push(lt(activityLog.createdAt, f.to));
  if (f.storeId)
    where.push(
      or(
        and(
          eq(activityLog.entity, "store"),
          eq(activityLog.entityId, f.storeId),
        ),
        sql`${activityLog.data}->>'storeId' = ${f.storeId}`,
      )!,
    );
  if (f.before) where.push(lt(activityLog.id, f.before));
  return db
    .select({
      id: activityLog.id,
      userId: activityLog.userId,
      action: activityLog.action,
      entity: activityLog.entity,
      entityId: activityLog.entityId,
      createdAt: activityLog.createdAt,
    })
    .from(activityLog)
    .where(and(...where))
    .orderBy(desc(activityLog.id))
    .limit(f.limit);
}
