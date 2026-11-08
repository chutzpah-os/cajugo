"use server";

import { redirect } from "next/navigation";
import { currentSession } from "@/domains/auth/service";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";
import { logger } from "@/platform/http/logger";
import { startCheckout } from "./service";

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
