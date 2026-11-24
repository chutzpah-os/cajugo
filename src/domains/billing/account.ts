import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { authorizeTo, can } from "@/domains/auth/service";
import { brandName } from "@/domains/fipe/service";
import { getSettings } from "@/domains/settings/service";
import {
  invoices,
  payments,
  sales,
  stores,
  vehicles,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { AppError } from "@/platform/http/errors";
import type { Session } from "@/platform/http/session";
import { whatsappLink } from "@/platform/whatsapp/link";
import { daysLate, dueSoon, isOverdue } from "./cycle-dates";

/**
 * Fatura [10c] e Conta [3c] do lojista (spec 011): só o dono (`billing.manage`), com
 * a loja da sessão (SUB-SEC-001, SUB-SEC-003).
 */

type Deps = { db: Db; now?: () => Date };

function storeOf(session: Session | null): string {
  const s = authorizeTo(session, "billing.manage");
  if (!s.storeId) throw AppError.forbidden();
  return s.storeId;
}

export type InvoiceStatus = "open" | "late" | "paid" | "canceled";

export type InvoiceCard = {
  id: string;
  /** "mm/aaaa" (mensal) ou "1ª mensalidade". */
  reference: string;
  membershipCents: number;
  fees: { vehicle: string; date: Date; cents: number }[];
  creditCents: number;
  totalCents: number;
  dueAt: Date;
  status: InvoiceStatus;
  daysLate: number;
};

type InvoiceRow = typeof invoices.$inferSelect;

/** "mm/aaaa" da fatura mensal, como na fila [10b] ("Mensalidade 11/2026"). */
export const periodLabel = (period: string | null) =>
  period ? `${period.slice(5, 7)}/${period.slice(0, 4)}` : "1ª mensalidade";

function statusOf(invoice: InvoiceRow, now: Date): InvoiceStatus {
  if (invoice.status === "paid") return "paid";
  if (invoice.status === "canceled") return "canceled";
  return isOverdue(invoice.dueAt, now) ? "late" : "open";
}

const INVOICE_LABEL: Record<InvoiceStatus, string> = {
  open: "Em aberto",
  late: "Em atraso",
  paid: "Paga",
  canceled: "Cancelada",
};

/** Taxas CajuGo de cada fatura: as vendas ligadas a ela (D1). */
async function feesOf(db: Db, invoiceIds: string[]) {
  if (!invoiceIds.length) return new Map<string, InvoiceCard["fees"]>();
  const rows = await db
    .select({
      invoiceId: sales.invoiceId,
      make: vehicles.make,
      model: vehicles.model,
      date: sales.createdAt,
      cents: sales.feeCents,
    })
    .from(sales)
    .innerJoin(vehicles, eq(vehicles.id, sales.vehicleId))
    .where(inArray(sales.invoiceId, invoiceIds))
    .orderBy(asc(sales.createdAt));
  const byInvoice = new Map<string, InvoiceCard["fees"]>();
  for (const r of rows) {
    const list = byInvoice.get(r.invoiceId!) ?? [];
    list.push({
      vehicle:
        [r.make && brandName(r.make), r.model].filter(Boolean).join(" ") ||
        "Veículo",
      date: r.date,
      cents: r.cents ?? 0,
    });
    byInvoice.set(r.invoiceId!, list);
  }
  return byInvoice;
}

async function cards(db: Db, rows: InvoiceRow[], now: Date) {
  const fees = await feesOf(
    db,
    rows.map((r) => r.id),
  );
  return rows.map((r): InvoiceCard => ({
    id: r.id,
    reference: periodLabel(r.period),
    membershipCents: r.membershipCents,
    fees: fees.get(r.id) ?? [],
    creditCents: r.creditCents,
    totalCents: r.totalCents,
    dueAt: r.dueAt,
    status: statusOf(r, now),
    daysLate: r.status === "open" ? daysLate(r.dueAt, now) : 0,
  }));
}

/** Faturas mensais abertas da loja, da mais antiga para a mais nova. */
export async function openMonthly(db: Db, storeId: string) {
  return db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.storeId, storeId),
        eq(invoices.kind, "monthly"),
        eq(invoices.status, "open"),
      ),
    )
    .orderBy(asc(invoices.dueAt));
}

/** Soma das faturas (o total em aberto, quando são as abertas). */
export const totalOf = (rows: { totalCents: number }[]) =>
  rows.reduce((sum, i) => sum + i.totalCents, 0);

export type InvoiceView = {
  open: InvoiceCard[];
  openTotalCents: number;
  /** Último comprovante recusado da mensal ([12e]): motivo e o que falta. */
  lastRejection: { reason: string; missingCents: number | null } | null;
};

/** Fatura do mês [10c] (SUB-FR-002, SUB-FR-016): as abertas e o total a pagar. */
export async function invoiceView(
  deps: Deps,
  session: Session | null,
): Promise<InvoiceView> {
  const storeId = storeOf(session);
  const now = deps.now?.() ?? new Date();
  const open = await cards(deps.db, await openMonthly(deps.db, storeId), now);
  const openTotalCents = totalOf(open);
  const [last] = open.length
    ? await deps.db
        .select({
          status: payments.status,
          reason: payments.rejectReason,
          amountCents: payments.amountCents,
        })
        .from(payments)
        .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
        .where(and(eq(payments.storeId, storeId), eq(invoices.kind, "monthly")))
        .orderBy(desc(payments.submittedAt))
        .limit(1)
    : [];
  const missing = last ? openTotalCents - last.amountCents : 0;
  return {
    open,
    openTotalCents,
    lastRejection:
      last?.status === "rejected"
        ? {
            reason: last.reason ?? "",
            missingCents: missing > 0 ? missing : null,
          }
        : null,
  };
}

const STORE_LABEL: Record<string, string> = {
  registered: "Aguardando pagamento",
  payment_review: "Pagamento em análise",
  active: "Ativa",
  past_due: "Em atraso",
  suspended: "Suspensa",
  cancel_scheduled: "Cancelamento agendado",
  canceled: "Cancelada",
  archived: "Arquivada",
};

export type AccountView = {
  plan: string;
  status: string;
  statusLabel: string;
  membershipCents: number;
  nextDueAt: Date | null;
  /** Chave e favorecido vazios enquanto a chave Pix não está nas regras. */
  howToPay: {
    pixKey: string | null;
    beneficiary: string | null;
    supportUrl: string;
  };
  /** Fatura mais antiga em aberto, ou a última fatura. */
  current: InvoiceCard | null;
  /** Faturas anteriores: mês, valor e status. */
  history: {
    reference: string;
    totalCents: number;
    status: InvoiceStatus;
    statusLabel: string;
  }[];
};

/** Conta do lojista [3c] (SUB-FR-010). */
export async function accountView(
  deps: Deps,
  session: Session | null,
): Promise<AccountView> {
  const storeId = storeOf(session);
  const now = deps.now?.() ?? new Date();
  const [store] = await deps.db
    .select({ status: stores.status, nextDueAt: stores.nextDueAt })
    .from(stores)
    .where(eq(stores.id, storeId));
  if (!store) throw AppError.notFound();
  const settings = await getSettings(deps.db, now);
  const rows = await deps.db
    .select()
    .from(invoices)
    .where(and(eq(invoices.storeId, storeId), ne(invoices.status, "canceled")))
    .orderBy(desc(invoices.dueAt));
  const oldestOpen = [...rows].reverse().find((r) => r.status === "open");
  const currentRow = oldestOpen ?? rows[0];
  const [current] = currentRow
    ? await cards(deps.db, [currentRow], now)
    : [null];
  return {
    plan: "Plano Catálogo",
    status: store.status,
    statusLabel: STORE_LABEL[store.status],
    membershipCents: settings.membership_cents,
    // A fatura aberta vence antes do `next_due_at`, que já andou na abertura (D4).
    nextDueAt: oldestOpen?.dueAt ?? store.nextDueAt,
    howToPay: {
      pixKey: settings.pix?.key ?? null,
      beneficiary: settings.pix?.beneficiary ?? null,
      supportUrl: whatsappLink(
        settings.support_whatsapp,
        "Olá! Quero tirar uma dúvida sobre a fatura da minha loja na CajuGo.",
      ),
    },
    current,
    history: rows
      .filter((r) => r.id !== currentRow?.id)
      .map((r) => {
        const status = statusOf(r, now);
        return {
          reference: periodLabel(r.period),
          totalCents: r.totalCents,
          status,
          statusLabel: INVOICE_LABEL[status],
        };
      }),
  };
}

export type BillingAlert =
  | { kind: "due"; dueAt: Date; totalCents: number }
  | { kind: "late"; days: number; totalCents: number }
  | { kind: "suspended"; days: number; totalCents: number }
  /** Usuário da loja: só que ela está suspensa, sem valor nem pagar. */
  | { kind: "suspended_staff" };

/**
 * Alerta da fatura no topo do painel (SUB-FR-006, 007, 009): vence em até 3 dias, em
 * atraso ou loja suspensa [12f]. Valor e "Pagar agora" só para o dono; o usuário da
 * loja vê só que ela está suspensa. Comprovante em análise: sem cobrança de novo.
 */
export async function billingAlert(
  deps: Deps,
  session: Session | null,
): Promise<BillingAlert | null> {
  if (!session?.storeId) return null;
  const now = deps.now?.() ?? new Date();
  const [store] = await deps.db
    .select({ status: stores.status })
    .from(stores)
    .where(eq(stores.id, session.storeId));
  if (!store) return null;
  const owner = can(session, "billing.manage");
  if (!owner)
    return store.status === "suspended" ? { kind: "suspended_staff" } : null;
  const open = await openMonthly(deps.db, session.storeId);
  const totalCents = totalOf(open);
  const days = open[0] ? daysLate(open[0].dueAt, now) : 0;
  if (store.status === "suspended")
    return { kind: "suspended", days, totalCents };
  if (!open.length) return null;
  const [inReview] = await deps.db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.storeId, session.storeId),
        eq(payments.status, "submitted"),
      ),
    )
    .limit(1);
  if (inReview) return null;
  if (store.status === "past_due" || isOverdue(open[0].dueAt, now))
    return { kind: "late", days, totalCents };
  if (dueSoon(open[0].dueAt, now))
    return { kind: "due", dueAt: open[0].dueAt, totalCents };
  return null;
}
