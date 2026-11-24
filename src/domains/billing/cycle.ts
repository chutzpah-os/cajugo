import {
  and,
  arrayContains,
  asc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  min,
} from "drizzle-orm";
import { rewardPaidInvoices } from "@/domains/referrals/service";
import { moveSubscription } from "@/domains/stores/service";
import { notify, type NoticeData } from "@/domains/notices/service";
import { getSettings } from "@/domains/settings/service";
import {
  billingCredits,
  invoices,
  payments,
  profiles,
  sales,
  stores,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import {
  invoicePeriod,
  isOverdue,
  opensInvoice,
  OPEN_DAYS_BEFORE,
  pastDueStart,
  suspensionDue,
} from "./cycle-dates";
import { nextDueAfter } from "./due-date";
import { invoiceTotals } from "./invoice-math";
import { endCanceledPeriods } from "./cancellation";

/**
 * Ciclo de cobrança no job diário (spec 011): abre a fatura mensal, marca o atraso e
 * suspende. Cada mudança parte do estado esperado, então repetir não faz nada
 * (SUB-NFR-002).
 */

/** Lojas que já pagaram a 1ª mensalidade e ainda são cobradas. */
export const BILLED_STATUSES = ["active", "past_due", "suspended"] as const;

const DAY_MS = 86_400_000;
const brDay = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

/**
 * Faturas que viraram pagas: rendem o Caju Indica (010) e o crédito do lojista que
 * indicou entra no `billing_credits` (D3), dentro da mesma transação.
 */
export async function rewardReferrals(
  tx: Db,
  invoiceIds: string[],
  now: Date,
): Promise<void> {
  const credits = await rewardPaidInvoices(tx, invoiceIds, now);
  if (credits.length)
    await tx.insert(billingCredits).values(
      credits.map((c) => ({
        storeId: c.storeId,
        kind: "referral" as const,
        sourceId: c.rewardId,
        amountCents: c.amountCents,
        createdAt: now,
      })),
    );
}

/** Abre as faturas que chegaram à janela (SUB-FR-001, SUB-FR-006, SUB-FR-014). */
/** Só o seed dos e2e: o ciclo restrito a estas lojas (o staging tem outras). */
export type CycleScope = { storeIds?: string[] };

const inScope = (scope: CycleScope) =>
  scope.storeIds ? inArray(stores.id, scope.storeIds) : undefined;

export async function openDueInvoices(
  db: Db,
  now: Date,
  scope: CycleScope = {},
): Promise<number> {
  // Filtro largo no banco; a regra exata é a data em São Paulo.
  const horizon = new Date(now.getTime() + (OPEN_DAYS_BEFORE + 1) * DAY_MS);
  const candidates = await db
    .select({ id: stores.id })
    .from(stores)
    .where(
      and(
        inArray(stores.status, [...BILLED_STATUSES]),
        inScope(scope),
        isNotNull(stores.nextDueAt),
        lte(stores.nextDueAt, horizon),
      ),
    );
  let opened = 0;
  for (const { id } of candidates)
    // Mais de uma se o job ficou dias sem rodar; no máximo 12 por execução.
    for (let i = 0; i < 12 && (await openNext(db, id, now)); i++) opened++;
  return opened;
}

/** Abre a próxima fatura da loja, se é a hora; `true` se abriu. */
async function openNext(db: Db, storeId: string, now: Date): Promise<boolean> {
  const settings = await getSettings(db, now);
  return db.transaction(async (tx) => {
    const [store] = await tx
      .select({
        ownerId: stores.ownerId,
        status: stores.status,
        billingDay: stores.billingDay,
        nextDueAt: stores.nextDueAt,
      })
      .from(stores)
      .where(eq(stores.id, storeId))
      .for("update");
    const dueAt = store?.nextDueAt;
    if (
      !dueAt ||
      !BILLED_STATUSES.includes(store.status as never) ||
      !opensInvoice(dueAt, now)
    )
      return false;

    const fees = await tx
      .select({ id: sales.id, cents: sales.feeCents })
      .from(sales)
      .where(
        and(
          eq(sales.storeId, storeId),
          isNull(sales.invoiceId),
          isNull(sales.canceledAt),
          gt(sales.feeCents, 0),
          lte(sales.createdAt, now),
        ),
      );
    const credits = await tx
      .select({
        id: billingCredits.id,
        amountCents: billingCredits.amountCents,
      })
      .from(billingCredits)
      .where(
        and(
          eq(billingCredits.storeId, storeId),
          isNull(billingCredits.appliedInvoiceId),
        ),
      )
      .orderBy(asc(billingCredits.createdAt), asc(billingCredits.id));
    const totals = invoiceTotals({
      membershipCents: settings.membership_cents,
      fees: fees.map((f) => f.cents!),
      credits,
    });

    const nextDueAt = nextDueAfter(
      dueAt,
      store.billingDay ?? Number(brDay.format(dueAt).slice(0, 2)),
    );
    await tx.update(stores).set({ nextDueAt }).where(eq(stores.id, storeId));

    const paid = totals.totalCents === 0;
    const [invoice] = await tx
      .insert(invoices)
      .values({
        storeId,
        kind: "monthly",
        period: invoicePeriod(dueAt),
        membershipCents: settings.membership_cents,
        feesCents: totals.feesCents,
        creditCents: totals.creditCents,
        totalCents: totals.totalCents,
        dueAt,
        status: paid ? "paid" : "open",
        paidAt: paid ? now : null,
      })
      .onConflictDoNothing()
      .returning({ id: invoices.id });
    // Período já faturado: só o vencimento anda (nunca duas faturas no mês).
    if (!invoice) return true;
    // Paga com crédito também conta como mensalidade paga (D5).
    if (paid) await rewardReferrals(tx, [invoice.id], now);

    if (fees.length)
      await tx
        .update(sales)
        .set({ invoiceId: invoice.id })
        .where(
          inArray(
            sales.id,
            fees.map((f) => f.id),
          ),
        );
    await applyCredits(tx, storeId, invoice.id, totals);

    if (!paid)
      await notify(
        tx,
        store.ownerId,
        {
          kind: "invoice_due",
          due: brDay.format(dueAt),
          totalCents: totals.totalCents,
        },
        now,
      );
    await logActivity(tx, {
      userId: null,
      action: "invoice.opened",
      entity: "invoice",
      entityId: invoice.id,
      data: {
        storeId,
        kind: "monthly",
        period: invoicePeriod(dueAt),
        totalCents: totals.totalCents,
      },
    });
    return true;
  });
}

/** Marca os créditos abatidos; o abatido em parte deixa o resto disponível. */
async function applyCredits(
  tx: Db,
  storeId: string,
  invoiceId: string,
  totals: ReturnType<typeof invoiceTotals>,
) {
  if (totals.applied.length)
    await tx
      .update(billingCredits)
      .set({ appliedInvoiceId: invoiceId })
      .where(inArray(billingCredits.id, totals.applied));
  if (!totals.split) return;
  const [credit] = await tx
    .update(billingCredits)
    .set({ appliedInvoiceId: invoiceId, amountCents: totals.split.usedCents })
    .where(eq(billingCredits.id, totals.split.id))
    .returning();
  await tx.insert(billingCredits).values({
    storeId,
    kind: credit.kind,
    sourceId: credit.sourceId,
    amountCents: totals.split.leftCents,
  });
}

/** Comprovante em conferência: a loja fica como está até o admin decidir (SUB-FR-003). */
async function receiptInReview(db: Db, storeId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.storeId, storeId), eq(payments.status, "submitted")))
    .limit(1);
  return !!row;
}

/** Vencimento da fatura aberta mais antiga de cada loja `status`. */
async function oldestOpenDue(
  db: Db,
  status: "active" | "past_due",
  scope: CycleScope,
) {
  return db
    .select({ storeId: stores.id, dueAt: min(invoices.dueAt) })
    .from(stores)
    .innerJoin(invoices, eq(invoices.storeId, stores.id))
    .where(
      and(
        eq(stores.status, status),
        inScope(scope),
        eq(invoices.kind, "monthly"),
        eq(invoices.status, "open"),
      ),
    )
    .groupBy(stores.id);
}

/** Fatura vencida sem pagamento: ativa → em atraso desde o dia seguinte (SUB-FR-007). */
export async function markPastDue(
  db: Db,
  now: Date,
  scope: CycleScope = {},
): Promise<number> {
  let marked = 0;
  for (const { storeId, dueAt } of await oldestOpenDue(db, "active", scope)) {
    if (!dueAt || !isOverdue(dueAt, now)) continue;
    const since = pastDueStart(dueAt);
    await db.transaction(async (tx) => {
      if (
        (await receiptInReview(tx, storeId)) ||
        !(await moveSubscription(tx, storeId, ["active"], "past_due", since))
      )
        return;
      marked++;
      await logActivity(tx, {
        userId: null,
        action: "store.past_due",
        entity: "store",
        entityId: storeId,
        data: { since: since.toISOString() },
      });
    });
  }
  return marked;
}

/**
 * Avisa o dono da loja (`notice()`) e os admins (`notice(nome da loja)`) de uma troca
 * na assinatura (SUB-FR-015, CAN-FR-012).
 */
export async function notifyOwnerAndAdmins(
  tx: Db,
  storeId: string,
  notice: (store?: string) => NoticeData,
  now: Date,
) {
  const [store] = await tx
    .select({ name: stores.name, ownerId: stores.ownerId })
    .from(stores)
    .where(eq(stores.id, storeId));
  await notify(tx, store.ownerId, notice(), now);
  const admins = await tx
    .select({ id: profiles.id })
    .from(profiles)
    .where(arrayContains(profiles.roles, ["admin"]));
  for (const admin of admins)
    await notify(tx, admin.id, notice(store.name), now);
}

/** Avisa o lojista e os admins de uma suspensão ou reativação (SUB-FR-015). */
export async function notifyStatusChange(
  tx: Db,
  storeId: string,
  kind: "store_suspended" | "store_reactivated",
  now: Date,
  byAdmin = false,
) {
  await notifyOwnerAndAdmins(
    tx,
    storeId,
    (store) =>
      store
        ? { kind, store }
        : kind === "store_reactivated" && byAdmin
          ? { kind, byAdmin: true }
          : { kind },
    now,
  );
}

/** Em atraso além da tolerância das regras → suspensa (SUB-FR-008). */
export async function suspendOverdue(
  db: Db,
  now: Date,
  scope: CycleScope = {},
): Promise<number> {
  const { past_due_tolerance_days: tolerance } = await getSettings(db, now);
  const late = await db
    .select({ id: stores.id, since: stores.pastDueSince })
    .from(stores)
    .where(
      and(
        eq(stores.status, "past_due"),
        isNotNull(stores.pastDueSince),
        inScope(scope),
      ),
    );
  let suspended = 0;
  for (const store of late) {
    if (!suspensionDue(store.since!, tolerance, now)) continue;
    await db.transaction(async (tx) => {
      if (
        (await receiptInReview(tx, store.id)) ||
        !(await moveSubscription(
          tx,
          store.id,
          ["past_due"],
          "suspended",
          store.since,
        ))
      )
        return;
      suspended++;
      await notifyStatusChange(tx, store.id, "store_suspended", now);
      await logActivity(tx, {
        userId: null,
        action: "store.suspended",
        entity: "store",
        entityId: store.id,
        data: { by: "system", toleranceDays: tolerance },
      });
    });
  }
  return suspended;
}

/**
 * Sem fatura mensal vencida em aberto, a loja em atraso ou suspensa volta a ativa
 * (SUB-FR-004); a que estava suspensa avisa e fica no registro como reativação.
 * `true` se voltou.
 */
export async function backToActiveIfSettled(
  tx: Db,
  storeId: string,
  now: Date,
  by: { userId: string | null; source: "payment" | "fee_refund"; id: string },
): Promise<boolean> {
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
  if (open.some((i) => isOverdue(i.dueAt, now))) return false;
  const [store] = await tx
    .select({ status: stores.status })
    .from(stores)
    .where(eq(stores.id, storeId));
  const wasSuspended = store?.status === "suspended";
  if (
    !(await moveSubscription(
      tx,
      storeId,
      ["past_due", "suspended"],
      "active",
      null,
    ))
  )
    return false;
  if (wasSuspended) {
    await notifyStatusChange(tx, storeId, "store_reactivated", now);
    await logActivity(tx, {
      userId: by.userId,
      action: "store.reactivated",
      entity: "store",
      entityId: storeId,
      data: { by: by.source, sourceId: by.id },
    });
  }
  return true;
}

/**
 * Venda desfeita (SUB-FR-014), na transação de `sellers.undoSale`: sem fatura, nada;
 * com a fatura aberta, a taxa sai e o total é recalculado (o crédito que passar do
 * novo subtotal volta a ficar disponível); com a fatura paga, vira crédito.
 */
export async function refundSaleFee(
  tx: Db,
  saleId: string,
  now: Date,
): Promise<void> {
  const [sale] = await tx
    .select({
      storeId: sales.storeId,
      feeCents: sales.feeCents,
      invoiceId: sales.invoiceId,
    })
    .from(sales)
    .where(eq(sales.id, saleId));
  if (!sale?.invoiceId || !sale.feeCents) return;
  const [invoice] = await tx
    .select()
    .from(invoices)
    .where(eq(invoices.id, sale.invoiceId))
    .for("update");
  if (invoice.status !== "open") {
    await tx.insert(billingCredits).values({
      storeId: sale.storeId,
      kind: "fee_refund",
      sourceId: saleId,
      amountCents: sale.feeCents,
    });
    return;
  }
  const feesCents = invoice.feesCents - sale.feeCents;
  const subtotal = invoice.membershipCents + feesCents;
  const creditCents = Math.min(invoice.creditCents, subtotal);
  if (invoice.creditCents > creditCents)
    await tx.insert(billingCredits).values({
      storeId: sale.storeId,
      kind: "fee_refund",
      sourceId: saleId,
      amountCents: invoice.creditCents - creditCents,
    });
  const totalCents = subtotal - creditCents;
  await tx
    .update(invoices)
    .set({
      feesCents,
      creditCents,
      totalCents,
      ...(totalCents === 0 ? { status: "paid" as const, paidAt: now } : {}),
    })
    .where(eq(invoices.id, invoice.id));
  await tx.update(sales).set({ invoiceId: null }).where(eq(sales.id, saleId));
  if (totalCents === 0) await rewardReferrals(tx, [invoice.id], now);
  // Fatura zerada era a única vencida: a loja volta ao ar.
  if (totalCents === 0)
    await backToActiveIfSettled(tx, sale.storeId, now, {
      userId: null,
      source: "fee_refund",
      id: saleId,
    });
}

/** Job diário: cada etapa do ciclo (contrato do cron, D6). */
export async function runBillingCycle(
  db: Db,
  now: Date,
  scope: CycleScope = {},
): Promise<{
  opened: number;
  pastDue: number;
  suspended: number;
  ended: number;
}> {
  const opened = await openDueInvoices(db, now, scope);
  const pastDue = await markPastDue(db, now, scope);
  const suspended = await suspendOverdue(db, now, scope);
  // Cancelamento (011b): o período pago acabou.
  const ended = await endCanceledPeriods(db, now, scope);
  return { opened, pastDue, suspended, ended };
}
