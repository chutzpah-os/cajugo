import { count, eq } from "drizzle-orm";
import { sellers } from "@/platform/db/schema";
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
