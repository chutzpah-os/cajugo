"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentSession, signIn } from "@/domains/auth/service";
import { getDb } from "@/platform/db/client";
import { clientIp, hashIp } from "@/platform/http/client-ip";
import { AppError } from "@/platform/http/errors";
import { isHoneypotFilled } from "@/platform/http/honeypot";
import { errorMessage, logger } from "@/platform/http/logger";
import { requestAuthProvider } from "@/platform/supabase/next";
import { registerReferrer } from "./service";

export type ReferrerSignupState = {
  /** Envio do robô (campo isca): confirmação sem conta. */
  sent?: boolean;
  message?: string;
  errors: Record<string, string>;
} | null;

const FIELDS = ["name", "phone", "email", "password"] as const;

/** Cadastro rápido do indicador [9b] (IND-FR-004): cria a conta, entra e abre [9d]. */
export async function registerReferrerAction(
  _prev: ReferrerSignupState,
  form: FormData,
): Promise<ReferrerSignupState> {
  const session = await currentSession();
  const input: Record<string, unknown> = { terms: form.get("terms") === "on" };
  if (!session) for (const f of FIELDS) input[f] = String(form.get(f) ?? "");
  const ipHash = hashIp(clientIp(await headers()));
  const deps = { db: getDb(), auth: await requestAuthProvider() };
  try {
    const { userId } = await registerReferrer(deps, session, input, {
      ipHash,
      honeypotFilled: isHoneypotFilled(form),
    });
    if (!userId) return { sent: true, errors: {} };
    if (!session)
      await signIn(
        deps,
        { email: String(input.email), password: String(input.password) },
        { ipHash },
      );
  } catch (error) {
    if (error instanceof AppError)
      return {
        message:
          error.type === "too-many-requests"
            ? "Muitas tentativas. Aguarde alguns minutos e tente de novo."
            : error.errors.length
              ? undefined
              : (error.detail ?? error.title),
        errors: Object.fromEntries(
          error.errors.map((e) => [e.field, e.message]),
        ),
      };
    logger.error("referrals.signup_failed", { error: errorMessage(error) });
    return {
      message: "Não foi possível concluir agora. Tente de novo.",
      errors: {},
    };
  }
  redirect("/indica");
}
