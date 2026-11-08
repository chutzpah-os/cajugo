"use server";

import { redirect } from "next/navigation";
import { currentSession } from "@/domains/auth/service";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";
import { logger } from "@/platform/http/logger";
import {
  getCloudinary,
  type SignedUpload,
} from "@/platform/cloudinary/cloudinary";
import { receiptUpload, startCheckout, submitReceipt } from "./service";

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
