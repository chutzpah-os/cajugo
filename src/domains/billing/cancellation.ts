import { and, eq, inArray, isNull, lte, sum } from "drizzle-orm";
import { authorizeTo } from "@/domains/auth/service";
import { endStorePartnerships } from "@/domains/sellers/service";
import { billingCredits, invoices, stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import type { Session } from "@/platform/http/session";
import { cancelSchema } from "./cancel-reasons";
import { notifyOwnerAndAdmins, type CycleScope } from "./cycle";

/**
 * Cancelamento da assinatura (spec 011b): o dono agenda o fim para o próximo
 * vencimento e pode desfazer até lá; em atraso ou suspensa, a loja fica cancelada na
 * hora. `storeId` sempre da sessão (CAN-SEC-001). Cada troca parte do status
 * esperado, então repetir não faz nada.
 */

type Deps = { db: Db; now?: () => Date };

const brDay = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

/** Só o dono da loja (CAN-SEC-002). */
function ownerOf(session: Session | null) {
  const s = authorizeTo(session, "billing.manage");
  if (!s.storeId) throw AppError.forbidden();
  return { userId: s.userId, storeId: s.storeId };
}

/**
 * A loja sai da CajuGo (CAN-FR-005, CAN-FR-009), na transação de quem cancelou: o
 * crédito não usado expira, as parcerias da Rede Caju acabam, lojista e admins são
 * avisados. O status já é `canceled`.
 */
export async function closeStore(
  tx: Db,
  storeId: string,
  now: Date,
  by: { userId: string | null; source: "owner" | "period_end" },
): Promise<void> {
  const free = and(
    eq(billingCredits.storeId, storeId),
    isNull(billingCredits.appliedInvoiceId),
  );
  const [{ cents }] = await tx
    .select({ cents: sum(billingCredits.amountCents).mapWith(Number) })
    .from(billingCredits)
    .where(free);
  if (cents) await tx.delete(billingCredits).where(free);
  const partnerships = await endStorePartnerships(tx, storeId, now);
  await notifyOwnerAndAdmins(
    tx,
    storeId,
    (store) => ({ kind: "store_canceled", ...(store ? { store } : {}) }),
    now,
  );
  await logActivity(tx, {
    userId: by.userId,
    action: "store.canceled",
    entity: "store",
    entityId: storeId,
    data: { by: by.source, expiredCreditCents: cents ?? 0, partnerships },
  });
}

/**
 * [12h] Cancelar assinatura (CAN-FR-002, CAN-FR-009): ativa → cancelamento agendado até
 * o próximo vencimento; em atraso ou suspensa → cancelada agora, com as faturas
 * mensais abertas canceladas.
 */
export async function cancelSubscription(
  deps: Deps,
  session: Session | null,
  raw: unknown,
): Promise<{
  status: "cancel_scheduled" | "canceled";
  activeUntil: Date | null;
}> {
  const { userId, storeId } = ownerOf(session);
  const parsed = cancelSchema.safeParse(raw ?? {});
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const reason = parsed.data.reason ?? null;
  const now = deps.now?.() ?? new Date();

  return deps.db.transaction(async (tx) => {
    const [store] = await tx
      .select({ status: stores.status, nextDueAt: stores.nextDueAt })
      .from(stores)
      .where(eq(stores.id, storeId))
      .for("update");
    if (!store) throw AppError.notFound();

    if (store.status === "active" && store.nextDueAt) {
      const activeUntil = store.nextDueAt;
      await tx
        .update(stores)
        .set({
          status: "cancel_scheduled",
          cancelRequestedAt: now,
          cancelReason: reason,
          activeUntil,
        })
        .where(eq(stores.id, storeId));
      const until = brDay.format(activeUntil);
      await notifyOwnerAndAdmins(
        tx,
        storeId,
        (name) => ({
          kind: "cancel_scheduled",
          until,
          ...(name ? { store: name } : {}),
        }),
        now,
      );
      await logActivity(tx, {
        userId,
        action: "subscription.cancel_scheduled",
        entity: "store",
        entityId: storeId,
        data: { reason, activeUntil: activeUntil.toISOString() },
      });
      return { status: "cancel_scheduled" as const, activeUntil };
    }

    if (store.status === "past_due" || store.status === "suspended") {
      await tx
        .update(stores)
        .set({
          status: "canceled",
          cancelRequestedAt: now,
          cancelReason: reason,
          canceledAt: now,
          pastDueSince: null,
        })
        .where(eq(stores.id, storeId));
      const dropped = await tx
        .update(invoices)
        .set({ status: "canceled" })
        .where(
          and(
            eq(invoices.storeId, storeId),
            eq(invoices.kind, "monthly"),
            eq(invoices.status, "open"),
          ),
        )
        .returning({ id: invoices.id });
      await logActivity(tx, {
        userId,
        action: "subscription.canceled_now",
        entity: "store",
        entityId: storeId,
        data: { reason, from: store.status, canceledInvoices: dropped.length },
      });
      await closeStore(tx, storeId, now, { userId, source: "owner" });
      return { status: "canceled" as const, activeUntil: null };
    }

    throw AppError.conflict(
      store.status === "cancel_scheduled"
        ? "O cancelamento já está agendado."
        : "Não há assinatura para cancelar.",
    );
  });
}

/** Desfazer cancelamento (CAN-FR-003): até o fim do período, volta a ativa. */
export async function undoCancel(
  deps: Deps,
  session: Session | null,
): Promise<void> {
  const { userId, storeId } = ownerOf(session);
  const now = deps.now?.() ?? new Date();
  await deps.db.transaction(async (tx) => {
    const [store] = await tx
      .select({ status: stores.status, activeUntil: stores.activeUntil })
      .from(stores)
      .where(eq(stores.id, storeId))
      .for("update");
    if (!store) throw AppError.notFound();
    if (store.status !== "cancel_scheduled")
      throw AppError.conflict("Não há cancelamento para desfazer.");
    if (!store.activeUntil || now >= store.activeUntil)
      throw AppError.conflict(
        "O período já terminou. Para voltar, reassine na Conta.",
      );
    await tx
      .update(stores)
      .set({
        status: "active",
        cancelRequestedAt: null,
        cancelReason: null,
        activeUntil: null,
      })
      .where(eq(stores.id, storeId));
    await notifyOwnerAndAdmins(
      tx,
      storeId,
      (name) => ({ kind: "cancel_undone", ...(name ? { store: name } : {}) }),
      now,
    );
    await logActivity(tx, {
      userId,
      action: "subscription.cancel_undone",
      entity: "store",
      entityId: storeId,
    });
  });
}

/**
 * Job diário (CAN-FR-005): cancelamento agendado com o período pago no fim → cancelada.
 * Parte do status esperado, então rodar de novo não repete (CAN-NFR-002).
 */
export async function endCanceledPeriods(
  db: Db,
  now: Date,
  scope: CycleScope = {},
): Promise<number> {
  const due = await db
    .select({ id: stores.id })
    .from(stores)
    .where(
      and(
        eq(stores.status, "cancel_scheduled"),
        lte(stores.activeUntil, now),
        scope.storeIds ? inArray(stores.id, scope.storeIds) : undefined,
      ),
    );
  let ended = 0;
  for (const { id } of due)
    await db.transaction(async (tx) => {
      const done = await tx
        .update(stores)
        .set({ status: "canceled", canceledAt: now })
        .where(and(eq(stores.id, id), eq(stores.status, "cancel_scheduled")))
        .returning({ id: stores.id });
      if (!done.length) return;
      ended++;
      await closeStore(tx, id, now, { userId: null, source: "period_end" });
    });
  return ended;
}
