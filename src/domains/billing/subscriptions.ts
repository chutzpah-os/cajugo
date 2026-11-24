import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { authorizeTo, can } from "@/domains/auth/service";
import { getSettings, upcomingSetting } from "@/domains/settings/service";
import { brl } from "@/platform/br/money";
import { invoices, payments, profiles, stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import type { Session } from "@/platform/http/session";
import { whatsappLink } from "@/platform/whatsapp/link";
import { moveSubscription } from "@/domains/stores/service";
import { logActivity } from "@/platform/http/activity-log";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import { BILLED_STATUSES, notifyStatusChange } from "./cycle";
import { daysLate, dueSoon, isOverdue } from "./cycle-dates";
import { totalOf } from "./account";
import { mrrCents } from "./invoice-math";

/** Assinaturas do admin [4b] (spec 011): admin e suporte veem; só o admin decide. */

export const SUBSCRIPTION_FILTERS = [
  "todas",
  "em-dia",
  "atrasadas",
  "suspensas",
  "cancelamento",
  "canceladas",
] as const;
export type SubscriptionFilter = (typeof SUBSCRIPTION_FILTERS)[number];

const filterSchema = z.object({
  filtro: z.enum(SUBSCRIPTION_FILTERS).catch("todas").default("todas"),
});

/** Status em [4b]: as cobradas, o cancelamento agendado e as canceladas (011b). */
const LISTED_STATUSES = [
  ...BILLED_STATUSES,
  "cancel_scheduled",
  "canceled",
] as const;
type ListedStatus = (typeof LISTED_STATUSES)[number];

const FILTER_STATUS: Record<SubscriptionFilter, ListedStatus[]> = {
  todas: [...BILLED_STATUSES, "cancel_scheduled"],
  "em-dia": ["active"],
  atrasadas: ["past_due"],
  suspensas: ["suspended"],
  cancelamento: ["cancel_scheduled"],
  canceladas: ["canceled"],
};

const COUNT_OF: Record<ListedStatus, keyof SubscriptionsView["counts"]> = {
  active: "ok",
  past_due: "late",
  suspended: "suspended",
  cancel_scheduled: "canceling",
  canceled: "canceled",
};

export type SubscriptionLine =
  | { kind: "ok"; nextDueAt: Date | null; amountCents: number }
  | { kind: "late"; days: number; amountCents: number }
  | { kind: "review"; submittedAt: Date }
  | { kind: "suspended"; days: number; amountCents: number }
  /** Cancelamento agendado (011b): "Termina em dd/mm · motivo". */
  | { kind: "canceling"; until: Date; reason: string | null }
  | { kind: "canceled"; at: Date; reason: string | null };

export type SubscriptionItem = {
  storeId: string;
  name: string;
  slug: string;
  owner: string;
  since: Date | null;
  status: ListedStatus;
  line: SubscriptionLine;
  /** `wa.me` com a mensagem de cobrança pronta (atraso e suspensa). */
  whatsappUrl: string | null;
  canSuspend: boolean;
  canReactivate: boolean;
};

export type SubscriptionsView = {
  filter: SubscriptionFilter;
  mrrCents: number;
  counts: {
    ok: number;
    late: number;
    suspended: number;
    canceling: number;
    canceled: number;
  };
  plan: {
    name: string;
    membershipCents: number;
    stores: number;
    /** Mudança de mensalidade já agendada (Editar plano, 011b). */
    upcoming: { membershipCents: number; validFrom: Date } | null;
  };
  items: SubscriptionItem[];
  /** "Vencem em 3 dias" (SUB-FR-006). */
  dueSoon: {
    storeId: string;
    name: string;
    dueAt: Date;
    amountCents: number;
    whatsappUrl: string;
  }[];
};

const brDay = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

/** [4b] (SUB-FR-011, SUB-FR-012, SUB-FR-006). */
export async function subscriptionsView(
  deps: { db: Db; now?: () => Date },
  session: Session | null,
  query: unknown,
): Promise<SubscriptionsView> {
  const s = authorizeTo(session, "subscriptions.view");
  const { filtro } = filterSchema.parse(query ?? {});
  const now = deps.now?.() ?? new Date();
  const settings = await getSettings(deps.db, now);
  const upcoming = await upcomingSetting(deps.db, "membership_cents", now);
  const decide = can(s, "stores.suspend");

  const rows = await deps.db
    .select({
      storeId: stores.id,
      name: stores.name,
      slug: stores.slug,
      whatsapp: stores.whatsapp,
      status: stores.status,
      since: stores.activatedAt,
      nextDueAt: stores.nextDueAt,
      activeUntil: stores.activeUntil,
      canceledAt: stores.canceledAt,
      cancelReason: stores.cancelReason,
      owner: profiles.name,
    })
    .from(stores)
    .innerJoin(profiles, eq(profiles.id, stores.ownerId))
    .where(inArray(stores.status, [...LISTED_STATUSES]))
    .orderBy(asc(stores.name));
  const ids = rows.map((r) => r.storeId);
  const open = ids.length
    ? await deps.db
        .select({
          storeId: invoices.storeId,
          dueAt: invoices.dueAt,
          totalCents: invoices.totalCents,
        })
        .from(invoices)
        .where(
          and(
            inArray(invoices.storeId, ids),
            eq(invoices.kind, "monthly"),
            eq(invoices.status, "open"),
          ),
        )
        .orderBy(asc(invoices.dueAt))
    : [];
  const inReview = ids.length
    ? await deps.db
        .select({
          storeId: payments.storeId,
          submittedAt: payments.submittedAt,
        })
        .from(payments)
        .where(
          and(inArray(payments.storeId, ids), eq(payments.status, "submitted")),
        )
    : [];

  const openOf = (id: string) => open.filter((i) => i.storeId === id);
  const counts = { ok: 0, late: 0, suspended: 0, canceling: 0, canceled: 0 };
  const items: SubscriptionItem[] = [];
  for (const r of rows) {
    const status = r.status as ListedStatus;
    counts[COUNT_OF[status]]++;
    if (!FILTER_STATUS[filtro].includes(status)) continue;
    const mine = openOf(r.storeId);
    const total = totalOf(mine);
    const days = mine[0] ? daysLate(mine[0].dueAt, now) : 0;
    const review = inReview.find((p) => p.storeId === r.storeId);
    const ending = status === "cancel_scheduled" || status === "canceled";
    const line: SubscriptionLine = ending
      ? status === "cancel_scheduled"
        ? { kind: "canceling", until: r.activeUntil!, reason: r.cancelReason }
        : { kind: "canceled", at: r.canceledAt!, reason: r.cancelReason }
      : review
        ? { kind: "review", submittedAt: review.submittedAt }
        : status === "active"
          ? {
              kind: "ok",
              nextDueAt: mine[0]?.dueAt ?? r.nextDueAt,
              amountCents: total || settings.membership_cents,
            }
          : {
              kind: status === "past_due" ? "late" : "suspended",
              days,
              amountCents: total,
            };
    items.push({
      storeId: r.storeId,
      name: r.name,
      slug: r.slug,
      owner: r.owner,
      since: r.since,
      status,
      line,
      whatsappUrl:
        status === "active" || ending
          ? null
          : whatsappLink(
              r.whatsapp,
              `Olá, ${r.name}! A fatura da sua loja na CajuGo está em atraso há ${days} ${days === 1 ? "dia" : "dias"} (${brl(total)}). Para pagar, entre no painel em Conta.`,
            ),
      canSuspend: decide && status === "past_due",
      canReactivate: decide && status === "suspended",
    });
  }

  const dueSoonList = rows.flatMap((r) => {
    if (!(BILLED_STATUSES as readonly string[]).includes(r.status)) return [];
    const next = openOf(r.storeId).find((i) => dueSoon(i.dueAt, now));
    if (!next) return [];
    return [
      {
        storeId: r.storeId,
        name: r.name,
        dueAt: next.dueAt,
        amountCents: next.totalCents,
        whatsappUrl: whatsappLink(
          r.whatsapp,
          `Olá, ${r.name}! A fatura da sua loja na CajuGo vence em ${brDay.format(next.dueAt)} (${brl(next.totalCents)}). Para pagar, entre no painel em Conta.`,
        ),
      },
    ];
  });

  return {
    filter: filtro,
    mrrCents: mrrCents(
      { active: counts.ok, past_due: counts.late, suspended: counts.suspended },
      settings.membership_cents,
    ),
    counts,
    plan: {
      name: "Plano Catálogo",
      membershipCents: settings.membership_cents,
      stores: counts.ok + counts.late + counts.suspended + counts.canceling,
      upcoming: upcoming
        ? { membershipCents: upcoming.value, validFrom: upcoming.validFrom }
        : null,
    },
    items,
    dueSoon: dueSoonList,
  };
}

const suspendSchema = z.object({ storeId: z.uuid() }).strict();
const reactivateSchema = z
  .object({
    storeId: z.uuid(),
    reason: z
      .string()
      .trim()
      .min(3, "Informe o motivo.")
      .max(200, "Use no máximo 200 caracteres."),
  })
  .strict();

function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  return parsed.data;
}

/** Loja travada até o fim da transação; inexistente → 404. */
async function lockedStore(db: Db, storeId: string) {
  const [store] = await db
    .select({ status: stores.status, pastDueSince: stores.pastDueSince })
    .from(stores)
    .where(eq(stores.id, storeId))
    .for("update");
  if (!store) throw AppError.notFound();
  return store;
}

/** **Suspender** [4b] (SUB-FR-013): só o admin, só loja em atraso. */
export async function suspendStore(
  deps: { db: Db; now?: () => Date },
  session: Session | null,
  raw: unknown,
): Promise<void> {
  const admin = authorizeTo(session, "stores.suspend");
  const { storeId } = parse(suspendSchema, raw);
  const now = deps.now?.() ?? new Date();
  await deps.db.transaction(async (tx) => {
    const store = await lockedStore(tx, storeId);
    if (
      !(await moveSubscription(
        tx,
        storeId,
        ["past_due"],
        "suspended",
        store.pastDueSince,
      ))
    )
      throw AppError.conflict("Só uma loja em atraso pode ser suspensa.");
    await notifyStatusChange(tx, storeId, "store_suspended", now);
    await logActivity(tx, {
      userId: admin.userId,
      action: "store.suspended",
      entity: "store",
      entityId: storeId,
      data: { by: "admin" },
    });
  });
}

/**
 * **Reativar** [4b] (SUB-FR-013): só o admin, só loja suspensa, com motivo. Sem
 * pagamento, volta a em atraso e a tolerância conta de novo a partir de agora; sem
 * fatura vencida em aberto, volta a ativa.
 */
export async function reactivateStore(
  deps: { db: Db; now?: () => Date },
  session: Session | null,
  raw: unknown,
): Promise<void> {
  const admin = authorizeTo(session, "stores.suspend");
  const { storeId, reason } = parse(reactivateSchema, raw);
  const now = deps.now?.() ?? new Date();
  await deps.db.transaction(async (tx) => {
    if ((await lockedStore(tx, storeId)).status !== "suspended")
      throw AppError.conflict("Só uma loja suspensa pode ser reativada.");
    const open = await tx
      .select({ dueAt: invoices.dueAt })
      .from(invoices)
      .where(
        and(
          eq(invoices.storeId, storeId),
          eq(invoices.kind, "monthly"),
          eq(invoices.status, "open"),
        ),
      );
    const late = open.some((i) => isOverdue(i.dueAt, now));
    await moveSubscription(
      tx,
      storeId,
      ["suspended"],
      late ? "past_due" : "active",
      late ? now : null,
    );
    await notifyStatusChange(tx, storeId, "store_reactivated", now, true);
    await logActivity(tx, {
      userId: admin.userId,
      action: "store.reactivated",
      entity: "store",
      entityId: storeId,
      data: { by: "admin", reason, to: late ? "past_due" : "active" },
    });
  });
}
