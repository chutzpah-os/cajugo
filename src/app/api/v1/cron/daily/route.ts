import { revalidateTag } from "next/cache";
import { purgeExpired } from "@/domains/buyers/service";
import { ALERTS_TAG } from "@/domains/buyers/tags";
import { getDb } from "@/platform/db/client";
import { isCronRequest } from "@/platform/http/cron";
import { errorMessage, logger } from "@/platform/http/logger";
import { purgeRateLimits } from "@/platform/http/rate-limit";

const DAY_MS = 86_400_000;
const NO_STORE = { "cache-control": "no-store" };

/** Job diário (ARCHITECTURE §6, contract.md da 006d): cada etapa é idempotente. */
export async function GET(request: Request) {
  if (!isCronRequest(request))
    return Response.json(
      { error: { code: "unauthorized", message: "Não autorizado." } },
      { status: 401, headers: NO_STORE },
    );
  const db = getDb();
  const now = new Date();
  try {
    const expiredAlerts = await purgeExpired(db, now);
    // A lista em cache do admin não guarda mais nome e celular dos vencidos (ALR-SEC-004).
    if (expiredAlerts) revalidateTag(ALERTS_TAG, { expire: 0 });
    // Janelas de rate limit vão até 1 dia; 2 dias de folga.
    const rateLimitsBefore = new Date(now.getTime() - 2 * DAY_MS);
    await purgeRateLimits(db, rateLimitsBefore);
    return Response.json(
      {
        data: {
          expiredAlerts,
          rateLimitsBefore: rateLimitsBefore.toISOString(),
        },
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    logger.error("cron.daily_failed", { error: errorMessage(error) });
    return Response.json(
      { error: { code: "internal", message: "Falha no job diário." } },
      { status: 500, headers: NO_STORE },
    );
  }
}
