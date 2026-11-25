import { and, count, eq, gte, lt, sum } from "drizzle-orm";
import { payments } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { saoPauloMonthStart } from "./due-date";

/**
 * Pagamentos no painel do admin [4a] (012b, ADM-FR-001/002): mensalidades pagas
 * (confirmadas) do dia 1 até agora e no mesmo período do mês anterior, e os
 * comprovantes a conferir. Sem sessão: só o domínio `admin` chama, depois de
 * conferir `admin.read`.
 */
export async function paymentsSnapshot(db: Db, now: Date) {
  const start = saoPauloMonthStart(now);
  const prevStart = saoPauloMonthStart(new Date(start.getTime() - 86_400_000));
  const prevEnd = new Date(
    prevStart.getTime() + (now.getTime() - start.getTime()),
  );
  const paidBetween = (a: Date, b: Date) =>
    db
      .select({ cents: sum(payments.amountCents).mapWith(Number) })
      .from(payments)
      .where(
        and(
          eq(payments.status, "confirmed"),
          gte(payments.reviewedAt, a),
          lt(payments.reviewedAt, b),
        ),
      );
  const [[cur], [prev], [review]] = await Promise.all([
    paidBetween(start, now),
    paidBetween(prevStart, prevEnd),
    db
      .select({ n: count() })
      .from(payments)
      .where(eq(payments.status, "submitted")),
  ]);
  return {
    paidThisMonthCents: cur.cents ?? 0,
    paidPrevCents: prev.cents ?? 0,
    receiptsToReview: review.n,
  };
}
