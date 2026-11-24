import {
  and,
  count,
  desc,
  eq,
  gte,
  isNull,
  lt,
  or,
  sum,
  type SQL,
} from "drizzle-orm";
import { saoPauloMonthStart } from "@/domains/billing/service";
import { z } from "zod";
import { authorizeTo } from "@/domains/auth/service";
import { notifyStore } from "@/domains/notices/service";
import { shortTitle } from "@/domains/vehicles/service";
import {
  profiles,
  sales,
  sellers,
  stores,
  vehicles,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
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

const receivedSchema = z
  .object({ saleId: z.uuid(), received: z.boolean() })
  .strict();

/**
 * **Recebi** e **Desfazer** [7d] (EXT-FR-003, 004, 009, 010; EXT-SEC-001, 002, 004):
 * só o vendedor da venda (o bloqueado também, D2). Recebi passa A receber → Paga com a
 * data; desfazer volta só o Recebi do próprio vendedor, em até 24 h. Cada mudança parte
 * do status esperado; repetir não faz nada. A loja recebe o aviso.
 */
export async function setCommissionReceived(
  deps: { db: Db },
  session: Session | null,
  raw: unknown,
  now: Date = new Date(),
): Promise<void> {
  authorizeTo(session, "commission.receive");
  const sellerId = await statementSellerOf(deps.db, session);
  const parsed = receivedSchema.safeParse(raw);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const { saleId, received } = parsed.data;

  await deps.db.transaction(async (tx) => {
    const [sale] = await tx
      .select({
        id: sales.id,
        storeId: sales.storeId,
        status: sales.commissionStatus,
        receivedAt: sales.commissionReceivedAt,
        make: vehicles.make,
        model: vehicles.model,
      })
      .from(sales)
      .innerJoin(vehicles, eq(vehicles.id, sales.vehicleId))
      .where(and(eq(sales.id, saleId), liveSalesOf(sellerId)))
      .for("update", { of: sales });
    if (!sale) throw AppError.notFound();
    if (received) {
      if (sale.status !== "to_receive") return;
      await tx
        .update(sales)
        .set({ commissionStatus: "paid", commissionReceivedAt: now })
        .where(eq(sales.id, sale.id));
    } else {
      if (sale.status !== "paid") return;
      if (
        !sale.receivedAt ||
        now.getTime() - sale.receivedAt.getTime() > UNDO_MS
      )
        throw AppError.conflict("Para corrigir, fale com a CajuGo.");
      await tx
        .update(sales)
        .set({ commissionStatus: "to_receive", commissionReceivedAt: null })
        .where(eq(sales.id, sale.id));
    }
    const [me] = await tx
      .select({ name: profiles.name })
      .from(profiles)
      .where(eq(profiles.id, sellerId));
    await notifyStore(
      tx,
      sale.storeId,
      {
        kind: received ? "commission_received" : "commission_unreceived",
        seller: me.name.trim().split(/\s+/)[0],
        vehicle: shortTitle(sale),
      },
      now,
    );
    await logActivity(tx, {
      userId: sellerId,
      action: received ? "commission.received" : "commission.unreceived",
      entity: "sale",
      entityId: sale.id,
    });
  });
}

/** Totais do painel [7b] (EXT-FR-005, 007, 008): a receber, vendas do mês e as 5 últimas. */
export async function sellerSalesSummary(
  db: Db,
  sellerId: string,
  now: Date,
): Promise<{
  toReceiveCents: number;
  salesThisMonth: number;
  recentSales: StatementItem[];
}> {
  const mine = liveSalesOf(sellerId);
  const [due] = await db
    .select({ cents: sum(sales.commissionCents).mapWith(Number) })
    .from(sales)
    .where(and(mine, eq(sales.commissionStatus, "to_receive")));
  const [month] = await db
    .select({ n: count() })
    .from(sales)
    .where(and(mine, gte(sales.createdAt, saoPauloMonthStart(now))));
  const recent = await statementRows(db, mine).limit(5);
  return {
    toReceiveCents: due?.cents ?? 0,
    salesThisMonth: month?.n ?? 0,
    recentSales: recent.map((r) => toItem(r, now)),
  };
}
