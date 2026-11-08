import { and, desc, eq } from "drizzle-orm";
import { authorizeTo } from "@/domains/auth/service";
import { rejectSelfReferralsByTaxId } from "@/domains/referrals/service";
import { getSettings, pixReady } from "@/domains/settings/service";
import { maskTaxId, parseTaxId, type TaxIdType } from "@/platform/br/tax-id";
import type {
  Cloudinary,
  SignedUpload,
} from "@/platform/cloudinary/cloudinary";
import { brCode } from "@/platform/pix/br-code";
import { invoices, payments, stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import type { Session } from "@/platform/http/session";
import { whatsappLink } from "@/platform/whatsapp/link";
import { startCheckoutSchema } from "./schemas";

/**
 * Cobrança da loja (spec 004; mensais na 011): fatura, pagamento por Pix manual e
 * conferência pelo admin. `storeId` sempre da sessão; o admin recebe ids e a posse é
 * conferida aqui (SECURITY.md §4).
 */

export type BillingDeps = { db: Db; now?: () => Date };
export type FileDeps = BillingDeps & { cloudinary: Cloudinary };

/** Comprovante: foto ou PDF, até 10 MB (PIX-FR-005, PIX-SEC-002). */
export const RECEIPT_FORMATS = ["jpg", "png", "webp", "heic", "pdf"];
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

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
  const taxId = parseTaxId(parsed.data.taxId);
  if (!taxId) {
    const digits = parsed.data.taxId.replace(/\D/g, "").length;
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
  const invoice = await openFirstInvoice(deps.db, storeId);
  if (!invoice) return null;
  const settings = await getSettings(deps.db, clock(deps));
  if (!pixReady(settings.pix)) throw AppError.conflict(UNAVAILABLE);
  const { key, beneficiary, city } = settings.pix;
  return {
    amountCents: invoice.totalCents,
    key,
    beneficiary,
    city,
    brCode: brCode({
      key,
      name: beneficiary,
      city,
      amountCents: invoice.totalCents,
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
  if (
    store?.status !== "registered" ||
    !(await openFirstInvoice(deps.db, storeId))
  )
    throw AppError.conflict("Não há pagamento aguardando comprovante.");
  return deps.cloudinary.signUpload({
    folder: receiptFolder(storeId),
    publicId: `receipt-${crypto.randomUUID()}`,
    allowedFormats: RECEIPT_FORMATS,
    type: "authenticated",
  });
}
