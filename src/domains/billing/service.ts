import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  or,
} from "drizzle-orm";
import { authorizeTo, can } from "@/domains/auth/service";
import { authorize } from "@/platform/http/session";
import { userRole } from "@/platform/db/schema";
import { rejectSelfReferralsByTaxId } from "@/domains/referrals/service";
import { notify } from "@/domains/notices/service";
import {
  activateFirstTime,
  backToRegistered,
  markPaymentReview,
} from "@/domains/stores/service";
import { getSettings, pixReady } from "@/domains/settings/service";
import { maskTaxId, parseTaxId, type TaxIdType } from "@/platform/br/tax-id";
import type {
  Cloudinary,
  SignedUpload,
} from "@/platform/cloudinary/cloudinary";
import { brCode } from "@/platform/pix/br-code";
import {
  billingCredits,
  invoices,
  notices,
  payments,
  stores,
} from "@/platform/db/schema";
import { isUniqueViolation } from "@/platform/db/errors";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import {
  checkPrivateUpload,
  PRIVATE_FORMATS,
  privateExtension,
} from "@/platform/cloudinary/private-files";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import type { Session } from "@/platform/http/session";
import { storeUrl } from "@/platform/http/urls";
import { whatsappLink } from "@/platform/whatsapp/link";
import { openMonthly, periodLabel, totalOf } from "./account";
import { backToActiveIfSettled, rewardReferrals } from "./cycle";
import { settleOldestFirst } from "./invoice-math";
import { firstDueDate, saoPauloMonthStart } from "./due-date";
import {
  confirmPaymentSchema,
  manualPaymentSchema,
  storeSearchSchema,
  rejectPaymentSchema,
  startCheckoutSchema,
  submitReceiptSchema,
} from "./schemas";

/**
 * Cobrança da loja (spec 004; mensais na 011): fatura, pagamento por Pix manual e
 * conferência pelo admin. `storeId` sempre da sessão; o admin recebe ids e a posse é
 * conferida aqui (SECURITY.md §4).
 */

export type BillingDeps = { db: Db; now?: () => Date };
export type FileDeps = BillingDeps & { cloudinary: Cloudinary };

/** Comprovante: foto ou PDF, até 10 MB (PIX-FR-005, PIX-SEC-002). */
export const RECEIPT_FORMATS = PRIVATE_FORMATS;

const clock = (deps: BillingDeps) => deps.now?.() ?? new Date();

/** Lojista da sessão e a loja dele (só `store_owner`, PIX-SEC-006). */
function ownerOf(session: Session | null): { userId: string; storeId: string } {
  const s = authorizeTo(session, "billing.manage");
  if (!s.storeId) throw AppError.forbidden();
  return { userId: s.userId, storeId: s.storeId };
}

const UNAVAILABLE =
  "O pagamento está indisponível no momento. Fale com a CajuGo.";

async function openFirstInvoice(db: Db, storeId: string) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.storeId, storeId),
        eq(invoices.kind, "first"),
        eq(invoices.status, "open"),
      ),
    );
  return invoice ?? null;
}

type Invoice = typeof invoices.$inferSelect;

/**
 * O que a loja paga agora: a 1ª mensalidade ou, depois dela, as faturas mensais
 * abertas (011): o total delas, com o pagamento ligado à mais antiga (SUB-FR-016).
 */
async function payable(
  db: Db,
  storeId: string,
): Promise<{ invoice: Invoice; amountCents: number; first: boolean } | null> {
  const first = await openFirstInvoice(db, storeId);
  if (first)
    return { invoice: first, amountCents: first.totalCents, first: true };
  const open = await openMonthly(db, storeId);
  if (!open.length) return null;
  return {
    invoice: open[0],
    amountCents: totalOf(open),
    first: false,
  };
}

/** Valor esperado de um pagamento: a 1ª ou o total mensal em aberto da loja. */
async function expectedFor(db: Db, invoice: Invoice): Promise<number> {
  if (invoice.kind === "first") return invoice.totalCents;
  const open = await openMonthly(db, invoice.storeId);
  return totalOf(open) || invoice.totalCents;
}

async function hasReceiptInReview(db: Db, storeId: string) {
  const [row] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.storeId, storeId), eq(payments.status, "submitted")))
    .limit(1);
  return !!row;
}

export type CheckoutView = {
  storeName: string;
  /** Valor da fatura aberta ou, sem fatura, a mensalidade vigente (PIX-FR-001). */
  membershipCents: number;
  taxId: { type: TaxIdType; masked: string } | null;
  pixReady: boolean;
  /** `wa.me` do atendimento, para quando a chave Pix não está configurada. */
  supportUrl: string;
  /** Último comprovante recusado da fatura aberta ([12e]). */
  lastRejection: { reason: string; missingCents: number | null } | null;
};

/** Tela de pagamento [5d] (PIX-FR-001, 002, 004; PIX-SEC-005). */
export async function checkoutView(
  deps: BillingDeps,
  session: Session | null,
): Promise<CheckoutView> {
  const { storeId } = ownerOf(session);
  const now = clock(deps);
  const [store] = await deps.db
    .select({
      name: stores.name,
      taxId: stores.taxId,
      taxIdType: stores.taxIdType,
    })
    .from(stores)
    .where(eq(stores.id, storeId));
  if (!store) throw AppError.notFound();
  const settings = await getSettings(deps.db, now);
  const invoice = await openFirstInvoice(deps.db, storeId);

  let lastRejection: CheckoutView["lastRejection"] = null;
  if (invoice) {
    const [last] = await deps.db
      .select({
        status: payments.status,
        reason: payments.rejectReason,
        amountCents: payments.amountCents,
      })
      .from(payments)
      .where(eq(payments.invoiceId, invoice.id))
      .orderBy(desc(payments.submittedAt))
      .limit(1);
    if (last?.status === "rejected") {
      const missing = invoice.totalCents - last.amountCents;
      lastRejection = {
        reason: last.reason ?? "",
        missingCents: missing > 0 ? missing : null,
      };
    }
  }

  return {
    storeName: store.name,
    membershipCents: invoice?.totalCents ?? settings.membership_cents,
    taxId:
      store.taxId && store.taxIdType
        ? {
            type: store.taxIdType,
            masked: maskTaxId(store.taxIdType, store.taxId),
          }
        : null,
    pixReady: pixReady(settings.pix),
    supportUrl: whatsappLink(
      settings.support_whatsapp,
      "Olá! Quero pagar a assinatura da minha loja na CajuGo.",
    ),
    lastRejection,
  };
}

async function storedTaxId(db: Db, storeId: string) {
  const [s] = await db
    .select({ digits: stores.taxId, type: stores.taxIdType })
    .from(stores)
    .where(eq(stores.id, storeId));
  return s?.digits && s.type ? { digits: s.digits, type: s.type } : null;
}

const TAX_ID_MESSAGE: Record<number, string> = {
  11: "CPF inválido.",
  14: "CNPJ inválido.",
};

/**
 * "Pagar com Pix" em [5d] (PIX-FR-002): grava o CPF/CNPJ na loja e abre a fatura da
 * 1ª mensalidade com a mensalidade vigente (ou reaproveita a aberta); confere a
 * autoindicação por documento (PIX-FR-003). Sem chave Pix
 * pronta, recusa (PIX-FR-004). Só com a loja `registered`.
 */
export async function startCheckout(
  deps: BillingDeps,
  session: Session | null,
  input: unknown,
): Promise<void> {
  const { userId, storeId } = ownerOf(session);
  const parsed = startCheckoutSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const typed = parsed.data.taxId?.trim() ?? "";
  // Vazio: reaproveita o documento já informado (reenvio depois de recusa, [12e]).
  const taxId = typed ? parseTaxId(typed) : await storedTaxId(deps.db, storeId);
  if (!taxId) {
    const digits = typed.replace(/\D/g, "").length;
    throw AppError.validation([
      {
        field: "taxId",
        code: "invalid",
        message: TAX_ID_MESSAGE[digits] ?? "Informe um CPF ou CNPJ.",
      },
    ]);
  }
  const now = clock(deps);
  const settings = await getSettings(deps.db, now);
  if (!pixReady(settings.pix)) throw AppError.conflict(UNAVAILABLE);

  await deps.db.transaction(async (tx) => {
    const [store] = await tx
      .select({ status: stores.status })
      .from(stores)
      .where(eq(stores.id, storeId));
    if (!store) throw AppError.notFound();
    if (store.status !== "registered")
      throw AppError.conflict("O pagamento da 1ª mensalidade já foi enviado.");

    await tx
      .update(stores)
      .set({ taxId: taxId.digits, taxIdType: taxId.type })
      .where(eq(stores.id, storeId));
    // Autoindicação por documento, nos dois sentidos (PIX-FR-003).
    await rejectSelfReferralsByTaxId(tx, storeId);

    if (await openFirstInvoice(tx, storeId)) return;
    const [invoice] = await tx
      .insert(invoices)
      .values({
        storeId,
        kind: "first",
        membershipCents: settings.membership_cents,
        totalCents: settings.membership_cents,
        dueAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: invoices.id });
    if (invoice)
      await logActivity(tx, {
        userId,
        action: "invoice.opened",
        entity: "invoice",
        entityId: invoice.id,
        data: { kind: "first", totalCents: settings.membership_cents },
      });
  });
}

export type PixView = {
  amountCents: number;
  key: string;
  beneficiary: string;
  city: string;
  /** "Copia e cola" e conteúdo do QR code (BR Code com o valor). */
  brCode: string;
  reviewBusinessDays: number;
};

/**
 * Tela do Pix [6c] (PIX-FR-004): valor da fatura aberta, chave e favorecido das
 * regras, BR Code com o valor e o prazo de conferência. `null` sem fatura aberta
 * (a pessoa ainda não passou por [5d]); chave não pronta → 409.
 */
export async function pixView(
  deps: BillingDeps,
  session: Session | null,
): Promise<PixView | null> {
  const { storeId } = ownerOf(session);
  const due = await payable(deps.db, storeId);
  if (!due) return null;
  const settings = await getSettings(deps.db, clock(deps));
  if (!pixReady(settings.pix)) throw AppError.conflict(UNAVAILABLE);
  const { key, beneficiary, city } = settings.pix;
  return {
    amountCents: due.amountCents,
    key,
    beneficiary,
    city,
    brCode: brCode({
      key,
      name: beneficiary,
      city,
      amountCents: due.amountCents,
    }),
    reviewBusinessDays: settings.review_business_days,
  };
}

/** Pasta privada dos comprovantes da loja (ADR 0011). */
const receiptFolder = (storeId: string) => `receipts/${storeId}`;

/**
 * Assinatura para o navegador enviar o comprovante direto ao Cloudinary, privado
 * (`authenticated`), na pasta da loja da sessão e com nome gerado aqui (PIX-SEC-001,
 * PIX-SEC-002). Só com a loja `registered` e a fatura aberta (PIX-FR-006).
 */
export async function receiptUpload(
  deps: FileDeps,
  session: Session | null,
): Promise<SignedUpload> {
  const { storeId } = ownerOf(session);
  const [store] = await deps.db
    .select({ status: stores.status })
    .from(stores)
    .where(eq(stores.id, storeId));
  const due = await payable(deps.db, storeId);
  if (!store || !due || (due.first && store.status !== "registered"))
    throw AppError.conflict("Não há pagamento aguardando comprovante.");
  if (!due.first && (await hasReceiptInReview(deps.db, storeId)))
    throw AppError.conflict(IN_REVIEW);
  return deps.cloudinary.signUpload({
    folder: receiptFolder(storeId),
    publicId: `receipt-${crypto.randomUUID()}`,
    allowedFormats: RECEIPT_FORMATS,
    type: "authenticated",
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const IN_REVIEW = "Já recebemos um comprovante. Aguarde a conferência.";

/**
 * Envio do comprovante (PIX-FR-005, PIX-FR-006): o arquivo tem que ser exatamente o
 * nome assinado para a loja da sessão (outra loja ou fora do padrão → 404,
 * PIX-SEC-001), existir, ser imagem ou PDF de até 10 MB (recusado é apagado,
 * PIX-SEC-002). Cria o pagamento `submitted` com o valor pago e passa a loja para
 * "pagamento em análise"; com outro em análise, recusa e apaga o arquivo.
 */
export async function submitReceipt(
  deps: FileDeps,
  session: Session | null,
  input: unknown,
): Promise<void> {
  const { userId, storeId } = ownerOf(session);
  const parsed = submitReceiptSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const { publicId, paidCents } = parsed.data;
  const prefix = deps.cloudinary.fullPublicId(
    receiptFolder(storeId),
    "receipt-",
  );
  if (!publicId.startsWith(prefix) || !UUID.test(publicId.slice(prefix.length)))
    throw AppError.notFound();

  const file = await checkPrivateUpload(
    deps.cloudinary,
    publicId,
    "receipt",
    "Não encontramos o comprovante enviado. Tente de novo.",
  );
  const discard = () => deps.cloudinary.destroy(publicId, "authenticated");

  const now = clock(deps);
  try {
    await deps.db.transaction(async (tx) => {
      const due = await payable(tx, storeId);
      if (!due) throw AppError.conflict(IN_REVIEW);
      // Só a 1ª mensalidade muda a loja; na mensal ela segue como está (SUB-FR-003).
      if (
        due.first
          ? !(await markPaymentReview(tx, storeId))
          : await hasReceiptInReview(tx, storeId)
      )
        throw AppError.conflict(IN_REVIEW);
      const { invoice } = due;
      const [payment] = await tx
        .insert(payments)
        .values({
          invoiceId: invoice.id,
          storeId,
          paidCents,
          amountCents: paidCents,
          receiptPublicId: publicId,
          receiptFormat: file.format,
          status: "submitted",
          submittedBy: userId,
          submittedAt: now,
        })
        .returning({ id: payments.id });
      await logActivity(tx, {
        userId,
        action: "payment.submitted",
        entity: "payment",
        entityId: payment.id,
        data: {
          invoiceId: invoice.id,
          paidCents,
          expectedCents: due.amountCents,
        },
      });
    });
  } catch (error) {
    await discard();
    if (isUniqueViolation(error)) throw AppError.conflict(IN_REVIEW);
    throw error;
  }
}

/** Como a fatura aparece para o admin (GLOSSARY "Fatura"). */
const REFERENCE: Record<"first" | "monthly", string> = {
  first: "1ª mensalidade",
  monthly: "Mensalidade",
};
/** A mesma referência no nome do arquivo baixado. */
const REFERENCE_SLUG: Record<"first" | "monthly", string> = {
  first: "1a-mensalidade",
  monthly: "mensalidade",
};

export type QueueItem = {
  paymentId: string;
  storeName: string;
  storeSlug: string;
  reference: string;
  paidCents: number;
  expectedCents: number;
  /** "Valor diferente do esperado" (PIX-FR-008). */
  differs: boolean;
  submittedAt: Date;
  format: string | null;
};

export type QueueView = {
  items: QueueItem[];
  waiting: number;
  confirmedThisMonth: number;
  /** Falso: [10b] mostra "Chave Pix não configurada" (PIX-FR-004). */
  pixReady: boolean;
  /** Suporte vê a fila sem os botões (PIX-SEC-003). */
  canReview: boolean;
};

/** Fila de comprovantes [10b] (PIX-FR-007, 008): admin e suporte. */
export async function reviewQueue(
  deps: BillingDeps,
  session: Session | null,
): Promise<QueueView> {
  const s = authorizeTo(session, "payments.view");
  const now = clock(deps);
  const rows = await deps.db
    .select({
      paymentId: payments.id,
      storeName: stores.name,
      storeSlug: stores.slug,
      kind: invoices.kind,
      period: invoices.period,
      storeId: payments.storeId,
      paidCents: payments.paidCents,
      amountCents: payments.amountCents,
      expectedCents: invoices.totalCents,
      submittedAt: payments.submittedAt,
      format: payments.receiptFormat,
    })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .innerJoin(stores, eq(stores.id, payments.storeId))
    .where(eq(payments.status, "submitted"))
    .orderBy(asc(payments.submittedAt));
  const [{ confirmed }] = await deps.db
    .select({ confirmed: count() })
    .from(payments)
    .where(
      and(
        eq(payments.status, "confirmed"),
        gte(payments.reviewedAt, saoPauloMonthStart(now)),
      ),
    );
  const settings = await getSettings(deps.db, now);
  // Mensal: o esperado é o total em aberto da loja (SUB-FR-016).
  const monthlyExpected = new Map<string, number>();
  for (const r of rows)
    if (r.kind === "monthly" && !monthlyExpected.has(r.storeId))
      monthlyExpected.set(
        r.storeId,
        totalOf(await openMonthly(deps.db, r.storeId)) || r.expectedCents,
      );
  return {
    items: rows.map((r) => {
      const paid = r.paidCents ?? r.amountCents;
      const expectedCents = monthlyExpected.get(r.storeId) ?? r.expectedCents;
      return {
        paymentId: r.paymentId,
        storeName: r.storeName,
        storeSlug: r.storeSlug,
        reference:
          r.kind === "monthly"
            ? `${REFERENCE.monthly} ${periodLabel(r.period)}`
            : REFERENCE.first,
        paidCents: paid,
        expectedCents,
        differs: paid !== expectedCents,
        submittedAt: r.submittedAt,
        format: r.format,
      };
    }),
    waiting: rows.length,
    confirmedThisMonth: confirmed,
    pixReady: pixReady(settings.pix),
    canReview: can(s, "payments.review"),
  };
}

const ALREADY_REVIEWED = "Este comprovante já foi conferido.";
const ALREADY_PAID = "Esta fatura já foi paga.";

const brDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

/**
 * Fatura paga → loja no ar (PIX-FR-009, PIX-FR-011), dentro da transação de quem
 * confirmou: fatura `paid`, 1ª ativação com o vencimento, aviso ao lojista e a
 * mensagem pronta do `wa.me` para o admin avisar a loja.
 */
async function settleInvoice(
  tx: Db,
  invoice: { id: string; storeId: string; kind: "first" | "monthly" },
  at: Date,
): Promise<{ whatsappUrl: string }> {
  // Paga uma vez só: o segundo (outro admin, corrida) não acha a fatura aberta e a
  // transação inteira é desfeita (PIX-SEC-007).
  const paid = await tx
    .update(invoices)
    .set({ status: "paid", paidAt: at })
    .where(and(eq(invoices.id, invoice.id), eq(invoices.status, "open")))
    .returning({ id: invoices.id });
  if (!paid.length) throw AppError.conflict(ALREADY_PAID);
  // Caju Indica: a 1ª mensalidade da loja indicada rende (010).
  await rewardReferrals(tx, [invoice.id], at);
  const [store] = await tx
    .select({
      name: stores.name,
      slug: stores.slug,
      whatsapp: stores.whatsapp,
      ownerId: stores.ownerId,
    })
    .from(stores)
    .where(eq(stores.id, invoice.storeId));
  const { billingDay, nextDueAt } = firstDueDate(at);
  if (invoice.kind === "first")
    await activateFirstTime(tx, invoice.storeId, { billingDay, nextDueAt, at });
  await notify(tx, store.ownerId, { kind: "payment_confirmed" }, at);
  return {
    whatsappUrl: whatsappLink(
      store.whatsapp,
      `Olá, ${store.name}! Seu pagamento foi confirmado e a sua loja já está no ar na CajuGo: ${storeUrl(store.slug)}. Próximo vencimento: ${brDate.format(nextDueAt)}.`,
    ),
  };
}

/**
 * Admin confirma o comprovante [10b] (PIX-FR-009): pode corrigir o valor pelo extrato
 * (PIX-FR-008). Só `admin` (PIX-SEC-003); conferido uma vez só, mesmo com dois admins
 * ao mesmo tempo (PIX-SEC-007). Histórico com valores e referência (PIX-SEC-004).
 */
export async function confirmPayment(
  deps: BillingDeps,
  session: Session | null,
  input: unknown,
): Promise<{ whatsappUrl: string }> {
  const admin = authorizeTo(session, "payments.review");
  const parsed = confirmPaymentSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const { paymentId, amountCents } = parsed.data;
  const now = clock(deps);

  return deps.db.transaction(async (tx) => {
    const [payment] = await tx
      .update(payments)
      .set({
        status: "confirmed",
        reviewedBy: admin.userId,
        reviewedAt: now,
        ...(amountCents ? { amountCents } : {}),
      })
      .where(and(eq(payments.id, paymentId), eq(payments.status, "submitted")))
      .returning();
    if (!payment) throw await notOpenForReview(tx, paymentId);
    const [invoice] = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.id, payment.invoiceId));
    if (invoice.kind === "monthly")
      return settleMonthly(tx, payment, admin.userId, now);
    await logActivity(tx, {
      userId: admin.userId,
      action: "payment.confirmed",
      entity: "payment",
      entityId: payment.id,
      data: {
        storeId: payment.storeId,
        invoiceId: invoice.id,
        reference: REFERENCE[invoice.kind],
        paidCents: payment.paidCents,
        amountCents: payment.amountCents,
        expectedCents: invoice.totalCents,
      },
    });
    return settleInvoice(tx, invoice, now);
  });
}

const BELOW_OLDEST =
  "Valor menor que a fatura mais antiga. Recuse informando o valor faltante.";

/**
 * Pagamento confirmado de fatura mensal (SUB-FR-004, 016, 017; D3): quita as faturas
 * abertas inteiras, da mais antiga para a mais nova; a sobra vira crédito; sem fatura
 * vencida em aberto, a loja em atraso ou suspensa volta a ativa.
 */
async function settleMonthly(
  tx: Db,
  payment: typeof payments.$inferSelect,
  adminId: string,
  now: Date,
): Promise<{ whatsappUrl: string }> {
  const open = await tx
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.storeId, payment.storeId),
        eq(invoices.kind, "monthly"),
        eq(invoices.status, "open"),
      ),
    )
    .orderBy(asc(invoices.dueAt))
    .for("update");
  const result = settleOldestFirst(payment.amountCents, open);
  if (!result)
    throw AppError.validation([
      { field: "amountCents", code: "too_small", message: BELOW_OLDEST },
    ]);
  if (result.paid.length) {
    await tx
      .update(invoices)
      .set({ status: "paid", paidAt: now })
      .where(inArray(invoices.id, result.paid));
    await rewardReferrals(tx, result.paid, now);
  }
  if (result.surplusCents)
    await tx.insert(billingCredits).values({
      storeId: payment.storeId,
      kind: "overpayment",
      sourceId: payment.id,
      amountCents: result.surplusCents,
    });
  await logActivity(tx, {
    userId: adminId,
    action: "payment.confirmed",
    entity: "payment",
    entityId: payment.id,
    data: {
      storeId: payment.storeId,
      reference: REFERENCE.monthly,
      paidCents: payment.paidCents,
      amountCents: payment.amountCents,
      paidInvoices: result.paid.length,
      creditCents: result.surplusCents,
    },
  });

  const [store] = await tx
    .select({
      name: stores.name,
      slug: stores.slug,
      whatsapp: stores.whatsapp,
      ownerId: stores.ownerId,
      status: stores.status,
      nextDueAt: stores.nextDueAt,
    })
    .from(stores)
    .where(eq(stores.id, payment.storeId));
  const wasSuspended = store.status === "suspended";
  const back = await backToActiveIfSettled(tx, payment.storeId, now, {
    userId: adminId,
    source: "payment",
    id: payment.id,
  });
  // A reativada já recebeu "Pagamento confirmado. Sua loja está no ar."
  if (!(back && wasSuspended))
    await notify(tx, store.ownerId, { kind: "payment_confirmed" }, now);

  const next = store.nextDueAt
    ? ` Próximo vencimento: ${brDate.format(store.nextDueAt)}.`
    : "";
  return {
    whatsappUrl: whatsappLink(
      store.whatsapp,
      back
        ? `Olá, ${store.name}! Seu pagamento foi confirmado e a sua loja está no ar na CajuGo: ${storeUrl(store.slug)}.${next}`
        : `Olá, ${store.name}! Recebemos o seu pagamento na CajuGo.${next}`,
    ),
  };
}

/** Pagamento que não está em análise: já conferido (409) ou inexistente (404). */
async function notOpenForReview(db: Db, paymentId: string): Promise<AppError> {
  const [exists] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.id, paymentId));
  return exists ? AppError.conflict(ALREADY_REVIEWED) : AppError.notFound();
}

/**
 * Admin recusa o comprovante [10b] (PIX-FR-010): motivo obrigatório; a 1ª mensalidade
 * volta a "cadastrada" para o lojista reenviar ([12e]), com o valor faltante quando o
 * valor que vale é menor que o esperado. Aviso ao lojista e histórico (PIX-FR-013,
 * PIX-SEC-004); conferido uma vez só (PIX-SEC-007).
 */
export async function rejectPayment(
  deps: BillingDeps,
  session: Session | null,
  input: unknown,
): Promise<void> {
  const admin = authorizeTo(session, "payments.review");
  const parsed = rejectPaymentSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const { paymentId, reason, amountCents } = parsed.data;
  const now = clock(deps);

  await deps.db.transaction(async (tx) => {
    const [payment] = await tx
      .update(payments)
      .set({
        status: "rejected",
        rejectReason: reason,
        reviewedBy: admin.userId,
        reviewedAt: now,
        ...(amountCents ? { amountCents } : {}),
      })
      .where(and(eq(payments.id, paymentId), eq(payments.status, "submitted")))
      .returning();
    if (!payment) throw await notOpenForReview(tx, paymentId);
    const [invoice] = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.id, payment.invoiceId));
    // Na mensal a loja segue no status em que estava (SUB-FR-005).
    if (invoice.kind === "first") await backToRegistered(tx, payment.storeId);
    const expectedCents = await expectedFor(tx, invoice);
    const missing = expectedCents - payment.amountCents;
    const [store] = await tx
      .select({ ownerId: stores.ownerId })
      .from(stores)
      .where(eq(stores.id, payment.storeId));
    await notify(
      tx,
      store.ownerId,
      {
        kind: "payment_rejected",
        reason,
        ...(missing > 0 ? { missingCents: missing } : {}),
      },
      now,
    );
    await logActivity(tx, {
      userId: admin.userId,
      action: "payment.rejected",
      entity: "payment",
      entityId: payment.id,
      data: {
        storeId: payment.storeId,
        invoiceId: invoice.id,
        reference: REFERENCE[invoice.kind],
        reason,
        paidCents: payment.paidCents,
        amountCents: payment.amountCents,
        expectedCents,
      },
    });
  });
}

export type StoreHit = {
  storeId: string;
  name: string;
  slug: string;
  status: "registered" | "payment_review";
  /** Tem comprovante em análise: conferir esse primeiro. */
  pendingReceipt: boolean;
};

/** Lojas que ainda não pagaram a 1ª mensalidade, por nome ou endereço (PIX-FR-011). */
export async function findStoresToCharge(
  deps: BillingDeps,
  session: Session | null,
  query: unknown,
): Promise<StoreHit[]> {
  authorizeTo(session, "payments.review");
  const parsed = storeSearchSchema.safeParse(query);
  if (!parsed.success) return [];
  const like = `%${parsed.data.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await deps.db
    .select({
      storeId: stores.id,
      name: stores.name,
      slug: stores.slug,
      status: stores.status,
    })
    .from(stores)
    .where(
      and(
        inArray(stores.status, ["registered", "payment_review"]),
        or(ilike(stores.name, like), ilike(stores.slug, like)),
      ),
    )
    .orderBy(asc(stores.name))
    .limit(10);
  return rows.map((r) => ({
    ...r,
    status: r.status as StoreHit["status"],
    pendingReceipt: r.status === "payment_review",
  }));
}

/**
 * Admin registra pagamento sem comprovante (PIX-FR-011): exceção (ex.: dinheiro),
 * com forma, valor e observação; mesmo efeito da confirmação. Só para loja que ainda
 * não pagou a 1ª mensalidade e sem comprovante em análise. Só `admin`, com histórico.
 */
export async function registerManualPayment(
  deps: BillingDeps,
  session: Session | null,
  input: unknown,
): Promise<{ whatsappUrl: string }> {
  const admin = authorizeTo(session, "payments.review");
  const parsed = manualPaymentSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const { storeId, method, amountCents, note } = parsed.data;
  const now = clock(deps);
  const settings = await getSettings(deps.db, now);

  return deps.db.transaction(async (tx) => {
    // Trava a loja até o fim: um comprovante enviado ao mesmo tempo espera e depois
    // recebe "já em análise" (ou o admin vê "comprovante pendente").
    const [store] = await tx
      .select({ status: stores.status })
      .from(stores)
      .where(eq(stores.id, storeId))
      .for("update");
    if (!store) throw AppError.notFound();
    if (store.status === "payment_review")
      throw AppError.conflict("Confira o comprovante pendente desta loja.");
    if (store.status !== "registered")
      throw AppError.conflict("Esta loja não tem pagamento pendente.");

    let invoice = await openFirstInvoice(tx, storeId);
    if (!invoice)
      [invoice] = await tx
        .insert(invoices)
        .values({
          storeId,
          kind: "first",
          membershipCents: settings.membership_cents,
          totalCents: settings.membership_cents,
          dueAt: now,
        })
        .returning();
    const [payment] = await tx
      .insert(payments)
      .values({
        invoiceId: invoice.id,
        storeId,
        amountCents,
        status: "confirmed",
        manual: true,
        method,
        note,
        submittedBy: admin.userId,
        submittedAt: now,
        reviewedBy: admin.userId,
        reviewedAt: now,
      })
      .returning({ id: payments.id });
    await logActivity(tx, {
      userId: admin.userId,
      action: "payment.manual",
      entity: "payment",
      entityId: payment.id,
      data: {
        storeId,
        invoiceId: invoice.id,
        reference: REFERENCE[invoice.kind],
        method,
        amountCents,
        expectedCents: invoice.totalCents,
        note,
      },
    });
    return settleInvoice(tx, invoice, now);
  });
}

/**
 * Arquivo do comprovante (ADR 0011, `contract.md`): admin e suporte veem qualquer um;
 * o lojista só o da própria loja. Outra loja, outro papel, id inválido, inexistente
 * ou registro sem comprovante → 404 (PIX-SEC-001, PIX-SEC-002, PIX-SEC-003).
 */
export async function receiptFile(
  deps: FileDeps,
  session: Session | null,
  paymentId: string,
): Promise<{ body: ArrayBuffer; contentType: string; filename: string }> {
  const s = authorize(session, userRole.enumValues);
  if (!UUID.test(paymentId)) throw AppError.notFound();
  const team = can(s, "payments.view");
  if (!team && !(can(s, "billing.manage") && s.storeId))
    throw AppError.notFound();
  const [row] = await deps.db
    .select({
      storeId: payments.storeId,
      publicId: payments.receiptPublicId,
      format: payments.receiptFormat,
      kind: invoices.kind,
    })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    // Posse no próprio filtro (SECURITY.md §4): o lojista só acha o da sua loja.
    .where(
      and(
        eq(payments.id, paymentId),
        team ? undefined : eq(payments.storeId, s.storeId!),
      ),
    );
  if (!row?.publicId || !row.format) throw AppError.notFound();
  const file = await deps.cloudinary.fetchPrivate(row.publicId, row.format);
  if (!file) throw AppError.notFound();
  const ext = privateExtension(row.format);
  return {
    ...file,
    filename: `comprovante-${REFERENCE_SLUG[row.kind]}.${ext}`,
  };
}

/** Pagamento em análise [10a] (PIX-FR-006): o comprovante enviado e o prazo. */
export async function paymentInReview(
  deps: BillingDeps,
  session: Session | null,
): Promise<{
  submittedAt: Date;
  paidCents: number;
  reviewBusinessDays: number;
} | null> {
  const { storeId } = ownerOf(session);
  const [payment] = await deps.db
    .select({
      submittedAt: payments.submittedAt,
      paidCents: payments.paidCents,
      amountCents: payments.amountCents,
    })
    .from(payments)
    .where(
      and(eq(payments.storeId, storeId), eq(payments.status, "submitted")),
    );
  if (!payment) return null;
  const settings = await getSettings(deps.db, clock(deps));
  return {
    submittedAt: payment.submittedAt,
    paidCents: payment.paidCents ?? payment.amountCents,
    reviewBusinessDays: settings.review_business_days,
  };
}

/**
 * Só testes (`pnpm e2e:seed`, que recusa a produção): apaga faturas, pagamentos e
 * avisos das lojas e contas criadas pelos e2e, e devolve os comprovantes para o seed
 * apagar no Cloudinary.
 */
export async function removeBillingForTests(
  db: Db,
  input: { storeIds: string[]; profileIds: string[] },
): Promise<string[]> {
  const receipts: string[] = [];
  await db.transaction(async (tx) => {
    if (input.storeIds.length) {
      const rows = await tx
        .select({ publicId: payments.receiptPublicId })
        .from(payments)
        .where(
          and(
            inArray(payments.storeId, input.storeIds),
            isNotNull(payments.receiptPublicId),
          ),
        );
      receipts.push(...rows.map((r) => r.publicId!));
      await tx
        .delete(payments)
        .where(inArray(payments.storeId, input.storeIds));
      await tx
        .delete(billingCredits)
        .where(inArray(billingCredits.storeId, input.storeIds));
      await tx
        .delete(invoices)
        .where(inArray(invoices.storeId, input.storeIds));
    }
    if (input.profileIds.length)
      await tx
        .delete(notices)
        .where(inArray(notices.profileId, input.profileIds));
  });
  return receipts;
}

export { saoPauloMonthStart } from "./due-date";
export { refundSaleFee, runBillingCycle } from "./cycle";
export {
  reactivateStore,
  SUBSCRIPTION_FILTERS,
  subscriptionsView,
  suspendStore,
  type SubscriptionFilter,
  type SubscriptionItem,
  type SubscriptionsView,
} from "./subscriptions";
export {
  accountView,
  billingAlert,
  invoiceView,
  type BillingAlert,
  type AccountView,
  type InvoiceCard,
  type InvoiceView,
} from "./account";

const SUBSCRIPTION_LABEL: Record<string, string> = {
  registered: "Aguardando pagamento",
  payment_review: "Pagamento em análise",
  active: "Ativo",
  past_due: "Em atraso",
  suspended: "Suspensa",
  cancel_scheduled: "Cancelamento agendado",
  canceled: "Cancelada",
  archived: "Arquivada",
};

/** Card da assinatura em Meus veículos [1c] (VEH-FR-001): só para o lojista. */
export async function subscriptionCard(
  deps: BillingDeps,
  session: Session | null,
): Promise<{
  plan: string;
  membershipCents: number;
  statusLabel: string;
  nextDueAt: Date | null;
}> {
  const { storeId } = ownerOf(session);
  const [store] = await deps.db
    .select({ status: stores.status, nextDueAt: stores.nextDueAt })
    .from(stores)
    .where(eq(stores.id, storeId));
  if (!store) throw AppError.notFound();
  const settings = await getSettings(deps.db, clock(deps));
  return {
    plan: "Plano Catálogo",
    membershipCents: settings.membership_cents,
    statusLabel: SUBSCRIPTION_LABEL[store.status],
    nextDueAt: store.nextDueAt,
  };
}
