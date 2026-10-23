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
