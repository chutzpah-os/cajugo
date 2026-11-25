import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import { authorizeTo } from "@/domains/auth/service";
import { profiles, stores, vehicles } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import type { Session } from "@/platform/http/session";

export const STORE_FILTERS = [
  "todas",
  "em-dia",
  "atrasadas",
  "suspensas",
  "cadastradas",
  "cancelamento",
  "canceladas",
] as const;
export type StoreFilter = (typeof STORE_FILTERS)[number];

type Status = (typeof stores.$inferSelect)["status"];

const FILTER_STATUS: Record<StoreFilter, Status[]> = {
  todas: [
    "registered",
    "payment_review",
    "active",
    "past_due",
    "suspended",
    "cancel_scheduled",
    "canceled",
  ],
  "em-dia": ["active"],
  atrasadas: ["past_due"],
  suspensas: ["suspended"],
  cadastradas: ["registered", "payment_review"],
  cancelamento: ["cancel_scheduled"],
  canceladas: ["canceled"],
};

export const PAGE_SIZE = 20;

const querySchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  filtro: z.enum(STORE_FILTERS).catch("todas").default("todas"),
  /** Cursor: o id da última loja da página anterior (uuid v7 segue a criação). */
  depois: z.uuid().optional().catch(undefined),
});

export type AdminStoreItem = {
  storeId: string;
  name: string;
  owner: string;
  city: string;
  status: Status;
  vehicles: number;
  onCajugo: number;
};

export type AdminStoresView = {
  filter: StoreFilter;
  q: string;
  items: AdminStoreItem[];
  /** Cursor da próxima página; null quando acabou. */
  next: string | null;
};

/** Escapa `%` e `_` da busca do admin (ILIKE). */
const like = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/**
 * Lojas [1d] do admin (ADM-FR-004, ADM-NFR-003): busca por nome, endereço, cidade ou
 * dono (nome ou e-mail), filtro pela situação da assinatura e 20 por vez, das mais
 * novas às mais antigas. Admin e suporte (ADM-SEC-001). Arquivadas não aparecem.
 */
export async function storesAdmin(
  db: Db,
  session: Session | null,
  raw: unknown,
): Promise<AdminStoresView> {
  authorizeTo(session, "admin.read");
  const { q, filtro, depois } = querySchema.parse(raw ?? {});

  const where: (SQL | undefined)[] = [
    inArray(stores.status, FILTER_STATUS[filtro]),
  ];
  if (q) {
    const p = like(q);
    where.push(
      or(
        ilike(stores.name, p),
        ilike(stores.city, p),
        ilike(stores.addressStreet, p),
        ilike(stores.addressDistrict, p),
        ilike(profiles.name, p),
        ilike(profiles.email, p),
      ),
    );
  }
  if (depois) where.push(lt(stores.id, depois));

  const stock = db
    .select({
      storeId: vehicles.storeId,
      total: count().as("total"),
      onCajugo:
        sql<number>`count(*) filter (where ${vehicles.status} = 'published' and ${vehicles.shareOnCajugo})`
          .mapWith(Number)
          .as("on_cajugo"),
    })
    .from(vehicles)
    .where(and(ne(vehicles.status, "deleted"), ne(vehicles.status, "sold")))
    .groupBy(vehicles.storeId)
    .as("stock");

  const rows = await db
    .select({
      storeId: stores.id,
      name: stores.name,
      city: stores.city,
      state: stores.state,
      status: stores.status,
      owner: profiles.name,
      total: stock.total,
      onCajugo: stock.onCajugo,
    })
    .from(stores)
    .innerJoin(profiles, eq(profiles.id, stores.ownerId))
    .leftJoin(stock, eq(stock.storeId, stores.id))
    .where(and(...where))
    .orderBy(desc(stores.id))
    .limit(PAGE_SIZE + 1);

  const page = rows.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  return {
    filter: filtro,
    q: q ?? "",
    items: page.map((r) => ({
      storeId: r.storeId,
      name: r.name,
      owner: r.owner,
      city: `${r.city}/${r.state}`,
      status: r.status,
      vehicles: r.total ?? 0,
      onCajugo: r.onCajugo ?? 0,
    })),
    next: rows.length > PAGE_SIZE && last ? last.storeId : null,
  };
}
