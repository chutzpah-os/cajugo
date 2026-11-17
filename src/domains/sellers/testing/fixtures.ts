import { eq } from "drizzle-orm";
import { profiles, sellers } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { uuidv7 } from "@/platform/db/uuid";
import type { Session } from "@/platform/http/session";

let seq = 0;

/** Só testes: vendedor com conta, CPF e Pix, no status pedido. */
export async function seller(
  db: Db,
  over: Partial<typeof sellers.$inferInsert> & { name?: string } = {},
): Promise<Session> {
  seq += 1;
  const id = uuidv7();
  const { name = `Vendedor ${seq}`, ...row } = over;
  await db.insert(profiles).values({
    id,
    email: `${id}@x.com`,
    name,
    phone: "5579999990000",
    roles: ["seller"],
    cpf: String(10_000_000_000 + seq * 7919),
    pixKey: `${id}@x.com`,
    pixKeyType: "email",
  });
  await db
    .insert(sellers)
    .values({ profileId: id, city: "Aracaju", status: "in_review", ...row });
  return {
    userId: id,
    roles: ["seller"],
    activeRole: "seller",
    storeId: null,
    mustChangePassword: false,
  };
}

/** Só testes: vendedor aprovado, com código. */
export async function activeSeller(
  db: Db,
  code: string,
  over: Partial<typeof sellers.$inferInsert> & { name?: string } = {},
) {
  return seller(db, { status: "active", code, ...over });
}

export async function sellerRow(db: Db, id: string) {
  const [row] = await db
    .select()
    .from(sellers)
    .where(eq(sellers.profileId, id));
  return row;
}

/** Só testes: a loja liga "Aceitar vendedores" e, opcionalmente, a comissão padrão. */
export async function acceptSellers(
  db: Db,
  storeId: string,
  commission?: { type: "pct" | "fixed"; value: number },
) {
  const { stores } = await import("@/platform/db/schema");
  await db
    .update(stores)
    .set({
      acceptsSellers: true,
      ...(commission
        ? { commissionType: commission.type, commissionValue: commission.value }
        : {}),
    })
    .where(eq(stores.id, storeId));
}
