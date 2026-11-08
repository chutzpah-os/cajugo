"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { STORES_TAG } from "@/domains/stores/service";
import { currentSession } from "@/domains/auth/service";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";
import { logger } from "@/platform/http/logger";
import {
  getCloudinary,
  type SignedUpload,
} from "@/platform/cloudinary/cloudinary";
import {
  confirmPayment,
  findStoresToCharge,
  receiptUpload,
  registerManualPayment,
  rejectPayment,
  startCheckout,
  submitReceipt,
  type StoreHit,
} from "./service";

export type FormState = {
  ok: boolean;
  message?: string;
  errors: Record<string, string>;
} | null;

/** Erro de negócio → estado do formulário; erro inesperado vai para o log. */
function formError(error: unknown, fallback: string): FormState {
  if (error instanceof AppError)
    return {
      ok: false,
      message: error.errors.length ? undefined : (error.detail ?? error.title),
      errors: Object.fromEntries(error.errors.map((e) => [e.field, e.message])),
    };
  logger.error("billing.action_failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  return { ok: false, message: fallback, errors: {} };
}

/** "Pagar com Pix" em [5d] (PIX-FR-002): grava o documento e segue para [6c]. */
export async function startCheckoutAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    await startCheckout({ db: getDb() }, await currentSession(), {
      taxId: String(form.get("taxId") ?? ""),
    });
  } catch (error) {
    return formError(
      error,
      "Não foi possível continuar agora. Tente de novo em instantes.",
    );
  }
  redirect("/lojistas/pagamento/pix");
}

/** Assinatura do envio do comprovante (PIX-SEC-002). */
export async function receiptUploadAction(): Promise<
  { ok: true; upload: SignedUpload } | { ok: false; message: string }
> {
  try {
    return {
      ok: true,
      upload: await receiptUpload(
        { db: getDb(), cloudinary: getCloudinary() },
        await currentSession(),
      ),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        formError(error, "Não foi possível enviar agora.")?.message ??
        "Não foi possível enviar agora.",
    };
  }
}

/** Comprovante enviado + valor pago (PIX-FR-005, PIX-FR-006). */
export async function submitReceiptAction(input: {
  publicId: string;
  paidCents: number;
}): Promise<FormState> {
  try {
    await submitReceipt(
      { db: getDb(), cloudinary: getCloudinary() },
      await currentSession(),
      input,
    );
    return { ok: true, errors: {} };
  } catch (error) {
    return formError(
      error,
      "Não foi possível enviar o comprovante agora. Tente de novo.",
    );
  }
}

export type ReviewResult =
  | { ok: true; whatsappUrl?: string }
  | { ok: false; message?: string; errors: Record<string, string> };

function reviewError(error: unknown): ReviewResult {
  const state = formError(
    error,
    "Não foi possível concluir agora. Tente de novo.",
  );
  return { ok: false, message: state?.message, errors: state?.errors ?? {} };
}

/** Confirmar [10b] (PIX-FR-009): a loja vai ao ar, então a página pública é renovada. */
export async function confirmPaymentAction(input: {
  paymentId: string;
  amountCents?: number;
}): Promise<ReviewResult> {
  try {
    const { whatsappUrl } = await confirmPayment(
      { db: getDb() },
      await currentSession(),
      input,
    );
    updateTag(STORES_TAG);
    return { ok: true, whatsappUrl };
  } catch (error) {
    return reviewError(error);
  }
}

/** Recusar com motivo [10b] (PIX-FR-010). */
export async function rejectPaymentAction(input: {
  paymentId: string;
  reason: string;
  amountCents?: number;
}): Promise<ReviewResult> {
  try {
    await rejectPayment({ db: getDb() }, await currentSession(), input);
    return { ok: true };
  } catch (error) {
    return reviewError(error);
  }
}

/** Busca de loja para o registro sem comprovante (PIX-FR-011). */
export async function findStoresAction(query: string): Promise<StoreHit[]> {
  try {
    return await findStoresToCharge(
      { db: getDb() },
      await currentSession(),
      String(query).slice(0, 60),
    );
  } catch (error) {
    // Erro inesperado vai para o log; sem permissão, só não acha nada.
    formError(error, "");
    return [];
  }
}

/** Registrar pagamento sem comprovante (PIX-FR-011). */
export async function manualPaymentAction(input: {
  storeId: string;
  method: string;
  amountCents: number;
  note: string;
}): Promise<ReviewResult> {
  try {
    const { whatsappUrl } = await registerManualPayment(
      { db: getDb() },
      await currentSession(),
      input,
    );
    updateTag(STORES_TAG);
    return { ok: true, whatsappUrl };
  } catch (error) {
    return reviewError(error);
  }
}
