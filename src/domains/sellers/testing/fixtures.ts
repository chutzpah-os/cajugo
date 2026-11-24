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

/** Só testes: venda da Rede Caju já confirmada, sem passar pela [7g] (008b). */
export async function soldBy(
  db: Db,
  input: {
    sellerId: string;
    storeId: string;
    confirmedBy: string;
    vehicleId: string;
    commissionCents?: number;
    status?: "to_receive" | "paid";
    at?: Date;
    finalPriceCents?: number;
    commissionReceivedAt?: Date | null;
  },
) {
  const { sales } = await import("@/platform/db/schema");
  const [row] = await db
    .insert(sales)
    .values({
      vehicleId: input.vehicleId,
      storeId: input.storeId,
      sellerId: input.sellerId,
      attribution: "other_partner",
      finalPriceCents: input.finalPriceCents ?? 5_800_000,
      commissionCents: input.commissionCents ?? 116_000,
      commissionStatus: input.status ?? "to_receive",
      feeBps: 100,
      feeCents: 58_000,
      confirmedBy: input.confirmedBy,
      createdAt: input.at ?? new Date("2026-11-20T12:00:00Z"),
      commissionReceivedAt: input.commissionReceivedAt ?? null,
    })
    .returning();
  return row;
}
