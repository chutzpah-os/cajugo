import { and, count, desc, eq, isNull, lt, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import { shortTitle } from "@/domains/vehicles/service";
import { sales, sellers, stores, vehicles } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { AppError } from "@/platform/http/errors";
import { authorize, type Session } from "@/platform/http/session";

/**
 * Extrato do vendedor [7d] (spec 008b): as vendas confirmadas com o vendedor da
 * sessão, sem as desfeitas. Saída montada aqui, sem nada do comprador (EXT-SEC-003).
 */

export const STATEMENT_FILTERS = ["todas", "a-receber", "pagas"] as const;
export type StatementFilter = (typeof STATEMENT_FILTERS)[number];

const PAGE = 20;
/** O vendedor desfaz o próprio "Recebi" por 24 h (EXT-FR-009). */
export const UNDO_MS = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const querySchema = z.object({
  filtro: z.enum(STATEMENT_FILTERS).catch("todas").default("todas"),
  cursor: z.string().regex(UUID).nullish().catch(null),
});

const STATUS_OF: Record<StatementFilter, "to_receive" | "paid" | null> = {
  todas: null,
  "a-receber": "to_receive",
  pagas: "paid",
};

export type StatementItem = {
  saleId: string;
  vehicle: string;
  store: string;
  date: Date;
  finalPriceCents: number;
  commissionCents: number;
  status: "to_receive" | "paid";
  /** Até quando o **Desfazer** vale; nulo sem "Recebi" do vendedor ou passado. */
  canUndoUntil: Date | null;
};

export type SellerStatement = {
  filter: StatementFilter;
  counts: { all: number; toReceive: number; paid: number };
  items: StatementItem[];
  nextCursor: string | null;
};

/** Vendedor da sessão, ativo ou bloqueado (o bloqueado vê o extrato, SEL-FR-002). */
export async function statementSellerOf(db: Db, session: Session | null) {
  const s = authorize(session, ["seller"]);
  const [row] = await db
    .select({ id: sellers.profileId })
    .from(sellers)
    .where(eq(sellers.profileId, s.userId));
  if (!row) throw AppError.forbidden();
  return row.id;
}

/** Vendas ativas do vendedor (a desfeita some, EXT-FR-007). */
export const liveSalesOf = (sellerId: string) =>
  and(eq(sales.sellerId, sellerId), isNull(sales.canceledAt))!;

const ITEM = {
  saleId: sales.id,
  make: vehicles.make,
  model: vehicles.model,
  store: stores.name,
  date: sales.createdAt,
  finalPriceCents: sales.finalPriceCents,
  commissionCents: sales.commissionCents,
  status: sales.commissionStatus,
  receivedAt: sales.commissionReceivedAt,
};

/** Monta o item do extrato a partir da linha de `ITEM`. */
export function toItem(
  r: {
    saleId: string;
    make: string | null;
    model: string | null;
    store: string;
    date: Date;
    finalPriceCents: number;
    commissionCents: number | null;
    status: "to_receive" | "paid" | null;
    receivedAt: Date | null;
  },
  now: Date,
): StatementItem {
  const until = r.receivedAt
    ? new Date(r.receivedAt.getTime() + UNDO_MS)
    : null;
  return {
    saleId: r.saleId,
    vehicle: shortTitle(r),
    store: r.store,
    date: r.date,
    finalPriceCents: r.finalPriceCents,
    commissionCents: r.commissionCents ?? 0,
    status: r.status ?? "to_receive",
    canUndoUntil: r.status === "paid" && until && until > now ? until : null,
  };
}

/** Linhas do extrato com o veículo e a loja. */
export function statementRows(db: Db, where: SQL) {
  return db
    .select(ITEM)
    .from(sales)
    .innerJoin(vehicles, eq(vehicles.id, sales.vehicleId))
    .innerJoin(stores, eq(stores.id, sales.storeId))
    .where(where)
    .orderBy(desc(sales.createdAt), desc(sales.id));
}

/** Extrato [7d] (EXT-FR-001, 002, 007, 008, NFR-002, SEC-001, 003). */
export async function sellerStatement(
  db: Db,
  session: Session | null,
  raw: unknown,
  now: Date = new Date(),
): Promise<SellerStatement> {
  const sellerId = await statementSellerOf(db, session);
  const { filtro, cursor } = querySchema.parse(raw ?? {});
  const mine = liveSalesOf(sellerId);

  const grouped = await db
    .select({ status: sales.commissionStatus, n: count() })
    .from(sales)
    .where(mine)
    .groupBy(sales.commissionStatus);
  const n = (s: string) => grouped.find((g) => g.status === s)?.n ?? 0;
  const counts = {
    all: grouped.reduce((sum, g) => sum + g.n, 0),
    toReceive: n("to_receive"),
    paid: n("paid"),
  };

  let after: SQL | undefined;
  if (cursor) {
    const [at] = await db
      .select({ createdAt: sales.createdAt })
      .from(sales)
      .where(and(eq(sales.id, cursor), mine));
    if (at)
      after = or(
        lt(sales.createdAt, at.createdAt),
        and(eq(sales.createdAt, at.createdAt), lt(sales.id, cursor)),
      );
  }
  const status = STATUS_OF[filtro];
  const rows = await statementRows(
    db,
    and(mine, status ? eq(sales.commissionStatus, status) : undefined, after)!,
  ).limit(PAGE + 1);
  const page = rows.slice(0, PAGE);
  return {
    filter: filtro,
    counts,
    items: page.map((r) => toItem(r, now)),
    nextCursor: rows.length > PAGE ? page[PAGE - 1].saleId : null,
  };
}
