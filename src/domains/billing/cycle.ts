import { and, asc, eq, gt, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import { notify } from "@/domains/notices/service";
import { getSettings } from "@/domains/settings/service";
import { billingCredits, invoices, sales, stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import { invoicePeriod, opensInvoice, OPEN_DAYS_BEFORE } from "./cycle-dates";
import { nextDueAfter } from "./due-date";
import { invoiceTotals } from "./invoice-math";

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

/** Abre as faturas que chegaram à janela (SUB-FR-001, SUB-FR-006, SUB-FR-014). */
export async function openDueInvoices(db: Db, now: Date): Promise<number> {
  // Filtro largo no banco; a regra exata é a data em São Paulo.
  const horizon = new Date(now.getTime() + (OPEN_DAYS_BEFORE + 1) * DAY_MS);
  const candidates = await db
    .select({ id: stores.id })
    .from(stores)
    .where(
      and(
        inArray(stores.status, [...BILLED_STATUSES]),
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

/** Job diário: cada etapa do ciclo (contrato do cron, D6). */
export async function runBillingCycle(
  db: Db,
  now: Date,
): Promise<{ opened: number; pastDue: number; suspended: number }> {
  const opened = await openDueInvoices(db, now);
  return { opened, pastDue: 0, suspended: 0 };
}
