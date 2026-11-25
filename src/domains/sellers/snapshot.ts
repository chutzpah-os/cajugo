import { and, count, eq, gte, isNull } from "drizzle-orm";
import { partnerships, sales, sellers } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";

/**
 * Vendedores em análise no painel do admin [4a] (012b, ADM-FR-002). Sem sessão: só o
 * domínio `admin` chama, depois de conferir `admin.read`.
 */
export async function sellersInReview(db: Db): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(sellers)
    .where(eq(sellers.status, "in_review"));
  return row.n;
}

/** Card Rede Caju do detalhe do admin [6g] (012b): parceiros ativos e vendas no mês. */
export async function storeNetworkForAdmin(
  db: Db,
  storeId: string,
  monthStart: Date,
) {
  const [[partners], [salesRow]] = await Promise.all([
    db
      .select({ n: count() })
      .from(partnerships)
      .where(
        and(
          eq(partnerships.storeId, storeId),
          eq(partnerships.status, "active"),
        ),
      ),
    db
      .select({ n: count() })
      .from(sales)
      .where(
        and(
          eq(sales.storeId, storeId),
          isNull(sales.canceledAt),
          gte(sales.createdAt, monthStart),
        ),
      ),
  ]);
  return { partners: partners.n, salesThisMonth: salesRow.n };
}
