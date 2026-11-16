import { like, or } from "drizzle-orm";
import { searchAlerts } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";

/**
 * Alertas do staging para o e2e (006d). O de "Argo V0" casa com o veículo completo da
 * vitrine E2E (publicado na hora do seed, depois do alerta); o outro fica esperando.
 * Os pedidos feitos pela tela nos testes usam buscas com "e2e" e saem no próximo seed.
 */
export const E2E_ALERTS = {
  matchedName: "Ana E2E",
  matchedPhone: "5579990000001",
  matchedQuery: "q=Argo+V0",
  waitingQuery: "q=e2e-sem-carro",
} as const;

export async function seedAlerts(db: Db, now: Date) {
  const A = E2E_ALERTS;
  await db
    .delete(searchAlerts)
    .where(
      or(
        like(searchAlerts.query, "%e2e%"),
        like(searchAlerts.query, A.matchedQuery),
      ),
    );
  const before = new Date(now.getTime() - 60 * 60_000);
  await db.insert(searchAlerts).values([
    {
      name: A.matchedName,
      phone: A.matchedPhone,
      query: A.matchedQuery,
      consentAt: before,
      createdAt: before,
    },
    {
      name: "Bia E2E",
      phone: "5579990000002",
      query: A.waitingQuery,
      consentAt: before,
      createdAt: before,
    },
  ]);
}
