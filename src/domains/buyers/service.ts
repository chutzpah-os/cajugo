import { and, count, eq, isNull } from "drizzle-orm";
import type { SavedSearch } from "@/domains/showcase/service";
import { isUniqueViolation } from "@/platform/db/errors";
import { searchAlerts } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";

/** Até 5 alertas pendentes por celular (ALR-SEC-002). */
export const PENDING_PER_PHONE = 5;

export type CreateAlertResult =
  | { ok: true; status: "created"; alertId: string }
  | { ok: true; status: "duplicate" }
  | { ok: false; error: "too-many" };

/**
 * "Avisar quando chegar" (ALR-FR-001): guarda nome, celular, a busca normalizada e a
 * hora do consentimento. A mesma busca pendente do mesmo celular não repete
 * (ALR-FR-006, índice único); um celular tem até 5 pendentes (ALR-SEC-002).
 */
export async function createAlert(
  db: Db,
  input: { name: string; phone: string; search: SavedSearch },
  now: Date = new Date(),
): Promise<CreateAlertResult> {
  const [{ pending }] = await db
    .select({ pending: count() })
    .from(searchAlerts)
    .where(
      and(
        eq(searchAlerts.phone, input.phone),
        eq(searchAlerts.status, "pending"),
      ),
    );
  try {
    if (pending >= PENDING_PER_PHONE) {
      // A mesma busca já guardada é "duplicada", não "demais".
      const [same] = await db
        .select({ id: searchAlerts.id })
        .from(searchAlerts)
        .where(
          and(
            eq(searchAlerts.phone, input.phone),
            eq(searchAlerts.status, "pending"),
            eq(searchAlerts.query, input.search.query),
            input.search.discoveryPath
              ? eq(searchAlerts.discoveryPath, input.search.discoveryPath)
              : isNull(searchAlerts.discoveryPath),
          ),
        );
      return same
        ? { ok: true, status: "duplicate" }
        : { ok: false, error: "too-many" };
    }
    const [row] = await db
      .insert(searchAlerts)
      .values({
        name: input.name,
        phone: input.phone,
        query: input.search.query,
        discoveryPath: input.search.discoveryPath,
        consentAt: now,
        createdAt: now,
      })
      .returning({ id: searchAlerts.id });
    return { ok: true, status: "created", alertId: row.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: true, status: "duplicate" };
    throw error;
  }
}
